import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/archive_log.dart';

class ArchiveLogRepository {
  final FirebaseFirestore _db;

  ArchiveLogRepository({FirebaseFirestore? db}) : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection('archiveLogs');

  Stream<List<ArchiveLog>> watchForUser(String userId) {
    return _col
        .where('userId', isEqualTo: userId)
        .orderBy('archivedAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => ArchiveLog.fromMap(d.id, d.data())).toList());
  }

  Future<int> totalArchivedCount(String userId) async {
    final snap = await _col.where('userId', isEqualTo: userId).get();
    return snap.docs.fold<int>(
      0,
      (total, d) => total + ((d.data()['emailCount'] as num?)?.toInt() ?? 0),
    );
  }

  Future<void> markRestored(String logId, DateTime restoredAt) {
    return _col.doc(logId).update({'restoredAt': restoredAt.millisecondsSinceEpoch});
  }
}
