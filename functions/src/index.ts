import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { MailProviderAdapter } from "./providers/mailProviderInterface";
import { GmailProvider } from "./providers/gmailProvider";
import { OutlookProvider } from "./providers/outlookProvider";
import { ImapProvider } from "./providers/imapProvider";

admin.initializeApp();

function resolveProvider(provider: string): MailProviderAdapter {
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

/** OAuth同意 or アプリパスワード検証を行い、アカウントを連携する。 */
export const connectAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, userId, ...params } = request.data ?? {};
  if (userId !== uid) throw new HttpsError("permission-denied", "userId mismatch");

  const adapter = resolveProvider(provider);
  const result = await adapter.connect(uid, params);
  return result;
});

/** アカウントをスキャンし、カテゴリ自動判定した検出結果を返す（Aha Moment用）。 */
export const scanAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  const items = await adapter.scan(accountId);
  await admin
    .firestore()
    .collection("linkedAccounts")
    .doc(accountId)
    .update({ lastScanAt: Date.now() });
  return { items };
});

/** 検出結果のうち選択されたメールをアーカイブする（サーバー側、可逆）。 */
export const applyArchiveRules = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId, emailIds } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  await adapter.archive(accountId, emailIds ?? []);

  await admin.firestore().collection("archiveLogs").add({
    userId: uid,
    archivedAt: Date.now(),
    emailCount: (emailIds ?? []).length,
    category: "other",
    restoredAt: null,
  });
  return { ok: true };
});

/** アーカイブ済みメールを受信箱に復元する。 */
export const restoreEmail = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId, emailIds } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  await adapter.restore(accountId, emailIds ?? []);
  return { ok: true };
});

/** 1通だけ本文/添付をオンデマンドでクラウド取得する（明示タップ時のみ発火）。 */
export const fetchMessageBody = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId, messageId } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  return adapter.fetchMessageBody(accountId, messageId);
});

async function assertAccountOwnership(accountId: string, uid: string): Promise<void> {
  const doc = await admin.firestore().collection("linkedAccounts").doc(accountId).get();
  const data = doc.data();
  if (!data || data.userId !== uid) {
    throw new HttpsError("permission-denied", "not your account");
  }
}
