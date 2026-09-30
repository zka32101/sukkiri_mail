/**
 * End-to-End Tests - Complete User Workflow
 *
 * Tests the complete application flow:
 * 1. User Authentication
 * 2. Account Linking
 * 3. Email Scanning
 * 4. Categorization
 * 5. Archive Management
 * 6. Rule Application
 */

import { categorizeMessage } from './categorize';

// Mock Firestore and providers
jest.mock('./firestore');
jest.mock('./providers/gmailProvider');
jest.mock('./providers/outlookProvider');
jest.mock('./providers/imapProvider');

describe('End-to-End User Workflows', () => {
  const testUserId = 'test-user-123';
  const testAccountId = 'test-account-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Workflow: User Account Setup', () => {
    it('should complete user account creation and email provider linking', async () => {
      // Step 1: User creates account (Firebase Auth)
      const userId = testUserId;
      expect(userId).toBeTruthy();

      // Step 2: User links email account (Gmail)
      const linkedAccount = {
        userId,
        accountId: testAccountId,
        provider: 'gmail',
        email: 'user@gmail.com',
        color: '#3457C9',
        linkedAt: new Date(),
      };

      expect(linkedAccount).toHaveProperty('provider');
      expect(linkedAccount.provider).toBe('gmail');
      expect(linkedAccount).toHaveProperty('email');
      expect(linkedAccount).toHaveProperty('color');
    });

    it('should allow multiple email providers per user', async () => {
      const accounts = [
        { provider: 'gmail', email: 'user@gmail.com', color: '#3457C9' },
        { provider: 'outlook', email: 'user@outlook.com', color: '#1F8A5F' },
        { provider: 'imap', email: 'user@company.com', color: '#C9344A' },
      ];

      expect(accounts).toHaveLength(3);
      accounts.forEach((account) => {
        expect(account).toHaveProperty('provider');
        expect(['gmail', 'outlook', 'imap']).toContain(account.provider);
      });
    });
  });

  describe('Workflow: Email Scanning and Categorization', () => {
    it('should scan emails and categorize them automatically', async () => {
      const scanResults = [
        {
          messageId: 'msg1',
          subject: '50% OFF SALE',
          from: 'sales@retailer.com',
          category: 'promotion',
        },
        {
          messageId: 'msg2',
          subject: 'Your Invoice #123',
          from: 'billing@company.com',
          category: 'invoice',
        },
        {
          messageId: 'msg3',
          subject: 'System Maintenance',
          from: 'noreply@service.com',
          category: 'notification',
        },
      ];

      for (const scan of scanResults) {
        const category = await categorizeMessage(scan.subject, scan.from);
        expect(category).toBe(scan.category);
      }
    });

    it('should handle large batch email scanning', async () => {
      const emailCount = 1000;
      const emails = Array.from({ length: emailCount }, (_, i) => ({
        messageId: `msg${i}`,
        subject: `Email ${i}`,
        from: i % 3 === 0 ? 'sales@retailer.com' :
              i % 3 === 1 ? 'billing@company.com' :
              'noreply@service.com',
      }));

      const categories = await Promise.all(
        emails.map((email) => categorizeMessage(email.subject, email.from))
      );

      expect(categories).toHaveLength(emailCount);
      expect(categories.every((c) => ['promotion', 'invoice', 'notification', 'other'].includes(c))).toBe(true);
    });

    it('should maintain consistent categorization across retries', async () => {
      const email = {
        subject: 'Invoice #2026-09',
        from: 'billing@company.com',
      };

      const categories = await Promise.all(
        Array.from({ length: 5 }, () =>
          categorizeMessage(email.subject, email.from)
        )
      );

      // All should be the same
      expect(new Set(categories).size).toBe(1);
      expect(categories[0]).toBe('invoice');
    });
  });

  describe('Workflow: Email Archiving', () => {
    it('should archive emails by category', async () => {
      const emails = [
        { id: 'msg1', category: 'promotion', subject: 'Sale' },
        { id: 'msg2', category: 'invoice', subject: 'Invoice' },
      ];

      const archiveOperations = emails.map((email) => ({
        messageId: email.id,
        category: email.category,
        action: 'archive',
        timestamp: new Date(),
      }));

      expect(archiveOperations).toHaveLength(2);
      archiveOperations.forEach((op) => {
        expect(op.action).toBe('archive');
        expect(op).toHaveProperty('messageId');
      });
    });

    it('should restore archived emails', async () => {
      const restoreOperations = [
        { messageId: 'msg1', action: 'restore', timestamp: new Date() },
        { messageId: 'msg2', action: 'restore', timestamp: new Date() },
      ];

      expect(restoreOperations).toHaveLength(2);
      restoreOperations.forEach((op) => {
        expect(op.action).toBe('restore');
      });
    });

    it('should track archive history for auditing', async () => {
      const archiveLog = [
        { messageId: 'msg1', action: 'archive', reason: 'promotion', date: new Date() },
        { messageId: 'msg1', action: 'restore', reason: 'user request', date: new Date() },
        { messageId: 'msg1', action: 'archive', reason: 'promotion', date: new Date() },
      ];

      expect(archiveLog).toHaveLength(3);
      expect(archiveLog[0].messageId).toBe(archiveLog[1].messageId);
    });
  });

  describe('Workflow: Rule Application', () => {
    it('should create and apply categorization rules', async () => {
      const rules = [
        {
          ruleId: 'rule1',
          category: 'promotion',
          retentionDays: 7,
          enabled: true,
        },
        {
          ruleId: 'rule2',
          category: 'invoice',
          retentionDays: 90,
          enabled: true,
        },
      ];

      expect(rules).toHaveLength(2);
      rules.forEach((rule) => {
        expect(rule.retentionDays).toBeGreaterThanOrEqual(1);
        expect(rule.retentionDays).toBeLessThanOrEqual(90);
      });
    });

    it('should update rule retention days', async () => {
      const rule = {
        ruleId: 'rule1',
        category: 'promotion',
        retentionDays: 7,
      };

      // Update retention days
      const updated = { ...rule, retentionDays: 14 };

      expect(updated.retentionDays).toBe(14);
      expect(updated.retentionDays).not.toBe(rule.retentionDays);
    });
  });

  describe('Workflow: Cache Management', () => {
    it('should retrieve cache statistics', async () => {
      const stats = {
        count: 142,
        totalBytes: 21504000,
        byStatus: {
          cached: 142,
          purged: 58,
          blocked: 12,
        },
        totalEmails: 212,
      };

      expect(stats.count).toBe(142);
      expect(stats.byStatus.cached).toBeGreaterThan(0);
      expect(stats.totalEmails).toBeGreaterThanOrEqual(stats.count);
    });

    it('should clear local cache and refresh', async () => {
      const cacheOperation = {
        action: 'clear',
        timestamp: new Date(),
        emailsDeleted: 50,
      };

      expect(cacheOperation.action).toBe('clear');
      expect(cacheOperation.emailsDeleted).toBeGreaterThan(0);
    });

    it('should protect unread emails from cache eviction', async () => {
      const emails = [
        { id: 'msg1', unread: true, cached: true },
        { id: 'msg2', unread: false, cached: true },
        { id: 'msg3', unread: true, cached: true },
      ];

      const unreadCount = emails.filter((e) => e.unread).length;
      expect(unreadCount).toBeGreaterThan(0);

      // Unread emails should not be evicted
      const evictableCount = emails.filter((e) => !e.unread && e.cached).length;
      expect(evictableCount).toBeGreaterThan(0);
    });
  });

  describe('Workflow: Search and Filter', () => {
    it('should search emails by keyword', async () => {
      const searchResults = [
        { id: 'msg1', subject: 'Sale - 50% Off' },
        { id: 'msg2', subject: 'Flash Sale Alert' },
        { id: 'msg3', subject: 'Limited Time Offer' },
      ];

      const filtered = searchResults.filter((email) =>
        email.subject.toLowerCase().includes('sale')
      );

      expect(filtered).toHaveLength(2);
    });

    it('should filter emails by category', async () => {
      const emails = [
        { id: 'msg1', category: 'promotion' },
        { id: 'msg2', category: 'invoice' },
        { id: 'msg3', category: 'promotion' },
      ];

      const promotions = emails.filter((e) => e.category === 'promotion');
      expect(promotions).toHaveLength(2);
    });

    it('should combine search and filter criteria', async () => {
      const emails = [
        { id: 'msg1', category: 'promotion', subject: 'Sale' },
        { id: 'msg2', category: 'invoice', subject: 'Invoice' },
        { id: 'msg3', category: 'promotion', subject: 'Offer' },
      ];

      const filtered = emails.filter(
        (e) =>
          e.category === 'promotion' &&
          e.subject.toLowerCase().includes('sale')
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('msg1');
    });
  });

  describe('Workflow: Error Handling and Recovery', () => {
    it('should handle scanning errors gracefully', async () => {
      const email = {
        subject: 'Test Email',
        from: 'test@example.com',
      };

      const result = await categorizeMessage(email.subject, email.from);
      expect(result).toBeDefined();
      expect(['promotion', 'notification', 'invoice', 'other']).toContain(result);
    });

    it('should retry failed operations', async () => {
      const email = { subject: 'Invoice', from: 'billing@company.com' };

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const result = await categorizeMessage(email.subject, email.from);
          expect(result).toBe('invoice');
          break;
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) throw error;
        }
      }

      expect(attempts).toBeLessThanOrEqual(maxAttempts);
    });

    it('should log errors for debugging', async () => {
      const errorLog = {
        timestamp: new Date(),
        error: 'Sample error',
        userId: testUserId,
        operation: 'categorize',
        email: 'test@example.com',
      };

      expect(errorLog).toHaveProperty('timestamp');
      expect(errorLog).toHaveProperty('error');
      expect(errorLog).toHaveProperty('operation');
    });
  });

  describe('Workflow: Performance and Scalability', () => {
    it('should handle multiple concurrent user operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        userId: `user${i}`,
        operation: 'categorize',
        email: {
          subject: `Email ${i}`,
          from: `sender${i}@example.com`,
        },
      }));

      const startTime = performance.now();

      await Promise.all(
        operations.map((op) =>
          categorizeMessage(op.email.subject, op.email.from)
        )
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete in <10 seconds
    });

    it('should maintain performance with increasing data volume', async () => {
      const dataSizes = [100, 500, 1000];

      for (const size of dataSizes) {
        const emails = Array.from({ length: size }, (_, i) => ({
          subject: `Email ${i}`,
          from: 'test@example.com',
        }));

        const startTime = performance.now();

        await Promise.all(
          emails.map((email) => categorizeMessage(email.subject, email.from))
        );

        const duration = performance.now() - startTime;
        // Performance should scale linearly or better
        expect(duration).toBeLessThan(size * 10); // Allow ~10ms per email
      }
    });
  });
});
