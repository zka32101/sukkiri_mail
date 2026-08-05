export type MailCategory = "promotion" | "notification" | "invoice" | "other";

const kAccountColorPalette = [
  "#3457C9",
  "#1F8A5F",
  "#C9344A",
  "#9A7B1F",
  "#7A3FC9",
  "#0F9AA6",
];

/**
 * 簡易カテゴリ自動判定。件名・送信者ドメインのキーワードで分類する。
 * 本番ではメール本文の機械学習分類に拡張可能な設計にしておく（MVPはルールベース）。
 */
export function categorizeMessage(subject: string, senderEmail: string): MailCategory {
  const s = subject.toLowerCase();
  const from = senderEmail.toLowerCase();

  if (/請求|invoice|receipt|領収書|お支払い/.test(s)) return "invoice";
  if (/no-?reply|notification|通知|お知らせ/.test(from) || /通知|お知らせ/.test(s)) {
    return "notification";
  }
  if (/セール|割引|off|sale|campaign|キャンペーン|メルマガ|newsletter/.test(s)) {
    return "promotion";
  }
  return "other";
}

/** アカウント登録時にパレットから重複回避で自動割当する。 */
export function pickNextAccountColor(existingColors: (string | undefined)[]): string {
  const used = new Set(existingColors.filter(Boolean));
  for (const c of kAccountColorPalette) {
    if (!used.has(c)) return c;
  }
  return kAccountColorPalette[existingColors.length % kAccountColorPalette.length];
}
