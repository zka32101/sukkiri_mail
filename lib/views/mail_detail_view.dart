import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';
import '../models/email_meta.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/mail_actions.dart';

/// メール一覧のタップ先。件名・差出人・スニペットは常時保持しているメタデータから即表示し、
/// 本文全文はここでのオンデマンド取得（fetchMessageBody）に限定する
/// （一覧表示時点で全文を毎回取得するとAPI呼び出しが増えすぎるため）。
class MailDetailView extends ConsumerStatefulWidget {
  const MailDetailView({super.key, required this.meta, required this.account});

  final EmailMeta meta;
  final LinkedAccount account;

  @override
  ConsumerState<MailDetailView> createState() => _MailDetailViewState();
}

class _MailDetailViewState extends ConsumerState<MailDetailView> {
  String? _fullBodyHtml;
  bool _loadingBody = false;
  String? _bodyError;

  EmailMeta get meta => widget.meta;

  @override
  void initState() {
    super.initState();
    // ボタン操作を待たず、詳細画面を開いた時点で自動的に全文を取得する。
    _loadFullBody();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.mailDetailTitle),
        actions: [
          IconButton(
            icon: Icon(meta.isPinned ? Icons.push_pin : Icons.push_pin_outlined),
            tooltip: meta.isPinned
                ? l10n.mailListPinToggleOff
                : l10n.mailListPinToggleOn,
            onPressed: () => ref
                .read(emailMetaRepositoryProvider)
                .setPinned(meta.id, !meta.isPinned),
          ),
        ],
      ),
      body: ListView(
        // HTML本文側の要素（メール内のCTAボタン等）が画面最下部ぎりぎりに来ると
        // 端末のジェスチャーナビゲーションバーに隠れて見切れるため、下部に余裕を持たせる。
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          32 + MediaQuery.paddingOf(context).bottom,
        ),
        children: [
          Text(
            meta.subject.isEmpty ? l10n.mailDetailNoSubject : meta.subject,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          if (meta.senderEmail.isNotEmpty)
            Text(
              meta.senderEmail,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          const SizedBox(height: 4),
          Text(
            _formatDateTime(meta.receivedAt),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const Divider(height: 32),
          if (_fullBodyHtml != null)
            HtmlWidget(_fullBodyHtml!)
          else if (_loadingBody)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Text(meta.snippet),
          if (_bodyError != null) ...[
            const SizedBox(height: 8),
            Text(
              _bodyError!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              icon: const Icon(Icons.refresh),
              label: Text(l10n.commonRetry),
              onPressed: _loadingBody ? null : _loadFullBody,
            ),
          ],
          if (widget.account.provider == MailProviderType.gmail) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.open_in_new),
              label: Text(l10n.mailDetailOpenInMailApp),
              onPressed: _openInGmail,
            ),
          ],
          if (meta.senderEmail.isNotEmpty) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.block),
              label: Text(l10n.mailListBlockSender),
              onPressed: () => _confirmBlockSender(context, ref, l10n),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _loadFullBody() async {
    setState(() {
      _loadingBody = true;
      _bodyError = null;
    });
    try {
      final provider = resolveMailProvider(widget.account.provider);
      final body = await provider.fetchMessageBody(
        account: widget.account,
        messageId: meta.id,
      );
      if (!mounted) return;
      setState(() {
        _fullBodyHtml = body.html.isEmpty ? null : body.html;
        _loadingBody = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _bodyError = '$e';
        _loadingBody = false;
      });
    }
  }

  Future<void> _openInGmail() async {
    final uri = Uri.parse('https://mail.google.com/mail/u/0/#all/${meta.id}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _confirmBlockSender(
    BuildContext context,
    WidgetRef ref,
    AppLocalizations l10n,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(l10n.mailBlockSenderConfirm(meta.senderEmail)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l10n.commonConfirm),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    await blockSenderOneClick(ref, senderEmail: meta.senderEmail);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.mailBlockSenderDone)),
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDateTime(DateTime d) {
    return '${d.year}/${_twoDigits(d.month)}/${_twoDigits(d.day)} '
        '${_twoDigits(d.hour)}:${_twoDigits(d.minute)}';
  }
}
