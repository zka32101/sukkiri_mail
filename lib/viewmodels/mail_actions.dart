import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/sender_block_rule.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

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
