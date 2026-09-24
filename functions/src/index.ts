import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as zlib from "zlib";
import { MailProviderAdapter } from "./providers/mailProviderInterface";
import { GmailProvider } from "./providers/gmailProvider";
import { OutlookProvider } from "./providers/outlookProvider";
import { ImapProvider } from "./providers/imapProvider";
import { db as firestoreDb } from "./firestore";
import { enqueueScanTask } from "./cloudTasks";
import { mlDataCollectionService } from "./services/mlDataCollectionService";
import { globalRateLimiter } from "./scaling/rateLimiter";
import { performanceMonitor } from "./monitoring/monitoring";
import { errorHandlingService, defaultRetryStrategy } from "./services/errorHandlingService";
import {
  getLivenessCheck,
  getReadinessCheck,
  getDeepHealthCheck,
  recordHealthCheck,
} from "./health/healthCheck";
import {
  enablePushSyncForAccount,
  disablePushSyncForAccount,
  renewExpiringPushSync,
  findAccountByEmail,
  findAccountBySubscriptionId,
} from "./services/pushSyncService";
import {
  isConnectAccountRequest,
  isScanAccountRequest,
  isApplyArchiveRulesRequest,
  isRestoreEmailsRequest,
  isFetchMessageRequest,
  isUpdateCategoryRuleRequest,
  isGetCacheStatsRequest,
  isPushSyncRequest,
} from "./types";
import { getSecret } from "./secrets";

admin.initializeApp();

export { revenueCatWebhook } from "./revenueCatWebhook";

/**
 * Resolve provider string to MailProviderAdapter instance
 * @internal Used by Cloud Functions
 */
export function resolveProvider(provider: string): MailProviderAdapter {
  switch (provider) {
    case "gmail":
      return new GmailProvider();
    case "outlook":
      return new OutlookProvider();
    case "imap":
      return new ImapProvider();
    default:
      throw new HttpsError("invalid-argument", `unknown provider: ${provider}`);
  }
}

/**
 * Synthesize Firestore document ID for emailMeta
 * Combines accountId and itemId to avoid ID collisions across providers
 * @internal
 */
export function emailMetaDocId(accountId: string, itemId: string): string {
  return `${accountId}_${itemId}`;
}

/**
 * Extract provider's native message ID from composite ID
 * Reverses the transformation done by emailMetaDocId
 * @internal
 */
export function rawProviderMessageId(accountId: string, compositeId: string): string {
  const prefix = `${accountId}_`;
  return compositeId.startsWith(prefix) ? compositeId.slice(prefix.length) : compositeId;
}

/**
 * Verify that email IDs belong to the given accountId
 * IDOR prevention: ensures client-provided emailIds can't reference other users' accounts
 * @internal
 */
export function assertOwnedEmailIds(accountId: string, ids: string[]): void {
  const prefix = `${accountId}_`;
  for (const id of ids) {
    if (!id.startsWith(prefix)) {
      throw new HttpsError("permission-denied", "emailId does not belong to accountId");
    }
  }
}

/** OAuth同意 or アプリパスワード検証を行い、アカウントを連携する。 */
export const connectAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isConnectAccountRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, userId, ...params } = request.data;
  if (userId !== uid) throw new HttpsError("permission-denied", "userId mismatch");

  const adapter = resolveProvider(provider);
  const result = await adapter.connect(uid, params);
  return result;
});

/** アカウントをスキャンし、バックグラウンドで非同期処理（Cloud Tasks）を開始。
 *  UIをブロックせず即座に応答。検出結果はemailMetaへ永続化する（メール検索・アーカイブ済み一覧・ピン留めはこのコレクションを参照する）。 */
