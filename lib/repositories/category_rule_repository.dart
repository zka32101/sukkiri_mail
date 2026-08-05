import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/category_rule.dart';

class CategoryRuleRepository {
  final FirebaseFirestore _db;

  CategoryRuleRepository({FirebaseFirestore? db}) : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection('categoryRules');

  Stream<List<CategoryRule>> watchForUser(String userId) {
    return _col.where('userId', isEqualTo: userId).snapshots().map(
          (snap) => snap.docs.map((d) => CategoryRule.fromMap(d.id, d.data())).toList(),
        );
  }

  Future<CategoryRule> upsert(CategoryRule rule) async {
    if (rule.id.isEmpty) {
      final ref = await _col.add(rule.toMap());
      return CategoryRule.fromMap(ref.id, rule.toMap());
    }
    await _col.doc(rule.id).set(rule.toMap());
    return rule;
  }

  Future<void> remove(String ruleId) {
    return _col.doc(ruleId).delete();
  }
}
