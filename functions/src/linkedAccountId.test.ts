/**
 * Unit tests for linkedAccountDocId function
 */

import { linkedAccountDocId } from './linkedAccountId';

describe('linkedAccountDocId', () => {
  describe('Basic Functionality', () => {
    it('should generate a valid SHA256 hash', () => {
      const result = linkedAccountDocId('user123', 'gmail', 'test@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate a 64-character hex string', () => {
      const result = linkedAccountDocId('user456', 'outlook', 'test@example.jp');
      expect(result.length).toBe(64);
    });

    it('should generate consistent IDs for same input', () => {
      const userId = 'user789';
      const provider = 'imap';
      const email = 'test@example.com';

      const id1 = linkedAccountDocId(userId, provider, email);
      const id2 = linkedAccountDocId(userId, provider, email);

      expect(id1).toBe(id2);
    });
  });

  describe('Deduplication - Case Insensitivity', () => {
    it('should treat uppercase and lowercase email addresses as same', () => {
      const userId = 'user123';
      const provider = 'gmail';

      const id1 = linkedAccountDocId(userId, provider, 'Test@Example.com');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.com');
      const id3 = linkedAccountDocId(userId, provider, 'TEST@EXAMPLE.COM');

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });

    it('should handle mixed case email addresses consistently', () => {
      const userId = 'user456';
      const provider = 'outlook';

      const id1 = linkedAccountDocId(userId, provider, 'John.Doe@Gmail.Com');
      const id2 = linkedAccountDocId(userId, provider, 'john.doe@gmail.com');

      expect(id1).toBe(id2);
    });

    it('should treat uppercase and lowercase provider as different', () => {
      const userId = 'user789';
      const email = 'test@example.com';

      const idGmail = linkedAccountDocId(userId, 'gmail', email);
      const idGMAIL = linkedAccountDocId(userId, 'GMAIL', email);

      expect(idGmail).not.toBe(idGMAIL);
    });

    it('should treat uppercase and lowercase userId as different', () => {
      const provider = 'gmail';
      const email = 'test@example.com';

      const idUser = linkedAccountDocId('User123', provider, email);
      const iduser = linkedAccountDocId('user123', provider, email);

      expect(idUser).not.toBe(iduser);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim leading whitespace from email', () => {
      const userId = 'user123';
      const provider = 'gmail';

      const id1 = linkedAccountDocId(userId, provider, '  test@example.com');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.com');

      expect(id1).toBe(id2);
    });

    it('should trim trailing whitespace from email', () => {
      const userId = 'user456';
      const provider = 'outlook';

      const id1 = linkedAccountDocId(userId, provider, 'test@example.com  ');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.com');

      expect(id1).toBe(id2);
    });

    it('should trim both leading and trailing whitespace', () => {
      const userId = 'user789';
      const provider = 'imap';

      const id1 = linkedAccountDocId(userId, provider, '  test@example.com  ');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.com');

      expect(id1).toBe(id2);
    });

    it('should handle tabs and newlines in email', () => {
      const userId = 'user123';
      const provider = 'gmail';

      const id1 = linkedAccountDocId(userId, provider, '\t\ntest@example.com\n\t');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.com');

      expect(id1).toBe(id2);
    });

    it('should not affect whitespace within email address', () => {
      const userId = 'user456';
      const provider = 'outlook';

      // Note: Whitespace inside email should NOT be trimmed by trim()
      const emailWithSpace = 'test user@example.com';
      const result = linkedAccountDocId(userId, provider, emailWithSpace);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Deterministic Hashing', () => {
    it('should produce different IDs for different emails', () => {
      const userId = 'user123';
      const provider = 'gmail';

      const id1 = linkedAccountDocId(userId, provider, 'test1@example.com');
      const id2 = linkedAccountDocId(userId, provider, 'test2@example.com');

      expect(id1).not.toBe(id2);
    });

    it('should produce different IDs for different providers', () => {
      const userId = 'user123';
      const email = 'test@example.com';

      const idGmail = linkedAccountDocId(userId, 'gmail', email);
      const idOutlook = linkedAccountDocId(userId, 'outlook', email);
      const idImap = linkedAccountDocId(userId, 'imap', email);

      expect(idGmail).not.toBe(idOutlook);
      expect(idOutlook).not.toBe(idImap);
      expect(idGmail).not.toBe(idImap);
    });

    it('should produce different IDs for different users', () => {
      const provider = 'gmail';
      const email = 'test@example.com';

      const idUser1 = linkedAccountDocId('user1', provider, email);
      const idUser2 = linkedAccountDocId('user2', provider, email);
      const idUser3 = linkedAccountDocId('user3', provider, email);

      expect(idUser1).not.toBe(idUser2);
      expect(idUser2).not.toBe(idUser3);
      expect(idUser1).not.toBe(idUser3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = linkedAccountDocId('', '', '');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(10000);
      const result = linkedAccountDocId(longUserId, 'gmail', 'test@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const result = linkedAccountDocId('user123', 'gmail', longEmail);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters in user ID', () => {
      const result = linkedAccountDocId('user!@#$%^&*()', 'gmail', 'test@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters in provider', () => {
      const result = linkedAccountDocId('user123', 'gmail-custom!', 'test@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle Unicode characters in email', () => {
      const result = linkedAccountDocId('user123', 'gmail', 'テスト@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle Unicode characters in user ID', () => {
      const result = linkedAccountDocId('ユーザー123', 'gmail', 'test@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle email with plus addressing', () => {
      const id1 = linkedAccountDocId('user123', 'gmail', 'test+label@example.com');
      const id2 = linkedAccountDocId('user123', 'gmail', 'test@example.com');

      // Plus addressing creates different emails, so different IDs
      expect(id1).not.toBe(id2);
    });

    it('should handle email with dots in local part', () => {
      const result = linkedAccountDocId('user123', 'gmail', 'test.user@example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle email with subdomain', () => {
      const result = linkedAccountDocId('user123', 'gmail', 'test@mail.example.com');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Deduplication Verification', () => {
    it('should enable safe deduplication via merge writes', () => {
      // Simulating how Firestore would use this:
      // .doc(linkedAccountDocId(...)).set(data, { merge: true })
      // Multiple calls with same data should result in same doc ID

      const userId = 'user123';
      const provider = 'gmail';
      const email = 'test@example.com';

      const docIds = [
        linkedAccountDocId(userId, provider, email),
        linkedAccountDocId(userId, provider, 'Test@Example.com'),
        linkedAccountDocId(userId, provider, '  test@example.com  '),
      ];

      // All should resolve to the same document
      expect(new Set(docIds).size).toBe(1);
    });

    it('should prevent duplicate accounts with different case', () => {
      const userId = 'user456';
      const provider = 'outlook';

      // User accidentally tries to connect with different case
      const accountId1 = linkedAccountDocId(userId, provider, 'user@EXAMPLE.COM');
      const accountId2 = linkedAccountDocId(userId, provider, 'user@example.com');

      // Should get same ID, preventing duplicate
      expect(accountId1).toBe(accountId2);
    });

    it('should prevent duplicate accounts with whitespace variation', () => {
      const userId = 'user789';
      const provider = 'imap';

      const accountId1 = linkedAccountDocId(userId, provider, '  user@example.com  ');
      const accountId2 = linkedAccountDocId(userId, provider, 'user@example.com');
      const accountId3 = linkedAccountDocId(userId, provider, '\tuser@example.com\t');

      // All variations should map to same ID
      expect(accountId1).toBe(accountId2);
      expect(accountId2).toBe(accountId3);
    });
  });

  describe('Security Considerations', () => {
    it('should not be reversible (hash property)', () => {
      const userId = 'user123';
      const provider = 'gmail';
      const email = 'test@example.com';

      const docId = linkedAccountDocId(userId, provider, email);

      // Hash should not contain original data
      expect(docId).not.toContain(userId);
      expect(docId).not.toContain(provider);
      expect(docId).not.toContain(email);
    });

    it('should produce avalanche effect (small change = big output change)', () => {
      const userId = 'user123';
      const provider = 'gmail';

      const id1 = linkedAccountDocId(userId, provider, 'test@example.com');
      const id2 = linkedAccountDocId(userId, provider, 'test@example.co');  // changed one char

      // IDs should be completely different
      const differentChars = [...id1].filter((c, i) => c !== id2[i]).length;
      expect(differentChars).toBeGreaterThan(30); // Most characters should differ
    });

    it('should be collision-resistant (different inputs)', () => {
      const testCases = [
        ['user1', 'gmail', 'test1@example.com'],
        ['user1', 'gmail', 'test2@example.com'],
        ['user1', 'outlook', 'test1@example.com'],
        ['user2', 'gmail', 'test1@example.com'],
        ['user1:gmail:test1@example.com', 'gmail', 'test1@example.com'],
      ];

      const ids = testCases.map(([uid, prov, email]) =>
        linkedAccountDocId(uid, prov, email)
      );

      // All should be unique
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
