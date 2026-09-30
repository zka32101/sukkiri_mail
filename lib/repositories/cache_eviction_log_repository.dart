import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/cache_eviction_log.dart';
import '../services/app_firestore.dart';

class CacheEvictionLogRepository {
  final FirebaseFirestore _db;

  CacheEvictionLogRepository({FirebaseFirestore? db})
    : _db = db ?? appFirestore();

  CollectionReference<Map<String, dynamic>> get _col =>
      _db.collection('cacheEvictionLogs');

  Future<int> totalFreedBytes(String userId) async {
    final snap = await _col.where('userId', isEqualTo: userId).get();
    return snap.docs.fold<int>(
      0,
      (total, d) =>
          total + ((d.data()['freedBytesEstimate'] as num?)?.toInt() ?? 0),
    );
  }

  Future<void> add(CacheEvictionLog log) {
    return _col.add(log.toMap());
  }
}
