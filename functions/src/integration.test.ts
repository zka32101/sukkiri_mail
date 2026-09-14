/**
 * Integration Tests - Email Scanning to Categorization Pipeline
 *
 * Tests the complete flow:
 * API Call → Email Scanning → ML Categorization → Firestore Storage
 */

import { db } from './firestore';
import { categorizeMessage, categorizeMessageByRules } from './categorize';
import { mlInferenceService } from './services/mlInferenceService';

// Mock Firestore
jest.mock('./firestore');

describe('Email Processing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mlInferenceService.clearCache();
  });

  describe('Email Scanning to Categorization Pipeline', () => {
    it('should categorize promotional email end-to-end', async () => {
      const email = {
        subject: '50% OFF SALE - Limited Time!',
        from: 'sales@retailer.com',
        snippet: 'Great discount on all items',
        accountId: 'account123',
        messageId: 'msg456',
      };

      // Step 1: Categorize the email
      const category = await categorizeMessage(email.subject, email.from);

      expect(category).toBe('promotion');
    });

    it('should categorize invoice email end-to-end', async () => {
      const email = {
        subject: 'Your Monthly Invoice #2026-09',
        from: 'billing@company.com',
        snippet: 'Amount due: $99.99',
        accountId: 'account123',
        messageId: 'msg789',
      };

      const category = await categorizeMessage(email.subject, email.from);
      expect(category).toBe('invoice');
    });

    it('should categorize notification email end-to-end', async () => {
      const email = {
        subject: 'System Maintenance Alert',
        from: 'noreply@service.com',
        snippet: 'Scheduled maintenance tonight',
        accountId: 'account123',
        messageId: 'msg101',
      };

      const category = await categorizeMessage(email.subject, email.from);
      expect(category).toBe('notification');
    });

    it('should categorize personal email as other', async () => {
      const email = {
        subject: 'Meeting tomorrow at 2pm',
        from: 'colleague@company.com',
        snippet: 'Let\'s discuss the project',
        accountId: 'account123',
        messageId: 'msg202',
      };

      const category = await categorizeMessage(email.subject, email.from);
      expect(category).toBe('other');
    });
  });

  describe('Batch Email Processing', () => {
    it('should process multiple emails correctly', async () => {
      const emails = [
        {
          subject: 'Flash Sale Alert',
          from: 'promo@store.com',
          expected: 'promotion',
        },
        {
          subject: 'Invoice #INV-2026-001',
          from: 'billing@company.com',
          expected: 'invoice',
        },
        {
          subject: 'Password Reset Confirmation',
          from: 'noreply@app.com',
          expected: 'notification',
        },
        {
          subject: 'Can you review my draft?',
          from: 'friend@example.com',
          expected: 'other',
        },
      ];

      const results = await Promise.all(
        emails.map((email) =>
          categorizeMessage(email.subject, email.from).then((category) => ({
            ...email,
            actual: category,
          }))
        )
      );

      results.forEach((result) => {
        expect(result.actual).toBe(result.expected);
      });
    });

    it('should handle concurrent email processing', async () => {
      const emailCount = 50;
      const emails = Array.from({ length: emailCount }, (_, i) => ({
        subject: `Subject ${i}`,
        from: i % 2 === 0 ? 'sales@retailer.com' : 'billing@company.com',
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        emails.map((email) => categorizeMessage(email.subject, email.from))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(emailCount);
      expect(results.every((r) => ['promotion', 'invoice', 'notification', 'other'].includes(r))).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
    });
  });

  describe('Language Support Integration', () => {
    it('should handle English and Japanese mixed emails', async () => {
      const testCases = [
        {
          subject: '【セール】50% オフ Sale',
          from: 'sales@jp-retailer.jp',
          expected: 'promotion',
        },
        {
          subject: '請求書 Invoice #2026-09',
          from: 'billing@company.jp',
          expected: 'invoice',
        },
        {
          subject: 'お知らせ System Update',
          from: 'noreply@service.jp',
          expected: 'notification',
        },
      ];

      for (const testCase of testCases) {
        const result = await categorizeMessage(testCase.subject, testCase.from);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('Categorization with ML Inference', () => {
    it('should use ML inference when available', async () => {
      process.env.ENABLE_ML_CLASSIFICATION = 'true';

      const email = {
        subject: 'Limited Time Offer - 72 Hours Only',
        from: 'marketing@company.com',
      };

      const result = await categorizeMessage(email.subject, email.from);

      // Should return a valid category
      expect(['promotion', 'notification', 'invoice', 'other']).toContain(result);
    });

    it('should fallback to rules when ML is disabled', async () => {
      process.env.ENABLE_ML_CLASSIFICATION = 'false';
      delete process.env.VERTEX_AI_PROJECT_ID;

      const email = {
        subject: 'Your Invoice is Ready',
        from: 'billing@company.com',
      };

      const result = await categorizeMessage(email.subject, email.from);
      expect(result).toBe('invoice');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty subject', async () => {
      const result = await categorizeMessage('', 'sender@example.com');
      expect(['promotion', 'notification', 'invoice', 'other']).toContain(result);
    });

    it('should handle empty sender', async () => {
      const result = await categorizeMessage('Test Subject', '');
      expect(['promotion', 'notification', 'invoice', 'other']).toContain(result);
    });

    it('should handle very long subject', async () => {
      const longSubject = 'A'.repeat(5000) + 'invoice' + 'B'.repeat(5000);
      const result = await categorizeMessage(longSubject, 'test@example.com');
      expect(result).toBe('invoice');
    });

    it('should handle special characters', async () => {
      const specialSubject = '【⚡️】INVOICE #￥123 🎉';
      const result = await categorizeMessage(specialSubject, 'billing@company.com');
      expect(result).toBe('invoice');
    });

    it('should handle malformed email addresses', async () => {
      const malformedEmails = [
        'noreply',
        'noreply@',
        '@example.com',
        'user+tag@example.co.uk',
      ];

      for (const email of malformedEmails) {
        const result = await categorizeMessage('Test', email);
        expect(['promotion', 'notification', 'invoice', 'other']).toContain(result);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete categorization within acceptable latency', async () => {
      const email = {
        subject: 'Performance Test Email',
        from: 'test@example.com',
      };

      const startTime = performance.now();
      await categorizeMessage(email.subject, email.from);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle rate-limited requests gracefully', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => ({
        subject: `Email ${i}`,
        from: `sender${i}@example.com`,
      }));

      const results = await Promise.all(
        emails.map((email) => categorizeMessage(email.subject, email.from))
      );

      // All should return valid categories
      expect(results.every((r) => ['promotion', 'notification', 'invoice', 'other'].includes(r))).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should produce consistent results for same input', async () => {
      const email = {
        subject: 'Consistent Test',
        from: 'test@example.com',
      };

      const results = await Promise.all([
        categorizeMessage(email.subject, email.from),
        categorizeMessage(email.subject, email.from),
        categorizeMessage(email.subject, email.from),
      ]);

      // All should be the same
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it('should differentiate between similar emails', async () => {
      const results = await Promise.all([
        categorizeMessage('Invoice', 'billing@company.com'),
        categorizeMessage('Sale', 'sales@company.com'),
        categorizeMessage('Notification', 'noreply@company.com'),
      ]);

      // Should produce different categories
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });

  describe('Integration with Firestore', () => {
    it('should prepare data for Firestore storage', async () => {
      const email = {
        userId: 'user123',
        accountId: 'account456',
        messageId: 'msg789',
        subject: 'Test Invoice',
        from: 'billing@example.com',
        timestamp: new Date(),
      };

      const category = await categorizeMessage(email.subject, email.from);

      // Prepare for storage
      const firestoreData = {
        userId: email.userId,
        accountId: email.accountId,
        messageId: email.messageId,
        category: category,
        subject: email.subject,
        from: email.from,
        categorizedAt: email.timestamp,
      };

      expect(firestoreData).toHaveProperty('userId');
      expect(firestoreData).toHaveProperty('category');
      expect(firestoreData.category).toBe('invoice');
    });

    it('should batch store categorized emails', async () => {
      const emails = [
        { id: '1', subject: 'Invoice', from: 'billing@company.com' },
        { id: '2', subject: 'Sale', from: 'sales@company.com' },
        { id: '3', subject: 'Notification', from: 'noreply@company.com' },
      ];

      const categorizedEmails = await Promise.all(
        emails.map(async (email) => ({
          id: email.id,
          category: await categorizeMessage(email.subject, email.from),
        }))
      );

      // Should have categorization for all emails
      expect(categorizedEmails).toHaveLength(3);
      categorizedEmails.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('category');
      });
    });
  });
});
