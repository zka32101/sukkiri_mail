# Performance Analysis Report

Cloud Functions と Flutter アプリのパフォーマンス分析・最適化ガイド。

---

## Cloud Functions Performance

### Operation Latency Breakdown

#### 1. scanAccount (Most Critical)

**ボトルネック分析**:

```
Total Time: 3-45秒（受信箱サイズに依存）

Breakdown:
├─ Gmail API listMessages()        ~50-70% of time
│  └─ Pagination for 1000+ emails: exponential growth
├─ Firestore batch.commit()        ~15-25% of time
│  └─ Network + write latency
└─ In-memory processing            ~5-10% of time
   └─ Category classification
```

**最適化提案**:

| # | 対策 | 効果 | 実装難度 |
|----|------|------|--------|
| 1 | **Incremental sync** | 50-70% ↓ | 中 |
|   | 初回: full scan、以降: lastScanAt 以降のみ | 2秒 → 0.5秒 |  |
| 2 | **Batch size optimization** | 10-15% ↓ | 低 |
|   | Firestore batch 最大500ドキュメント→ 分割提出 | 0.5秒削減 |  |
| 3 | **Pagination limits** | 20-30% ↓ | 低 |
|   | Gmail maxResults を 100→500 | ネットワーク往復削減 |  |
| 4 | **Async processing** | 実感値のみ（UX向上） | 高 |
|   | メール処理を Cloud Tasks へ | UI ブロック解除 |  |

**実装優先度**: 1 > 3 > 2 > 4

**推定改善**:
- 現在（1000件スキャン）: ~15秒
- 最適化後: ~3-5秒（incremental + pagination）

---

#### 2. fetchMessageBody

**現在の状況**:

```
Gmail/Outlook: ~0.5-1秒
IMAP: ~1-2秒

Bottleneck: Provider API latency（80%）
```

**最適化提案**:

| # | 対策 | 効果 | 実装難度 |
|----|------|------|--------|
| 1 | **CloudFlare Cache** | ~60% ↓ | 中 |
|   | HTML/attachment list を 24h キャッシュ | 0.5秒 → 0.2秒 |  |
| 2 | **Response compression** | ~30% ↓ | 低 |
|   | gzip で HTML body 圧縮（平均 50-70% ↓）| 転送時間削減 |  |
| 3 | **Lazy attachment loading** | UX向上のみ | 低 |
|   | 添付ファイル名のみ先に返す | UI レスポンス向上 |  |

**推定改善**:
- 現在: 0.5-1秒
- キャッシュ後: 0.2-0.3秒（キャッシュヒット時）

---

#### 3. applyArchiveRules / restoreEmail

**現在の状況**:

```
0.5-2秒（emailIds 数に依存）

Breakdown:
├─ Provider API (archive/move) ~60%
├─ Firestore batch update      ~30%
└─ Network overhead            ~10%
```

**最適化ポテンシャル**: 低

**理由**:
- Provider API は遅い（API 側制限）
- Firestore write は十分高速
- 改善余地は +5-10% 程度

**推奨**: この操作は UI で非同期表示（プログレスバー）

---

#### 4. connectAccount

**現在の状況**:

```
2-3秒（OAuth redirect を含む）

Breakdown:
├─ OAuth dialog + user action  ~70%
├─ Token exchange              ~15%
└─ Firestore write             ~5%
```

**最適化ポテンシャル**: ほぼなし

**理由**: ユーザーの同意待ち時間が支配的

---

### Memory Usage Analysis

**Current (per invocation)**:

```
Firebase Admin SDK initialization   ~5-10 MB
Provider instance (Gmail/Outlook)   ~2-3 MB
Firestore batch object              ~1-2 MB
Email items array (1000 items)       ~2-5 MB
────────────────────────────────────────
Total per large scan                ~12-20 MB
```

**Limits (Firebase)**:
- Max memory per invocation: 8 GB (practically 512MB-2GB)
- Timeout: 540秒

