/// 対応プロバイダ。恒久削除は全プロバイダ共通で実装しない（アーカイブ/ラベル変更のみ）。
enum MailProviderType { gmail, outlook, imap }

MailProviderType mailProviderTypeFromString(String v) {
  switch (v) {
    case 'outlook':
      return MailProviderType.outlook;
    case 'imap':
      return MailProviderType.imap;
    case 'gmail':
    default:
      return MailProviderType.gmail;
  }
}

String mailProviderTypeToString(MailProviderType t) {
  switch (t) {
    case MailProviderType.outlook:
      return 'outlook';
    case MailProviderType.imap:
      return 'imap';
    case MailProviderType.gmail:
      return 'gmail';
  }
}

/// OAuth系（Gmail/Outlook）とアプリ専用パスワード系（IMAP）を明示的に区別。
/// エラーハンドリング・再連携UIの分岐に使用。
enum AuthMethod { oauth, appPassword }

AuthMethod authMethodFromString(String v) {
  return v == 'app_password' ? AuthMethod.appPassword : AuthMethod.oauth;
}

String authMethodToString(AuthMethod m) {
  return m == AuthMethod.appPassword ? 'app_password' : 'oauth';
}

/// アカウント登録時にパレットから自動割当（重複回避）するカラーパレット。
/// WCAG AAコントラスト確保。ダークモードは彩度を下げた同系色を使用（呼び出し側で調整）。
const List<String> kAccountColorPalette = [
  '#3457C9', // design blue
  '#1F8A5F', // go green
  '#C9344A', // red
  '#9A7B1F', // amber
  '#7A3FC9', // purple
  '#0F9AA6', // teal
];

class LinkedAccount {
  final String id;
  final String userId;
  final MailProviderType provider;
  final AuthMethod authMethod;
  final String emailAddress;
  final String? oauthStatus; // connected/expired/revoked（OAuth系のみ）
  final String? imapHost; // IMAP系のみ
  final DateTime? lastScanAt;
  final String colorHex;

  const LinkedAccount({
    required this.id,
    required this.userId,
    required this.provider,
    required this.authMethod,
    required this.emailAddress,
    required this.colorHex,
    this.oauthStatus,
    this.imapHost,
    this.lastScanAt,
  });

  LinkedAccount copyWith({
    String? oauthStatus,
    DateTime? lastScanAt,
    String? colorHex,
  }) {
    return LinkedAccount(
      id: id,
      userId: userId,
      provider: provider,
      authMethod: authMethod,
      emailAddress: emailAddress,
      imapHost: imapHost,
      oauthStatus: oauthStatus ?? this.oauthStatus,
      lastScanAt: lastScanAt ?? this.lastScanAt,
      colorHex: colorHex ?? this.colorHex,
    );
  }

  factory LinkedAccount.fromMap(String id, Map<String, dynamic> m) {
    return LinkedAccount(
      id: id,
      userId: m['userId'] as String? ?? '',
      provider: mailProviderTypeFromString(m['provider'] as String? ?? 'gmail'),
      authMethod: authMethodFromString(m['authMethod'] as String? ?? 'oauth'),
      emailAddress: m['emailAddress'] as String? ?? '',
      oauthStatus: m['oauthStatus'] as String?,
      imapHost: m['imapHost'] as String?,
      colorHex: m['colorHex'] as String? ?? kAccountColorPalette.first,
      lastScanAt: m['lastScanAt'] == null
          ? null
          : (m['lastScanAt'] is DateTime
                ? m['lastScanAt'] as DateTime
                : DateTime.fromMillisecondsSinceEpoch(
                    (m['lastScanAt'] as num).toInt(),
                  )),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'provider': mailProviderTypeToString(provider),
      'authMethod': authMethodToString(authMethod),
      'emailAddress': emailAddress,
      'oauthStatus': oauthStatus,
      'imapHost': imapHost,
      'colorHex': colorHex,
      'lastScanAt': lastScanAt?.millisecondsSinceEpoch,
    };
  }
}

/// 登録済みアカウント一覧から、パレットの中で未使用の色を選ぶ。
/// 全色使用済みならパレットを先頭から循環させる。
String pickNextAccountColor(List<LinkedAccount> existing) {
  final used = existing.map((a) => a.colorHex).toSet();
  for (final c in kAccountColorPalette) {
    if (!used.contains(c)) return c;
  }
  return kAccountColorPalette[existing.length % kAccountColorPalette.length];
}
