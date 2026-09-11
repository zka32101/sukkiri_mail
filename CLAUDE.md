# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**sukkiri_mail** is a cross-platform email management application (Flutter mobile + Firebase backend) designed to help users organize their inboxes and automatically filter unnecessary emails (promotions, notifications, invoices) into categories.

- **Frontend**: Flutter mobile app (iOS/Android) with Riverpod state management
- **Backend**: Firebase Cloud Functions (TypeScript/Node.js v20)
- **Database**: Firestore with a named database `sukkirimail` (NOT the default database)
- **Authentication**: Firebase Auth with OAuth support (Gmail, Outlook) and IMAP app passwords

## Development Commands

### Flutter App

```bash
# Install dependencies
flutter pub get

# Run the app
flutter run

# Run with specific target device
flutter run -d <device_id>

# Build APK/IPA
flutter build apk
flutter build ios

# Run tests
flutter test

# Generate code (localization, generated files)
flutter pub run build_runner build

# Format code
dart format lib test

# Lint analysis
flutter analyze
```

### Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript → JavaScript
npm run build

# Watch mode (auto-rebuild on file changes)
npm run watch

# Run tests
npm test

# Run specific test file
npm test -- functions/src/index.test.ts

# Watch mode for tests
npm run test:watch

# Lint check
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Emulate locally with Firestore
npm run serve

# Deploy to Firebase
npm run deploy

# View cloud logs
npm run logs

# Interactive functions shell
npm run shell
```

## Architecture Overview

### Backend Structure (`functions/src/`)

**Email Provider Pattern** (Adapter architecture):
- `mailProviderInterface.ts` - `MailProviderAdapter` interface defines contract for all email providers
- `gmailProvider.ts` - Gmail API implementation (OAuth2 with token refresh)
- `outlookProvider.ts` - Microsoft Graph API implementation
- `imapProvider.ts` - IMAP protocol implementation (ImapFlow library)

Each provider implements:
- `connect()` - Authenticate and link user's email account
- `scan()` - Fetch emails and categorize them (promotion/notification/invoice/other)
- `archive()` / `restore()` - Move emails via provider-specific APIs
- `fetchMessageBody()` - Retrieve email HTML and attachments

**Key Entry Points** (`index.ts`):
- `connectAccount` - OAuth consent or app password validation
- `scanAccount` - Scan inbox with auto-categorization
- `applyArchiveRules` - Apply user-defined rules
- `restoreEmails` - Restore archived emails
- `fetchMessageBody` - Get full email content

**Data Access**:
- `firestore.ts` - Singleton pattern for Firestore instance (named database `sukkirimail`)
- `linkedAccountUpsert.ts` - Account linking logic with color palette assignment
- Firestore collections: `users`, `accounts`, `emailMeta`, `archiveLog`, `rules`

**Utilities**:
- `categorize.ts` - Rule-based email categorization (can be extended to ML)
- `secrets.ts` - Google Cloud Secret Manager integration (OAuth tokens, IMAP passwords)
- `planLimits.ts` - Feature tier restrictions (free/pro/premium)
- `validation.ts` - Request type guards and validation

### Frontend Structure (`lib/`)

**Layered Architecture**:
1. **Views** (`lib/views/`) - UI widgets (Onboarding, Dashboard, Rules, Search, Account Linking)
2. **ViewModels** (`lib/viewmodels/`) - Riverpod providers managing state and business logic
3. **Services** (`lib/services/`) - Integration layer for external APIs
   - `cloud_functions_mail_provider.dart` - Calls backend functions
   - `local_cache_service.dart` - SQLite cache management (auto-cleanup rules)
   - `auth_service.dart` - Firebase Auth
4. **Repositories** (`lib/repositories/`) - Firestore data access layer

**State Management**: Riverpod providers (functional, testable approach)
- `local_cache_eviction_providers.dart` - Complex logic for smart cache eviction (unread emails protected)
- `scan_providers.dart` - Email scanning workflow
- `email_search_providers.dart` - Search and filtering

### Critical Design Constraints

1. **Named Database**: All Firestore calls use `sukkirimail` database, NOT `default`. The backend (`firestore.ts`) exports `db()` function that handles this. Never use `admin.firestore()` directly in functions.

2. **Token Security**: OAuth tokens and IMAP passwords are stored in Google Cloud Secret Manager, never sent to client. Credentials are only held in Cloud Functions memory during operations.

3. **No Permanent Deletion**: The system only archives/labels emails, never permanently deletes them. This is by design—users can always restore from archive.

4. **Email ID Composition**: Composite IDs combine `accountId_providerId` format:
   - `emailMetaDocId(accountId, itemId)` → creates composite ID
   - `rawProviderMessageId(accountId, compositeId)` → extracts provider ID
   - IDOR protection: `assertOwnedEmailIds()` ensures user can't access other users' emails

5. **Unread Email Protection**: Local cache auto-eviction never removes unread emails (critical safeguard in `local_cache_eviction_providers.dart`)

6. **Categorization Extensible Design**: Current MVP uses rule-based categorization (regex keywords). Structure allows future ML-based classification without refactoring.

## Testing Strategy

### Cloud Functions

- Framework: Jest with TypeScript (ts-jest preset)
- Location: `functions/src/**/*.test.ts` (same directory as source)
- Mock Strategy: Firebase Admin SDK and external APIs (Gmail, Outlook, Graph) are mocked
- Firestore Testing: Uses `__resetFirestoreCache()` export from `firestore.ts` to reset singleton between tests
- Coverage: 504 tests across 12 modules (core utilities, providers, database logic)

**Key Testing Patterns**:
```typescript
// Async function completion without throwing
await assertAccountOwnership("account123", "user123");

