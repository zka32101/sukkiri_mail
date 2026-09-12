import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as zlib from "zlib";
import { MailProviderAdapter } from "./providers/mailProviderInterface";
import { GmailProvider } from "./providers/gmailProvider";
import { OutlookProvider } from "./providers/outlookProvider";
import { ImapProvider } from "./providers/imapProvider";
import { db as firestoreDb } from "./firestore";
import { enqueueScanTask } from "./cloudTasks";
import { mlDataCollectionService } from "./services/mlDataCollectionService";
import {
  isConnectAccountRequest,
  isScanAccountRequest,
  isApplyArchiveRulesRequest,
  isRestoreEmailsRequest,
  isFetchMessageRequest,
} from "./types";

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
    const adapter = resolveProvider(provider);
    const items = await adapter.scan(accountId, lastScanAt);

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
