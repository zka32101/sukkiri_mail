import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/email_meta.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// メール一覧画面用：指定アカウントの「今アプリに見えるべき」メール
/// （実Gmail側は active かつ、アプリ側でも localCacheStatus=cached のもの）。
final visibleEmailsProvider =
    StreamProvider.family<List<EmailMeta>, String>((ref, accountId) {
  final userId = ref.watch(currentUserIdProvider).valueOrNull;
  if (userId == null) return const Stream.empty();
  return ref
      .watch(emailMetaRepositoryProvider)
      .watchVisibleForAccount(accountId, userId: userId);
});
