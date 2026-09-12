import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

import '../models/message_cache.dart';

/// SQLiteベースのメール本文・添付ファイルキャッシュ管理。
/// 24時間TTL（本文）と7日TTL（添付ファイル）を自動的に管理。
class MessageCacheDb {
  static const String _dbName = 'sukkiri_mail_cache.db';
  static const int _dbVersion = 1;
  static const String _tableName = 'message_cache';

  Database? _db;
  Future<Database>? _initFuture;

  Future<Database> get db async {
    if (_db != null) return _db!;
    // Prevent race condition: ensure only one initialization occurs
    _initFuture ??= _initDb();
    _db = await _initFuture!;
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);
    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS $_tableName (
        messageId TEXT NOT NULL,
        accountId TEXT NOT NULL,
        html TEXT NOT NULL,
        attachmentNames TEXT,
        cachedAt INTEGER NOT NULL,
        isCompressed INTEGER DEFAULT 0,
        originalSize INTEGER,
        compressedSize INTEGER,
        htmlBytesSize INTEGER DEFAULT 0,
        PRIMARY KEY (messageId, accountId)
      )
    ''');

    // cachedAt でのインデックス（期限切れキャッシュの削除効率化）
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_cached_at ON $_tableName (cachedAt)
    ''');
  }

  /// メール本文をキャッシュに保存。
  Future<void> cacheMessageBody(MessageBodyCache cache) async {
    final database = await db;
    await database.insert(
      _tableName,
      cache.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// messageId と accountId でメール本文キャッシュを取得。
  /// キャッシュが有効（24時間以内）な場合のみ返す。
  Future<MessageBodyCache?> getMessageBodyCache(
    String messageId,
    String accountId,
  ) async {
    final database = await db;
    final maps = await database.query(
      _tableName,
      where: 'messageId = ? AND accountId = ?',
      whereArgs: [messageId, accountId],
      limit: 1,
    );

    if (maps.isEmpty) return null;

    final cache = MessageBodyCache.fromMap(maps.first);
    if (!cache.isValid(DateTime.now())) {
      // 期限切れキャッシュは削除して null を返す
      await deleteMessageBodyCache(messageId, accountId);
      return null;
    }

    return cache;
  }

  /// メール本文キャッシュを削除。
  Future<void> deleteMessageBodyCache(String messageId, String accountId) async {
    final database = await db;
    await database.delete(
      _tableName,
      where: 'messageId = ? AND accountId = ?',
      whereArgs: [messageId, accountId],
    );
  }

  /// 期限切れ（24時間以上前）のメール本文キャッシュを一括削除。
  /// 定期的に呼び出してストレージをクリーンアップ。
  Future<int> deleteExpiredMessageBodyCaches() async {
    final database = await db;
    final expiryThresholdMs = DateTime.now()
        .subtract(const Duration(hours: 24))
        .millisecondsSinceEpoch;

    return await database.delete(
      _tableName,
      where: 'cachedAt < ?',
      whereArgs: [expiryThresholdMs],
    );
  }

  /// 全メール本文キャッシュを削除（アプリ設定リセット等で使用）。
  Future<int> deleteAllMessageCaches() async {
    final database = await db;
    return await database.delete(_tableName);
  }

  /// キャッシュサイズ情報を取得（ストレージ使用量表示用）。
  /// OCTET_LENGTH() を使用してUTF-8バイト数を正確に計算。
  Future<Map<String, int>> getCacheStats() async {
    final database = await db;
    final result = await database.rawQuery(
      'SELECT COUNT(*) as count, COALESCE(SUM(OCTET_LENGTH(html)), 0) as totalBytes FROM $_tableName',
    );

    if (result.isEmpty) return {'count': 0, 'totalBytes': 0};

    return {
      'count': (result.first['count'] as int?) ?? 0,
      'totalBytes': (result.first['totalBytes'] as int?) ?? 0,
    };
  }

  /// 最も古いメール本文キャッシュ1件を削除（容量不足時の自動削除用）。
  /// 戻り値: 削除されたキャッシュ件数（0または1）。
  Future<int> deleteOldestMessageCache() async {
    final database = await db;
    return await database.delete(
      _tableName,
      limit: 1,
      orderBy: 'cachedAt ASC',
    );
  }

  /// データベースをクローズ（テスト・アプリシャットダウン時に使用）。
  Future<void> close() async {
    final database = _db;
    if (database != null) {
      await database.close();
      _db = null;
    }
  }
}