// Promise-based assertions
await expect(provider.connect(...)).resolves.toEqual(expected);

// IDOR prevention tests (critical security)
expect(() => {
  assertOwnedEmailIds("account", ["other_email"]);
}).toThrow(HttpsError);
```

### Flutter App

- Framework: flutter_test + Riverpod testing utilities
- Location: `test/` directory
- Focus: ViewModels and Services testing (UI tested manually)

## Important Notes for Development

### Firestore Indexes
- Custom indexes are pre-configured in `firestore.indexes.json`
- Composite indexes required for complex queries (check Firebase Console if queries are slow)
- Query rules defined in `firestore.rules` (important for security)

### Environment Configuration
- `firebase.json` defines Firebase deployment targets
- Named database `sukkirimail` is configured here
- Cloud Functions build step runs `npm run build` (tsc) during `firebase deploy`

### GitHub Actions
- CI/CD configured in `.github/` directory
- Tests run on every PR; must pass before merge

### Local Development Workflow
```bash
# 1. Make changes to functions/src/*.ts
# 2. Run tests in watch mode
cd functions && npm run test:watch

# 3. Test linting
npm run lint

# 4. Emulate locally (optional)
npm run serve
# Then test functions via Firebase emulator UI (http://localhost:4000)

# 5. Commit and push (tests run in CI)
git add .
git commit -m "feat: ..."
git push origin branch-name
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `functions/src/firestore.ts` | Singleton Firestore connector (must use named DB) |
| `functions/src/providers/mailProviderInterface.ts` | Contract all email providers implement |
| `functions/src/index.ts` | Main Cloud Function entry points + utility helpers |
| `functions/src/categorize.ts` | Email categorization logic |
| `lib/services/local_cache_service.dart` | Intelligent cache eviction rules |
| `lib/viewmodels/local_cache_eviction_providers.dart` | Complex cache lifecycle management |
| `firestore.rules` | Security rules (validate ownership, permissions) |
| `firestore.indexes.json` | Composite index definitions |

## Deployment

1. **Functions**: `firebase deploy --only functions` (runs `npm run build` automatically)
2. **Firestore**: Manually update indexes/rules via Firebase Console or `firebase deploy` (rules only)
3. **Flutter App**: Build via `flutter build apk/ios` and distribute via app stores

## Common Pitfalls

- ❌ Using `admin.firestore()` instead of `db()` function (will connect to wrong database)
- ❌ Storing OAuth tokens in Firestore or returning to client
- ❌ Deleting emails permanently instead of archiving
- ❌ Missing IDOR checks before accessing user data
- ❌ Forgetting to reset Firestore cache between tests (`__resetFirestoreCache()`)