export const scanAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isScanAccountRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId } = request.data;
  await assertAccountOwnership(accountId, uid);

  // 乱発スキャンによる負荷・コスト急増を防ぐため、ユーザー単位でレート制限をかける。
  const rateLimitStatus = globalRateLimiter.isUserAllowed(uid);
  if (!rateLimitStatus.allowed) {
    throw new HttpsError(
      "resource-exhausted",
      `Too many scan requests. Please retry in ${Math.ceil(rateLimitStatus.retryAfterMs / 1000)}s`
    );
  }

  // Cloud Tasks へスキャンタスクをエンキュー。
  // 処理はバックグラウンドで実行される（UIをブロックしない）。
  const projectId = process.env.GCLOUD_PROJECT || "sukkiri-mail-prod";
  const location = "asia-northeast1";
  const queueName = "email-scanning";

  try {
    await enqueueScanTask(projectId, queueName, location, accountId, uid, provider);
    // スキャン開始確認を返却（実際の結果はリアルタイム Firestore 更新で配信）
    return {
      status: "scanning",
      message: "Email scan started in background",
      accountId,
    };
  } catch (error) {
    console.error("[scanAccount] Failed to enqueue scan task:", error);
    throw new HttpsError("internal", "Failed to start email scan");
  }
});

/** 検出結果のうち選択されたメールをアーカイブする（サーバー側、可逆）。 */
export const applyArchiveRules = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isApplyArchiveRulesRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId, emailIds } = request.data;
  await assertAccountOwnership(accountId, uid);
  // クライアントから渡されるemailIdsはemailMetaの合成ID。プロバイダAPIには本来のメッセージIDを渡す。
  const ids: string[] = emailIds ?? [];
  assertOwnedEmailIds(accountId, ids);
  const rawIds = ids.map((id) => rawProviderMessageId(accountId, id));

  const adapter = resolveProvider(provider);
  await adapter.archive(accountId, rawIds);

  const db = firestoreDb();
  const metaRefs = ids.map((id) => db.collection("emailMeta").doc(id));
  const metaSnaps = metaRefs.length > 0 ? await db.getAll(...metaRefs) : [];

  // emailMetaのstatusを更新し、実際のカテゴリ別にarchiveLogsを記録する（固定で"other"にしない）。
  const countByCategory = new Map<string, number>();
  const batch = db.batch();
  metaSnaps.forEach((snap, i) => {
    const category = (snap.data()?.category as string | undefined) ?? "other";
    countByCategory.set(category, (countByCategory.get(category) ?? 0) + 1);
    batch.set(metaRefs[i], { status: "archived" }, { merge: true });
  });

  const archivedAt = Date.now();
  for (const [category, count] of countByCategory) {
    const logRef = db.collection("archiveLogs").doc();
    batch.set(logRef, {
      userId: uid,
      archivedAt,
      emailCount: count,
      category,
      restoredAt: null,
    });
  }
  await batch.commit();

  return { ok: true };
});

/** アーカイブ済みメールを受信箱に復元する。 */
export const restoreEmail = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isRestoreEmailsRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId, emailIds } = request.data;
  await assertAccountOwnership(accountId, uid);
  const ids: string[] = emailIds ?? [];
  assertOwnedEmailIds(accountId, ids);
  const rawIds = ids.map((id) => rawProviderMessageId(accountId, id));

  const adapter = resolveProvider(provider);
  await adapter.restore(accountId, rawIds);

  if (ids.length > 0) {
    const db = firestoreDb();
    const batch = db.batch();
    for (const id of ids) {
      const ref = db.collection("emailMeta").doc(id);
      // 復元後は再びアーカイブ済み一覧・ダッシュボード集計から除外されるようactiveへ戻す。
      batch.set(ref, { status: "active" }, { merge: true });
    }
    await batch.commit();
  }

  return { ok: true };
});

/** 1通だけ本文/添付をオンデマンドでクラウド取得する（明示タップ時のみ発火）。
 *  HTML本文が大きい場合は自動的にgzip圧縮して転送時間を削減（20-30%削減期待）。 */
