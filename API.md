# Cloud Functions API Documentation

Sukkiri Mail のバックエンド API リファレンス。すべてのエンドポイントは Firebase Callable Functions です。

**認証**: すべてのエンドポイントに Firebase Authentication が必須です。

---

## Callable Functions

### 1. `connectAccount`

メールアカウントを連携します。OAuth 同意またはアプリパスワード検証を実行。

**Request**
```typescript
{
  provider: "gmail" | "outlook" | "imap";
  userId: string;  // 現在のユーザーID（uid と一致する必要があります）
  
  // Provider-specific params:
  // Gmail:
  //   - idToken: string (OAuth ID token)
  // Outlook:
  //   - authorizationCode: string (OAuth code)
  // IMAP:
  //   - host: string (e.g., "imap.gmail.com")
  //   - email: string
  //   - password: string (app password)
}
```

**Response**
```typescript
{
  id: string;                        // Account ID
  userId: string;
  provider: "gmail" | "outlook" | "imap";
  authMethod: "oauth" | "app_password";
  emailAddress: string;
  oauthStatus?: string;              // For OAuth providers
  imapHost?: string;                 // For IMAP
  colorHex: string;                  // Auto-assigned color
}
```

**Errors**
- `unauthenticated`: ユーザーが未認証
- `invalid-argument`: リクエスト形式が不正
- `permission-denied`: userId と uid が一致しない

**Performance**: ~2-3秒（OAuth リダイレクト時間を含む）

---

### 2. `scanAccount`

連携されたメールアカウントをスキャンし、メール一覧を取得・カテゴリ分け。
結果は Firestore `emailMeta` コレクションに永続化されます。

**Request**
```typescript
{
  provider: "gmail" | "outlook" | "imap";
  accountId: string;
}
```

**Response**
```typescript
{
  items: ScanResultItem[]
}

interface ScanResultItem {
  id: string;                    // Composite ID: accountId_providerId
  accountId: string;
  category: "promotion" | "notification" | "invoice" | "other";
  receivedAt: number;            // Timestamp in ms
  hasAttachment: boolean;
  snippet: string;               // Email preview
  subject: string;
  senderEmail: string;
  isUnread: boolean;
}
```

**Errors**
- `unauthenticated`: ユーザーが未認証
- `invalid-argument`: リクエスト形式が不正
- `permission-denied`: ユーザーがこのアカウントを所有していない

**Performance**: 
- **小規模受信箱** (~100件): ~3-5秒
- **中規模受信箱** (~1000件): ~10-15秒
- **大規模受信箱** (~10000件): ~30-45秒

**最適化ポイント**:
- Firestore バッチ書き込みで複数ドキュメント一括保存
- API レート制限に注意（Gmail: 10,000/day、Outlook: 429応答で待機）
- スキャンは重い操作。UI では進捗表示を推奨

---

### 3. `applyArchiveRules`

選択されたメールをアーカイブします（削除ではなくラベル変更またはフォルダ移動）。

**Request**
```typescript
{
  provider: "gmail" | "outlook" | "imap";
  accountId: string;
  emailIds: string[];            // Composite IDs from scanAccount response
}
```

**Response**
```typescript
{
  ok: true;
}
```

**Errors**
- `unauthenticated`: ユーザーが未認証
- `invalid-argument`: リクエスト形式が不正
- `permission-denied`: emailIds がユーザーのアカウントに属していない

**Performance**: 
- ~0.5-2秒（emailIds の個数に依存）
- Firestore バッチ更新で複数ドキュメント一括更新

**IDOR 防止**: `assertOwnedEmailIds()` で全 emailId をチェック。不正アクセス検出時は exception。

---

### 4. `restoreEmail`

アーカイブされたメールを受信箱に復元します。

**Request**
```typescript
{
  provider: "gmail" | "outlook" | "imap";
  accountId: string;
  emailIds: string[];            // Composite IDs
}
```

