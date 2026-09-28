import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "./db";
import { MailProviderAdapter, ScanResultItem } from "./providers/mailProviderInterface";
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

/**
 * スキャン結果をemailMetaへ保存する共通ロジック。scanAccount（連携直後の手動1回）と
 * rescanAllAccounts（毎日の自動再スキャン）の両方から呼ばれる。
 * 既存ドキュメントはmerge:trueで上書きするため、isPinned/localCacheStatus等
 * ユーザーが既に変更した状態は保持される（ただしsubject/senderEmail等の
 * メタデータは毎回最新化され、旧スキャン分の欠損も自動で埋まる）。
 */
async function persistScanResults(
  uid: string,
  accountId: string,
  items: ScanResultItem[],
): Promise<void> {
  if (items.length === 0) return;
  const firestore = db();
  const refs = items.map((item) => firestore.collection("emailMeta").doc(item.id));
  const existingDocs = await firestore.getAll(...refs);
  const existingIds = new Set(
    existingDocs.filter((d) => d.exists).map((d) => d.id),
  );

  const blockRulesSnap = await firestore
    .collection("senderBlockRules")
    .where("userId", "==", uid)
    .get();
  const blockRules = blockRulesSnap.docs.map((d) => d.data());
  const isBlocked = (senderEmail: string): boolean => {
    const lower = senderEmail.toLowerCase();
    return blockRules.some((rule) => {
      if (rule.accountId && rule.accountId !== accountId) return false;
      const pattern = String(rule.pattern ?? "").toLowerCase();
      if (!pattern) return false;
      if (rule.matchType === "domain") {
        const domain = pattern.startsWith("@") ? pattern : `@${pattern}`;
        return lower.endsWith(domain);
      }
      return lower === pattern;
    });
  };

  const batch = firestore.batch();
  for (const item of items) {
    const ref = firestore.collection("emailMeta").doc(item.id);
    const base = {
      accountId: item.accountId,
      userId: uid,
      category: item.category,
      receivedAt: item.receivedAt,
      hasAttachment: item.hasAttachment,
      snippet: item.snippet,
      subject: item.subject,
      senderEmail: item.senderEmail,
      status: "active",
    };
    if (existingIds.has(item.id)) {
      batch.set(ref, base, { merge: true });
    } else {
      batch.set(ref, {
        ...base,
        localCacheStatus: isBlocked(item.senderEmail) ? "blocked" : "cached",
        isPinned: false,
      });
    }
  }
  await batch.commit();

  await firestore.collection("linkedAccounts").doc(accountId).update({
    lastScanAt: Date.now(),
  });
}

/**
 * アカウントの過去30日分のメールを取得し、emailMeta（アプリのメール一覧が
 * 読む場所）へ保存する。連携直後に自動で1回呼ばれる想定（ユーザー操作は不要）。
 */
export const scanAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  const items = await adapter.scan(accountId);
  await persistScanResults(uid, accountId, items);
  return { items, savedCount: items.length };
});

/**
 * 全連携アカウントを毎日自動で再スキャンする。目的は2つ：
 * ①新着メールを継続的に取り込む（連携直後の1回だけでは新しいメールが増えないため）
 * ②スキャン仕様変更（件名/差出人の保存追加など）を、既にスキャン済みの過去メールにも
 *   merge:trueの上書きで反映させる（再連携なしで欠損データを自動補完）。
 */
export const rescanAllAccounts = onSchedule(
  { schedule: "every 24 hours", timeZone: "Asia/Tokyo" },
  async () => {
    const firestore = db();
    const accountsSnap = await firestore.collection("linkedAccounts").get();

    for (const accountDoc of accountsSnap.docs) {
      const account = accountDoc.data();
      const userId = account.userId as string | undefined;
      const providerKey = account.provider as string | undefined;
      if (!userId || !providerKey) continue;

      try {
        const adapter = resolveProvider(providerKey);
        const items = await adapter.scan(accountDoc.id);
        await persistScanResults(userId, accountDoc.id, items);
      } catch (e) {
        console.error(`rescanAllAccounts failed for account ${accountDoc.id}`, e);
      }
    }
  },
);

/** 検出結果のうち選択されたメールをアーカイブする（サーバー側、可逆）。 */
export const applyArchiveRules = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in required");
  const { provider, accountId, emailIds } = request.data ?? {};
  await assertAccountOwnership(accountId, uid);

  const adapter = resolveProvider(provider);
  await adapter.archive(accountId, emailIds ?? []);

  await db().collection("archiveLogs").add({
    userId: uid,
    archivedAt: Date.now(),
    emailCount: (emailIds ?? []).length,
    category: "other",
    restoredAt: null,
  });
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
  const doc = await db().collection("linkedAccounts").doc(accountId).get();
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
