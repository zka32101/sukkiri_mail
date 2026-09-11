# sukkiri_mail

受信箱に埋もれた「見なくていいメール」から人を解放するメール整理アプリ

**sukkiri_mail** は、プロモーション、通知、請求書などを自動カテゴリ分けして整理・アーカイブするクロスプラットフォーム メール管理アプリです。Gmail、Outlook、一般的なIMAP サーバーに対応しています。

## 特徴

- 🎯 **自動カテゴリ分け**: メールを「プロモーション」「通知」「請求書」「その他」に自動分類
- 📱 **クロスプラットフォーム**: iOS・Android で動作（Flutter）
- 🔐 **セキュア**: OAuth トークンは Secret Manager に保管、クライアント側には渡さない
- 🏗️ **複数メールプロバイダ対応**: Gmail API、Microsoft Graph API、IMAP 対応
- 💾 **スマートキャッシュ**: ローカルキャッシュでオフライン対応、未読メールは自動削除対象外
- 📊 **アーカイブ管理**: メール削除ではなくアーカイブで安全に整理

## 技術スタック

### フロントエンド
- **Flutter** - クロスプラットフォームモバイルアプリ
- **Riverpod** - 関数型の状態管理
- **Firebase** - 認証、Firestore データベース、Cloud Functions
- **SQLite (sqflite)** - ローカルキャッシュ

### バックエンド
- **Firebase Cloud Functions** - TypeScript / Node.js v20
- **Firestore** - ドキュメント DB（名前付きDB: `sukkirimail`）
- **Google Cloud Secret Manager** - 認証情報・トークン管理
- **メールプロバイダ**: Gmail API、Microsoft Graph API、ImapFlow

## セットアップ

### 前提条件
- Flutter SDK 3.12.2 以上
- Node.js 20 以上
- Firebase CLI がインストール済み
- Google Cloud プロジェクト設定済み

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/zka32101/sukkiri_mail.git
cd sukkiri_mail

# Flutter の依存関係をインストール
flutter pub get

# Cloud Functions の依存関係をインストール
cd functions
npm install
cd ..

# Firebase エミュレータをセットアップ（開発用）
firebase emulators:start
```

## 開発

### ローカル実行

```bash
# Flutter アプリ
flutter run

# Cloud Functions（エミュレータモード）
cd functions && npm run serve
```

### テスト

```bash
# Flutter テスト
flutter test

# Cloud Functions テスト
cd functions
npm test                 # 全テストを実行
npm run test:watch      # ウォッチモード
npm test -- functions/src/index.test.ts  # 特定ファイルのみ
```

### コード品質

```bash
# Cloud Functions - Lint
cd functions
npm run lint
npm run lint:fix        # 自動修正

# Flutter - 分析
flutter analyze

# Code formatting
dart format lib test
```

## プロジェクト構成

```
sukkiri_mail/
├── lib/                          # Flutter アプリ
│   ├── views/                    # UI ウィジェット
│   ├── viewmodels/              # Riverpod 状態管理
│   ├── services/                # 外部API 統合層
│   ├── repositories/            # Firestore データアクセス
│   └── models/                  # データモデル
├── functions/src/               # Cloud Functions バックエンド
│   ├── providers/               # メールプロバイダ（Gmail/Outlook/IMAP）
│   ├── index.ts                # メイン Cloud Function
│   ├── firestore.ts            # Firestore シングルトン
│   ├── categorize.ts           # メール自動分類ロジック
│   └── *.test.ts               # Jest ユニットテスト
├── firestore.rules             # Firestore セキュリティルール
├── firestore.indexes.json      # Firestore インデックス定義
├── CLAUDE.md                   # Claude Code 開発ガイド
└── firebase.json               # Firebase 設定
```

## アーキテクチャ

### バックエンド: Email Provider パターン

すべてのメールプロバイダは `MailProviderAdapter` インターフェースを実装：

```typescript
interface MailProviderAdapter {
  connect(userId, params): Promise<ConnectedAccountResult>    // 認証・連携
  scan(accountId): Promise<ScanResultItem[]>                 // スキャン・分類
  archive(accountId, emailIds): Promise<void>               // アーカイブ
  restore(accountId, emailIds): Promise<void>               // 復元
  fetchMessageBody(accountId, messageId): Promise<...>      // 本文取得
}
```

実装:
- `GmailProvider` - Gmail API（OAuth2 トークンリフレッシュ対応）
- `OutlookProvider` - Microsoft Graph API
- `ImapProvider` - IMAP プロトコル（ImapFlow ライブラリ）

### フロントエンド: レイヤード アーキテクチャ

1. **Views** - Material Design ウィジェット
2. **ViewModels** - Riverpod プロバイダ（ビジネスロジック）
3. **Services** - Cloud Functions 呼び出し、Firebase Auth、キャッシュ管理
4. **Repositories** - Firestore データアクセス

## セキュリティ

### 重要な設計原則

- **Token セキュリティ**: OAuth トークン・IMAP パスワードは Google Cloud Secret Manager に保管
- **IDOR 防止**: すべてのメール ID アクセスは `assertOwnedEmailIds()` で検証
- **削除なし**: メールは削除せずアーカイブのみ（ユーザーが常に復元可能）
- **名前付き DB**: Firestore は名前付き DB `sukkirimail` を使用（デフォルト DB ではない）

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

## デプロイ

### Cloud Functions のデプロイ

```bash
cd functions
npm run build
firebase deploy --only functions
```

### アプリのビルド・配布

```bash
# APK（Android）
flutter build apk --release

# IPA（iOS）
flutter build ios --release
```

## CI/CD

GitHub Actions で自動テスト実行：
- すべての PR で Cloud Functions・Flutter テスト実行
- ESLint・analyze チェック
- テスト合格まで merge ブロック

## 開発ガイド

詳細な開発手順・トラブルシューティング・アーキテクチャ解説は **[CLAUDE.md](./CLAUDE.md)** を参照してください。

## ライセンス

未定

## 貢献

バグ報告・機能リクエストは GitHub Issues にお願いします。PR は大歓迎です。

---

**Created**: Sep 2024  
**Team**: sukkiri_mail Development