**Response**
```typescript
{
  ok: true;
}
```

**Errors**
- `unauthenticated`: ユーザーが未認証
- `invalid-argument`: リクエスト形式が不正
- `permission-denied`: emailIds がユーザーのアカウントに属していない

**Performance**: ~0.5-2秒（emailIds の個数に依存）

---

### 5. `fetchMessageBody`

単一メールの本文と添付ファイル情報を取得します。
オンデマンド（ユーザーが明示的にタップ時）のみ実行。

**Request**
```typescript
{
  provider: "gmail" | "outlook" | "imap";
  accountId: string;
  messageId: string;             // Composite ID
}
```

**Response**
```typescript
{
  html: string;                  // Email body (HTML)
  attachmentNames: string[];     // Attachment filename list
}
```

**Errors**
- `unauthenticated`: ユーザーが未認証
- `invalid-argument`: リクエスト形式が不正
- `permission-denied`: messageId がユーザーのアカウントに属していない

**Performance**: 
- **Gmail**: ~0.5-1秒
- **Outlook**: ~0.5-1秒
- **IMAP**: ~1-2秒（プロトコルレイテンシ）

**注意**: 大量の本文フェッチは API レート制限に抵触する可能性。キャッシング推奨。

---

### 6. `revenueCatWebhook`

Revenue Cat サブスクリプション webhook エンドポイント。
サーバー側の webhooks により自動呼び出し（クライアント呼び出し不可）。

**Request** (Revenue Cat → Firebase)
```
POST https://[region]-[project].cloudfunctions.net/revenueCatWebhook
Authorization: Bearer [webhook_signature]
Content-Type: application/json

{
  "event": {
    "type": "subscriber_updated" | "initial_purchase" | ...
    "subscriber": { ... }
  }
}
```

**Response**
```typescript
{
  ok: true;
}
```

---

## Request ID Pattern (IDOR Prevention)

すべてのメール操作は **Composite ID** を使用します。

```
CompositeId = accountId + "_" + providerId

例：
  "account_123_item_456"
       ↑ Firestore accountId
                    ↑ Provider native messageId
```

**Security checks**:
- `assertOwnedEmailIds()` で全 ID をチェック
- ID に異なるアカウントプレフィックスがあれば即座に `permission-denied`

---

## Authentication Flow

```
1. Client: Firebase Auth token を取得
2. Call Functions: token を request.auth に含める
3. Cloud Functions: uid チェック
4. assertAccountOwnership(): Firestore linkedAccounts で所有権確認
5. Return data or throw HttpsError
```

**重要**: すべてのエンドポイントで 3 ステップの検証を実施

---

## Error Codes

| Code | 説明 | 対応 |
|------|------|------|
| `unauthenticated` | ログイン未実行 | ユーザーにログイン画面表示 |
| `invalid-argument` | リクエスト形式エラー | リクエスト形式を確認 |
| `permission-denied` | アクセス権限なし | エラーログ＆セキュリティ監視 |
| `not-found` | リソース未発見 | UI に適切なメッセージ表示 |
| `internal` | サーバーエラー | ユーザーに再試行提示・ログ確認 |

---

## Rate Limits

各プロバイダの API レート制限：

| Provider | Limit | リセット |
|----------|-------|---------|
| Gmail | 10,000/day | UTC 0:00 |
| Outlook | Per-minute (429 応答で待機) | - |
| IMAP | なし（サーバー依存） | - |

**推奨**: scanAccount 呼び出しは 1ユーザーあたり 1日 1-2回。

---

## Testing

### Local Emulation

```bash
cd functions
npm run serve

# In another terminal:
firebase emulators:start
```

### Example Call (from Web)

```javascript
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const scanAccountFn = httpsCallable(functions, "scanAccount");
const result = await scanAccountFn({
  provider: "gmail",
  accountId: "acc_123"
});

console.log(result.data.items);
```
