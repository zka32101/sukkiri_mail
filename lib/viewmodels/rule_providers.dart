import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/category_rule.dart';
import '../models/sender_block_rule.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

final categoryRulesProvider = StreamProvider<List<CategoryRule>>((ref) async* {
  final userId = await ref.watch(currentUserIdProvider.future);
  yield* ref.watch(categoryRuleRepositoryProvider).watchForUser(userId);
});

/// 差出人ブロックルール。RuleSettings画面の「差出人ブロック」タブ、
/// および一覧からの長押しショートカットの両方から追加される。
final senderBlockRulesProvider = StreamProvider<List<SenderBlockRule>>((ref) async* {
  final userId = await ref.watch(currentUserIdProvider.future);
  yield* ref.watch(senderBlockRuleRepositoryProvider).watchForUser(userId);
});
