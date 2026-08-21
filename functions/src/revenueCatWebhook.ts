import { timingSafeEqual } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { db } from "./firestore";
import { getSecret } from "./secrets";

/** lib/services/purchases_service.dartのkProEntitlementIdと同じ値に保つこと。 */
const PRO_ENTITLEMENT_ID = "pro";

/**
 * サブスクリプション状態が「有効」であることを意味するRevenueCatイベント種別。
 * CANCELLATIONは「次回更新をしない」設定への変更であって即座の失効ではないため、
 * ここには含めない（含めるとユーザーが自動更新をオフにした瞬間にPro機能を
 * 失ってしまい、既に支払い済みの期間分の権利を不当に奪うことになる）。
 * 実際に権利が失効するのはEXPIRATIONイベントのみ。
 * TRANSFERは単一のapp_user_idを持たない特殊な形式のため、別途分岐で処理する
 * （下記のtransferred_from/transferred_to分岐を参照）。
 */
const PRO_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
]);
const FREE_EVENT_TYPES = new Set(["EXPIRATION"]);

interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  // entitlement_ids はapi_version "1.0"のイベントに含まれる、このイベントが対象と
  // するEntitlement群。省略時（古いapi_versionを使っている場合等）はtypeのみで判定する。
  entitlement_ids?: string[];
  // TRANSFERイベントのみ、単一のapp_user_idの代わりにこれらが入る。
  transferred_from?: string[];
  transferred_to?: string[];
}

/** 秘密文字列の比較をタイミング攻撃に対して安全に行う。長さが異なる場合は
 *  即falseを返す（timingSafeEqualは長さ不一致だと例外を投げるため）。 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** このイベントが `pro` Entitlementに関するものかどうか。entitlement_idsが
 *  含まれていればそれで判定し、無ければ（古いapi_version等）type単独で
 *  判定していた従来の挙動にフォールバックする。 */
function isProEntitlementEvent(event: RevenueCatEvent): boolean {
  if (!event.entitlement_ids) return true;
  return event.entitlement_ids.includes(PRO_ENTITLEMENT_ID);
}

async function setPlan(uid: string, plan: "pro" | "free"): Promise<void> {
  await db().collection("users").doc(uid).set({ plan }, { merge: true });
  console.log(`[RevenueCat webhook] uid=${uid} plan=${plan}`);
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
  if (!safeEqual(providedSecret, expectedSecret)) {
    console.warn("[RevenueCat webhook] rejected: invalid Authorization header");
    response.status(401).send("unauthorized");
    return;
  }

  const event: RevenueCatEvent | undefined = request.body?.event;
  const eventType = event?.type;

  if (!eventType || !event) {
    console.warn("[RevenueCat webhook] missing event or event.type");
    // RevenueCat側の再送ループを避けるため、形式不正でも200を返す
    // （エラー応答だとRevenueCatが同じイベントを再送し続ける）。
    response.status(200).send("ignored: missing event or type");
    return;
  }

  // TRANSFERはapp_user_idを持たず、代わりにtransferred_from/transferred_toを持つ
  // 特殊な形式のため他のイベントとは別に処理する。移行先(transferred_to)には
  // proを付与する。移行元(transferred_from)は他の有効なEntitlementを保持している
  // 可能性を否定できないため、ここでは自動的にfreeへ降格しない
  // （本当に失効していれば、後続のEXPIRATIONイベントがfreeへ降格させる）。
  if (eventType === "TRANSFER") {
    if (!isProEntitlementEvent(event)) {
      response.status(200).send("ignored: TRANSFER not for pro entitlement");
      return;
    }
    const destinations = event.transferred_to ?? [];
    if (destinations.length === 0) {
      console.warn("[RevenueCat webhook] TRANSFER event missing transferred_to");
      response.status(200).send("ignored: TRANSFER missing transferred_to");
      return;
    }
    await Promise.all(destinations.map((uid) => setPlan(uid, "pro")));
    response.status(200).send("ok");
    return;
  }

  const uid = event.app_user_id ?? event.original_app_user_id;
  if (!uid) {
    console.warn("[RevenueCat webhook] missing app_user_id", { eventType });
    response.status(200).send("ignored: missing app_user_id");
    return;
  }

  let newPlan: "pro" | "free" | null = null;
  if (PRO_EVENT_TYPES.has(eventType) || FREE_EVENT_TYPES.has(eventType)) {
    // pro Entitlement以外（将来複数商品/Entitlementを扱うようになった場合）の
    // イベントでplanを誤って書き換えないよう、対象Entitlementを確認する。
    if (!isProEntitlementEvent(event)) {
      response.status(200).send(`ignored: ${eventType} not for pro entitlement`);
      return;
    }
    newPlan = PRO_EVENT_TYPES.has(eventType) ? "pro" : "free";
  }

  if (!newPlan) {
    // BILLING_ISSUE等、planを変更する必要が無いイベントは無視する。
    response.status(200).send(`ignored: no plan change for ${eventType}`);
    return;
  }

  await setPlan(uid, newPlan);
  response.status(200).send("ok");
});
