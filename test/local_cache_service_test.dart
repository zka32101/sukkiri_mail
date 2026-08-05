import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/email_meta.dart';
import 'package:sukkiri_mail/models/category_rule.dart';
import 'package:sukkiri_mail/models/sender_block_rule.dart';
import 'package:sukkiri_mail/services/local_cache_service.dart';

void main() {
  final service = LocalCacheService();
  final now = DateTime(2026, 8, 5);

  EmailMeta makeMeta({
    bool isPinned = false,
    LocalCacheStatus status = LocalCacheStatus.cached,
    int daysAgo = 0,
  }) {
    return EmailMeta(
      id: 'm1',
      accountId: 'a1',
      category: MailCategory.promotion,
      receivedAt: now.subtract(Duration(days: daysAgo)),
      snippet: 'snippet',
      isPinned: isPinned,
      localCacheStatus: status,
    );
  }

  group('ルール適用順序: ①SenderBlockRule ②isPinned ③時間経過パージ', () {
    test('①差出人ブロックはピン留めより優先し、blockedになる', () {
      final meta = makeMeta(isPinned: true, daysAgo: 1);
      final blockRule = SenderBlockRule(
        id: 'b1',
        userId: 'u1',
        pattern: '@spam.com',
        matchType: SenderMatchType.domain,
        createdAt: now,
      );

      final status = service.determineStatus(
        meta: meta,
        senderEmail: 'seller@spam.com',
        blockRules: [blockRule],
        retentionDays: 30,
        now: now,
      );

      expect(status, LocalCacheStatus.blocked);
    });

    test('②ピン留めは経過日数によらずcachedのまま', () {
      final meta = makeMeta(isPinned: true, daysAgo: 365);

      final status = service.determineStatus(
        meta: meta,
        senderEmail: 'friend@example.com',
        blockRules: const [],
        retentionDays: 30,
        now: now,
      );

      expect(status, LocalCacheStatus.cached);
    });

    test('③保護なし・ブロックなしで経過日数が保持期間を超えたらpurgedになる', () {
      final meta = makeMeta(daysAgo: 31);

      final status = service.determineStatus(
        meta: meta,
        senderEmail: 'shop@example.com',
        blockRules: const [],
        retentionDays: 30,
        now: now,
      );

      expect(status, LocalCacheStatus.purged);
    });

    test('保持期間内はcachedのまま', () {
      final meta = makeMeta(daysAgo: 10);

      final status = service.determineStatus(
        meta: meta,
        senderEmail: 'shop@example.com',
        blockRules: const [],
        retentionDays: 30,
        now: now,
      );

      expect(status, LocalCacheStatus.cached);
    });

    test('未読は経過日数によらずcachedのまま', () {
      final meta = makeMeta(daysAgo: 365);

      final status = service.determineStatus(
        meta: meta,
        senderEmail: 'shop@example.com',
        blockRules: const [],
        retentionDays: 30,
        now: now,
        isUnread: true,
      );

      expect(status, LocalCacheStatus.cached);
    });
  });

  group('planEviction', () {
    test('状態が変化するメールだけを返す', () {
      final metas = [
        makeMeta(daysAgo: 40), // purged化する
        makeMeta(isPinned: true, daysAgo: 40), // pinned→変化なし
      ];
      final withIds = [
        metas[0].copyWith(),
        metas[1],
      ];
      // idを区別するためコピーしてid差し替え
      final m1 = EmailMeta.fromMap('m1', withIds[0].toMap());
      final m2 = EmailMeta.fromMap('m2', withIds[1].toMap());

      final result = service.planEviction(
        metas: [m1, m2],
        senderEmailByMetaId: {'m1': 'shop@example.com', 'm2': 'shop@example.com'},
        blockRules: const [],
        retentionDays: 30,
        now: now,
      );

      expect(result.length, 1);
      expect(result.first.id, 'm1');
      expect(result.first.localCacheStatus, LocalCacheStatus.purged);
    });
  });

  test('estimateFreedBytes は件数に応じて概算する', () {
    final bytes = service.estimateFreedBytes(emailCount: 10, avgBytesPerEmail: 1000);
    expect(bytes, 10000);
  });
}
