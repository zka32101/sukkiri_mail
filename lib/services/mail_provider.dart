import '../models/email_meta.dart';
import '../models/linked_account.dart';

/// スキャン結果1件（Aha Moment用の検出結果）。
class ScanResultItem {
  final EmailMeta meta;
  final String subject;
  final String senderEmail;

  const ScanResultItem({
    required this.meta,
    required this.subject,
    required this.senderEmail,
  });
}

/// メール本文（オンデマンド取得結果）。
class MessageBody {
  final String messageId;
  final String html;
  final List<String> attachmentNames;

  const MessageBody({
    required this.messageId,
    required this.html,
    this.attachmentNames = const [],
  });
}

/// 全プロバイダ（Gmail/Outlook/IMAP）共通インターフェース。
/// 実装はすべてCloud Functions経由。恒久削除は行わない（アーカイブ/ラベル変更のみ）。
abstract class MailProvider {
  MailProviderType get providerType;

  /// OAuth同意 or アプリパスワード検証を行い、アカウントを連携する。
  Future<LinkedAccount> connect({required String userId});

  /// アカウントをスキャンし、カテゴリ自動判定した検出結果を返す（Aha Moment用）。
  Future<List<ScanResultItem>> scan({required LinkedAccount account});

  /// 指定したメールをアーカイブする（サーバー側、可逆）。
  Future<void> archive({
    required LinkedAccount account,
    required List<String> emailIds,
  });

  /// アーカイブ済みメールを受信箱に復元する。
  Future<void> restore({
    required LinkedAccount account,
    required List<String> emailIds,
  });

  /// カテゴリ一覧を返す（プロバイダ固有の分類ラベルがあれば反映）。
  Future<List<String>> listCategories({required LinkedAccount account});

  /// 1通だけ本文/添付をオンデマンドでクラウド取得する（明示タップ時のみ発火）。
  /// 既存スコープの「読み取り」範囲内で対応可能。追加権限・追加審査は不要。
  Future<MessageBody> fetchMessageBody({
    required LinkedAccount account,
    required String messageId,
  });
}
