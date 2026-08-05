# スッキリメール — iOSビルド準備状況 v1.0

## 完了（本セッションで実施）
- Bundle ID: `com.petitworks.sukkiri_mail`（Android applicationIdと統一）
- `Info.plist`: `CFBundleDisplayName`（ベース: スッキリメール）・`CFBundleLocalizations`（10言語）追加
- `ios/Runner/ja.lproj/InfoPlist.strings` / `en.lproj/InfoPlist.strings`: 表示名のローカライズ文字列ファイル作成
  （※Xcodeプロジェクト側でのローカライズ言語登録・pbxproj反映はXcode GUI操作が必要、下記参照）
- [.github/workflows/sukkiri-mail-ci.yml](../../.github/workflows/sukkiri-mail-ci.yml)：
  Ubuntu上のanalyze/test必須ゲート（3段階ゲートのStep1）を既存プロジェクト（anzet等）と同じ方式で追加

## ⏸ ユーザー待ち（この先に進むには以下が必要）

### 1. Apple Developer設定
- [reference_apple_appstore_connect_credentials]に基づき Team `6UWJGP52W5` の証明書・プロビジョニングを使用可能
- Xcodeで `ios/Runner.xcodeproj` を開き、以下をGUIで実施：
  - TARGETS → Runner → Signing & Capabilities で Team を設定
  - `ja.lproj`/`en.lproj` を Project → Info → Localizations に追加登録（pbxproj反映、GUI操作必須）
  - Bundle Identifier が Apple Developer Portal 側で予約済みか確認（未登録なら新規登録）

### 2. Firebase Console
- 新規Firebaseプロジェクト作成 → iOSアプリ追加（Bundle ID: `com.petitworks.sukkiri_mail`）
- `GoogleService-Info.plist` をダウンロードし `ios/Runner/` に配置（**H:\ 側のみ**、C:\apk\ミラーには置かない）
- [flutter-firebase-setup]スキールの手順に従う

### 3. OAuth Console設定（Gmail/Outlook連携に必須、Cloud Functions動作の前提）
- Google Cloud Console: OAuth同意画面登録 → `gmail.modify` + `gmail.labels` スコープ申請（Tier2想定）
  - クライアントID/シークレット取得後、Secret Managerに `gmail-oauth-client-id` / `gmail-oauth-client-secret` として登録
  - iOS用リダイレクトURIスキーム（`REVERSED_CLIENT_ID`）を `Info.plist` の `CFBundleURLTypes` に追加（GoogleService-Info.plist取得後に判明する値のため未確定）
- Azure Portal: アプリ登録（個人アカウント向け、`Mail.ReadWrite` + `offline_access`）
  - クライアントID/シークレット取得後、Secret Managerに `outlook-oauth-client-id` / `outlook-oauth-client-secret` として登録

### 4. RevenueCat設定
- iOS向けAPIキー取得 → `purchases_flutter` の初期化コードに接続（現在Paywall画面はUIのみ、購入フロー未接続）

## 完了後の次ステップ（着手可能になったら）
1. `flutter build ios --release`（[build-flutter-apk]と同様、C:\apk\への差分同期が必要かは要検証。
   iOSビルドはmacOS実行環境が必要なため、Windows上では実機ビルド不可 → GitHub Actions macOSランナー
   または実機Mac環境での実行が前提）
2. TestFlightアップロード（既存の[地理パズル王]プロジェクトのCI構成を参考にiOS用ワークフロー追加）
