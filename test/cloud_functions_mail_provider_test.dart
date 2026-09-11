import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sukkiri_mail/models/linked_account.dart';
import 'package:sukkiri_mail/services/cloud_functions_mail_provider.dart';

// Create a concrete implementation for testing
class TestMailProvider extends CloudFunctionsMailProvider {
  @override
  MailProviderType get providerType => MailProviderType.gmail;

  // Expose the decompressHtml method for testing
  String testDecompress(String html, bool isCompressed) {
    return decompressHtml(html, isCompressed);
  }
}

void main() {
  group('CloudFunctionsMailProvider - Decompression', () {
    late TestMailProvider provider;

    setUp(() {
      provider = TestMailProvider();
    });

    test('should return original HTML when isCompressed is false', () {
      const originalHtml = '<html><body>Test content</body></html>';
      final result = provider.testDecompress(originalHtml, false);
      expect(result, equals(originalHtml));
    });

    test('should decompress gzip-compressed HTML correctly', () {
      const originalHtml = '<html><body>Test email content with some data</body></html>';

      // Simulate what Cloud Functions does:
      // 1. Compress with gzip
      final compressed = gzip.encode(utf8.encode(originalHtml));
      // 2. Encode to base64
      final encoded = base64Encode(compressed);

      // Test decompression
      final result = provider.testDecompress(encoded, true);
      expect(result, equals(originalHtml));
    });

    test('should handle large HTML content', () {
      // Create a large HTML document (>1KB to trigger compression in real scenario)
      final largeHtml = '''
        <html>
          <head><title>Large Email</title></head>
          <body>
            ${List.generate(50, (i) => '<p>Line $i: This is a test paragraph with some content to make it larger.</p>').join('\n')}
          </body>
        </html>
      ''';

      // Simulate compression
      final compressed = gzip.encode(utf8.encode(largeHtml));
      final encoded = base64Encode(compressed);

      final result = provider.testDecompress(encoded, true);
      expect(result, equals(largeHtml));
    });

    test('should return original on invalid compressed data', () {
      const invalidData = 'not-valid-gzip-data';
      final result = provider.testDecompress(invalidData, true);
      // Should return the input when decompression fails
      expect(result, equals(invalidData));
    });

    test('should return empty string when decompression receives empty data', () {
      const emptyEncoded = ''; // Empty base64
      final result = provider.testDecompress(emptyEncoded, true);
      // Empty data should remain empty
      expect(result, equals(emptyEncoded));
    });
  });
}
