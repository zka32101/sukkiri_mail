import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../repositories/user_repository.dart';

/// 新着メール通知（FCM）の権限リクエスト・トークン管理のみを担当する。
/// 実際の通知送信はCloud Functions側（新着メール検知時にnotifySendersと突き合わせ）で行う。
class NotificationService {
  final UserRepository _userRepository;

  NotificationService({UserRepository? userRepository})
      : _userRepository = userRepository ?? UserRepository();

  /// 通知権限をリクエストし、許可された場合はFCMトークンをFirestoreに保存する。
  /// トークンが更新された場合も自動で反映する（onTokenRefresh購読）。
  Future<void> initialize(String userId) async {
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      if (kDebugMode) debugPrint('通知権限が拒否されました');
      return;
    }
    final token = await messaging.getToken();
    if (token != null) {
      await _userRepository.setFcmToken(userId, token);
    }
    messaging.onTokenRefresh.listen((newToken) {
      _userRepository.setFcmToken(userId, newToken);
    });
  }

  Future<void> disable(String userId) async {
    await _userRepository.setFcmToken(userId, null);
  }
}
