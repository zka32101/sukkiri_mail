/**
 * Unit tests for assertOwnedEmailIds security validation
 */

import { HttpsError } from 'firebase-functions/v2/https';

/** クライアントから渡されたemailMeta合成IDが、確認済みのaccountId配下のものであることを検証する。
 *  assertAccountOwnership()でaccountId自体の所有権は確認済みだが、emailIds自体はクライアント入力
 *  であり、他ユーザーのaccountIdをprefixに持つIDを紛れ込ませて他ユーザーのemailMetaドキュメントを
 *  書き換えられる余地がないよう、常にこの関数で明示的に検証してから使う（IDOR対策の多層防御）。 */
function assertOwnedEmailIds(accountId: string, ids: string[]): void {
  const prefix = `${accountId}_`;
  for (const id of ids) {
    if (!id.startsWith(prefix)) {
      throw new HttpsError('permission-denied', 'emailId does not belong to accountId');
    }
  }
}

describe('assertOwnedEmailIds', () => {
  const accountId = 'user1_account_123';

  it('should accept valid owned email IDs', () => {
    const ids = [
      `${accountId}_msg001`,
      `${accountId}_msg002`,
      `${accountId}_msg003`,
    ];
    expect(() => assertOwnedEmailIds(accountId, ids)).not.toThrow();
  });

  it('should accept empty array', () => {
    expect(() => assertOwnedEmailIds(accountId, [])).not.toThrow();
  });

  it('should reject email ID with wrong accountId prefix', () => {
    const wrongAccountId = 'user2_account_456';
    const ids = [`${wrongAccountId}_msg001`];
    expect(() => assertOwnedEmailIds(accountId, ids)).toThrow(HttpsError);
  });

  it('should reject email ID without any prefix', () => {
    const ids = ['msg001'];
    expect(() => assertOwnedEmailIds(accountId, ids)).toThrow(HttpsError);
  });

  it('should reject mixed valid and invalid IDs', () => {
    const ids = [
      `${accountId}_msg001`,
      'other_account_msg002',
      `${accountId}_msg003`,
    ];
    expect(() => assertOwnedEmailIds(accountId, ids)).toThrow(HttpsError);
  });

  it('should reject email ID that looks similar but different', () => {
    const similarId = `${accountId}x_msg001`; // Extra character
    const ids = [similarId];
    expect(() => assertOwnedEmailIds(accountId, ids)).toThrow(HttpsError);
  });

  it('should provide permission-denied error code', () => {
    const ids = ['wrong_prefix_msg001'];
    try {
      assertOwnedEmailIds(accountId, ids);
      fail('Should have thrown error');
    } catch (error) {
      if (error instanceof HttpsError) {
        expect(error.code).toBe('permission-denied');
      } else {
        fail('Should throw HttpsError');
      }
    }
  });

  it('should detect IDOR attempt with another user account ID', () => {
    const attacker_account = 'attacker_acct_999';
    const victim_email = `${accountId}_sensitive_msg`;

    // Attacker tries to access victim's email with their own account ID
    const ids = [victim_email];
    expect(() => assertOwnedEmailIds(attacker_account, ids)).toThrow(HttpsError);
  });
});
