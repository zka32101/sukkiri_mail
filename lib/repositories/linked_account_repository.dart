import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/linked_account.dart';
import '../services/app_firestore.dart';

class LinkedAccountRepository {
  final FirebaseFirestore _db;

  LinkedAccountRepository({FirebaseFirestore? db}) : _db = db ?? appFirestore();

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('linkedAccounts');

  Future<List<LinkedAccount>> listForUser(String userId) async {
    final snap = await _col.where('userId', isEqualTo: userId).get();
    return snap.docs.map((d) => LinkedAccount.fromMap(d.id, d.data())).toList();
  }

  Stream<List<LinkedAccount>> watchForUser(String userId) {
    return _col
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => LinkedAccount.fromMap(d.id, d.data()))
              .toList(),
        );
  }

  Future<LinkedAccount> add(LinkedAccount account) async {
    final ref = await _col.add(account.toMap());
    return LinkedAccount.fromMap(ref.id, account.toMap());
  }

  Future<void> updateColor(String accountId, String colorHex) {
    return _col.doc(accountId).update({'colorHex': colorHex});
  }

  Future<void> updateLastScanAt(String accountId, DateTime at) {
    return _col.doc(accountId).update({
      'lastScanAt': at.millisecondsSinceEpoch,
    });
  }

  Future<void> remove(String accountId) {
    return _col.doc(accountId).delete();
  }
}
