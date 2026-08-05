import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../services/mail_provider.dart';

/// アカウント連携→自動スキャン→「◯件検出・スッキリ度プレビュー」= Aha Moment最短動線。
/// account単位でスキャン結果をキャッシュするfamily provider。
final scanResultProvider =
    FutureProvider.family<List<ScanResultItem>, LinkedAccount>((ref, account) async {
  final provider = resolveMailProvider(account.provider);
  return provider.scan(account: account);
});

/// 選択中（アーカイブ対象として選ばれた）メールIDの状態。
final selectedArchiveIdsProvider = StateProvider<Set<String>>((ref) => {});
