import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/cache_eviction_log.dart';
import '../models/category_rule.dart';
import '../models/email_meta.dart';
import 'auth_provider.dart';
import 'core_providers.dart';
import 'linked_account_providers.dart';

/// メインシェル表示のたびに（Provider自体はアプリセッション中1回だけキャッシュされる）、
/// 全連携アカウントを対象にローカルキャッシュの自動削除（Must4、UIなし・裏側処理）を実行する。
///
/// ルール適用順序はLocalCacheServiceに従う：
///   ①SenderBlockRule（最優先） ②isPinned（保護） ③時間経過による自動パージ
/// カテゴリごとの保持日数（CategoryRule.retentionDays）を反映するため、
/// カテゴリ単位でLocalCacheService.planEvictionを呼び分ける。
final localCacheEvictionSweepProvider = FutureProvider<void>((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final accounts = await ref.watch(linkedAccountsProvider.future);
  if (accounts.isEmpty) return;

  final emailMetaRepo = ref.watch(emailMetaRepositoryProvider);
  final service = ref.watch(localCacheServiceProvider);

  final blockRules = await ref
      .watch(senderBlockRuleRepositoryProvider)
      .watchForUser(userId)
      .first;
  final categoryRules = await ref
      .watch(categoryRuleRepositoryProvider)
      .watchForUser(userId)
      .first;

  final now = DateTime.now();
  var totalFreedCount = 0;

  for (final account in accounts) {
    // CategoryRule.accountIdは「そのアカウント専用のルール」（null=全アカウント共通）を
    // 区別するためのフィールド。以前はカテゴリ名だけでMapを作っていたため、同じカテゴリに
    // 「全アカウント共通」ルールと「特定アカウント専用」ルールが両方存在する場合、
    // クエリ結果の順序次第でどちらが勝つか不定になり、意図しないアカウントに誤った
    // 保持日数（早すぎる自動削除、または遅すぎる保持）が適用され得た。
    // 全アカウント共通ルールを先に適用し、そのアカウント専用ルールで上書きすることで、
    // 「専用ルールが常に優先される」という意図した挙動を順序に依存せず保証する。
    final retentionDaysByCategory = <MailCategory, int>{};
    for (final r in categoryRules) {
      if (r.accountId == null) {
        retentionDaysByCategory[r.category] = r.retentionDays;
      }
    }
    for (final r in categoryRules) {
      if (r.accountId == account.id) {
        retentionDaysByCategory[r.category] = r.retentionDays;
      }
    }

    final metas = await emailMetaRepo.watchForAccount(account.id, userId).first;
    if (metas.isEmpty) continue;

    final byCategory = <MailCategory, List<EmailMeta>>{};
    for (final meta in metas) {
      byCategory.putIfAbsent(meta.category, () => []).add(meta);
    }
    final senderEmailByMetaId = {
      for (final meta in metas) meta.id: meta.senderEmail,
    };
    final unreadMetaIds = metas
        .where((meta) => meta.isUnread)
        .map((meta) => meta.id)
        .toSet();

    final changed = <EmailMeta>[];
    for (final entry in byCategory.entries) {
      // カテゴリ別ルールが未設定の場合はデフォルト30日を適用する。
      final retentionDays = retentionDaysByCategory[entry.key] ?? 30;
      changed.addAll(
        service.planEviction(
          metas: entry.value,
          senderEmailByMetaId: senderEmailByMetaId,
          blockRules: blockRules,
          retentionDays: retentionDays,
          now: now,
          unreadMetaIds: unreadMetaIds,
        ),
      );
    }

    for (final meta in changed) {
      await emailMetaRepo.setLocalCacheStatus(meta.id, meta.localCacheStatus);
    }
    totalFreedCount += changed
        .where((meta) => meta.localCacheStatus != LocalCacheStatus.cached)
        .length;
  }

  if (totalFreedCount > 0) {
    final freedBytes = service.estimateFreedBytes(emailCount: totalFreedCount);
    await ref
        .read(cacheEvictionLogRepositoryProvider)
        .add(
          CacheEvictionLog(
            id: '',
            userId: userId,
            purgedAt: now,
            emailCount: totalFreedCount,
            freedBytesEstimate: freedBytes,
          ),
        );
  }
});
