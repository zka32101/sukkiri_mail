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

  Future<void> _connect(MailProviderType type) async {
    setState(() => _connecting = true);
    try {
      final userId = await ref.read(currentUserIdProvider.future);
      final provider = resolveMailProvider(type);
      final account = await provider.connect(userId: userId);
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
                    onPressed: () => _connect(MailProviderType.gmail),
                  ),
                  const SizedBox(height: 12),
                  _ProviderButton(
                    icon: Icons.outbox_outlined,
                    label: l10n.accountLinkOutlook,
                    onPressed: () => _connect(MailProviderType.outlook),
                  ),
                  const SizedBox(height: 12),
                  _ProviderButton(
                    icon: Icons.alternate_email,
                    label: l10n.accountLinkImap,
                    onPressed: () => _connect(MailProviderType.imap),
                  ),
                ],
              ),
      ),
    );
  }
}

class _ProviderButton extends StatelessWidget {
  const _ProviderButton({required this.icon, required this.label, required this.onPressed});

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
