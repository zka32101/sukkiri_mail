/**
 * Push Sync Service
 *
 * Gmail Pub/Sub watch / Outlook Graph webhookサブスクリプションの登録・解除・更新、
 * および受信した通知から対象アカウントを解決する。
 * ポーリング（定期scan）ではなく、プロバイダ側からのプッシュ通知でスキャンを起動する。
 */

import * as crypto from "crypto";
import { db } from "../firestore";
import { getSecret } from "../secrets";
import { LinkedAccountDoc } from "../types";
import { GmailProvider } from "../providers/gmailProvider";
import { OutlookProvider } from "../providers/outlookProvider";

const gmailProvider = new GmailProvider();
const outlookProvider = new OutlookProvider();

export interface PushSyncEnableResult {
  expiresAt: number;
}

export interface PushSyncRenewalSummary {
  renewed: number;
  failed: number;
}

export interface ResolvedPushAccount {
  accountId: string;
  userId: string;
  clientState?: string;
}

function outlookNotificationUrl(): string {
  const projectId = process.env.GCLOUD_PROJECT || "sukkiri-mail-prod";
  const location = "asia-northeast1";
  return `https://${location}-${projectId}.cloudfunctions.net/outlookPushNotification`;
}

/**
 * プッシュ同期を有効化する。
 * Gmail: Pub/Sub watchを登録（要事前設定: Secret Manager `gmail-pubsub-topic`）。
 * Outlook: Graph webhookサブスクリプションを作成。
 */
export async function enablePushSyncForAccount(
  accountId: string,
  provider: string
): Promise<PushSyncEnableResult> {
  const ref = db().collection("linkedAccounts").doc(accountId);

  if (provider === "gmail") {
    const topicName = await getSecret("gmail-pubsub-topic");
    const { historyId, expiration } = await gmailProvider.watch(accountId, topicName);
    await ref.update({
      pushSyncEnabled: true,
      gmailHistoryId: historyId,
      gmailWatchExpiration: expiration,
    });
    return { expiresAt: expiration };
  }

  if (provider === "outlook") {
    const clientState = crypto.randomBytes(24).toString("hex");
    const { subscriptionId, expiresAt } = await outlookProvider.createSubscription(
      accountId,
      outlookNotificationUrl(),
      clientState
    );
    await ref.update({
      pushSyncEnabled: true,
      outlookSubscriptionId: subscriptionId,
      outlookSubscriptionExpiresAt: expiresAt,
      outlookClientState: clientState,
    });
    return { expiresAt };
  }

  throw new Error(`Push sync is not supported for provider: ${provider}`);
}

/**
 * プッシュ同期を無効化する。プロバイダ側の解除に失敗してもFirestore側の状態は
 * 必ずクリアする（無効な購読を「有効」のまま残さないため）。
 */
export async function disablePushSyncForAccount(accountId: string, provider: string): Promise<void> {
  const ref = db().collection("linkedAccounts").doc(accountId);
  const doc = await ref.get();
  const data = doc.data() as LinkedAccountDoc | undefined;

  try {
    if (provider === "gmail") {
      await gmailProvider.stopWatch(accountId);
    } else if (provider === "outlook" && data?.outlookSubscriptionId) {
      await outlookProvider.deleteSubscription(accountId, data.outlookSubscriptionId);
    }
  } catch (error) {
    console.warn(`[pushSyncService] Failed to unregister push sync for ${accountId}:`, error);
  }

  await ref.update({
    pushSyncEnabled: false,
    gmailHistoryId: null,
    gmailWatchExpiration: null,
    outlookSubscriptionId: null,
    outlookSubscriptionExpiresAt: null,
    outlookClientState: null,
  });
}

/**
 * 期限が近いプッシュ同期を一括更新する。Cloud Schedulerから定期実行される想定。
 */
export async function renewExpiringPushSync(
  thresholdMs: number = 24 * 60 * 60 * 1000
): Promise<PushSyncRenewalSummary> {
  const now = Date.now();
  const snapshot = await db().collection("linkedAccounts").where("pushSyncEnabled", "==", true).get();

  let renewed = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as LinkedAccountDoc;
    const expiresAt =
      data.provider === "gmail" ? data.gmailWatchExpiration : data.outlookSubscriptionExpiresAt;

    if (!expiresAt || expiresAt - now > thresholdMs) continue;

    try {
      if (data.provider === "gmail") {
        await enablePushSyncForAccount(doc.id, "gmail");
      } else if (data.provider === "outlook" && data.outlookSubscriptionId) {
        const { expiresAt: newExpiresAt } = await outlookProvider.renewSubscription(
          doc.id,
          data.outlookSubscriptionId
        );
        await doc.ref.update({ outlookSubscriptionExpiresAt: newExpiresAt });
      }
      renewed++;
    } catch (error) {
      failed++;
      console.error(`[pushSyncService] Failed to renew push sync for ${doc.id}:`, error);
    }
  }

  return { renewed, failed };
}

/** Gmail Pub/Sub通知のemailAddressから、対象アカウントを解決する。 */
export async function findAccountByEmail(
  provider: "gmail" | "outlook",
  emailAddress: string
): Promise<ResolvedPushAccount | null> {
  const snapshot = await db()
    .collection("linkedAccounts")
    .where("provider", "==", provider)
    .where("emailAddress", "==", emailAddress)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data() as LinkedAccountDoc;
  return { accountId: doc.id, userId: data.userId };
}

/** Outlook webhook通知のsubscriptionIdから、対象アカウントを解決する。 */
export async function findAccountBySubscriptionId(subscriptionId: string): Promise<ResolvedPushAccount | null> {
  const snapshot = await db()
    .collection("linkedAccounts")
    .where("outlookSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data() as LinkedAccountDoc;
  return { accountId: doc.id, userId: data.userId, clientState: data.outlookClientState };
}
