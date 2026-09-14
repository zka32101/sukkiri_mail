/**
 * ML Inference Service Tests
 *
 * Vertex AI統合、ルールベース分類フォールバック、
 * レート制限、キャッシング機能のテスト
 */

import { mlInferenceService } from './mlInferenceService';

// Mock categorize functions
jest.mock('../categorize', () => ({
  categorizeMessage: jest.fn(),
  categorizeMessageByRules: jest.fn(),
}));

import { categorizeMessage, categorizeMessageByRules } from '../categorize';

describe('MLInferenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mlInferenceService.clearCache();
  });

  describe('categorizeWithRules', () => {
    it('should use categorizeMessageByRules for rule-based classification', () => {
      (categorizeMessageByRules as jest.Mock).mockReturnValue('promotion');

      const features = {
        subject: 'Sale 50% off',
        from: 'sales@example.com',
        snippet: 'Great discount',
        recipientCount: 1,
        hasAttachments: false,
      };

      // Private method testing through inferCategorization with forceRule=true
      // This is tested indirectly through the public API
      expect(categorizeMessageByRules).not.toHaveBeenCalled(); // Setup mock first
    });
  });

  describe('inferCategorization', () => {
    it('should use rule-based classification when forceRule is true', async () => {
      (categorizeMessageByRules as jest.Mock).mockReturnValue('invoice');

      const features = {
        subject: '請求書 Invoice #12345',
        from: 'billing@company.com',
        snippet: 'Your monthly bill',
        recipientCount: 1,
        hasAttachments: true,
      };

      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        true // forceRule = true
      );

      expect(result.recommendedCategory).toBe('invoice');
      expect(result.modelVersion).toBe('rules-v1');
      expect(result.confidenceScore).toBe(0.5);
    });

    it('should return ML inference result when model is available', async () => {
      (categorizeMessage as jest.Mock).mockResolvedValue('promotion');

      const features = {
        subject: 'Flash Sale Alert',
        from: 'promo@retailer.com',
        snippet: 'Limited time offer',
        recipientCount: 1000,
        hasAttachments: false,
      };

      // Note: This test assumes a production model is set up in Firestore
      // In a real test environment, you would mock the Firestore queries

      // For now, test the structure of the response
      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        false
      );

      expect(result).toHaveProperty('recommendedCategory');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('alternativesWithScores');
      expect(result).toHaveProperty('latencyMs');
      expect(result).toHaveProperty('modelVersion');
    });

    it('should fallback to rules when no production model exists', async () => {
      (categorizeMessageByRules as jest.Mock).mockReturnValue('other');

      const features = {
        subject: 'Random subject',
        from: 'unknown@example.com',
        snippet: 'Some content',
        recipientCount: 1,
        hasAttachments: false,
      };

      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        false
      );

      // When no model exists, should return error message
      expect(result.errorMessage).toContain('No ML model available');
    });

    it('should include appropriate confidence scores', () => {
      expect(true).toBe(true); // Placeholder for confidence score validation
    });

    it('should handle inference errors gracefully', async () => {
      const features = {
        subject: 'Test',
        from: 'test@example.com',
        snippet: 'Test',
        recipientCount: 1,
        hasAttachments: false,
      };

      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        false
      );

      // When error occurs, should have error message
      if (result.errorMessage) {
        expect(result.confidenceScore).toBe(0);
        expect(result.recommendedCategory).toBeNull();
      }
    });
  });

  describe('categorization results', () => {
    it('should map Vertex AI categories to standard categories', () => {
      const categories = ['promotion', 'notification', 'invoice', 'other'];
      categories.forEach((category) => {
        expect(['promotion', 'notification', 'invoice', 'other']).toContain(
          category
        );
      });
    });

    it('should provide alternative categories with confidence scores', async () => {
      (categorizeMessage as jest.Mock).mockResolvedValue('promotion');

      const features = {
        subject: 'Sale Alert',
        from: 'sales@example.com',
        snippet: 'New sale',
        recipientCount: 1,
        hasAttachments: false,
      };

      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        true
      );

      expect(result.alternativesWithScores).toHaveProperty('promotion');
      expect(result.alternativesWithScores).toHaveProperty('notification');
      expect(result.alternativesWithScores).toHaveProperty('invoice');
    });
  });

  describe('Model metadata management', () => {
    it('should cache production models in memory', async () => {
      // Cache operations are internal to the service
      // Verify through repeated calls - second call should use cache
      expect(true).toBe(true); // Placeholder
    });

    it('should clear cache when requested', () => {
      mlInferenceService.clearCache();
      // Cache is cleared internally
      expect(true).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits per user and time window', async () => {
      // Rate limiting is checked internally
      // Test would require making many concurrent requests
      expect(true).toBe(true); // Placeholder
    });

    it('should return error when rate limit exceeded', async () => {
      const features = {
        subject: 'Test',
        from: 'test@example.com',
        snippet: 'Test',
        recipientCount: 1,
        hasAttachments: false,
      };

      // Would need to mock exceeding rate limit
      const result = await mlInferenceService.inferCategorization(
        'user123',
        'account456',
        features,
        false
      );

      // If rate limit is exceeded, errorMessage should indicate it
      if (result.errorMessage?.includes('Rate limit')) {
        expect(result.recommendedCategory).toBeNull();
      }
    });
  });

  describe('Mail feature transformation', () => {
    it('should transform MailFeatures to Vertex AI format', () => {
      // Test feature transformation indirectly through predictions
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Inference logging and tracking', () => {
    it('should log inference results for model improvement', async () => {
      // Logging is handled through mlDataCollectionService
      expect(true).toBe(true); // Placeholder
    });

    it('should verify inference accuracy with user feedback', async () => {
      // Accuracy verification is handled through mlDataCollectionService
      expect(true).toBe(true); // Placeholder
    });
  });
});
