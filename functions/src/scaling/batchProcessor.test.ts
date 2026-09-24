/**
 * Batch Processor Tests
 *
 * バッチ処理、並列バッチ、タイムアウト管理のテスト
 */

import { BatchProcessor, ParallelBatchProcessor } from './batchProcessor';

describe('BatchProcessor', () => {
  let processor: BatchProcessor<number>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (processor) {
      processor.reset();
    }
  });

  describe('Basic Operations', () => {
    it('should process items in batches', async () => {
      const processed: number[][] = [];
      processor = new BatchProcessor(async (items) => {
        processed.push(items);
        return items;
      });

      await processor.add(1);
      await processor.add(2);
      const result = await processor.flush();

      expect(result.successful.length).toBe(2);
      expect(result.totalProcessed).toBe(2);
    });

    it('should auto-flush on batch size', async () => {
      const processed: number[][] = [];
      processor = new BatchProcessor(
        async (items) => {
          processed.push(items);
          return items;
        },
        { batchSize: 2 }
      );

      await processor.add(1);
      await processor.add(2);
      // Should auto-flush here

      expect(processed.length).toBeGreaterThan(0);
    });

    it('should handle empty flush', async () => {
      processor = new BatchProcessor(async (items) => items);

      const result = await processor.flush();
      expect(result.successful.length).toBe(0);
      expect(result.totalProcessed).toBe(0);
    });
  });

  describe('Batch Configuration', () => {
    it('should respect batch size limit', async () => {
      const batches: number[][] = [];
      processor = new BatchProcessor(
        async (items) => {
          batches.push([...items]);
          return items;
        },
        { batchSize: 3 }
      );

      await processor.add(1);
      await processor.add(2);
      await processor.add(3);
      await processor.add(4); // Should trigger auto-flush

      // First batch should have 3 items
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should respect timeout', async () => {
      const processed: number[][] = [];
      processor = new BatchProcessor(
        async (items) => {
          processed.push(items);
          return items;
        },
        { timeoutMs: 100 }
      );

      await processor.add(1);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(processed.length).toBeGreaterThan(0);
    });

  });

  describe('Adding Items', () => {
    it('should add single items', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      expect(processor.getPendingCount()).toBe(1);
    });

    it('should add batch of items', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.addBatch([1, 2, 3]);
      expect(processor.getPendingCount()).toBe(3);
    });

    it('should track pending items', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.add(2);
      expect(processor.getPendingCount()).toBe(2);

      await processor.flush();
      expect(processor.getPendingCount()).toBe(0);
    });
  });

  describe('Processing Results', () => {
    it('should return successful items', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.add(2);
      const result = await processor.flush();

      expect(result.successful).toEqual([1, 2]);
    });

    it('should handle processing failures', async () => {
      processor = new BatchProcessor(async () => {
        throw new Error('Processing failed');
      });

      await processor.add(1);
      const result = await processor.flush();

      expect(result.failed.length).toBeGreaterThan(0);
      expect(result.successful.length).toBe(0);
    });

    it('should track processing time', async () => {
      processor = new BatchProcessor(async (items) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return items;
      });

      await processor.add(1);
      const result = await processor.flush();

      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should report total processed count', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.add(2);
      const result = await processor.flush();

      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track processed count', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.flush();

      expect(processor.getProcessedCount()).toBeGreaterThan(0);
    });

    it('should track failed count', async () => {
      processor = new BatchProcessor(async () => {
        throw new Error('Failed');
      });

      await processor.add(1);
      await processor.flush();

      expect(processor.getFailedCount()).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.add(2);
      await processor.flush();

      const stats = processor.getStats();
      expect(stats.successRate).toBe(100);
    });

    it('should provide statistics object', async () => {
      processor = new BatchProcessor(async (items) => items);

      const stats = processor.getStats();
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('successRate');
    });
  });

  describe('Reset', () => {
    it('should clear queue on reset', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.add(2);
      processor.reset();

      expect(processor.getPendingCount()).toBe(0);
    });

    it('should reset statistics', async () => {
      processor = new BatchProcessor(async (items) => items);

      await processor.add(1);
      await processor.flush();
      processor.reset();

      expect(processor.getProcessedCount()).toBe(0);
      expect(processor.getFailedCount()).toBe(0);
    });

    it('should clear timeout on reset', async () => {
      processor = new BatchProcessor(async (items) => items, {
        timeoutMs: 100,
      });

      await processor.add(1);
      processor.reset();

      await new Promise((resolve) => setTimeout(resolve, 150));
      const pending = processor.getPendingCount();
      expect(pending).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      processor = new BatchProcessor(
        async (items) => {
          attempts++;
          if (attempts < 2) {
            throw new Error('First attempt failed');
          }
          return items;
        },
        { maxRetries: 3 }
      );

      await processor.add(1);
      await processor.flush();

      expect(attempts).toBeGreaterThan(1);
    });

    it('should respect max retries', async () => {
      let attempts = 0;
      processor = new BatchProcessor(
        async () => {
          attempts++;
          throw new Error('Always fails');
        },
        { maxRetries: 2 }
      );

      await processor.add(1);
      await processor.flush();

      expect(attempts).toBeLessThanOrEqual(2);
    });
  });
});

describe('ParallelBatchProcessor', () => {
  let processor: ParallelBatchProcessor<number>;

  afterEach(() => {
    if (processor) {
      processor.reset();
    }
  });

  describe('Key-based Batching', () => {
    it('should separate batches by key', async () => {
      processor = new ParallelBatchProcessor(
        async (items) => items,
        { batchSize: 10 }
      );

      await processor.add('key1', 1);
      await processor.add('key2', 2);
      await processor.add('key1', 3);

      const result = await processor.flushAll();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should process each key independently', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);
      await processor.flushAll();

      const stats = processor.getStats();
      expect(stats.processorCount).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should provide aggregate statistics', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);

      const stats = processor.getStats();
      expect(stats).toHaveProperty('processorCount');
      expect(stats).toHaveProperty('totalPending');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
    });

    it('should track processor count', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);
      await processor.add('key3', 3);

      const stats = processor.getStats();
      expect(stats.processorCount).toBe(3);
    });
  });

  describe('Flushing', () => {
    it('should flush all processors', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);

      const results = await processor.flushAll();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return results from all processors', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);

      const results = await processor.flushAll();
      const totalProcessed = results.reduce(
        (sum, r) => sum + r.totalProcessed,
        0
      );
      expect(totalProcessed).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset all processors', async () => {
      processor = new ParallelBatchProcessor(async (items) => items);

      await processor.add('key1', 1);
      await processor.add('key2', 2);
      processor.reset();

      const stats = processor.getStats();
      expect(stats.processorCount).toBe(0);
      expect(stats.totalPending).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors in parallel batches', async () => {
      processor = new ParallelBatchProcessor(async () => {
        throw new Error('Processing failed');
      });

      await processor.add('key1', 1);
      const results = await processor.flushAll();

      const failedTotal = results.reduce((sum, r) => sum + r.failed.length, 0);
      expect(failedTotal).toBeGreaterThan(0);
    });
  });
});
