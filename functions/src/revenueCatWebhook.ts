import { onRequest } from "firebase-functions/v2/https";
import { db } from "./firestore";
import { getSecret } from "./secrets";

/**
 * サブスクリプション状態が「有効」であることを意味するRevenueCatイベント種別。
 * CANCELLATIONは「次回更新をしない」設定への変更であって即座の失効ではないため、
 * ここには含めない（含めるとユーザーが自動更新をオフにした瞬間にPro機能を
 * 失ってしまい、既に支払い済みの期間分の権利を不当に奪うことになる）。
 * 実際に権利が失効するのはEXPIRATIONイベントのみ。
 */
const PRO_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "TRANSFER",
]);
const FREE_EVENT_TYPES = new Set(["EXPIRATION"]);

interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
}

/**
 * RevenueCatのWebhookを受け取り、対応するFirebaseユーザーのplanをFirestoreへ反映する。
 * `users/{uid}.plan`はfirestore.rulesで「クライアントからは作成時のみ("free"固定)で
 * 変更不可、以降はCloud Functions（Admin SDK、ルールをバイパス）のみが変更できる」
 * よう既に制限されており、このWebhookがその「Cloud Functions側の変更経路」を担う。
 *
 * 【要確認】導入手順:
 * 1. Secret Managerに`revenuecat-webhook-secret`という名前で、任意のランダムな
 *    文字列（共有シークレット）を登録する。
 * 2. RevenueCatダッシュボード → Project settings → Integrations → Webhooks で
 *    このURLを登録し、「Authorization header value」に手順1と同じ文字列を設定する。
 * 3. クライアント（Flutter）側でPurchases SDKを初期化する際、`appUserID`に
 *    FirebaseのuidをそのままRevenueCatの`app_user_id`として渡すこと
 *    （lib/services/purchases_service.dart参照）。これによりWebhookのapp_user_idが
 *    そのままFirestoreのusersドキュメントIDとして使える。
 */
export const revenueCatWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("method not allowed");
    return;
  }

  const expectedSecret = await getSecret("revenuecat-webhook-secret").catch(
    () => null
  );
  if (!expectedSecret) {
    console.error("[RevenueCat webhook] revenuecat-webhook-secret is not configured");
    response.status(500).send("webhook not configured");
    return;
  }

  const authHeader = request.get("authorization") ?? "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (providedSecret !== expectedSecret) {
    console.warn("[RevenueCat webhook] rejected: invalid Authorization header");
    response.status(401).send("unauthorized");
    return;
  }

  const event: RevenueCatEvent | undefined = request.body?.event;
  const eventType = event?.type;
  // app_user_idは通常Firebaseのuidそのもの（クライアント側でPurchases.configure時に
  // appUserIDとして渡している前提）。TRANSFERイベントは複数のapp_user_idが絡む場合が
  // あるが、ここでは最も一般的な単純なケース（1対1の移行）のみ対応する。
  const uid = event?.app_user_id ?? event?.original_app_user_id;

  if (!eventType || !uid) {
    console.warn("[RevenueCat webhook] missing event.type or app_user_id", {
      eventType,
      hasUid: !!uid,
    });
    // RevenueCat側の再送ループを避けるため、形式不正でも200を返す
    // （エラー応答だとRevenueCatが同じイベントを再送し続ける）。
    response.status(200).send("ignored: missing type or app_user_id");
    return;
  }

  let newPlan: "pro" | "free" | null = null;
  if (PRO_EVENT_TYPES.has(eventType)) newPlan = "pro";
  else if (FREE_EVENT_TYPES.has(eventType)) newPlan = "free";

  if (!newPlan) {
    // BILLING_ISSUE等、planを変更する必要が無いイベントは無視する。
    response.status(200).send(`ignored: no plan change for ${eventType}`);
    return;
  }

  await db()
    .collection("users")
    .doc(uid)
    .set({ plan: newPlan }, { merge: true });

  console.log(`[RevenueCat webhook] uid=${uid} plan=${newPlan} (event=${eventType})`);
  response.status(200).send("ok");
});