export const fetchMessageBody = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isFetchMessageRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId, messageId } = request.data;
  await assertAccountOwnership(accountId, uid);
  assertOwnedEmailIds(accountId, [messageId]);

  const adapter = resolveProvider(provider);
  const result = await adapter.fetchMessageBody(accountId, rawProviderMessageId(accountId, messageId ?? ""));

  // Compress HTML if it's large (>1KB threshold for gzip efficiency)
  const htmlBuffer = Buffer.from(result.html, "utf-8");
  const compressionThreshold = 1024; // 1KB

  if (htmlBuffer.length > compressionThreshold) {
    const compressed = zlib.gzipSync(htmlBuffer);
    return {
      html: compressed.toString("base64"),
      attachmentNames: result.attachmentNames,
      isCompressed: true,
      originalSize: htmlBuffer.length,
      compressedSize: compressed.length,
    };
  }

  return {
    ...result,
    isCompressed: false,
  };
});

/**
 * Verify that the given uid owns the linkedAccount
 * @internal
 */
export async function assertAccountOwnership(accountId: string, uid: string): Promise<void> {
  const doc = await firestoreDb().collection("linkedAccounts").doc(accountId).get();
  const data = doc.data();
  if (!data || data.userId !== uid) {
    throw new HttpsError("permission-denied", "not your account");
  }
}

/** Cloud Tasks から呼び出されるバックグラウンド関数。
 *  実際のメールスキャン処理を実行し、結果を Firestore に永続化。
 *  UIをブロックせずに大規模スキャンに対応。 */
