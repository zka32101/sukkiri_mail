/**
 * Cloud Functions request parameter types for type safety
 */

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
