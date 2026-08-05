import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core_providers.dart';

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(authServiceProvider).authStateChanges;
});

/// アプリ起動時に匿名認証を保証し、確定したuidを返す。
final currentUserIdProvider = FutureProvider<String>((ref) async {
  final user = await ref.watch(authServiceProvider).ensureSignedIn();
  await ref.watch(userRepositoryProvider).ensureExists(user.uid);
  return user.uid;
});
