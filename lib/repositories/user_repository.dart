import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/user.dart';

class UserRepository {
  final FirebaseFirestore _db;

  UserRepository({FirebaseFirestore? db})
    : _db = db ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _col => _db.collection('users');

  Future<AppUser?> get(String userId) async {
    final doc = await _col.doc(userId).get();
    if (!doc.exists) return null;
    return AppUser.fromMap(doc.id, doc.data()!);
  }

  Future<AppUser> ensureExists(String userId) async {
    final existing = await get(userId);
    if (existing != null) return existing;
    final user = AppUser(id: userId, createdAt: DateTime.now());
    await _col.doc(userId).set(user.toMap());
    return user;
  }

  Future<void> setPlan(String userId, UserPlan plan) {
    return _col.doc(userId).update({'plan': userPlanToString(plan)});
  }

  Future<void> setLocalCacheRetentionDays(String userId, int days) {
    return _col.doc(userId).update({'localCacheRetentionDays': days});
  }

  Future<void> setSyncIntervalHours(String userId, int hours) {
    return _col.doc(userId).set(
      {'syncIntervalHours': hours},
      SetOptions(merge: true),
    );
  }

  Future<void> setFcmToken(String userId, String? token) {
    return _col.doc(userId).set({'fcmToken': token}, SetOptions(merge: true));
  }

  Future<void> setNotifySenders(String userId, List<String> senders) {
    return _col
        .doc(userId)
        .set({'notifySenders': senders}, SetOptions(merge: true));
  }

  Stream<AppUser?> watch(String userId) {
    return _col.doc(userId).snapshots().map(
          (doc) => doc.exists ? AppUser.fromMap(doc.id, doc.data()!) : null,
        );
  }
}
