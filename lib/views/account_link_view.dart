import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/auth_provider.dart';
import 'scan_result_view.dart';

/// OutlookのOAuth認可リクエストで使うredirect_uri。Microsoftが「ネイティブ/デスクトップアプリ」
/// 向けに提供している特別な固定エンドポイントで、遷移後にブラウザのURLへ ?code=... が付与される。
/// Azure Portal側のアプリ登録でこのURIをリダイレクトURIとして登録しておく必要がある。
const _outlookRedirectUri =
    'https://login.microsoftonline.com/common/oauth2/nativeclient';

/// GmailのOAuth「Webアプリケーション」タイプクライアントID（Google Cloud Console、
/// プロジェクト app1-6c108 で発行）。GoogleSignInのserverAuthCode取得に必須。
/// client_id自体は非秘密（クライアントシークレットのみCloud Functions側のSecret Managerで保持）。
const _gmailOAuthServerClientId =
    '663640153690-5q7jop7h1vmmgtr0i8gtsfjeg34m1dh2.apps.googleusercontent.com';

/// Aha Moment動線 Step2: プロバイダ選択→OAuth同意/アプリパスワード入力。
/// 初期実装優先順位：①Gmail（gmail.modify）②Outlook（Mail.ReadWrite）③汎用IMAP。
class AccountLinkView extends ConsumerStatefulWidget {
  const AccountLinkView({super.key});

  @override
  ConsumerState<AccountLinkView> createState() => _AccountLinkViewState();
}

class _AccountLinkViewState extends ConsumerState<AccountLinkView> {
  bool _connecting = false;

  Future<void> _connect(
    MailProviderType type, {
    Map<String, dynamic> params = const {},
  }) async {
    setState(() => _connecting = true);
    try {
      final userId = await ref.read(currentUserIdProvider.future);
      final provider = resolveMailProvider(type);
      final account = await provider.connect(userId: userId, params: params);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => ScanResultView(account: account)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  /// OAuthクライアントID等、実行時に必要な（秘密ではない）公開設定値をRemote Configから取得する。
  /// クライアントシークレットは決してクライアントへ渡さず、Cloud Functions側のSecret Managerのみで
  /// 保持する（クライアントに必要なのはOAuth同意画面へ渡す公開のclient_idのみ）。
  Future<String> _remoteConfigString(String key) async {
    final remoteConfig = FirebaseRemoteConfig.instance;
    try {
      await remoteConfig.setConfigSettings(
        RemoteConfigSettings(
          fetchTimeout: const Duration(seconds: 10),
          minimumFetchInterval: const Duration(hours: 1),
        ),
      );
      await remoteConfig.fetchAndActivate();
    } catch (_) {
      // オフライン等で取得に失敗した場合はSDKのデフォルト/キャッシュ値にフォールバックする。
    }
    return remoteConfig.getString(key);
  }

  Future<void> _showNotConfigured(String providerLabel, String detail) {
    final l10n = AppLocalizations.of(context)!;
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(providerLabel),
        content: Text(
          '$providerLabelとの連携は現在準備中です（$detail）。現在は「${l10n.accountLinkImap}」からご利用いただけます。',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
    );
  }

  /// GmailはGoogleSignInのネイティブOAuthフローで認可コード（serverAuthCode）を取得し、
  /// Cloud Functions側でアクセストークンへ交換する。
  Future<void> _connectGmail() async {
    try {
      final googleSignIn = GoogleSignIn(
        scopes: const ['https://www.googleapis.com/auth/gmail.modify'],
        serverClientId: _gmailOAuthServerClientId,
      );
      final account = await googleSignIn.signIn();
      if (account == null) return; // ユーザーがキャンセル
      final authCode = account.serverAuthCode;
      if (authCode == null || authCode.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Googleの認可コードを取得できませんでした')),
        );
        return;
      }
      if (!mounted) return;
      await _connect(MailProviderType.gmail, params: {'authCode': authCode});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  /// OutlookはMicrosoft側にネイティブSDKを導入していないため、外部ブラウザでOAuth同意画面を開き、
  /// 完了後のリダイレクト先URL（?code=...を含む）をユーザーに貼り付けてもらう方式で認可コードを得る。
  Future<void> _connectOutlook() async {
    final l10n = AppLocalizations.of(context)!;
    final clientId = await _remoteConfigString('outlook_oauth_client_id');
    if (clientId.isEmpty) {
      if (!mounted) return;
      await _showNotConfigured(
        l10n.accountLinkOutlook,
        'OAuthクライアントID未設定',
      );
      return;
    }

    final authUrl = Uri.https(
      'login.microsoftonline.com',
      '/consumers/oauth2/v2.0/authorize',
      {
        'client_id': clientId,
        'response_type': 'code',
        'redirect_uri': _outlookRedirectUri,
        'response_mode': 'query',
        'scope': 'Mail.ReadWrite offline_access',
      },
    );

    final pastedUrlController = TextEditingController();
    if (!mounted) return;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.accountLinkOutlook),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('①下のボタンでブラウザを開き、Microsoftアカウントでログイン・許可してください。'),
            const SizedBox(height: 8),
            const Text('②完了後に表示されるページのURLをコピーし、下に貼り付けてください。'),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () =>
                  launchUrl(authUrl, mode: LaunchMode.externalApplication),
              child: const Text('ブラウザを開く'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: pastedUrlController,
              decoration: const InputDecoration(labelText: '完了後のURL'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
    );
    if (result != true) return;
    final authCode = Uri.tryParse(
      pastedUrlController.text.trim(),
    )?.queryParameters['code'];
    if (authCode == null || authCode.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URLからcodeを読み取れませんでした')),
      );
      return;
    }
    if (!mounted) return;
    await _connect(
      MailProviderType.outlook,
      params: {'authCode': authCode, 'redirectUri': _outlookRedirectUri},
    );
  }

  Future<void> _connectImap() async {
    final l10n = AppLocalizations.of(context)!;
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    final hostController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.accountLinkImap),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'メールアドレス'),
            ),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'アプリ専用パスワード'),
            ),
            TextField(
              controller: hostController,
              decoration: const InputDecoration(
                labelText: 'IMAPホスト',
                hintText: 'imap.mail.yahoo.co.jp',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
    );
    if (result != true) return;
    final emailAddress = emailController.text.trim();
    final appPassword = passwordController.text;
    final imapHost = hostController.text.trim();
    if (emailAddress.isEmpty || appPassword.isEmpty || imapHost.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('すべての項目を入力してください')));
      return;
    }
    if (!mounted) return;
    await _connect(
      MailProviderType.imap,
      params: {
        'emailAddress': emailAddress,
        'appPassword': appPassword,
        'imapHost': imapHost,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.accountLinkTitle)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _connecting
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _ProviderButton(
                    icon: Icons.mail_outline,
                    label: l10n.accountLinkGmail,
                    onPressed: _connectGmail,
                  ),
                  const SizedBox(height: 12),
                  _ProviderButton(
                    icon: Icons.outbox_outlined,
                    label: l10n.accountLinkOutlook,
                    onPressed: _connectOutlook,
                  ),
                  const SizedBox(height: 12),
                  _ProviderButton(
                    icon: Icons.alternate_email,
                    label: l10n.accountLinkImap,
                    onPressed: _connectImap,
                  ),
                ],
              ),
      ),
    );
  }
}

class _ProviderButton extends StatelessWidget {
  const _ProviderButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon),
        label: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Text(label),
        ),
      ),
    );
  }
}
