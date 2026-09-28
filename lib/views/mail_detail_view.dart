import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/email_meta.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/mail_actions.dart';

/// メール一覧のタップ先。本文はオンデマンド取得の対象だが（fetchMessageBody）、
/// ここではまず既に保持しているメタデータ（件名・差出人・スニペット等）を表示し、
/// 一覧・詳細どちらからでも同じワンクリック操作（保護/差出人ブロック/カテゴリ整理）を
/// 行えるようにする。
class MailDetailView extends ConsumerWidget {
  const MailDetailView({super.key, required this.meta});

  final EmailMeta meta;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
        padding: const EdgeInsets.all(16),
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
          Text(meta.snippet),
          const SizedBox(height: 32),
          if (meta.senderEmail.isNotEmpty)
            OutlinedButton.icon(
              icon: const Icon(Icons.block),
              label: Text(l10n.mailListBlockSender),
              onPressed: () => _confirmBlockSender(context, ref, l10n),
            ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            icon: const Icon(Icons.rule),
            label: Text(l10n.mailDetailApplyCategoryRule),
            onPressed: () => _applyCategoryRule(context, ref, l10n),
          ),
        ],
      ),
    );
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

  Future<void> _applyCategoryRule(
    BuildContext context,
    WidgetRef ref,
    AppLocalizations l10n,
  ) async {
    await applyCategoryRuleOneClick(ref, category: meta.category);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.mailDetailApplyCategoryRuleDone)),
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDateTime(DateTime d) {
    return '${d.year}/${_twoDigits(d.month)}/${_twoDigits(d.day)} '
        '${_twoDigits(d.hour)}:${_twoDigits(d.minute)}';
  }
}
