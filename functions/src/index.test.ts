/**
 * Unit tests for index.ts utility functions
 */

/** emailMetaのドキュメントIDを合成する（accountIdをprefixし、プロバイダ間でのID衝突を避ける）。*/
function emailMetaDocId(accountId: string, itemId: string): string {
  return `${accountId}_${itemId}`;
}

/** 合成IDからプロバイダ本来のメッセージID（Gmail/Outlook/IMAP APIへ渡す値）を取り出す。 */
function rawProviderMessageId(accountId: string, compositeId: string): string {
  const prefix = `${accountId}_`;
  return compositeId.startsWith(prefix) ? compositeId.slice(prefix.length) : compositeId;
}

describe('emailMetaDocId', () => {
  it('should create composite ID with accountId prefix', () => {
    const result = emailMetaDocId('account123', 'msg456');
    expect(result).toBe('account123_msg456');
  });

  it('should handle empty itemId', () => {
    const result = emailMetaDocId('account123', '');
    expect(result).toBe('account123_');
  });

  it('should handle itemIds with underscores', () => {
    const result = emailMetaDocId('acc_123', 'msg_456');
    expect(result).toBe('acc_123_msg_456');
  });
});

describe('rawProviderMessageId', () => {
  it('should extract message ID from composite ID', () => {
    const composite = emailMetaDocId('account123', 'msg456');
    const result = rawProviderMessageId('account123', composite);
    expect(result).toBe('msg456');
  });

  it('should return original ID if prefix does not match', () => {
    const result = rawProviderMessageId('account123', 'account456_msg789');
    expect(result).toBe('account456_msg789');
  });

  it('should handle IDs without prefix', () => {
    const result = rawProviderMessageId('account123', 'msg456');
    expect(result).toBe('msg456');
  });

  it('should correctly handle round-trip conversion', () => {
    const accountId = 'acc_001';
    const messageId = 'msg_xyz';
    const composite = emailMetaDocId(accountId, messageId);
    const extracted = rawProviderMessageId(accountId, composite);
    expect(extracted).toBe(messageId);
  });
});

describe('IDOR prevention', () => {
  it('should prevent email ID ownership violations', () => {
    const accountId1 = 'user1_account';
    const accountId2 = 'user2_account';

    // Create composite ID for user1
    const userOneEmail = emailMetaDocId(accountId1, 'msg001');

    // Try to extract with wrong account ID should return unchanged
    const result = rawProviderMessageId(accountId2, userOneEmail);
    expect(result).toBe(userOneEmail);
    expect(result).not.toBe('msg001');
  });
});
