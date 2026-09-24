/**
 * Notification Service
 *
 * FCM (Firebase Cloud Messaging) を使ったプッシュ通知。
 * - デバイストークンの登録・解除（複数端末対応）
 * - スキャン完了/失敗通知
 * - 無効化されたトークンの自動クリーンアップ
 */

import * as admin from "firebase-admin";
import { db } from "../firestore";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * FCMトークンを登録する（同一トークンは上書き、複数端末は別ドキュメントとして共存）。
 */
export async function registerFcmTokenForUser(
  userId: string,
  token: string,
  platform: "ios" | "android" | "web" = "android"
): Promise<void> {
  await db()
    .collection("users")
    .doc(userId)
    .collection("fcmTokens")
    .doc(token)
    .set(
      {
        token,
        platform,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
}

/**
 * FCMトークンを解除する（ログアウト時等）。
 */
export async function unregisterFcmTokenForUser(userId: string, token: string): Promise<void> {
  await db().collection("users").doc(userId).collection("fcmTokens").doc(token).delete();
}

/**
 * ユーザーの全登録端末にプッシュ通知を送信する。
 * 無効化されたトークン（unregistered/invalid-argument）はFirestoreから削除する。
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  const tokensSnapshot = await db().collection("users").doc(userId).collection("fcmTokens").get();

  if (tokensSnapshot.empty) {
    return { successCount: 0, failureCount: 0 };
  }

  const tokens = tokensSnapshot.docs.map((doc) => doc.id);

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    ...(payload.data ? { data: payload.data } : {}),
  });

  // 無効化された（アンインストール済み等の）トークンを掃除する。
  const staleTokens: string[] = [];
  response.responses.forEach((result, i) => {
    if (
      !result.success &&
      (result.error?.code === "messaging/registration-token-not-registered" ||
        result.error?.code === "messaging/invalid-argument")
    ) {
      staleTokens.push(tokens[i]);
    }
  });

  if (staleTokens.length > 0) {
    const batch = db().batch();
    for (const token of staleTokens) {
      batch.delete(db().collection("users").doc(userId).collection("fcmTokens").doc(token));
    }
    await batch.commit();
  }

  return { successCount: response.successCount, failureCount: response.failureCount };
}

/** スキャン完了通知（検出件数を含む）。 */
export async function notifyScanCompleted(userId: string, itemCount: number): Promise<void> {
  try {
    await sendPushNotification(userId, {
      title: "メールの整理が完了しました",
      body:
        itemCount > 0
          ? `${itemCount}件のメールを分類しました。アプリで確認しましょう。`
          : "新しく分類対象のメールはありませんでした。",
      data: { type: "scan_completed", itemCount: String(itemCount) },
    });
  } catch (error) {
    console.error(`[notificationService] Failed to send scan-completed notification to ${userId}:`, error);
  }
}

/** スキャン失敗通知。 */
export async function notifyScanFailed(userId: string, accountId: string): Promise<void> {
  try {
    await sendPushNotification(userId, {
      title: "メールのスキャンに失敗しました",
      body: "アカウントの再連携が必要な場合があります。アプリでご確認ください。",
      data: { type: "scan_failed", accountId },
    });
  } catch (error) {
    console.error(`[notificationService] Failed to send scan-failed notification to ${userId}:`, error);
  }
}
