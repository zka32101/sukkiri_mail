import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/category_rule.dart';
import '../models/sender_block_rule.dart';
import '../viewmodels/auth_provider.dart';
import '../viewmodels/core_providers.dart';
import '../viewmodels/rule_providers.dart';

/// 3層構造：①カテゴリルール（Must2）②差出人ブロック（新規）③キャッシュ自動削除（Must4、UIなし・裏側処理）。
/// この画面は①②のUIを提供する。
class RuleSettingsView extends ConsumerStatefulWidget {
  const RuleSettingsView({super.key});

  @override
  ConsumerState<RuleSettingsView> createState() => _RuleSettingsViewState();
}

class _RuleSettingsViewState extends ConsumerState<RuleSettingsView>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// existingを渡すと編集（既存ドキュメントを更新）、省略すると新規作成になる。
  Future<void> _editCategoryRule([CategoryRule? existing]) async {
    final l10n = AppLocalizations.of(context)!;
    MailCategory category = existing?.category ?? MailCategory.promotion;
    int retentionDays = existing?.retentionDays ?? 30;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.ruleSettingsAddRule),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButton<MailCategory>(
                value: category,
                items: MailCategory.values
                    .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
                    .toList(),
                onChanged: (v) =>
                    setDialogState(() => category = v ?? category),
              ),
              Slider(
                value: retentionDays.toDouble(),
                min: 1,
                max: 90,
                divisions: 89,
                label: '$retentionDays日',
                onChanged: (v) =>
                    setDialogState(() => retentionDays = v.round()),
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
      ),
    );
    if (result != true) return;
    if (!mounted) return;
    final userId = await ref.read(currentUserIdProvider.future);
    if (!mounted) return;
    await ref
        .read(categoryRuleRepositoryProvider)
        .upsert(
          CategoryRule(
            id: existing?.id ?? '',
            userId: userId,
            category: category,
            retentionDays: retentionDays,
            accountId: existing?.accountId,
          ),
        );
  }

  Future<void> _deleteCategoryRule(CategoryRule rule) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ルールを削除しますか？'),
        content: Text('「${rule.category.name}・${rule.retentionDays}日」を削除します。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('削除する'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(categoryRuleRepositoryProvider).remove(rule.id);
  }

  Future<void> _deleteSenderBlockRule(SenderBlockRule rule) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ルールを削除しますか？'),
        content: Text('「${rule.pattern}」のブロックを解除します。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('削除する'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(senderBlockRuleRepositoryProvider).remove(rule.id);
  }

  Future<void> _addSenderBlockRule() async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    SenderMatchType matchType = SenderMatchType.domain;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(l10n.ruleSettingsAddRule),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                decoration: const InputDecoration(hintText: '@example.com'),
              ),
              DropdownButton<SenderMatchType>(
                value: matchType,
                items: SenderMatchType.values
                    .map((t) => DropdownMenuItem(value: t, child: Text(t.name)))
                    .toList(),
                onChanged: (v) =>
                    setDialogState(() => matchType = v ?? matchType),
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
      ),
    );
    if (result != true || controller.text.trim().isEmpty) return;
    if (!mounted) return;
    final userId = await ref.read(currentUserIdProvider.future);
    if (!mounted) return;
    await ref
        .read(senderBlockRuleRepositoryProvider)
        .add(
          SenderBlockRule(
            id: '',
            userId: userId,
            pattern: controller.text.trim(),
            matchType: matchType,
            createdAt: DateTime.now(),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final categoryRulesAsync = ref.watch(categoryRulesProvider);
    final senderBlockRulesAsync = ref.watch(senderBlockRulesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.ruleSettingsTitle),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: l10n.ruleSettingsCategoryTab),
            Tab(text: l10n.ruleSettingsSenderBlockTab),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          categoryRulesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('$e')),
            data: (rules) => ListView(
              children: rules
                  .map(
                    (r) => ListTile(
                      title: Text(r.category.name),
                      subtitle: Text('${r.retentionDays}日'),
                      onTap: () => _editCategoryRule(r),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: '削除',
                        onPressed: () => _deleteCategoryRule(r),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          senderBlockRulesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('$e')),
            data: (rules) => ListView(
              children: rules
                  .map(
                    (r) => ListTile(
                      title: Text(r.pattern),
                      subtitle: Text(r.matchType.name),
                      // 差出人ブロックルールは編集の概念が薄い（パターン自体を変えるなら
                      // 削除して作り直す方が分かりやすい）ため、削除のみ提供する。
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        tooltip: '削除',
                        onPressed: () => _deleteSenderBlockRule(r),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (_tabController.index == 0) {
            _editCategoryRule();
          } else {
            _addSenderBlockRule();
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
