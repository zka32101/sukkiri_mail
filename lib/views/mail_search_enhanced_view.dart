import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../models/email_meta.dart';
import '../viewmodels/email_search_providers.dart';
import '../viewmodels/linked_account_providers.dart';

/// 고급 검색 및 필터링 기능을 제공하는 향상된 메일 검색 뷰
/// - 카테고리, 날짜, 발신자 등의 고급 필터
/// - 필터 칩 표시
/// - 최근 검색 기록
class MailSearchEnhancedView extends ConsumerStatefulWidget {
  const MailSearchEnhancedView({super.key});

  @override
  ConsumerState<MailSearchEnhancedView> createState() =>
      _MailSearchEnhancedViewState();
}

class _MailSearchEnhancedViewState extends ConsumerState<MailSearchEnhancedView> {
  final _controller = TextEditingController();
  String _query = '';
  MailCategory? _selectedCategory;
  DateTime? _startDate;
  DateTime? _endDate;
  String? _senderFilter;
  bool _unreadOnly = false;
  bool _hasAttachments = false;
  final List<String> _searchHistory = [];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _hasActiveFilters =>
      _selectedCategory != null ||
      _startDate != null ||
      _endDate != null ||
      _senderFilter != null ||
      _unreadOnly ||
      _hasAttachments;

  void _clearFilters() {
    setState(() {
      _selectedCategory = null;
      _startDate = null;
      _endDate = null;
      _senderFilter = null;
      _unreadOnly = false;
      _hasAttachments = false;
    });
  }

