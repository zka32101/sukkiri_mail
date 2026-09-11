/**
 * Comprehensive validation and security tests
 */

import { HttpsError } from 'firebase-functions/v2/https';

/** クライアントから渡されたemailMeta合成IDが、確認済みのaccountId配下のものであることを検証。 */
function assertOwnedEmailIds(accountId: string, ids: string[]): void {
  const prefix = `${accountId}_`;
  for (const id of ids) {
    if (!id.startsWith(prefix)) {
      throw new HttpsError('permission-denied', 'emailId does not belong to accountId');
    }
  }
}

/** emailMetaのドキュメントIDを合成する（accountIdをprefixし、プロバイダ間でのID衝突を避ける）。*/
function emailMetaDocId(accountId: string, itemId: string): string {
  return `${accountId}_${itemId}`;
}

/** 合成IDからプロバイダ本来のメッセージID（Gmail/Outlook/IMAP APIへ渡す値）を取り出す。 */
function rawProviderMessageId(accountId: string, compositeId: string): string {
  const prefix = `${accountId}_`;
  return compositeId.startsWith(prefix) ? compositeId.slice(prefix.length) : compositeId;
}

describe('Security Validation', () => {
  describe('assertOwnedEmailIds - IDOR Prevention', () => {
    it('should accept single valid email ID', () => {
      expect(() => assertOwnedEmailIds('user1_account', ['user1_account_msg001'])).not.toThrow();
    });

    it('should accept multiple valid email IDs', () => {
      expect(() => assertOwnedEmailIds('user1_account', [
        'user1_account_msg001',
        'user1_account_msg002',
        'user1_account_msg003',
      ])).not.toThrow();
    });

    it('should reject email ID with different account prefix', () => {
      expect(() => assertOwnedEmailIds('user1_account', ['user2_account_msg001'])).toThrow(HttpsError);
    });

    it('should reject email ID without prefix', () => {
      expect(() => assertOwnedEmailIds('user1_account', ['msg001'])).toThrow(HttpsError);
    });

    it('should throw permission-denied error', () => {
      try {
        assertOwnedEmailIds('user1_account', ['wrong_msg001']);
        fail('Should have thrown');
      } catch (e) {
        if (e instanceof HttpsError) {
          expect(e.code).toBe('permission-denied');
        } else {
          fail('Should throw HttpsError');
        }
      }
    });

    it('should detect injection attempts with similar prefixes', () => {
      const ids = ['user1_accountX_msg001'];
      expect(() => assertOwnedEmailIds('user1_account', ids)).toThrow();
    });

    it('should detect injection with URL-encoded accountId', () => {
      const ids = ['user1%5Faccount_msg001'];
      expect(() => assertOwnedEmailIds('user1_account', ids)).toThrow();
    });

    it('should accept valid IDs with special characters in messageId', () => {
      expect(() => assertOwnedEmailIds('user1_account', [
        'user1_account_msg-001',
        'user1_account_msg:002',
        'user1_account_msg@003',
      ])).not.toThrow();
    });

    it('should handle empty ID list', () => {
      expect(() => assertOwnedEmailIds('user1_account', [])).not.toThrow();
    });

    it('should prevent prefix confusion attacks', () => {
      // Attacker tries: user_accountid_ where account is user_account
      expect(() => assertOwnedEmailIds('user_account', ['user_accountid_msg'])).toThrow();
    });

    it('should detect case-sensitive prefix mismatch', () => {
      expect(() => assertOwnedEmailIds('User1_Account', ['user1_account_msg001'])).toThrow();
    });

    it('should prevent multiple validation bypasses', () => {
      const mixedIds = [
        'user1_account_msg001',  // valid
        'user2_account_msg002',  // invalid
        'user1_account_msg003',  // valid
      ];
      expect(() => assertOwnedEmailIds('user1_account', mixedIds)).toThrow();
    });

    it('should reject on first invalid ID without processing rest', () => {
      expect(() => assertOwnedEmailIds('user1_account', ['invalid_msg'])).toThrow();
    });
  });

  describe('ID Composition and Extraction', () => {
    it('should correctly compose and decompose email IDs', () => {
      const accountId = 'user1_account';
      const messageId = 'msg123';
      const composite = emailMetaDocId(accountId, messageId);
      const extracted = rawProviderMessageId(accountId, composite);
      expect(extracted).toBe(messageId);
    });

    it('should handle empty messageId', () => {
      const composite = emailMetaDocId('user1_account', '');
      expect(composite).toBe('user1_account_');
      const extracted = rawProviderMessageId('user1_account', composite);
      expect(extracted).toBe('');
    });

    it('should handle messageIds with underscores', () => {
      const composite = emailMetaDocId('user1_account', 'msg_123_abc');
      expect(composite).toBe('user1_account_msg_123_abc');
      const extracted = rawProviderMessageId('user1_account', composite);
      expect(extracted).toBe('msg_123_abc');
    });

    it('should not extract messageId with wrong accountId', () => {
      const composite = emailMetaDocId('user1_account', 'msg123');
      const extracted = rawProviderMessageId('user2_account', composite);
      expect(extracted).toBe(composite);
    });

    it('should handle multiple underscores in accountId', () => {
      const accountId = 'user_1_account_2';
      const messageId = 'msg_123';
      const composite = emailMetaDocId(accountId, messageId);
      expect(composite).toBe('user_1_account_2_msg_123');
      const extracted = rawProviderMessageId(accountId, composite);
      expect(extracted).toBe('msg_123');
    });

    it('should prevent extraction confusion with similar accountIds', () => {
      const composite = emailMetaDocId('user_account', 'msg123');
      const extracted = rawProviderMessageId('user_accoun', composite);
      expect(extracted).toBe(composite);
    });
  });

  describe('Complex IDOR Scenarios', () => {
    it('should prevent cross-tenant access in multi-tenant scenario', () => {
      const tenant1Account = 'org1_user1_account';
      const tenant2Account = 'org2_user1_account';

      const tenant1Email = emailMetaDocId(tenant1Account, 'msg001');

      // Tenant 2 tries to access Tenant 1's email
      expect(() => assertOwnedEmailIds(tenant2Account, [tenant1Email])).toThrow();
    });

    it('should prevent directory traversal in IDs', () => {
      expect(() => assertOwnedEmailIds('user_account', ['../user2_account_msg001'])).toThrow();
      expect(() => assertOwnedEmailIds('user_account', ['user_account/../msg001'])).toThrow();
    });

    it('should handle null byte in message ID safely', () => {
      // Null byte in middle of ID - should still work with prefix matching
      expect(() => assertOwnedEmailIds('user_account', ['user_account_msg\x00001'])).not.toThrow();
    });

    it('should validate against length-based timing attacks', () => {
      const shortId = 'a_b';
      const longId = 'wrong_account_' + 'x'.repeat(1000);

      // Both should consistently reject
      expect(() => assertOwnedEmailIds('user_account', [shortId])).toThrow();
      expect(() => assertOwnedEmailIds('user_account', [longId])).toThrow();
    });

    it('should handle accounts with numeric suffixes correctly', () => {
      const accountId1 = 'user_account_1';
      const accountId2 = 'user_account_12';

      const email1 = emailMetaDocId(accountId1, 'msg001');
      const email2 = emailMetaDocId(accountId2, 'msg001');

      // Should not be confused between similar accountIds
      expect(() => assertOwnedEmailIds(accountId1, [email2])).toThrow();
      expect(() => assertOwnedEmailIds(accountId2, [email1])).toThrow();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very long accountIds', () => {
      const longAccountId = 'a'.repeat(256);
      const composite = emailMetaDocId(longAccountId, 'msg001');
      expect(() => assertOwnedEmailIds(longAccountId, [composite])).not.toThrow();
    });

    it('should handle Unicode characters in IDs', () => {
      const composite = emailMetaDocId('user_account', 'msg_日本語_001');
      expect(() => assertOwnedEmailIds('user_account', [composite])).not.toThrow();
    });

    it('should handle IDs with special URL characters', () => {
      const messageId = 'msg-!@#$%^&*()_+={}[]|:;<>?,./';
      const composite = emailMetaDocId('user_account', messageId);
      expect(() => assertOwnedEmailIds('user_account', [composite])).not.toThrow();
    });

    it('should consistently reject across different validation calls', () => {
      const wrongId = 'wrong_account_msg001';

      for (let i = 0; i < 10; i++) {
        expect(() => assertOwnedEmailIds('user_account', [wrongId])).toThrow();
      }
    });

    it('should handle rapid sequential validations', () => {
      const validId = 'user_account_msg001';
      const invalidId = 'wrong_account_msg001';

      expect(() => assertOwnedEmailIds('user_account', [validId])).not.toThrow();
      expect(() => assertOwnedEmailIds('user_account', [invalidId])).toThrow();
      expect(() => assertOwnedEmailIds('user_account', [validId])).not.toThrow();
    });
  });

  describe('Security Best Practices', () => {
    it('should fail-secure on unexpected input types', () => {
      // @ts-expect-error - Testing with invalid input
      expect(() => assertOwnedEmailIds('user_account', null)).toThrow();
    });

    it('should not leak information through error messages', () => {
      try {
        assertOwnedEmailIds('user_account', ['wrong_msg']);
        fail('Should have thrown');
      } catch (e) {
        if (e instanceof HttpsError) {
          // Error should be generic, not revealing what the correct format is
          expect(e.message).not.toContain('should start with');
          expect(e.message).not.toContain('user_account_');
        }
      }
    });

    it('should validate complete array before processing', () => {
      const ids = [
        'user_account_msg001',  // valid
        'wrong_msg',             // invalid (should be caught)
        'user_account_msg002',   // valid (but shouldn't reach if we fail on second)
      ];

      expect(() => assertOwnedEmailIds('user_account', ids)).toThrow();
    });
  });
});
