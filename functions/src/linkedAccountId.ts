import { createHash } from "crypto";

/**
 * userId + provider + emailAddress（大文字小文字を無視）から決定的な
 * linkedAccountsドキュメントIDを生成する。
 *
 * 同じ組み合わせは常に同じドキュメントIDに解決されるため、
 * `.doc(id).set(data, { merge: true })` だけで「既存なら更新・無ければ新規作成」の
 * 重複連携防止(dedup)が、読み取り→判定→書き込みという非アトミックな手順を経ずに実現できる
 * （Firestoreの単一ドキュメントへの書き込みはアトミックなため、同時に複数の接続リクエストが
 * 来ても重複ドキュメントは作られない）。emailAddressを小文字化して比較することで、
 * 大文字小文字だけが異なる同一アドレスの二重登録も防ぐ。
 */
export function linkedAccountDocId(
  userId: string,
  provider: string,
  emailAddress: string
): string {
  const key = `${userId}:${provider}:${emailAddress.trim().toLowerCase()}`;
  return createHash("sha256").update(key).digest("hex");
}
