/**
 * Error Handling Service Tests
 *
 * エラー分類、リトライ戦略、サーキットブレーカーのテスト
 */

import {
  ErrorClassifier,
  ErrorType,
  RetryStrategy,
  CircuitBreaker,
  ErrorHandlingService,
} from './errorHandlingService';

describe('ErrorHandlingService', () => {
  describe('ErrorClassifier', () => {
    it('should match status codes correctly', () => {
      const regex = /status[\s:]+(\d{3})/i;
      const testCases = [
        { str: 'status: 503 Service Unavailable', expected: '503' },
        { str: 'status:404 Not Found', expected: '404' },
        { str: 'STATUS: 500 Error', expected: '500' },
        { str: 'Response status: 429 Too Many', expected: '429' },
      ];

      testCases.forEach(({ str, expected }) => {
        const match = str.match(regex);
        expect(match).not.toBeNull();
        if (match) {
          expect(match[1]).toBe(expected);
        }
      });
    });

    it('should classify network errors as retryable', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.NETWORK);
      expect(context.isRetryable).toBe(true);
    });

    it('should classify timeout errors as retryable', () => {
      const error = new Error('Request timeout after 5000ms');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.NETWORK);
      expect(context.isRetryable).toBe(true);
    });

    it('should classify rate limit errors as retryable', () => {
      const error = new Error('rate limit exceeded');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.RATE_LIMIT);
      expect(context.isRetryable).toBe(true);
    });

    it('should classify authentication errors as non-retryable', () => {
      const error = new Error('unauthorized: Invalid token');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.AUTHENTICATION);
      expect(context.isRetryable).toBe(false);
    });

    it('should classify 500 errors as retryable', () => {
      const error = new Error('status: 500 Internal Server Error');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.TEMPORARY);
      expect(context.isRetryable).toBe(true);
    });

    it('should classify 400 errors as non-retryable', () => {
      const error = new Error('status: 400 Bad Request');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.PERMANENT);
      expect(context.isRetryable).toBe(false);
    });

    it('should classify 429 (rate limit) as retryable', () => {
      const error = new Error('status: 429 Too Many Requests');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.RATE_LIMIT);
      expect(context.isRetryable).toBe(true);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something went wrong');
      const context = ErrorClassifier.classifyError(error);

      expect(context.type).toBe(ErrorType.UNKNOWN);
      expect(context.isRetryable).toBe(false);
    });

    it('should extract status code from error message', () => {
      const error = new Error('Response status: 503 Service Unavailable');
      const context = ErrorClassifier.classifyError(error);

      expect(context.statusCode).toBe(503);
      expect(context.isRetryable).toBe(true);
    });
  });

  describe('RetryStrategy', () => {
    let strategy: RetryStrategy;

    beforeEach(() => {
      strategy = new RetryStrategy(3, 100, 10000, 0);
    });

    it('should determine when to retry', () => {
      const retryableContext = {
        type: ErrorType.TEMPORARY,
        message: 'Server error',
        isRetryable: true,
        attemptNumber: 1,
        totalAttempts: 3,
      };

      expect(strategy.shouldRetry(retryableContext)).toBe(true);
    });

    it('should not retry non-retryable errors', () => {
      const nonRetryableContext = {
        type: ErrorType.AUTHENTICATION,
        message: 'Unauthorized',
        isRetryable: false,
        attemptNumber: 1,
        totalAttempts: 3,
      };

      expect(strategy.shouldRetry(nonRetryableContext)).toBe(false);
    });

    it('should not retry when max attempts reached', () => {
      const context = {
        type: ErrorType.TEMPORARY,
        message: 'Server error',
        isRetryable: true,
        attemptNumber: 3,
        totalAttempts: 3,
      };

      expect(strategy.shouldRetry(context)).toBe(false);
    });

    it('should calculate exponential backoff delays', () => {
      const delay1 = strategy.getDelayMs(1);
      const delay2 = strategy.getDelayMs(2);
      const delay3 = strategy.getDelayMs(3);

      expect(delay1).toBe(100); // 100ms
      expect(delay2).toBe(200); // 200ms
      expect(delay3).toBe(400); // 400ms
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap maximum delay', () => {
      const strategyWithCap = new RetryStrategy(5, 100, 1000, 0);
      const delay1 = strategyWithCap.getDelayMs(1); // 100
      const delay5 = strategyWithCap.getDelayMs(5); // Would be 1600, capped at 1000

      expect(delay1).toBe(100);
      expect(delay5).toBeLessThanOrEqual(1000);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(3, 2, 1000);
    });

    it('should start in closed state', () => {
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getState().status).toBe('closed');
    });

    it('should open after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.getState().status).toBe('open');
    });

    it('should track failure count', () => {
      breaker.recordFailure();
      expect(breaker.getState().failureCount).toBe(1);

      breaker.recordFailure();
      expect(breaker.getState().failureCount).toBe(2);
    });

    it('should reset on success in closed state', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();

      expect(breaker.getState().failureCount).toBe(0);
    });

    it('should reset circuit breaker', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      breaker.reset();

      expect(breaker.getState().status).toBe('closed');
      expect(breaker.getState().failureCount).toBe(0);
      expect(breaker.isOpen()).toBe(false);
    });

    it('should track success count in half-open state', async () => {
      // Open the breaker
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Wait for half-open transition
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Check state before attempting transition
      expect(breaker.getState().status).toBe('open');

      // isOpen() triggers transition to half_open
      const isOpen = breaker.isOpen();
      expect(isOpen).toBe(false); // half_open allows requests

      // Record successes
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState().status).toBe('closed');
    }, 10000);
  });

  describe('ErrorHandlingService', () => {
    let service: ErrorHandlingService;

    beforeEach(() => {
      service = new ErrorHandlingService();
    });

    it('should provide circuit breaker instances', () => {
      const cb1 = service.getCircuitBreaker('api-1');
      const cb2 = service.getCircuitBreaker('api-1');
      const cb3 = service.getCircuitBreaker('api-2');

      expect(cb1).toBe(cb2);
      expect(cb1).not.toBe(cb3);
    });

    it('should record error statistics', () => {
      service.recordError('operation-1', new Error('Error 1'));
      service.recordError('operation-1', new Error('Error 2'));

      const stats = service.getErrorStats('operation-1');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(2);
    });

    it('should return all error statistics', () => {
      service.recordError('op-1', new Error('Error'));
      service.recordError('op-2', new Error('Error'));
      service.recordError('op-3', new Error('Error'));

      const allStats = service.getAllErrorStats();
      expect(Object.keys(allStats).length).toBe(3);
      expect(allStats['op-1']).toBeDefined();
      expect(allStats['op-2']).toBeDefined();
      expect(allStats['op-3']).toBeDefined();
    });

    it('should reset error statistics', () => {
      service.recordError('operation-1', new Error('Error'));
      service.recordError('operation-2', new Error('Error'));

      service.resetErrorStats('operation-1');
      expect(service.getErrorStats('operation-1')).toBeNull();
      expect(service.getErrorStats('operation-2')).toBeDefined();
    });

    it('should reset all error statistics', () => {
      service.recordError('operation-1', new Error('Error'));
      service.recordError('operation-2', new Error('Error'));

      service.resetErrorStats();
      expect(service.getAllErrorStats()).toEqual({});
    });

    it('should return null for non-existent operation stats', () => {
      const stats = service.getErrorStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('Error recovery scenarios', () => {
    it('should classify timeout errors as retryable', () => {
      const error = new Error('Connection timeout');
      const context = ErrorClassifier.classifyError(error);
      expect(context.isRetryable).toBe(true);
      expect(context.type).toBe(ErrorType.NETWORK);
    });

    it('should classify 503 errors as retryable', () => {
      const error = new Error('status: 503 Service Unavailable');
      const context = ErrorClassifier.classifyError(error);
      expect(context.isRetryable).toBe(true);
      expect(context.type).toBe(ErrorType.TEMPORARY);
    });

    it('should classify and reject permanent errors', () => {
      const errors = [
        new Error('Unauthorized'),
        new Error('status: 401 Unauthorized'),
        new Error('status: 403 Forbidden'),
      ];

      errors.forEach((error) => {
        const context = ErrorClassifier.classifyError(error);
        expect(context.isRetryable).toBe(false);
      });
    });

    it('should track circuit breaker recovery process', () => {
      const breaker = new CircuitBreaker(2, 2, 500);
      const service = new ErrorHandlingService();

      // Open the breaker
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState().status).toBe('open');

      // Record in service
      service.recordError('operation', new Error('Failed'));
      service.recordError('operation', new Error('Failed'));

      const stats = service.getErrorStats('operation');
      expect(stats!.count).toBe(2);
      expect(breaker.getState().status).toBe('open');
    });
  });
});
