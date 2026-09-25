import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/category_rule.dart';
import 'package:sukkiri_mail/models/email_meta.dart';
import 'package:sukkiri_mail/viewmodels/mail_list_providers.dart';

EmailMeta _meta({
  required String id,
  required int receivedAtMs,
  bool isUnread = false,
  String senderEmail = '',
}) {
  return EmailMeta(
    id: id,
    accountId: 'a1',
    category: MailCategory.promotion,
    receivedAt: DateTime.fromMillisecondsSinceEpoch(receivedAtMs),
    snippet: 'snippet-$id',
    senderEmail: senderEmail,
    isUnread: isUnread,
  );
}

void main() {
  group('sortMails', () {
    final mails = [
      _meta(id: 'old-read', receivedAtMs: 1000, isUnread: false),
      _meta(id: 'new-unread', receivedAtMs: 3000, isUnread: true),
      _meta(id: 'mid-read', receivedAtMs: 2000, isUnread: false),
    ];

    test('newest: 受信日時の降順に並ぶ', () {
      final sorted = sortMails(mails, MailListSortOrder.newest);
      expect(sorted.map((m) => m.id).toList(), [
        'new-unread',
        'mid-read',
        'old-read',
      ]);
    });

    test('unreadFirst: 未読が先頭、同条件内は受信日時の降順', () {
      final sorted = sortMails(mails, MailListSortOrder.unreadFirst);
      expect(sorted.first.id, 'new-unread');
      expect(sorted.first.isUnread, isTrue);
      // 既読同士は受信日時降順を維持する
      expect(sorted[1].id, 'mid-read');
      expect(sorted[2].id, 'old-read');
    });

    test('sender: 送信者のアルファベット順、同送信者内は受信日時の降順', () {
      final bySender = [
        _meta(id: 'b-old', receivedAtMs: 1000, senderEmail: 'b@example.com'),
        _meta(id: 'a-new', receivedAtMs: 3000, senderEmail: 'a@example.com'),
        _meta(id: 'a-old', receivedAtMs: 1000, senderEmail: 'a@example.com'),
      ];
      final sorted = sortMails(bySender, MailListSortOrder.sender);
      expect(sorted.map((m) => m.id).toList(), [
        'a-new',
        'a-old',
        'b-old',
      ]);
    });

    test('元のリストを変更しない', () {
      final original = List<EmailMeta>.from(mails);
      sortMails(mails, MailListSortOrder.newest);
      expect(mails.map((m) => m.id), original.map((m) => m.id));
    });
  });

  group('groupBySender', () {
    test('送信者ごとにまとめ、最新メールを含むグループを先頭にする', () {
      final mails = [
        _meta(id: '1', receivedAtMs: 1000, senderEmail: 'old@example.com'),
        _meta(id: '2', receivedAtMs: 3000, senderEmail: 'new@example.com'),
        _meta(id: '3', receivedAtMs: 500, senderEmail: 'old@example.com'),
      ];

      final groups = groupBySender(mails);

      expect(groups.keys.first, 'new@example.com');
      expect(groups['old@example.com']!.length, 2);
      expect(groups['new@example.com']!.length, 1);
    });

    test('送信者不明（空文字）もグループとして扱う', () {
      final mails = [_meta(id: '1', receivedAtMs: 1000, senderEmail: '')];
      final groups = groupBySender(mails);

      expect(groups.containsKey(''), isTrue);
      expect(groups['']!.single.id, '1');
    });
  });
}
