/**
 * Cloud Functions request parameter types for type safety
 */

// ============================================================================
// Firestore Document Types
// ============================================================================

/** LinkedAccount document in Firestore */
export interface LinkedAccountDoc {
  userId: string;
  provider: "gmail" | "outlook" | "imap";
  authMethod: "oauth" | "app_password";
  emailAddress: string;
  // OAuth fields
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  // IMAP fields
  imapHost?: string;
  imapUsername?: string;
  appPassword?: string;
  colorHex: string;
  lastScanAt?: number;
  createdAt?: number;
  updatedAt?: number;
  // Push sync fields (Gmail Pub/Sub watch / Outlook Graph webhook subscription)
  pushSyncEnabled?: boolean;
  gmailHistoryId?: string;
  gmailWatchExpiration?: number;
  outlookSubscriptionId?: string;
  outlookSubscriptionExpiresAt?: number;
  outlookClientState?: string;
}

/** EmailMeta document in Firestore */
export interface EmailMetaDoc {
  userId: string;
  accountId: string;
  category: "promotion" | "notification" | "invoice" | "other";
  receivedAt: number;
  hasAttachment: boolean;
  snippet: string;
  subject: string;
  senderEmail: string;
  isUnread: boolean;
  status?: "active" | "archived";
  isPinned?: boolean;
  localCacheStatus?: "cached" | "uncached";
  createdAt?: number;
  updatedAt?: number;
}

/** ArchiveLog document in Firestore */
export interface ArchiveLogDoc {
  userId: string;
  archivedAt: number;
  emailCount: number;
  category: string;
  restoredAt: number | null;
  createdAt?: number;
}

// ============================================================================
// Cloud Functions Request Types
// ============================================================================

/** connectAccount function request parameters */
export interface ConnectAccountRequest {
  provider: string;
  userId: string;
  [key: string]: unknown;
}

/** scanAccount function request parameters */
export interface ScanAccountRequest {
  provider: string;
  accountId: string;
}

/** applyArchiveRules function request parameters */
export interface ApplyArchiveRulesRequest {
  provider: string;
  accountId: string;
  emailIds?: string[];
}

/** restoreEmails function request parameters */
export interface RestoreEmailsRequest {
  provider: string;
  accountId: string;
  emailIds?: string[];
}

/** fetchMessage function request parameters */
export interface FetchMessageRequest {
  provider: string;
  accountId: string;
  messageId: string;
}

/** disconnectAccount function request parameters */
export interface DisconnectAccountRequest {
  accountId: string;
}

/** updateCategoryRule function request parameters */
export interface UpdateCategoryRuleRequest {
  ruleId: string;
  retentionDays: number;
}

/** getCacheStats function request parameters (no params needed) */
export interface GetCacheStatsRequest {
  // No parameters needed - returns user's cache stats
}

/** enablePushSync / disablePushSync function request parameters */
export interface PushSyncRequest {
  provider: string;
  accountId: string;
}

/** registerFcmToken / unregisterFcmToken function request parameters */
export interface FcmTokenRequest {
  token: string;
  platform?: "ios" | "android" | "web";
}

/** Type guard to validate ConnectAccountRequest */
export function isConnectAccountRequest(data: unknown): data is ConnectAccountRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "userId" in data
  );
}

/** Type guard to validate ScanAccountRequest */
export function isScanAccountRequest(data: unknown): data is ScanAccountRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "accountId" in data
  );
}

/** Type guard to validate ApplyArchiveRulesRequest */
export function isApplyArchiveRulesRequest(data: unknown): data is ApplyArchiveRulesRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "accountId" in data
  );
}

/** Type guard to validate RestoreEmailsRequest */
export function isRestoreEmailsRequest(data: unknown): data is RestoreEmailsRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "accountId" in data
  );
}

/** Type guard to validate FetchMessageRequest */
export function isFetchMessageRequest(data: unknown): data is FetchMessageRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "accountId" in data &&
    "messageId" in data
  );
}

/** Type guard to validate DisconnectAccountRequest */
export function isDisconnectAccountRequest(data: unknown): data is DisconnectAccountRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "accountId" in data
  );
}

/** Type guard to validate UpdateCategoryRuleRequest */
export function isUpdateCategoryRuleRequest(data: unknown): data is UpdateCategoryRuleRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "ruleId" in data &&
    "retentionDays" in data &&
    typeof (data as UpdateCategoryRuleRequest).retentionDays === "number"
  );
}

/** Type guard to validate GetCacheStatsRequest */
export function isGetCacheStatsRequest(data: unknown): data is GetCacheStatsRequest {
  // No validation needed - GetCacheStatsRequest has no fields
  return typeof data === "object";
}

/** Type guard to validate PushSyncRequest */
export function isPushSyncRequest(data: unknown): data is PushSyncRequest {
  return (
    typeof data === "object" &&
    data !== null &&
    "provider" in data &&
    "accountId" in data
  );
}

/** Type guard to validate FcmTokenRequest */
export function isFcmTokenRequest(data: unknown): data is FcmTokenRequest {
  return typeof data === "object" && data !== null && "token" in data;
}

// ============================================================================
// External API Response Types
// ============================================================================

/** Microsoft Graph OAuth Token Response */
export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/** Microsoft Graph User Profile */
export interface MicrosoftUserProfile {
  id: string;
  userPrincipalName: string;
  mail?: string;
  displayName?: string;
}

/** Microsoft Graph Message */
export interface MicrosoftGraphMessage {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      address: string;
      name?: string;
    };
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  bodyPreview: string;
  isRead: boolean;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
  attachments?: MicrosoftGraphAttachment[];
}

/** Microsoft Graph Attachment */
export interface MicrosoftGraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

/** RevenueCat Webhook Event */
export interface RevenueCatEventData {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlement_ids?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
}

/** Gmail OAuth Token Response */
export interface GmailTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

/** Gmail Profile */
export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/** Gmail Message */
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload?: {
    partId: string;
    mimeType: string;
    filename: string;
    headers?: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      size: number;
      data?: string;
    };
    parts?: unknown[];
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

/** IMAP Mail Message */
export interface ImapMailMessage {
  seq: number;
  uid: number;
  flags: string[];
  headers: Record<string, string | string[]>;
  source: Buffer;
  text?: string;
  html?: string;
}
