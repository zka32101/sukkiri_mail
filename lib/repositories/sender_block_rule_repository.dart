import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/sender_block_rule.dart';

class SenderBlockRuleRepository {
  final FirebaseFirestore _db;

  SenderBlockRuleRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('senderBlockRules');

  Stream<List<SenderBlockRule>> watchForUser(String userId) {
    return _col
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => SenderBlockRule.fromMap(d.id, d.data()))
              .toList(),
        );
  }

  /// 長押し「この差出人を今後ダウンロードしない」ショートカット用。
  Future<SenderBlockRule> add(SenderBlockRule rule) async {
    final ref = await _col.add(rule.toMap());
    return SenderBlockRule.fromMap(ref.id, rule.toMap());
  }

  Future<void> remove(String ruleId) {
    return _col.doc(ruleId).delete();
  }
}
