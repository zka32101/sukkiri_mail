import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { MailProviderAdapter } from "./providers/mailProviderInterface";
import { GmailProvider } from "./providers/gmailProvider";
import { OutlookProvider } from "./providers/outlookProvider";
import { ImapProvider } from "./providers/imapProvider";

admin.initializeApp();

// このプロジェクト(app1-6c108)は複数アプリ共存のため、Firestoreは名前付き
// データベース "sukkirimail" を使う（Flutter側もfirestoreProviderで同じ名前を
// 指定している）。admin.firestore()は引数なしだと(default)DBを見てしまうため、
// このアプリ用の読み書きは必ずこのヘルパー経由にする。
function db() {
  return getFirestore(admin.app(), "sukkirimail");
}

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

const DEFAULT_LOCAL_CACHE_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 「実Gmail等には一切書き込まず、アプリの一覧表示からのみ経過日数で外す」機能の本体。
 * 毎日1回、ユーザーごとに設定された日数(users/{uid}.localCacheRetentionDays、
 * 未設定なら30日)より古く、ピン留めされていないメールを
 * emailMeta.localCacheStatus = "purged" にする。
 * Gmail等の外部APIは一切呼び出さない（実メールボックスは変更されない）。
 */
export const autoHideOldEmails = onSchedule(
  { schedule: "every 24 hours", timeZone: "Asia/Tokyo" },
  async () => {
    const firestore = db();
    const accountsSnap = await firestore.collection("linkedAccounts").get();

    // ユーザーごとの設定日数はaccount横断で使い回すため軽くキャッシュする。
    const retentionDaysByUser = new Map<string, number>();

    for (const accountDoc of accountsSnap.docs) {
      const account = accountDoc.data();
      const userId = account.userId as string | undefined;
      if (!userId) continue;

      let retentionDays = retentionDaysByUser.get(userId);
      if (retentionDays === undefined) {
        const userDoc = await firestore.collection("users").doc(userId).get();
        retentionDays =
          (userDoc.data()?.localCacheRetentionDays as number | undefined) ??
          DEFAULT_LOCAL_CACHE_RETENTION_DAYS;
        retentionDaysByUser.set(userId, retentionDays);
      }

      const cutoff = Date.now() - retentionDays * MS_PER_DAY;

      const emailsSnap = await firestore
        .collection("emailMeta")
        .where("accountId", "==", accountDoc.id)
        .where("status", "==", "active")
        .where("localCacheStatus", "==", "cached")
        .get();

      let batch = firestore.batch();
      let pending = 0;
      for (const emailDoc of emailsSnap.docs) {
        const email = emailDoc.data();
        if (email.isPinned === true) continue;
        if ((email.receivedAt as number) > cutoff) continue;

        batch.update(emailDoc.ref, { localCacheStatus: "purged" });
        pending++;
        if (pending >= 400) {
          await batch.commit();
          batch = firestore.batch();
          pending = 0;
        }
      }
      if (pending > 0) {
        await batch.commit();
      }
    }
  },
);