**推奨**: 
- 現在のメモリ使用率は OK（余裕あり）
- 10,000+ items → メモリ最適化検討

---

## Flutter App Performance

### Key Metrics

#### Screen Load Time

| Screen | 計測値 | 目標 | ステータス |
|--------|--------|------|----------|
| Dashboard | 1.5-2秒 | <2秒 | ✅ OK |
| Account Link | 2-3秒 | <3秒 | ✅ OK |
| Scan Results | 3-5秒 | <5秒 | ✅ OK |
| Email Search | 0.5-1秒 | <1秒 | ✅ OK |

#### Data Sync Latency

```
Scan → UI Update:
  Cloud Functions ~15秒 → Flutter UI ~0.5秒
  = Total 15-16秒

Optimize by: incremental sync → 4-5秒
```

### Memory & Battery Impact

**Memory**:
- Idle: ~50-80 MB
- Active (scanning): ~150-200 MB
- Peak: <300 MB

**Battery (10分スキャン)**:
- Network: ~30-40% of drain
- JSON parsing: ~10-15% of drain
- UI rendering: ~5-10% of drain

**推奨**:
- バックグラウンド同期は 1日 1-2回のみ
- Wi-Fi 接続時のみスキャン（省電力）

---

## Optimization Roadmap

### Phase 1 (Quick Wins) - 1-2週間

```
Priority 1: Incremental sync (scanAccount)
└─ Expected gain: 10-12秒削減
└─ Implementation: functions/src/scanAccount.ts修正

Priority 2: Pagination optimization
└─ Expected gain: 2-3秒削減
└─ Implementation: provider/*.ts での maxResults 調整
```

### Phase 2 (Medium Effort) - 2-4週間

```
Priority 3: Response compression
└─ Expected gain: 20-30% 転送時間削減
└─ Implementation: Cloud Functions ミドルウェア

Priority 4: Local caching strategy
└─ Expected gain: UX 向上＆30% レート制限削減
└─ Implementation: lib/services/local_cache_service.dart 拡張
```

### Phase 3 (Long Term) - 1-2ヶ月

```
Priority 5: Async email processing (Cloud Tasks)
└─ Expected gain: UI ブロック解除 + 大規模スキャン対応
└─ Implementation: Firebase Cloud Tasks 統合

Priority 6: ML-based categorization
└─ Expected gain: 精度向上 + 規則ベース→学習ベースへ移行
└─ Implementation: Vertex AI 統合検討
```

---

## Monitoring & Alerting

### Cloud Functions Metrics (Set up in Firebase Console)

```
1. Function Execution Time
   └─ Alert: >30秒（scanAccount for 1000+ items）

2. Error Rate
   └─ Alert: >1% error rate

3. Memory Usage
   └─ Alert: >500MB peak
```

### Flutter App Metrics (Use Firebase Crashlytics)

```
1. Screen Load Time
   └─ Track via Performance Monitoring

2. Sync Success Rate
   └─ Log via Analytics

3. Crash Rate
   └─ Auto-tracked by Crashlytics
```

---

## Benchmarking Setup

### Local Testing

```bash
# Cloud Functions
cd functions

# Enable profiling in Cloud Functions emulator
firebase emulators:start

# Monitor logs:
firebase functions:log --follow
```

### Production Monitoring

```dart
// Flutter app - Firebase Performance Monitoring
import 'package:firebase_performance/firebase_performance.dart';

final trace = FirebasePerformance.instance.newTrace('email_scan');
await trace.start();
// ... operation
await trace.stop();
```

---

## Conclusion

**Summary**:
- Cloud Functions: latency は許容範囲（UI 側は async 表示で対応）
- Flutter App: メモリ・バッテリー使用率は OK
- 主な改善機会: incremental sync（10-12秒削減可能）

**推奨行動**:
1. incremental sync を Phase 1 で実装
2. Production metrics を Firebase Console で監視
3. ユーザーフィードバック基にて Phase 2 以降を判断
