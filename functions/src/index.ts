import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as zlib from "zlib";
import { MailProviderAdapter } from "./providers/mailProviderInterface";
import { GmailProvider } from "./providers/gmailProvider";
import { OutlookProvider } from "./providers/outlookProvider";
import { ImapProvider } from "./providers/imapProvider";
import { db as firestoreDb } from "./firestore";
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

/** アカウントをスキャンし、カテゴリ自動判定した検出結果を返す（Aha Moment用）。
 *  検出結果はemailMetaへ永続化する（メール検索・アーカイブ済み一覧・ピン留めはこのコレクションを参照する）。 */
export const scanAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");

  if (!isScanAccountRequest(request.data)) {
    throw new HttpsError("invalid-argument", "invalid request data");
  }

  const { provider, accountId } = request.data;
  await assertAccountOwnership(accountId, uid);

  // Fetch lastScanAt for incremental sync
  const db = firestoreDb();
  const accountDoc = await db.collection("linkedAccounts").doc(accountId).get();
  const lastScanAt = (accountDoc.data()?.lastScanAt as number | null) ?? null;

  const adapter = resolveProvider(provider);
  const items = await adapter.scan(accountId, lastScanAt);

  const batch = db.batch();
  for (const item of items) {
    const docRef = db.collection("emailMeta").doc(emailMetaDocId(accountId, item.id));
    // merge: trueで既存のstatus/isPinned/localCacheStatusは上書きしない（再スキャン時に保護状態を維持）。
    batch.set(
      docRef,
      {
        userId: uid,
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
  batch.update(db.collection("linkedAccounts").doc(accountId), { lastScanAt: Date.now() });
  await batch.commit();

  // クライアントへ返すidはFirestoreドキュメントID（合成ID）に揃える。
  // 以降アーカイブ/復元/ピン留めはこのidをそのままemailMetaの参照に使う。
  const responseItems = items.map((item) => ({
    ...item,
    id: emailMetaDocId(accountId, item.id),
  }));
  return { items: responseItems };
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
