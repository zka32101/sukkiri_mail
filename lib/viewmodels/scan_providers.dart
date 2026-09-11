import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/linked_account.dart';
import '../models/email_meta.dart';
import '../services/app_firestore.dart';
import '../services/mail_provider.dart';

/// Cloud Tasks非同期スキャンを開始。
/// scanAccountを呼び出してスキャンタスクをエンキュー。
/// 即座に { status: "scanning" } を返す（UI非ブロッキング）。
final startScanTaskProvider =
    FutureProvider.family<Map<String, dynamic>, LinkedAccount>((
      ref,
      account,
    ) async {
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('scanAccount');
      final result = await callable.call<Map<String, dynamic>>({
        'provider': mailProviderTypeToString(account.provider),
        'accountId': account.id,
      });
      return Map<String, dynamic>.from(result.data as Map);
    });

/// Firestore real-time listenerでscanStatusをリッスン。
/// linked_accounts/{accountId} のscanStatusフィールドを監視。
final scanStatusProvider =
    StreamProvider.family<LinkedAccount?, String>((ref, accountId) {
      final db = appFirestore();
      return db
          .collection('linkedAccounts')
          .doc(accountId)
          .snapshots()
          .map((snap) {
        if (!snap.exists) return null;
        return LinkedAccount.fromMap(snap.id, snap.data() ?? {});
      });
    });

/// scanStatus="completed"になったらemailMetaを取得。
/// scanResultProvider は family FutureProvider で、accountIdに対する
/// スキャン結果をキャッシュする（autoDisposeで不要時に解放）。
final scanResultProvider =
    FutureProvider.autoDispose.family<List<ScanResultItem>, String>((
      ref,
      accountId,
    ) async {
      // scanStatus="completed" になるまで待機
      final accountAsync = ref.watch(scanStatusProvider(accountId));
      final account = accountAsync.whenData((acc) => acc).value;

      if (account == null || account.scanStatus != 'completed') {
        return [];
      }

      // emailMeta を取得
      final db = appFirestore();
      final querySnap = await db
          .collection('emailMeta')
          .where('accountId', isEqualTo: accountId)
          .where('status', isNotEqualTo: 'archived')
          .orderBy('status')
          .orderBy('receivedAt', descending: true)
          .get();

      final items = querySnap.docs.map((doc) {
        final m = doc.data();
        return ScanResultItem(
          meta: EmailMeta.fromMap(doc.id, m),
          subject: m['subject'] as String? ?? '',
          senderEmail: m['senderEmail'] as String? ?? '',
        );
      }).toList();

      return items;
    });

/// 選択中（アーカイブ対象として選ばれた）メールIDの状態。
final selectedArchiveIdsProvider = StateProvider<Set<String>>((ref) => {});
