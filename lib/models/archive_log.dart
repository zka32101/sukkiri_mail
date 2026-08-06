import 'category_rule.dart';

class ArchiveLog {
  final String id;
  final String userId;
  final DateTime archivedAt;
  final int emailCount;
  final MailCategory category;
  final DateTime? restoredAt;

  const ArchiveLog({
    required this.id,
    required this.userId,
    required this.archivedAt,
    required this.emailCount,
    required this.category,
    this.restoredAt,
  });

  bool get isRestored => restoredAt != null;

  ArchiveLog copyWith({DateTime? restoredAt}) {
    return ArchiveLog(
      id: id,
      userId: userId,
      archivedAt: archivedAt,
      emailCount: emailCount,
      category: category,
      restoredAt: restoredAt ?? this.restoredAt,
    );
  }

  factory ArchiveLog.fromMap(String id, Map<String, dynamic> m) {
    return ArchiveLog(
      id: id,
      userId: m['userId'] as String? ?? '',
      archivedAt: m['archivedAt'] is DateTime
          ? m['archivedAt'] as DateTime
          : DateTime.fromMillisecondsSinceEpoch(
              (m['archivedAt'] as num?)?.toInt() ?? 0,
            ),
      emailCount: (m['emailCount'] as num?)?.toInt() ?? 0,
      category: mailCategoryFromString(m['category'] as String? ?? 'promotion'),
      restoredAt: m['restoredAt'] == null
          ? null
          : (m['restoredAt'] is DateTime
                ? m['restoredAt'] as DateTime
                : DateTime.fromMillisecondsSinceEpoch(
                    (m['restoredAt'] as num).toInt(),
                  )),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'archivedAt': archivedAt.millisecondsSinceEpoch,
      'emailCount': emailCount,
      'category': mailCategoryToString(category),
      'restoredAt': restoredAt?.millisecondsSinceEpoch,
    };
  }
}
