/**
 * Production Configuration Tests
 *
 * 環境検出、設定オーバーライド、タイムアウト、レート制限のテスト
 */

import {
  getProductionConfig,
  overrideConfigFromEnv,
  getConfig,
  resetConfig,
  updateConfig,
} from './productionConfig';

describe('ProductionConfig', () => {
  afterEach(() => {
    resetConfig();
  });

  describe('getProductionConfig', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.environment).toBe('development');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.environment).toBe('production');
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(true);
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = getProductionConfig();

      expect(config.environment).toBe('development');
      expect(config.isDevelopment).toBe(true);
    });

    it('should set appropriate log levels per environment', () => {
      process.env.NODE_ENV = 'development';
      let config = getProductionConfig();
      expect(config.logLevel).toBe('debug');

      process.env.NODE_ENV = 'production';
      resetConfig();
      config = getProductionConfig();
      expect(config.logLevel).toBe('info');
    });

    it('should set detailed logging for development only', () => {
      process.env.NODE_ENV = 'development';
      let config = getProductionConfig();
      expect(config.enableDetailedLogging).toBe(true);

      process.env.NODE_ENV = 'production';
      resetConfig();
      config = getProductionConfig();
      expect(config.enableDetailedLogging).toBe(false);
    });

    it('should enable tracing for production only', () => {
      process.env.NODE_ENV = 'development';
      let config = getProductionConfig();
      expect(config.enableTracing).toBe(false);

      process.env.NODE_ENV = 'production';
      resetConfig();
      config = getProductionConfig();
      expect(config.enableTracing).toBe(true);
    });
  });

  describe('Timeout configurations', () => {
    it('should use shorter timeouts in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.functionTimeout).toBe(30000);
      expect(config.externalApiTimeout).toBe(10000);
      expect(config.databaseQueryTimeout).toBe(5000);
      expect(config.emailScanTimeout).toBe(60000);
    });

    it('should use longer timeouts in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.functionTimeout).toBe(60000);
      expect(config.externalApiTimeout).toBe(30000);
      expect(config.databaseQueryTimeout).toBe(15000);
      expect(config.emailScanTimeout).toBe(120000);
    });
  });

  describe('Rate limiting configurations', () => {
    it('should have stricter rate limits in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.rateLimitPerMinute).toBe(100);
      expect(config.rateLimitPerHour).toBe(5000);
      expect(config.burstLimit).toBe(20);
    });

    it('should have generous rate limits in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.rateLimitPerMinute).toBe(1000);
      expect(config.rateLimitPerHour).toBe(50000);
      expect(config.burstLimit).toBe(100);
    });
  });

  describe('Cache configurations', () => {
    it('should enable cache in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.enableCache).toBe(true);
      expect(config.cacheTTLMs).toBe(600000); // 10 min
      expect(config.maxCacheSize).toBe(10000);
    });

    it('should disable cache in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.enableCache).toBe(false);
    });

    it('should enable cache in staging', () => {
      process.env.NODE_ENV = 'staging';
      const config = getProductionConfig();

      expect(config.enableCache).toBe(true);
      expect(config.cacheTTLMs).toBe(300000); // 5 min
      expect(config.maxCacheSize).toBe(5000);
    });
  });

  describe('Monitoring and alerting', () => {
    it('should enable alerts in production only', () => {
      process.env.NODE_ENV = 'production';
      let config = getProductionConfig();
      expect(config.enableAlerts).toBe(true);

      process.env.NODE_ENV = 'development';
      resetConfig();
      config = getProductionConfig();
      expect(config.enableAlerts).toBe(false);
    });

    it('should have appropriate alert thresholds for production', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.alertThresholds.errorRatePercent).toBe(5);
      expect(config.alertThresholds.latencyMs).toBe(2000);
      expect(config.alertThresholds.failureCountPerMinute).toBe(10);
    });

    it('should have lenient alert thresholds for development', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.alertThresholds.errorRatePercent).toBe(20);
      expect(config.alertThresholds.latencyMs).toBe(5000);
      expect(config.alertThresholds.failureCountPerMinute).toBe(50);
    });
  });

  describe('Performance configurations', () => {
    it('should limit concurrent operations in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getProductionConfig();

      expect(config.maxConcurrentOperations).toBe(50);
      expect(config.enableCompression).toBe(true);
      expect(config.enableBatching).toBe(true);
    });

    it('should allow more concurrent operations in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getProductionConfig();

      expect(config.maxConcurrentOperations).toBe(100);
      expect(config.enableCompression).toBe(false);
      expect(config.enableBatching).toBe(false);
    });
  });

  describe('overrideConfigFromEnv', () => {
    it('should override log level from environment variable', () => {
      const config = getProductionConfig();
      process.env.LOG_LEVEL = 'warn';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.logLevel).toBe('warn');
    });

    it('should ignore invalid log levels', () => {
      const config = getProductionConfig();
      process.env.LOG_LEVEL = 'invalid';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.logLevel).toBe(config.logLevel);
    });

    it('should override function timeout', () => {
      const config = getProductionConfig();
      process.env.FUNCTION_TIMEOUT = '45000';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.functionTimeout).toBe(45000);
    });

    it('should override detailed logging flag', () => {
      const config = getProductionConfig();
      process.env.ENABLE_DETAILED_LOGGING = 'true';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.enableDetailedLogging).toBe(true);
    });

    it('should override cache setting', () => {
      const config = { ...getProductionConfig(), enableCache: false };
      process.env.ENABLE_CACHE = 'true';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.enableCache).toBe(true);
    });

    it('should override rate limit per minute', () => {
      const config = getProductionConfig();
      process.env.RATE_LIMIT_PER_MINUTE = '200';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.rateLimitPerMinute).toBe(200);
    });

    it('should not modify original config object', () => {
      const config = getProductionConfig();
      const original = { ...config };
      process.env.LOG_LEVEL = 'error';

      overrideConfigFromEnv(config);
      expect(config).toEqual(original);
    });

    it('should handle multiple overrides', () => {
      const config = getProductionConfig();
      process.env.LOG_LEVEL = 'warn';
      process.env.FUNCTION_TIMEOUT = '50000';
      process.env.ENABLE_CACHE = 'true';

      const overridden = overrideConfigFromEnv(config);
      expect(overridden.logLevel).toBe('warn');
      expect(overridden.functionTimeout).toBe(50000);
      expect(overridden.enableCache).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return cached config on second call', () => {
      process.env.NODE_ENV = 'production';
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should apply environment overrides', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'debug';
      resetConfig();

      const config = getConfig();
      expect(config.logLevel).toBe('debug');
    });

    it('should return development config by default', () => {
      delete process.env.NODE_ENV;
      resetConfig();

      const config = getConfig();
      expect(config.isDevelopment).toBe(true);
      expect(config.environment).toBe('development');
    });
  });

  describe('resetConfig', () => {
    it('should clear cached config', () => {
      process.env.NODE_ENV = 'production';
      const config1 = getConfig();
      resetConfig();
      process.env.NODE_ENV = 'development';
      const config2 = getConfig();

      expect(config1.environment).toBe('production');
      expect(config2.environment).toBe('development');
    });
  });

  describe('updateConfig', () => {
    it('should update specific config properties', () => {
      process.env.NODE_ENV = 'production';
      getConfig();
      const updated = updateConfig({ logLevel: 'debug', burstLimit: 50 });

      expect(updated.logLevel).toBe('debug');
      expect(updated.burstLimit).toBe(50);
      expect(updated.environment).toBe('production');
    });

    it('should return merged config', () => {
      process.env.NODE_ENV = 'production';
      const original = getConfig();
      const updates = { rateLimitPerMinute: 500 };
      const updated = updateConfig(updates);

      expect(updated.rateLimitPerMinute).toBe(500);
      expect(updated.rateLimitPerHour).toBe(original.rateLimitPerHour);
    });

    it('should affect subsequent getConfig calls', () => {
      process.env.NODE_ENV = 'production';
      getConfig();
      updateConfig({ logLevel: 'error' });
      const config = getConfig();

      expect(config.logLevel).toBe('error');
    });
  });

  describe('Configuration structure', () => {
    it('should have all required properties', () => {
      const config = getProductionConfig();

      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('isDevelopment');
      expect(config).toHaveProperty('isProduction');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('enableDetailedLogging');
      expect(config).toHaveProperty('enableMetrics');
      expect(config).toHaveProperty('enableTracing');
      expect(config).toHaveProperty('functionTimeout');
      expect(config).toHaveProperty('externalApiTimeout');
      expect(config).toHaveProperty('databaseQueryTimeout');
      expect(config).toHaveProperty('emailScanTimeout');
      expect(config).toHaveProperty('rateLimitPerMinute');
      expect(config).toHaveProperty('rateLimitPerHour');
      expect(config).toHaveProperty('burstLimit');
      expect(config).toHaveProperty('enableCache');
      expect(config).toHaveProperty('cacheTTLMs');
      expect(config).toHaveProperty('maxCacheSize');
      expect(config).toHaveProperty('enableAlerts');
      expect(config).toHaveProperty('alertThresholds');
      expect(config).toHaveProperty('maxConcurrentOperations');
      expect(config).toHaveProperty('enableCompression');
      expect(config).toHaveProperty('enableBatching');
    });

    it('should have valid timeout values', () => {
      const config = getProductionConfig();

      expect(config.functionTimeout).toBeGreaterThan(0);
      expect(config.externalApiTimeout).toBeGreaterThan(0);
      expect(config.databaseQueryTimeout).toBeGreaterThan(0);
      expect(config.emailScanTimeout).toBeGreaterThan(0);
    });

    it('should have valid rate limit values', () => {
      const config = getProductionConfig();

      expect(config.rateLimitPerMinute).toBeGreaterThan(0);
      expect(config.rateLimitPerHour).toBeGreaterThan(0);
      expect(config.burstLimit).toBeGreaterThan(0);
      expect(config.rateLimitPerHour).toBeGreaterThanOrEqual(config.rateLimitPerMinute);
    });

    it('should have valid cache values', () => {
      const config = getProductionConfig();

      expect(config.cacheTTLMs).toBeGreaterThan(0);
      expect(config.maxCacheSize).toBeGreaterThan(0);
    });

    it('should have valid alert thresholds', () => {
      const config = getProductionConfig();

      expect(config.alertThresholds.errorRatePercent).toBeGreaterThan(0);
      expect(config.alertThresholds.errorRatePercent).toBeLessThanOrEqual(100);
      expect(config.alertThresholds.latencyMs).toBeGreaterThan(0);
      expect(config.alertThresholds.failureCountPerMinute).toBeGreaterThan(0);
    });

    it('should have valid concurrent operation limits', () => {
      const config = getProductionConfig();

      expect(config.maxConcurrentOperations).toBeGreaterThan(0);
    });
  });

  describe('Environment type validation', () => {
    it('should accept valid environments', () => {
      const validEnvs = ['development', 'staging', 'production'];
      validEnvs.forEach((env) => {
        process.env.NODE_ENV = env;
        resetConfig();
        const prodConfig = getProductionConfig();
        expect(['development', 'staging', 'production']).toContain(
          prodConfig.environment
        );
      });
    });
  });
});
