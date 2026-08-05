import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/linked_account.dart';

LinkedAccount _account(String colorHex) {
  return LinkedAccount(
    id: 'a',
    userId: 'u',
    provider: MailProviderType.gmail,
    authMethod: AuthMethod.oauth,
    emailAddress: 'a@example.com',
    colorHex: colorHex,
  );
}

void main() {
  group('pickNextAccountColor', () {
    test('未使用の色があればパレット先頭から返す', () {
      final color = pickNextAccountColor([]);
      expect(color, kAccountColorPalette.first);
    });

    test('既に使われている色は避ける', () {
      final existing = [_account(kAccountColorPalette[0])];
      final color = pickNextAccountColor(existing);
      expect(color, kAccountColorPalette[1]);
    });

    test('全色使用済みならパレットを循環させる', () {
      final existing = kAccountColorPalette.map(_account).toList();
      final color = pickNextAccountColor(existing);
      expect(kAccountColorPalette.contains(color), isTrue);
    });
  });
}
