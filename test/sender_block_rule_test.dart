import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/sender_block_rule.dart';

void main() {
  group('SenderBlockRule.matches', () {
    test('sender一致は完全一致のみ', () {
      final rule = SenderBlockRule(
        id: 'r1',
        userId: 'u1',
        pattern: 'spam@example.com',
        matchType: SenderMatchType.sender,
        createdAt: DateTime.now(),
      );

      expect(rule.matches('spam@example.com'), isTrue);
      expect(rule.matches('SPAM@example.com'), isTrue); // 大文字小文字を無視
      expect(rule.matches('other@example.com'), isFalse);
      expect(rule.matches('spam@example.co.jp'), isFalse);
    });

    test('domain一致は@付きドメインで判定', () {
      final rule = SenderBlockRule(
        id: 'r2',
        userId: 'u1',
        pattern: '@spam.co.jp',
        matchType: SenderMatchType.domain,
        createdAt: DateTime.now(),
      );

      expect(rule.matches('anyone@spam.co.jp'), isTrue);
      expect(rule.matches('anyone@notspam.co.jp'), isFalse);
      expect(rule.matches('anyone@spam.co.jp.evil.com'), isFalse);
    });

    test('domainパターンに@が無くても補完される', () {
      final rule = SenderBlockRule(
        id: 'r3',
        userId: 'u1',
        pattern: 'spam.co.jp',
        matchType: SenderMatchType.domain,
        createdAt: DateTime.now(),
      );

      expect(rule.matches('anyone@spam.co.jp'), isTrue);
    });
  });
}
