import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/email_meta.dart';

class EmailMetaRepository {
  final FirebaseFirestore _db;

  EmailMetaRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('emailMeta');

  /// firestore.rulesのemailMeta読み取り許可は resource.data.userId ==
  /// auth.uid のみ（他人のメタデータを覗けないようにするため）。Firestoreの
  /// セキュリティルールはコレクションクエリ全体を静的に検証するため、
  /// クエリ自体にuserIdの等価フィルタが無いと（accountId等だけでは）
  /// permission-deniedで弾かれる。呼び出し側は必ず現在ログイン中のuidを渡すこと。
  Stream<List<EmailMeta>> watchForAccount(
    String accountId, {
    required String userId,
    EmailStatus? status,
    LocalCacheStatus? localCacheStatus,
  }) {
    Query<Map<String, dynamic>> q = _col
        .where('accountId', isEqualTo: accountId)
        .where('userId', isEqualTo: userId);
    if (status != null) {
      q = q.where('status', isEqualTo: emailStatusToString(status));
    }
    if (localCacheStatus != null) {
      q = q.where(
        'localCacheStatus',
        isEqualTo: localCacheStatusToString(localCacheStatus),
      );
    }
    return q.snapshots().map(
      (snap) =>
          snap.docs.map((d) => EmailMeta.fromMap(d.id, d.data())).toList(),
    );
  }

  /// メール一覧画面用：実Gmail側の状態(status)には触れず、アプリ表示からのみ
  /// 経過日数で外された(localCacheStatus=purged)ものを除いた「今アプリに見えるべき」一覧。
  Stream<List<EmailMeta>> watchVisibleForAccount(
    String accountId, {
    required String userId,
  }) {
    return watchForAccount(
      accountId,
      userId: userId,
      status: EmailStatus.active,
      localCacheStatus: LocalCacheStatus.cached,
    );
  }

  /// メタデータは件名・送信者・日時・カテゴリ・スニペットで常時検索可能（キャッシュ削除後も）。
  Future<List<EmailMeta>> search(
    String accountId,
    String query, {
    required String userId,
  }) async {
    // Firestoreの部分一致検索は不可のため、簡易実装としてsnippetの前方一致で絞り込む。
    // 本番ではAlgolia等の全文検索インデックスに置き換え可能な設計にしておく。
    final snap = await _col
        .where('accountId', isEqualTo: accountId)
        .where('userId', isEqualTo: userId)
        .get();
    final all = snap.docs
        .map((d) => EmailMeta.fromMap(d.id, d.data()))
        .toList();
    final q = query.toLowerCase();
    return all.where((m) => m.snippet.toLowerCase().contains(q)).toList();
  }

  Future<void> setPinned(String emailId, bool isPinned) {
    return _col.doc(emailId).update({'isPinned': isPinned});
  }

  /// 受信箱スッキリ度ダッシュボード用：アカウント横断の保護（ピン留め）件数。
  Future<int> countPinned(String userId) async {
    final snap = await _col
        .where('userId', isEqualTo: userId)
        .where('isPinned', isEqualTo: true)
        .count()
        .get();
    return snap.count ?? 0;
  }

  Future<void> setStatus(String emailId, EmailStatus status) {
    return _col.doc(emailId).update({'status': emailStatusToString(status)});
  }

  Future<void> setLocalCacheStatus(String emailId, LocalCacheStatus status) {
    return _col.doc(emailId).update({
      'localCacheStatus': localCacheStatusToString(status),
    });
  }

  /// 差出人ブロック時：既にキャッシュ済みの該当差出人メールを一覧から即座に
  /// 除外するため、localCacheStatusをまとめてblockedへ更新する。
  /// Firestoreの一括更新に単一クエリの範囲制限は無いが、対象件数が多い場合に
  /// 備えWriteBatchでまとめて送信する。
  Future<void> markSenderBlocked(
    String senderEmail, {
    required String userId,
    String? accountId,
  }) async {
    Query<Map<String, dynamic>> q = _col
        .where('userId', isEqualTo: userId)
        .where('senderEmail', isEqualTo: senderEmail);
    if (accountId != null) {
      q = q.where('accountId', isEqualTo: accountId);
    }
    final snap = await q.get();
    if (snap.docs.isEmpty) return;
    final batch = _db.batch();
    for (final doc in snap.docs) {
      batch.update(doc.reference, {
        'localCacheStatus': localCacheStatusToString(LocalCacheStatus.blocked),
      });
    }
    await batch.commit();
  }

  /// 差出人ブロックルールの追加UI用：これまでに取り込まれた差出人アドレス一覧
  /// （全アカウント横断、重複除去）。
  Future<List<String>> distinctSenders(String userId) async {
    final snap = await _col.where('userId', isEqualTo: userId).get();
    final senders = snap.docs
        .map((d) => d.data()['senderEmail'] as String? ?? '')
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();
    senders.sort();
    return senders;
  }
}
