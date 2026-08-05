/// カテゴリ自動判定の対象カテゴリ。
enum MailCategory { promotion, notification, invoice, other }

MailCategory mailCategoryFromString(String v) {
  switch (v) {
    case 'notification':
      return MailCategory.notification;
    case 'invoice':
      return MailCategory.invoice;
    case 'other':
      return MailCategory.other;
    case 'promotion':
    default:
      return MailCategory.promotion;
  }
}

String mailCategoryToString(MailCategory c) {
  switch (c) {
    case MailCategory.notification:
      return 'notification';
    case MailCategory.invoice:
      return 'invoice';
    case MailCategory.other:
      return 'other';
    case MailCategory.promotion:
      return 'promotion';
  }
}

/// action は archive 固定（恒久削除は実装しない原則）。
class CategoryRule {
  final String id;
  final String userId;
  final MailCategory category;
  final int retentionDays;
  final String? accountId; // null = 全アカウント共通

  const CategoryRule({
    required this.id,
    required this.userId,
    required this.category,
    required this.retentionDays,
    this.accountId,
  });

  static const String action = 'archive';

  CategoryRule copyWith({int? retentionDays, String? accountId}) {
    return CategoryRule(
      id: id,
      userId: userId,
      category: category,
      retentionDays: retentionDays ?? this.retentionDays,
      accountId: accountId ?? this.accountId,
    );
  }

  factory CategoryRule.fromMap(String id, Map<String, dynamic> m) {
    return CategoryRule(
      id: id,
      userId: m['userId'] as String? ?? '',
      category: mailCategoryFromString(m['category'] as String? ?? 'promotion'),
      retentionDays: (m['retentionDays'] as num?)?.toInt() ?? 30,
      accountId: m['accountId'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'category': mailCategoryToString(category),
      'retentionDays': retentionDays,
      'action': action,
      'accountId': accountId,
    };
  }
}
