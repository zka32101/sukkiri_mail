import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./firestore";

/** 無料プランで連携できるメールアカウント数の上限。lib/views/account_link_view.dartの
 *  `_freePlanAccountLimit`（UX向けの事前チェック用）と同じ値に保つこと。 */
export const FREE_PLAN_ACCOUNT_LIMIT = 2;

/**
 * 無料プランのアカウント数上限を強制する。新規アカウント作成時
 * （＝各プロバイダのconnect()が新しいlinkedAccountsドキュメントを作ろうとしている時）
 * のみ呼び出す想定 — 既存アカウントの再接続（トークン更新等）はアカウント数を
 * 増やさないため対象外でよい。
 *
 * クライアント側の表示制限（account_link_view.dart）はUXのための事前チェックに
 * すぎず、Cloud Functionsを直接呼び出せば回避できてしまう。ここがサーバー側の
 * 真の防衛線になる。
 */
export async function assertCanAddAccount(
  uid: string,
  existingAccountCountForUser: number
): Promise<void> {
  if (existingAccountCountForUser < FREE_PLAN_ACCOUNT_LIMIT) return;

  const userDoc = await db().collection("users").doc(uid).get();
  const plan = (userDoc.data()?.plan as string | undefined) ?? "free";
  if (plan === "pro") return;

  throw new HttpsError(
    "resource-exhausted",
    `無料プランで連携できるメールアカウントは${FREE_PLAN_ACCOUNT_LIMIT}つまでです。Proにアップグレードすると無制限に連携できます。`
  );
}
