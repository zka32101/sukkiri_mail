import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/sender_block_rule.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// メール一覧・詳細の両方から呼ばれる「この差出人を今後取り込まない」ワンクリック操作。
/// 実Gmail側のメールは消さないが、アプリ上の一覧からは既存分も含めて即座に非表示にする
/// （localCacheStatus=blockedへ一括更新）。次回スキャン以降の新規取り込みも止まる。
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
  await ref.read(emailMetaRepositoryProvider).markSenderBlocked(
        senderEmail,
        userId: userId,
        accountId: accountId,
      );
}
