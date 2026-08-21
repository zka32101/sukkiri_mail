import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/cache_eviction_log.dart';
import '../models/category_rule.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import '../models/sender_block_rule.dart';
import '../repositories/email_meta_repository.dart';
import '../services/local_cache_service.dart';
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

  // 1件のアカウント・1件のメールでの失敗が、他の全アカウント・全メールの処理を
  // 巻き添えにして中断させないよう、アカウント単位・メール単位でtry/catchする。
  // このProviderは非autoDisposeでroot_shell.dartから一度だけwatchされ、
  // エラー結果はアプリセッション中ずっとキャッシュされて再試行されないため、
  // 一時的なネットワーク不調等で丸ごと失敗させないことが特に重要
  // （以前は1件のFirestore書き込み失敗が残り全アカウントの処理を中断させていた）。
  for (final account in accounts) {
    try {
      totalFreedCount += await _sweepAccount(
        account: account,
        userId: userId,
        emailMetaRepo: emailMetaRepo,
        service: service,
        categoryRules: categoryRules,
        blockRules: blockRules,
        now: now,
      );
    } catch (e) {
      debugPrint('[localCacheEvictionSweep] account=${account.id} failed: $e');
    }
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

/// 1アカウント分のキャッシュ削除スイープを行い、実際に解放（cached以外へ変更）できた
/// メール件数を返す。1件のFirestore書き込みが失敗しても、そのメールをスキップして
/// 残りのメールの処理を続ける（呼び出し元でアカウント単位のtry/catchも行っているが、
/// メール単位でも独立させることで、たまたま1件だけ失敗した場合に同一アカウント内の
/// 残りのメールまで巻き添えで未処理にならないようにする）。
Future<int> _sweepAccount({
  required LinkedAccount account,
  required String userId,
  required EmailMetaRepository emailMetaRepo,
  required LocalCacheService service,
  required List<CategoryRule> categoryRules,
  required List<SenderBlockRule> blockRules,
  required DateTime now,
}) async {
  // CategoryRule.accountIdは「そのアカウント専用のルール」（null=全アカウント共通）を
  // 区別するためのフィールド。全アカウント共通ルールを先に適用し、そのアカウント専用
  // ルールで上書きすることで、「専用ルールが常に優先される」という意図した挙動を
  // クエリ結果の順序に依存せず保証する。
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
  if (metas.isEmpty) return 0;

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

  var freedCount = 0;
  for (final meta in changed) {
    try {
      await emailMetaRepo.setLocalCacheStatus(meta.id, meta.localCacheStatus);
      if (meta.localCacheStatus != LocalCacheStatus.cached) freedCount++;
    } catch (e) {
      // この1件は次回のスイープで再評価される。他のメールの処理は継続する。
      debugPrint(
        '[localCacheEvictionSweep] emailMeta=${meta.id} update failed: $e',
      );
    }
  }
  return freedCount;
}
