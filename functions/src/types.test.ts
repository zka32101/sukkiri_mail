/**
 * Unit tests for type guard functions
 */

import {
  isConnectAccountRequest,
  isScanAccountRequest,
  isApplyArchiveRulesRequest,
  isRestoreEmailsRequest,
  isFetchMessageRequest,
  isDisconnectAccountRequest,
} from './types';

describe('Type Guard Functions', () => {
  describe('isConnectAccountRequest', () => {
    it('should accept valid ConnectAccountRequest', () => {
      const request = { provider: 'gmail', userId: 'user123' };
      expect(isConnectAccountRequest(request)).toBe(true);
    });

    it('should accept ConnectAccountRequest with extra fields', () => {
      const request = { provider: 'gmail', userId: 'user123', authCode: 'code123' };
      expect(isConnectAccountRequest(request)).toBe(true);
    });

    it('should reject missing provider', () => {
      const request = { userId: 'user123' };
      expect(isConnectAccountRequest(request)).toBe(false);
    });

    it('should reject missing userId', () => {
      const request = { provider: 'gmail' };
      expect(isConnectAccountRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isConnectAccountRequest(null)).toBe(false);
      expect(isConnectAccountRequest(undefined)).toBe(false);
      expect(isConnectAccountRequest('string')).toBe(false);
      expect(isConnectAccountRequest(123)).toBe(false);
      expect(isConnectAccountRequest([])).toBe(false);
    });

    it('should reject null object', () => {
      const request: any = null;
      expect(isConnectAccountRequest(request)).toBe(false);
    });
  });

  describe('isScanAccountRequest', () => {
    it('should accept valid ScanAccountRequest', () => {
      const request = { provider: 'gmail', accountId: 'account123' };
      expect(isScanAccountRequest(request)).toBe(true);
    });

    it('should reject missing provider', () => {
      const request = { accountId: 'account123' };
      expect(isScanAccountRequest(request)).toBe(false);
    });

    it('should reject missing accountId', () => {
      const request = { provider: 'gmail' };
      expect(isScanAccountRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isScanAccountRequest(null)).toBe(false);
      expect(isScanAccountRequest(undefined)).toBe(false);
      expect(isScanAccountRequest('string')).toBe(false);
      expect(isScanAccountRequest(123)).toBe(false);
    });

    it('should accept ScanAccountRequest with optional emailIds', () => {
      const request = { provider: 'gmail', accountId: 'account123', emailIds: ['id1', 'id2'] };
      expect(isScanAccountRequest(request)).toBe(true);
    });
  });

  describe('isApplyArchiveRulesRequest', () => {
    it('should accept valid ApplyArchiveRulesRequest', () => {
      const request = { provider: 'gmail', accountId: 'account123' };
      expect(isApplyArchiveRulesRequest(request)).toBe(true);
    });

    it('should accept with optional emailIds', () => {
      const request = { provider: 'gmail', accountId: 'account123', emailIds: ['id1', 'id2'] };
      expect(isApplyArchiveRulesRequest(request)).toBe(true);
    });

    it('should reject missing provider', () => {
      const request = { accountId: 'account123' };
      expect(isApplyArchiveRulesRequest(request)).toBe(false);
    });

    it('should reject missing accountId', () => {
      const request = { provider: 'gmail' };
      expect(isApplyArchiveRulesRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isApplyArchiveRulesRequest(null)).toBe(false);
      expect(isApplyArchiveRulesRequest(undefined)).toBe(false);
      expect(isApplyArchiveRulesRequest('string')).toBe(false);
      expect(isApplyArchiveRulesRequest(123)).toBe(false);
    });

    it('should accept empty emailIds array', () => {
      const request = { provider: 'gmail', accountId: 'account123', emailIds: [] };
      expect(isApplyArchiveRulesRequest(request)).toBe(true);
    });
  });

  describe('isRestoreEmailsRequest', () => {
    it('should accept valid RestoreEmailsRequest', () => {
      const request = { provider: 'gmail', accountId: 'account123' };
      expect(isRestoreEmailsRequest(request)).toBe(true);
    });

    it('should accept with optional emailIds', () => {
      const request = { provider: 'gmail', accountId: 'account123', emailIds: ['id1', 'id2'] };
      expect(isRestoreEmailsRequest(request)).toBe(true);
    });

    it('should reject missing provider', () => {
      const request = { accountId: 'account123' };
      expect(isRestoreEmailsRequest(request)).toBe(false);
    });

    it('should reject missing accountId', () => {
      const request = { provider: 'gmail' };
      expect(isRestoreEmailsRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isRestoreEmailsRequest(null)).toBe(false);
      expect(isRestoreEmailsRequest(undefined)).toBe(false);
      expect(isRestoreEmailsRequest('string')).toBe(false);
      expect(isRestoreEmailsRequest(123)).toBe(false);
    });

    it('should accept empty emailIds array', () => {
      const request = { provider: 'gmail', accountId: 'account123', emailIds: [] };
      expect(isRestoreEmailsRequest(request)).toBe(true);
    });
  });

  describe('isFetchMessageRequest', () => {
    it('should accept valid FetchMessageRequest', () => {
      const request = { provider: 'gmail', accountId: 'account123', messageId: 'msg456' };
      expect(isFetchMessageRequest(request)).toBe(true);
    });

    it('should reject missing provider', () => {
      const request = { accountId: 'account123', messageId: 'msg456' };
      expect(isFetchMessageRequest(request)).toBe(false);
    });

    it('should reject missing accountId', () => {
      const request = { provider: 'gmail', messageId: 'msg456' };
      expect(isFetchMessageRequest(request)).toBe(false);
    });

    it('should reject missing messageId', () => {
      const request = { provider: 'gmail', accountId: 'account123' };
      expect(isFetchMessageRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isFetchMessageRequest(null)).toBe(false);
      expect(isFetchMessageRequest(undefined)).toBe(false);
      expect(isFetchMessageRequest('string')).toBe(false);
      expect(isFetchMessageRequest(123)).toBe(false);
    });

    it('should reject with only two of three required fields', () => {
      expect(isFetchMessageRequest({ provider: 'gmail', accountId: 'account123' })).toBe(false);
      expect(isFetchMessageRequest({ provider: 'gmail', messageId: 'msg456' })).toBe(false);
      expect(isFetchMessageRequest({ accountId: 'account123', messageId: 'msg456' })).toBe(false);
    });
  });

  describe('isDisconnectAccountRequest', () => {
    it('should accept valid DisconnectAccountRequest', () => {
      const request = { accountId: 'account123' };
      expect(isDisconnectAccountRequest(request)).toBe(true);
    });

    it('should accept DisconnectAccountRequest with extra fields', () => {
      const request = { accountId: 'account123', provider: 'gmail' };
      expect(isDisconnectAccountRequest(request)).toBe(true);
    });

    it('should reject missing accountId', () => {
      const request = { provider: 'gmail' };
      expect(isDisconnectAccountRequest(request)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(isDisconnectAccountRequest(null)).toBe(false);
      expect(isDisconnectAccountRequest(undefined)).toBe(false);
      expect(isDisconnectAccountRequest('string')).toBe(false);
      expect(isDisconnectAccountRequest(123)).toBe(false);
    });

    it('should reject empty object', () => {
      const request = {};
      expect(isDisconnectAccountRequest(request)).toBe(false);
    });
  });

  describe('Type Guard Integration', () => {
    it('should correctly distinguish between similar request types', () => {
      const connectReq = { provider: 'gmail', userId: 'user123' };
      const scanReq = { provider: 'gmail', accountId: 'account123' };

      expect(isConnectAccountRequest(connectReq)).toBe(true);
      expect(isScanAccountRequest(connectReq)).toBe(false);

      expect(isConnectAccountRequest(scanReq)).toBe(false);
      expect(isScanAccountRequest(scanReq)).toBe(true);
    });

    it('should handle edge case with provider as accountId', () => {
      const ambiguous = { provider: 'gmail', accountId: 'gmail' };
      expect(isScanAccountRequest(ambiguous)).toBe(true);
      expect(isConnectAccountRequest(ambiguous)).toBe(false);
    });

    it('should validate narrow requirements for DisconnectAccountRequest', () => {
      const disconnect = { accountId: 'account123' };
      expect(isDisconnectAccountRequest(disconnect)).toBe(true);
      expect(isScanAccountRequest(disconnect)).toBe(false);
      expect(isFetchMessageRequest(disconnect)).toBe(false);
    });

    it('should handle untrusted client input safely', () => {
      const untrusted = {
        __proto__: { isAdmin: true },
        provider: 'gmail',
        userId: 'user123',
      };
      expect(isConnectAccountRequest(untrusted)).toBe(true);
    });

    it('should accept objects with null prototype', () => {
      const nullProto = Object.create(null) as Record<string, string>;
      nullProto.provider = 'gmail';
      nullProto.accountId = 'account123';
      expect(isScanAccountRequest(nullProto)).toBe(true);
    });
  });
});
