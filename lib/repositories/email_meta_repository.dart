import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/email_meta.dart';

class EmailMetaRepository {
  final FirebaseFirestore _db;

  EmailMetaRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('emailMeta');

  Stream<List<EmailMeta>> watchForAccount(
    String accountId, {
    EmailStatus? status,
  }) {
    Query<Map<String, dynamic>> q = _col.where(
      'accountId',
      isEqualTo: accountId,
    );
    if (status != null) {
      q = q.where('status', isEqualTo: emailStatusToString(status));
    }
    return q.snapshots().map(
      (snap) =>
          snap.docs.map((d) => EmailMeta.fromMap(d.id, d.data())).toList(),
    );
  }

  /// メタデータは件名・送信者・日時・カテゴリ・スニペットで常時検索可能（キャッシュ削除後も）。
  Future<List<EmailMeta>> search(String accountId, String query) async {
    // Firestoreの部分一致検索は不可のため、簡易実装としてsnippetの前方一致で絞り込む。
    // 本番ではAlgolia等の全文検索インデックスに置き換え可能な設計にしておく。
    final snap = await _col.where('accountId', isEqualTo: accountId).get();
    final all = snap.docs
        .map((d) => EmailMeta.fromMap(d.id, d.data()))
        .toList();
    final q = query.toLowerCase();
    return all.where((m) => m.snippet.toLowerCase().contains(q)).toList();
  }

  Future<void> setPinned(String emailId, bool isPinned) {
    return _col.doc(emailId).update({'isPinned': isPinned});
  }

  Future<void> setStatus(String emailId, EmailStatus status) {
    return _col.doc(emailId).update({'status': emailStatusToString(status)});
  }

  Future<void> setLocalCacheStatus(String emailId, LocalCacheStatus status) {
    return _col.doc(emailId).update({
      'localCacheStatus': localCacheStatusToString(status),
    });
  }
}
