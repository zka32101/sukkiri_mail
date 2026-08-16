import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/archive_log.dart';
import '../services/app_firestore.dart';

class ArchiveLogRepository {
  final FirebaseFirestore _db;

  ArchiveLogRepository({FirebaseFirestore? db}) : _db = db ?? appFirestore();

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('archiveLogs');

  Stream<List<ArchiveLog>> watchForUser(String userId) {
    return _col
        .where('userId', isEqualTo: userId)
        .orderBy('archivedAt', descending: true)
        .snapshots()
        .map(
          (snap) =>
              snap.docs.map((d) => ArchiveLog.fromMap(d.id, d.data())).toList(),
        );
  }
}
