import 'package:firebase_auth/firebase_auth.dart';

/// アプリ自体のログインは匿名認証。メールアカウント連携（Gmail/Outlook/IMAP OAuth・
/// アプリパスワード）とは別レイヤーで、こちらは個人情報を扱わない。
class AuthService {
  final FirebaseAuth _auth;

  AuthService({FirebaseAuth? auth}) : _auth = auth ?? FirebaseAuth.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  Future<User> ensureSignedIn() async {
    final existing = _auth.currentUser;
    if (existing != null) return existing;
    final credential = await _auth.signInAnonymously();
    return credential.user!;
  }

  Future<void> signOut() => _auth.signOut();
}
