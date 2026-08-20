import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
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

/// プラン判定（無料/Pro）等、users/{uid}ドキュメントの内容が必要な箇所で使う。
/// ドキュメントは`currentUserIdProvider`内のensureExists()で必ず作成済みのはず。
final currentAppUserProvider = FutureProvider<AppUser>((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final repo = ref.watch(userRepositoryProvider);
  return await repo.get(userId) ?? await repo.ensureExists(userId);
});
