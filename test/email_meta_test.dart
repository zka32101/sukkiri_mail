import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/category_rule.dart';
import 'package:sukkiri_mail/models/email_meta.dart';

EmailMeta _meta({
  bool isUnread = true,
  String subject = '件名テスト',
}) {
  return EmailMeta(
    id: 'e1',
    accountId: 'a1',
    category: MailCategory.promotion,
    receivedAt: DateTime.fromMillisecondsSinceEpoch(1000),
    snippet: 'スニペット',
    senderEmail: 'sender@example.com',
    subject: subject,
    isUnread: isUnread,
  );
}

void main() {
  group('EmailMeta.fromMap / toMap', () {
    test('subjectを含めて往復変換できる', () {
      final map = _meta().toMap();
      final restored = EmailMeta.fromMap('e1', map);

      expect(restored.subject, '件名テスト');
      expect(restored.senderEmail, 'sender@example.com');
      expect(restored.isUnread, isTrue);
    });

    test('subjectが欠落している場合は空文字にフォールバックする', () {
      final map = _meta().toMap()..remove('subject');
      final restored = EmailMeta.fromMap('e1', map);

      expect(restored.subject, '');
    });

    test('isUnreadが欠落している場合は未読扱い（安全側）にフォールバックする', () {
      final map = _meta().toMap()..remove('isUnread');
      final restored = EmailMeta.fromMap('e1', map);

      expect(restored.isUnread, isTrue);
    });
  });

  group('EmailMeta.copyWith', () {
    test('isUnreadを指定した値に更新できる', () {
      final original = _meta(isUnread: true);
      final updated = original.copyWith(isUnread: false);

      expect(updated.isUnread, isFalse);
      expect(original.isUnread, isTrue); // 元のインスタンスは不変
    });

    test('isUnreadを指定しない場合は元の値を保持する', () {
      final original = _meta(isUnread: false);
      final updated = original.copyWith(isPinned: true);

      expect(updated.isUnread, isFalse);
      expect(updated.isPinned, isTrue);
    });

    test('subjectはcopyWithの対象外で常に元の値を維持する', () {
      final original = _meta(subject: '元の件名');
      final updated = original.copyWith(isPinned: true);

      expect(updated.subject, '元の件名');
    });
  });
}
