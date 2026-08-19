import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../services/mail_provider.dart';

/// アカウント連携→自動スキャン→「◯件検出・スッキリ度プレビュー」= Aha Moment最短動線。
/// account単位でスキャン結果をキャッシュするfamily provider。
/// autoDisposeにより、ScanResultView等の閲覧画面を離れて誰も参照しなくなった
/// スキャン結果（件名・送信者を含む数十〜数百件規模になり得る）はキャッシュから解放される
/// （非autoDisposeだとアプリセッション中ずっとメモリに残り続けてしまう）。
final scanResultProvider =
    FutureProvider.autoDispose.family<List<ScanResultItem>, LinkedAccount>((
      ref,
      account,
    ) async {
      final provider = resolveMailProvider(account.provider);
      return provider.scan(account: account);
    });

/// 選択中（アーカイブ対象として選ばれた）メールIDの状態。
final selectedArchiveIdsProvider = StateProvider<Set<String>>((ref) => {});
