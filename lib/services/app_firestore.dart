import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

/// 【要確認】このFirebaseプロジェクトのFirestoreは既定(default)データベースではなく、
/// 「sukkirimail」という名前で作成された。FirebaseFirestore.instanceは常にdefault
/// データベースへ接続してしまうため、全リポジトリはこの関数経由でインスタンスを取得する。
/// databaseIdを変更する場合はここだけを直せばよい。
const String _firestoreDatabaseId = 'sukkirimail';

FirebaseFirestore appFirestore() {
  return FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: _firestoreDatabaseId,
  );
}
