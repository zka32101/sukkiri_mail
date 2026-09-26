/**
 * Production Configuration
 *
 * 本番環境設定、ロギング、タイムアウト、レート制限
 * - 環境検出
 * - ログレベルの設定
 * - タイムアウト設定
 * - レート制限設定
 */

export type Environment = 'development' | 'staging' | 'production';

export interface ProductionConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDetailedLogging: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;

  // Timeouts (in milliseconds)
  functionTimeout: number;
  externalApiTimeout: number;
  databaseQueryTimeout: number;
  emailScanTimeout: number;

  // Rate limiting
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  burstLimit: number;

  // Cache settings
  enableCache: boolean;
  cacheTTLMs: number;
  maxCacheSize: number;

  // Monitoring & Alerting
  enableAlerts: boolean;
  alertThresholds: {
    errorRatePercent: number;
    latencyMs: number;
    failureCountPerMinute: number;
  };

  // Performance
  maxConcurrentOperations: number;
  enableCompression: boolean;
  enableBatching: boolean;
}

/**
 * 環境を検出して適切な設定を返す
 */
export function getProductionConfig(): ProductionConfig {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';

  // Base configuration
  const config: ProductionConfig = {
    environment: env,
    isDevelopment,
    isProduction,
    logLevel: isDevelopment ? 'debug' : 'info',
    enableDetailedLogging: isDevelopment,
    enableMetrics: true,
    enableTracing: isProduction,

    // Timeouts
    functionTimeout: isProduction ? 30000 : 60000,
    externalApiTimeout: isProduction ? 10000 : 30000,
    databaseQueryTimeout: isProduction ? 5000 : 15000,
    emailScanTimeout: isProduction ? 60000 : 120000,

    // Rate limiting (adjusted per environment)
    rateLimitPerMinute: isProduction ? 100 : 1000,
    rateLimitPerHour: isProduction ? 5000 : 50000,
    burstLimit: isProduction ? 20 : 100,

    // Cache
    enableCache: isProduction ? true : isDevelopment ? false : true,
    cacheTTLMs: isProduction ? 600000 : 300000, // 10 min prod, 5 min staging
    maxCacheSize: isProduction ? 10000 : 5000,

    // Monitoring
    enableAlerts: isProduction ? true : false,
    alertThresholds: {
      errorRatePercent: isProduction ? 5 : 20,
      latencyMs: isProduction ? 2000 : 5000,
      failureCountPerMinute: isProduction ? 10 : 50,
    },

    // Performance
    maxConcurrentOperations: isProduction ? 50 : 100,
    enableCompression: isProduction,
    enableBatching: isProduction,
  };

  return config;
}

/**
 * 環境変数から設定を上書き
 */
export function overrideConfigFromEnv(
  config: ProductionConfig
): ProductionConfig {
  const overrides: Partial<ProductionConfig> = {};

  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL as ProductionConfig['logLevel'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      overrides.logLevel = level;
    }
  }

  if (process.env.FUNCTION_TIMEOUT) {
    overrides.functionTimeout = parseInt(process.env.FUNCTION_TIMEOUT, 10);
  }

  if (process.env.ENABLE_DETAILED_LOGGING) {
    overrides.enableDetailedLogging = process.env.ENABLE_DETAILED_LOGGING === 'true';
  }

  if (process.env.ENABLE_CACHE) {
    overrides.enableCache = process.env.ENABLE_CACHE === 'true';
  }

  if (process.env.RATE_LIMIT_PER_MINUTE) {
    overrides.rateLimitPerMinute = parseInt(
      process.env.RATE_LIMIT_PER_MINUTE,
      10
    );
  }

  return { ...config, ...overrides };
}

/**
 * 現在の本番環境設定
 */
let currentConfig: ProductionConfig | null = null;

export function getConfig(): ProductionConfig {
  if (!currentConfig) {
    currentConfig = getProductionConfig();
    currentConfig = overrideConfigFromEnv(currentConfig);
  }
  return currentConfig;
}

/**
 * 設定をリセット（テスト用）
 */
export function resetConfig(): void {
  currentConfig = null;
}

/**
 * 設定を更新（テスト用または動的設定）
 */
export function updateConfig(
  updates: Partial<ProductionConfig>
): ProductionConfig {
  const config = getConfig();
  currentConfig = { ...config, ...updates };
  return currentConfig;
}
