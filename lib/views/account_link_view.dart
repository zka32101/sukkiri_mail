import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/auth_provider.dart';
import 'scan_result_view.dart';

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

  /// Gmail/Outlookは実OAuth（クライアントID登録・リダイレクトURI設定）が未整備のため、
  /// 誤って接続を試みて分かりにくいエラーになるのを避け、状況を明示するダイアログを出す。
  Future<void> _showComingSoon(String providerLabel) {
    final l10n = AppLocalizations.of(context)!;
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(providerLabel),
        content: Text('$providerLabelとの連携は準備中です。現在は「${l10n.accountLinkImap}」からご利用いただけます。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
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
                    onPressed: () => _showComingSoon(l10n.accountLinkGmail),
                  ),
                  const SizedBox(height: 12),
                  _ProviderButton(
                    icon: Icons.outbox_outlined,
                    label: l10n.accountLinkOutlook,
                    onPressed: () => _showComingSoon(l10n.accountLinkOutlook),
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
