import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
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

/// app1-6c108 プロジェクトは複数アプリ共存のため、Firestoreは名前付きデータベース
/// `sukkirimail`（(default)ではない）を使用する。Cloud Functions側もこのDBを参照する。
final firestoreProvider = Provider<FirebaseFirestore>(
  (ref) => FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'sukkirimail',
  ),
);

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(db: ref.watch(firestoreProvider)),
);

final linkedAccountRepositoryProvider = Provider<LinkedAccountRepository>(
  (ref) => LinkedAccountRepository(db: ref.watch(firestoreProvider)),
);

final categoryRuleRepositoryProvider = Provider<CategoryRuleRepository>(
  (ref) => CategoryRuleRepository(db: ref.watch(firestoreProvider)),
);

final senderBlockRuleRepositoryProvider = Provider<SenderBlockRuleRepository>(
  (ref) => SenderBlockRuleRepository(db: ref.watch(firestoreProvider)),
);

final emailMetaRepositoryProvider = Provider<EmailMetaRepository>(
  (ref) => EmailMetaRepository(db: ref.watch(firestoreProvider)),
);

final archiveLogRepositoryProvider = Provider<ArchiveLogRepository>(
  (ref) => ArchiveLogRepository(db: ref.watch(firestoreProvider)),
);

final cacheEvictionLogRepositoryProvider = Provider<CacheEvictionLogRepository>(
  (ref) => CacheEvictionLogRepository(db: ref.watch(firestoreProvider)),
);

final localCacheServiceProvider = Provider<LocalCacheService>(
  (ref) => LocalCacheService(),
);
