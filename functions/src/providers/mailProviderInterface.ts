/**
 * Gmail/Outlook/IMAP共通インターフェース。
 * OAuthトークン・IMAPアプリパスワードはこの層の実装内でのみ扱い、
 * クライアントには一切渡さない（Secret Managerに保管する設計）。
 * 恒久削除は実装しない（アーカイブ/ラベル変更のみ）。
 */

export interface ScanResultItem {
  id: string;
  accountId: string;
  category: "promotion" | "notification" | "invoice" | "other";
  receivedAt: number;
  hasAttachment: boolean;
  snippet: string;
  subject: string;
  senderEmail: string;
  // 未読メールは自動キャッシュ削除の対象外にするための判定に使う（LocalCacheServiceの最重要ガード）。
  isUnread: boolean;
}

export interface ConnectedAccountResult {
  id: string;
  userId: string;
  provider: "gmail" | "outlook" | "imap";
  authMethod: "oauth" | "app_password";
  emailAddress: string;
  oauthStatus?: string;
  imapHost?: string;
  colorHex: string;
}

export interface MessageBodyResult {
  html: string;
  attachmentNames: string[];
}

export interface MailProviderAdapter {
  connect(userId: string, params: Record<string, unknown>): Promise<ConnectedAccountResult>;
  scan(accountId: string): Promise<ScanResultItem[]>;
  archive(accountId: string, emailIds: string[]): Promise<void>;
  restore(accountId: string, emailIds: string[]): Promise<void>;
  fetchMessageBody(accountId: string, messageId: string): Promise<MessageBodyResult>;
}