  bool _matchesFilters(EmailMeta email) {
    if (_selectedCategory != null && email.category != _selectedCategory) {
      return false;
    }
    if (_startDate != null &&
        email.receivedAt.isBefore(_startDate!)) {
      return false;
    }
    if (_endDate != null &&
        email.receivedAt.isAfter(_endDate!)) {
      return false;
    }
    if (_senderFilter != null &&
        !email.senderEmail.toLowerCase().contains(_senderFilter!.toLowerCase())) {
      return false;
    }
    if (_unreadOnly && !email.isUnread) {
      return false;
    }
    if (_hasAttachments && !email.hasAttachment) {
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final accounts = ref.watch(linkedAccountsProvider).valueOrNull ?? [];

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          decoration: InputDecoration(
            hintText: l10n.mailSearchHint,
            border: InputBorder.none,
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _controller.clear();
                      setState(() => _query = '');
                    },
                  )
                : null,
          ),
          onChanged: (v) => setState(() => _query = v),
          onSubmitted: (v) {
            if (v.trim().isNotEmpty && !_searchHistory.contains(v)) {
              setState(() => _searchHistory.insert(0, v));
            }
          },
        ),
      ),
      body: Column(
        children: [
          // フィルターチップ表示
          if (_hasActiveFilters)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  if (_selectedCategory != null)
                    Chip(
                      label: Text(_selectedCategory!.name),
                      onDeleted: () =>
                          setState(() => _selectedCategory = null),
                      avatar: const Icon(Icons.category, size: 18),
                    ),
                  if (_startDate != null || _endDate != null)
                    Chip(
                      label: Text(
                        _startDate != null && _endDate != null
                            ? '${_startDate!.month}/${_startDate!.day} - ${_endDate!.month}/${_endDate!.day}'
                            : _startDate != null
                                ? '${_startDate!.month}/${_startDate!.day}以降'
                                : '${_endDate!.month}/${_endDate!.day}まで',
                      ),
                      onDeleted: () => setState(() {
                        _startDate = null;
                        _endDate = null;
                      }),
                      avatar: const Icon(Icons.calendar_today, size: 18),
                    ),
                  if (_senderFilter != null)
                    Chip(
                      label: Text(_senderFilter!),
                      onDeleted: () =>
                          setState(() => _senderFilter = null),
                      avatar: const Icon(Icons.person, size: 18),
                    ),
                  if (_unreadOnly)
                    Chip(
                      label: const Text('未読のみ'),
                      onDeleted: () =>
                          setState(() => _unreadOnly = false),
                      avatar: const Icon(Icons.mark_email_unread, size: 18),
                    ),
                  if (_hasAttachments)
                    Chip(
                      label: const Text('添付ファイル有'),
                      onDeleted: () =>
                          setState(() => _hasAttachments = false),
                      avatar: const Icon(Icons.attach_file, size: 18),
                    ),
                  TextButton(
                    onPressed: _clearFilters,
                    child: const Text('クリア'),
                  ),
                ],
              ),
            ),
          // フィルターボタン
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.tune),
                  tooltip: 'フィルター',
                  onPressed: () => _showFilterMenu(context),
                ),
              ],
            ),
          ),
          // 検索結果
          Expanded(
            child: _query.trim().isEmpty && _searchHistory.isEmpty
                ? _buildEmptyState(l10n)
                : _buildSearchResults(context, accounts, l10n),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations l10n) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            l10n.mailSearchTitle,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          if (_searchHistory.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              '最近の検索',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: 300,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _searchHistory.take(5).map((history) {
                  return InputChip(
                    label: Text(history),
                    onPressed: () {
                      _controller.text = history;
                      setState(() => _query = history);
                    },
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSearchResults(
    BuildContext context,
    List<dynamic> accounts,
    AppLocalizations l10n,
  ) {
    if (accounts.isEmpty) {
      return const Center(child: Text('リンク済みのメールアカウントがありません'));
    }

    return ListView(
      children: accounts.map((account) {
        final resultsAsync = ref.watch(
          mailSearchProvider(
            MailSearchParams(accountId: account.id, query: _query),
          ),
        );
        return resultsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: LinearProgressIndicator(),
          ),
          error: (e, _) => Padding(
            padding: const EdgeInsets.all(16),
            child: Text('エラー: $e'),
          ),
          data: (metas) {
            final filtered = metas.where(_matchesFilters).toList();
            if (filtered.isEmpty) {
              return Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'フィルター条件に合致するメールがありません',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Text(
                    '${account.emailAddress} (${filtered.length}件)',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ),
                ...filtered.map((m) {
                  return ListTile(
                    title: Text(
                      m.snippet,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight:
                            m.isUnread ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.senderEmail,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12),
                        ),
                        Text(
                          m.receivedAt.toString().split('.')[0],
                          style: const TextStyle(fontSize: 11),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (m.hasAttachment)
                          const Icon(Icons.attach_file, size: 16),
                        const SizedBox(width: 8),
                        if (m.isUnread)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ],
            );
          },
        );
      }).toList(),
    );
  }

  void _showFilterMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'フィルター条件',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              // カテゴリフィルター
              Text(
                'カテゴリ',
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: MailCategory.values.map((cat) {
                  final isSelected = _selectedCategory == cat;
                  return FilterChip(
                    label: Text(cat.name),
                    selected: isSelected,
                    onSelected: (selected) {
                      Navigator.pop(context);
                      setState(() {
                        _selectedCategory = selected ? cat : null;
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              // 日付範囲フィルター
              Text(
                '日付範囲',
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _startDate ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null && mounted) {
                          setState(() => _startDate = picked);
                          // ignore: use_build_context_synchronously
                          Navigator.pop(context);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: Text(
                        _startDate != null
                            ? '${_startDate!.month}/${_startDate!.day}以降'
                            : '開始日',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _endDate ?? DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now(),
                        );
                        if (picked != null && mounted) {
                          setState(() => _endDate = picked);
                          // ignore: use_build_context_synchronously
                          Navigator.pop(context);
                        }
                      },
                      icon: const Icon(Icons.calendar_today),
                      label: Text(
                        _endDate != null
                            ? '${_endDate!.month}/${_endDate!.day}まで'
                            : '終了日',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // 発信者フィルター
              Text(
                '発信者',
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 8),
              TextField(
                decoration: InputDecoration(
                  hintText: 'メールアドレスで検索',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.person),
                  suffixIcon: _senderFilter != null
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () =>
                              setState(() => _senderFilter = null),
                        )
                      : null,
                ),
                onChanged: (value) =>
                    setState(() => _senderFilter = value.isEmpty ? null : value),
                onSubmitted: (_) => Navigator.pop(context),
              ),
              const SizedBox(height: 16),
              // ステータスフィルター
              CheckboxListTile(
                title: const Text('未読のみ'),
                value: _unreadOnly,
                onChanged: (value) {
                  setState(() => _unreadOnly = value ?? false);
                  Navigator.pop(context);
                },
              ),
              CheckboxListTile(
                title: const Text('添付ファイル有'),
                value: _hasAttachments,
                onChanged: (value) {
                  setState(() => _hasAttachments = value ?? false);
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 16),
              // ボタン
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: () {
                      _clearFilters();
                      Navigator.pop(context);
                    },
                    child: const Text('クリア'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('完了'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
