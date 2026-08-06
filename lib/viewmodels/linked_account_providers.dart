import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/linked_account.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

final linkedAccountsProvider = StreamProvider<List<LinkedAccount>>((
  ref,
) async* {
  final userId = await ref.watch(currentUserIdProvider.future);
  yield* ref.watch(linkedAccountRepositoryProvider).watchForUser(userId);
});

/// 次に割り当てるアカウントカラー（登録済みアカウントの色と重複しない）。
final nextAccountColorProvider = Provider<String>((ref) {
  final accounts = ref.watch(linkedAccountsProvider).valueOrNull ?? [];
  return pickNextAccountColor(accounts);
});
