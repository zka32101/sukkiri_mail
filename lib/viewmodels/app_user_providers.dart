import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// サインイン中ユーザーのプロフィール（localCacheRetentionDays等の設定を含む）。
final currentAppUserProvider = FutureProvider<AppUser>((ref) async {
  final userId = await ref.watch(currentUserIdProvider.future);
  final user = await ref.watch(userRepositoryProvider).get(userId);
  return user ?? AppUser(id: userId, createdAt: DateTime.now());
});