export const processScanTask = onRequest(async (request, response) => {
  try {
    // Cloud Tasks からのリクエストを検証（安全な型チェック）
    let bodyText: string;
    if (typeof request.body === "string") {
      bodyText = request.body;
    } else if (Buffer.isBuffer(request.body)) {
      bodyText = request.body.toString();
    } else {
      response.status(400).json({ error: "Invalid request body format" });
      return;
    }

    const payload = JSON.parse(Buffer.from(bodyText, "base64").toString());
    const { accountId, userId, provider } = payload;

    if (!accountId || !userId || !provider) {
      response.status(400).json({ error: "Missing required fields" });
      return;
    }

    const db = firestoreDb();

    // Firestore でスキャン状態を "in_progress" に更新
    await db.collection("linkedAccounts").doc(accountId).update({
      scanStatus: "in_progress",
      scanStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      scanError: null,
    });

    console.info(`[processScanTask] Starting scan for account ${accountId}`);

    // Fetch lastScanAt for incremental sync
    const accountDoc = await db.collection("linkedAccounts").doc(accountId).get();
    const lastScanAt = (accountDoc.data()?.lastScanAt as number | null) ?? null;

    // プロバイダを解決し、スキャンを実行
    // サーキットブレーカーで連続障害中のプロバイダへの無駄なリクエストを遮断し、
    // 一時的なエラー（ネットワーク/レート制限等）は指数バックオフで自動リトライする。
    const adapter = resolveProvider(provider);
    const operationName = `scan.${provider}`;
    const circuitBreaker = errorHandlingService.getCircuitBreaker(operationName);

    if (circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker open for provider ${provider}; skipping scan`);
    }

    let items;
    try {
      const { result } = await performanceMonitor.measureOperation(operationName, () =>
        defaultRetryStrategy.executeWithRetry(
          () => adapter.scan(accountId, lastScanAt),
          operationName
        )
      );
      items = result;
      circuitBreaker.recordSuccess();
    } catch (scanError) {
      circuitBreaker.recordFailure();
      errorHandlingService.recordError(operationName, scanError);
      throw scanError;
    }

    // emailMeta へメール情報を永続化（merge: true で既存の status/isPinned を保護）
    const batch = db.batch();
    for (const item of items) {
      const docRef = db.collection("emailMeta").doc(emailMetaDocId(accountId, item.id));
      batch.set(
        docRef,
        {
          userId,
          accountId,
          category: item.category,
          receivedAt: item.receivedAt,
          hasAttachment: item.hasAttachment,
          snippet: item.snippet,
          subject: item.subject,
          senderEmail: item.senderEmail,
          isUnread: item.isUnread,
        },
        { merge: true }
      );
    }

    // linkedAccounts を更新（lastScanAt を現在時刻に設定）
    batch.update(db.collection("linkedAccounts").doc(accountId), {
      lastScanAt: Date.now(),
    });

    await batch.commit();

    // スキャン完了状態を Firestore に記録
    await db.collection("linkedAccounts").doc(accountId).update({
      scanStatus: "completed",
      scanCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      scanItemCount: items.length,
    });

    console.info(
      `[processScanTask] Scan completed for account ${accountId}: ${items.length} items`
    );

    response.status(200).json({
      status: "success",
      accountId,
      itemCount: items.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[processScanTask] Error during scan:", errorMessage);

    // エラー情報を linkedAccounts に記録（ユーザー向けエラー表示用）
    try {
      let bodyText: string;
      if (typeof request.body === "string") {
        bodyText = request.body;
      } else if (Buffer.isBuffer(request.body)) {
        bodyText = request.body.toString();
      } else {
        throw new Error("Invalid request body format");
      }

      const payload = JSON.parse(Buffer.from(bodyText, "base64").toString());
      const { accountId } = payload;
      if (accountId) {
        await firestoreDb().collection("linkedAccounts").doc(accountId).update({
          scanStatus: "failed",
          scanError: errorMessage,
          scanFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (updateError) {
      console.error("[processScanTask] Failed to update error status:", updateError);
    }

    response.status(500).json({
      status: "error",
      message: errorMessage,
    });
  }
});

/** ML 推論ログを記録。推論実行後に呼び出す。 */
export const logMLInference = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  const { accountId, messageId, modelVersion, modelType, inferenceResult } =
    request.data;

  if (
    !accountId ||
    !messageId ||
    !modelVersion ||
    !modelType ||
    !inferenceResult
  ) {
    throw new HttpsError("invalid-argument", "missing required fields");
  }

  try {
    const logId = await mlDataCollectionService.logInference(
      uid,
      accountId,
      messageId,
      modelVersion,
      modelType,
      inferenceResult
    );

    return { ok: true, logId };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to log inference: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/** ML 推論検証。ユーザー確認後に実際の分類結果を記録。 */
export const verifyMLInference = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  const { logId, userCategory, userFeedback } = request.data;

  if (!logId || !userCategory || !userFeedback) {
    throw new HttpsError("invalid-argument", "missing required fields");
  }

  if (!["accept", "reject", "skip"].includes(userFeedback)) {
    throw new HttpsError("invalid-argument", "invalid userFeedback value");
  }

  try {
    await mlDataCollectionService.verifyInference(
      uid,
      logId,
      userCategory,
      userFeedback
    );

    return { ok: true };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to verify inference: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/** モデル精度統計を計算（A/B テスト検証用）。 */
export const getModelAccuracyStats = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  const { modelVersion, startDate, endDate } = request.data;

  if (!modelVersion || !startDate || !endDate) {
    throw new HttpsError("invalid-argument", "missing required fields");
  }

  try {
    const stats = await mlDataCollectionService.calculateModelAccuracy(
      uid,
      modelVersion,
      new Date(startDate),
      new Date(endDate)
    );

    return stats;
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to calculate accuracy stats: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/** 期限切れ ML ログをクリーンアップ。 */
export const cleanupMLLogs = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  const { retentionDays } = request.data ?? {};

  try {
    const deletedCount = await mlDataCollectionService.cleanupOldLogs(
      uid,
      retentionDays ?? 90
    );

    return { ok: true, deletedCount };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to cleanup logs: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * ユーザーがカテゴリルールを編集し、保持日数を更新する
 */
export const updateCategoryRule = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isUpdateCategoryRuleRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { ruleId, retentionDays } = request.data;

  // 保持日数は1～90日の範囲
  if (retentionDays < 1 || retentionDays > 90) {
    throw new HttpsError(
      "invalid-argument",
      "retentionDays must be between 1 and 90"
    );
  }

  try {
    // ルールがユーザーに所有されていることを確認
    const ruleDoc = await firestoreDb()
      .collection("users")
      .doc(uid)
      .collection("rules")
      .doc(ruleId)
      .get();

    if (!ruleDoc.exists) {
      throw new HttpsError("not-found", "rule not found");
    }

    // 保持日数を更新
    await ruleDoc.ref.update({
      retentionDays,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true, ruleId, retentionDays };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      `Failed to update rule: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * 現在のユーザーのローカルキャッシュ統計情報を返す
 * フロントエンドでキャッシュ管理画面に表示する情報
 */
export const getCacheStats = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isGetCacheStatsRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  try {
    // ユーザーの全メタデータを取得
    const emailMetaSnapshot = await firestoreDb()
      .collectionGroup("emailMeta")
      .where("userId", "==", uid)
      .get();

    const totalEmailCount = emailMetaSnapshot.size;

    // キャッシュステータス別にメールをカウント
    const statsByStatus: Record<string, number> = {
      cached: 0,
      purged: 0,
      blocked: 0,
    };

    let totalSizeEstimate = 0;
    const avgBytesPerEmail = 150 * 1024; // 150 KB per email (estimate)

    emailMetaSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const cacheStatus = data.localCacheStatus ?? "cached";
      statsByStatus[cacheStatus] = (statsByStatus[cacheStatus] ?? 0) + 1;

      // cached状態のメールについてサイズ推定
      if (cacheStatus === "cached") {
        totalSizeEstimate += avgBytesPerEmail;
      }
    });

    return {
      ok: true,
      stats: {
        count: statsByStatus.cached ?? 0, // フロントエンドで表示されるメール数
        totalBytes: totalSizeEstimate,
        byStatus: statsByStatus,
        totalEmails: totalEmailCount,
      },
    };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/** Kubernetes-style Liveness probe。外部依存なし、プロセスが生きていれば200を返す。 */
export const healthz = onRequest(async (request, response) => {
  const result = getLivenessCheck();
  recordHealthCheck(result);
  response.status(200).json(result);
});

/** Kubernetes-style Readiness probe。Firestore接続を確認し、準備完了かを返す。 */
export const readyz = onRequest(async (request, response) => {
  const result = await getReadinessCheck();
  recordHealthCheck(result);
  response.status(result.status === "unhealthy" ? 503 : 200).json(result);
});

/** 詳細ヘルスチェック（Firestore/メモリ/イベントループ）。運用監視・障害調査用。 */
export const deepHealthCheck = onRequest(async (request, response) => {
  const result = await getDeepHealthCheck();
  recordHealthCheck(result);
  response.status(result.status === "unhealthy" ? 503 : 200).json(result);
});

/** 運用モニタリング用: スキャン処理のレイテンシ/エラー率、アクティブアラート、レート制限状況を返す。 */
export const getSystemMetrics = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  const providers = ["gmail", "outlook", "imap"];
  const scanMetrics = providers.reduce<Record<string, unknown>>((acc, provider) => {
    acc[provider] = {
      latency: performanceMonitor.getMetricStats(`scan.${provider}.latency`),
      errorStats: errorHandlingService.getErrorStats(`scan.${provider}`),
      circuitBreaker: errorHandlingService.getCircuitBreaker(`scan.${provider}`).getState(),
    };
    return acc;
  }, {});

  return {
    ok: true,
    scanMetrics,
    activeAlerts: performanceMonitor.getActiveAlerts(),
    rateLimiter: {
      deniedCount: globalRateLimiter.getDeniedCount(),
      activeUsers: globalRateLimiter.getActiveUsers(),
      userStats: globalRateLimiter.getUserStats(uid),
    },
  };
});

/**
 * プッシュ型同期を有効化する（ポーリングではなくプロバイダ側からの変更通知でスキャンを起動）。
 * gmail: Pub/Sub watch、outlook: Graph webhookサブスクリプションを登録する。imapは非対応。
 */
export const enablePushSync = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isPushSyncRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId } = request.data;
  await assertAccountOwnership(accountId, uid);

  if (provider !== "gmail" && provider !== "outlook") {
    throw new HttpsError("invalid-argument", "push sync is only supported for gmail and outlook");
  }

  try {
    const { expiresAt } = await enablePushSyncForAccount(accountId, provider);
    return { ok: true, expiresAt };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to enable push sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/** プッシュ型同期を無効化する（アカウント連携解除時にも呼び出すこと）。 */
export const disablePushSync = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isPushSyncRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId } = request.data;
  await assertAccountOwnership(accountId, uid);

  try {
    await disablePushSyncForAccount(accountId, provider);
    return { ok: true };
  } catch (error) {
    throw new HttpsError(
      "internal",
      `Failed to disable push sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Gmail Pub/Sub push通知の受信エンドポイント。
 * 【要確認】GCP ConsoleでPub/Subトピックを作成し、このURLをpushサブスクリプションの
 * エンドポイントに設定、共有シークレットをSecret Managerに`gmail-pubsub-verification-token`
 * として登録し、サブスクリプションのpush先URLに `?token=<同じ値>` を付与すること。
 */
export const gmailPushNotification = onRequest(async (request, response) => {
  try {
    const expectedToken = await getSecret("gmail-pubsub-verification-token");
    if (request.query.token !== expectedToken) {
      response.status(403).json({ error: "invalid verification token" });
      return;
    }

    const message = (request.body as { message?: { data?: string } } | undefined)?.message;
    if (!message?.data) {
      response.status(400).json({ error: "missing message data" });
      return;
    }

    const decoded = JSON.parse(Buffer.from(message.data, "base64").toString("utf-8")) as {
      emailAddress?: string;
    };
    if (!decoded.emailAddress) {
      response.status(400).json({ error: "missing emailAddress" });
      return;
    }

    const account = await findAccountByEmail("gmail", decoded.emailAddress);
    if (!account) {
      // 連携解除済み等でアカウントが見つからない場合もPub/Subの再送を止めるため200を返す。
      console.warn(`[gmailPushNotification] No linked account for ${decoded.emailAddress}`);
      response.status(200).json({ ok: true, skipped: true });
      return;
    }

    const projectId = process.env.GCLOUD_PROJECT || "sukkiri-mail-prod";
    await enqueueScanTask(
      projectId,
      "email-scanning",
      "asia-northeast1",
      account.accountId,
      account.userId,
      "gmail"
    );

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error("[gmailPushNotification] Error:", error);
    // Pub/Subの無限リトライを避けるためエラー時も200を返す（追跡はログで行う）。
    response.status(200).json({ ok: false });
  }
});

/**
 * Microsoft Graph webhook通知の受信エンドポイント。
 * サブスクリプション作成直後の検証リクエスト（validationTokenクエリパラメータ）と、
 * 実際の変更通知（POSTボディのvalue配列）の両方を処理する。
 */
export const outlookPushNotification = onRequest(async (request, response) => {
  const validationToken = request.query.validationToken;
  if (typeof validationToken === "string") {
    response.status(200).set("Content-Type", "text/plain").send(validationToken);
    return;
  }

  try {
    const notifications =
      (request.body as { value?: Array<{ subscriptionId?: string; clientState?: string }> } | undefined)
        ?.value ?? [];

    for (const notification of notifications) {
      if (!notification.subscriptionId) continue;

      const account = await findAccountBySubscriptionId(notification.subscriptionId);
      if (!account) continue;

      // clientStateはGraphのwebhookが本物の送信元かを検証するための共有シークレット。
      if (account.clientState !== notification.clientState) {
        console.warn(
          `[outlookPushNotification] clientState mismatch for subscription ${notification.subscriptionId}`
        );
        continue;
      }

      const projectId = process.env.GCLOUD_PROJECT || "sukkiri-mail-prod";
      await enqueueScanTask(
        projectId,
        "email-scanning",
        "asia-northeast1",
        account.accountId,
        account.userId,
        "outlook"
      );
    }

    response.status(202).json({ ok: true });
  } catch (error) {
    console.error("[outlookPushNotification] Error:", error);
    response.status(202).json({ ok: false });
  }
});

/** プッシュ同期サブスクリプションの期限切れ防止のため、定期的に更新する（6時間毎）。 */
export const renewPushSubscriptions = onSchedule("every 6 hours", async () => {
  const result = await renewExpiringPushSync();
  console.info(`[renewPushSubscriptions] renewed=${result.renewed} failed=${result.failed}`);
});
