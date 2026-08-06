import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/linked_account.dart';
import '../services/cloud_functions_mail_provider.dart';
import '../services/mail_provider.dart';
import 'root_shell.dart';

/// Aha Moment動線 Step4: 検出結果からアーカイブ候補を選択・保護し、確定する。
/// スワイプで保護（ピン留め）＝自動アーカイブ・自動キャッシュ削除の両方から除外。
class ArchiveCandidatesView extends ConsumerStatefulWidget {
  const ArchiveCandidatesView({
    super.key,
    required this.account,
    required this.items,
  });

  final LinkedAccount account;
  final List<ScanResultItem> items;

  @override
  ConsumerState<ArchiveCandidatesView> createState() =>
      _ArchiveCandidatesViewState();
}

class _ArchiveCandidatesViewState extends ConsumerState<ArchiveCandidatesView> {
  late Set<String> _selected;
  final Set<String> _pinned = {};
  bool _archiving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.items.map((i) => i.meta.id).toSet();
  }

  Future<void> _archiveSelected() async {
    setState(() => _archiving = true);
    try {
      final provider = resolveMailProvider(widget.account.provider);
      final ids = _selected.difference(_pinned).toList();
      if (ids.isNotEmpty) {
        await provider.archive(account: widget.account, emailIds: ids);
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const RootShell()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _archiving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.archiveCandidatesTitle)),
      body: ListView.builder(
        itemCount: widget.items.length,
        itemBuilder: (context, index) {
          final item = widget.items[index];
          final id = item.meta.id;
          final isPinned = _pinned.contains(id);
          return CheckboxListTile(
            value: _selected.contains(id),
            onChanged: isPinned
                ? null
                : (v) {
                    setState(() {
                      if (v == true) {
                        _selected.add(id);
                      } else {
                        _selected.remove(id);
                      }
                    });
                  },
            title: Text(
              item.subject,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              item.senderEmail,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            secondary: IconButton(
              icon: Icon(isPinned ? Icons.push_pin : Icons.push_pin_outlined),
              tooltip: isPinned ? l10n.commonUnpin : l10n.commonPin,
              onPressed: () {
                setState(() {
                  if (isPinned) {
                    _pinned.remove(id);
                  } else {
                    _pinned.add(id);
                  }
                });
              },
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _archiving ? null : _archiveSelected,
            child: _archiving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(l10n.archiveCandidatesArchiveAll),
          ),
        ),
      ),
    );
  }
}
