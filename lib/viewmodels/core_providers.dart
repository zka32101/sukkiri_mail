import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../repositories/archive_log_repository.dart';
import '../repositories/cache_eviction_log_repository.dart';
import '../repositories/category_rule_repository.dart';
import '../repositories/email_meta_repository.dart';
import '../repositories/linked_account_repository.dart';
import '../repositories/sender_block_rule_repository.dart';
import '../repositories/user_repository.dart';
import '../services/auth_service.dart';
import '../services/local_cache_service.dart';
import '../services/purchases_service.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(),
);

final linkedAccountRepositoryProvider = Provider<LinkedAccountRepository>(
  (ref) => LinkedAccountRepository(),
);

final categoryRuleRepositoryProvider = Provider<CategoryRuleRepository>(
  (ref) => CategoryRuleRepository(),
);

final senderBlockRuleRepositoryProvider = Provider<SenderBlockRuleRepository>(
  (ref) => SenderBlockRuleRepository(),
);

final emailMetaRepositoryProvider = Provider<EmailMetaRepository>(
  (ref) => EmailMetaRepository(),
);

final archiveLogRepositoryProvider = Provider<ArchiveLogRepository>(
  (ref) => ArchiveLogRepository(),
);

final cacheEvictionLogRepositoryProvider = Provider<CacheEvictionLogRepository>(
  (ref) => CacheEvictionLogRepository(),
);

final localCacheServiceProvider = Provider<LocalCacheService>(
  (ref) => LocalCacheService(),
);

// PurchasesServiceは内部でSDK初期化状態(_configured)を保持するため、
// アプリセッション中は同一インスタンスを使い回す必要がある。
final purchasesServiceProvider = Provider<PurchasesService>(
  (ref) => PurchasesService(),
);
