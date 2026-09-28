import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/category_rule.dart';
import '../models/sender_block_rule.dart';
import 'auth_provider.dart';
import 'core_providers.dart';
import 'rule_providers.dart';

/// メール一覧・詳細の両方から呼ばれる「この差出人を今後取り込まない」ワンクリック操作。
/// 既存の受信済みメール自体は消さず、次回スキャン以降の新規取り込みのみ止める。
Future<void> blockSenderOneClick(
  WidgetRef ref, {
  required String senderEmail,
  String? accountId,
}) async {
  final userId = await ref.read(currentUserIdProvider.future);
  await ref.read(senderBlockRuleRepositoryProvider).add(
        SenderBlockRule(
          id: '',
          userId: userId,
          accountId: accountId,
          pattern: senderEmail,
          matchType: SenderMatchType.sender,
          createdAt: DateTime.now(),
        ),
      );
}

/// メール詳細から「このカテゴリを自動整理する」ワンクリックでカテゴリルールを作成する。
/// 既存の同カテゴリ・同アカウントのルールがあれば保持日数を上書きする。
Future<void> applyCategoryRuleOneClick(
  WidgetRef ref, {
  required MailCategory category,
  String? accountId,
  int retentionDays = 30,
}) async {
  final userId = await ref.read(currentUserIdProvider.future);
  final existingRules = ref.read(categoryRulesProvider).valueOrNull ??
      await ref.read(categoryRuleRepositoryProvider).watchForUser(userId).first;
  final existing = existingRules.where(
    (r) => r.category == category && r.accountId == accountId,
  );
  final rule = CategoryRule(
    id: existing.isEmpty ? '' : existing.first.id,
    userId: userId,
    category: category,
    retentionDays: retentionDays,
    accountId: accountId,
  );
  await ref.read(categoryRuleRepositoryProvider).upsert(rule);
}
