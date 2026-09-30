import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Helper function that mirrors the decompression logic from CloudFunctionsMailProvider
/// Used for testing without requiring class instantiation or Firebase initialization
String _testDecompressHtml(String html, bool isCompressed) {
  if (!isCompressed) return html;

  try {
    // Decode base64
    final bytes = base64Decode(html);
    // Decompress gzip
    final decompressed = gzip.decode(bytes);
    // Convert back to UTF-8 string
    return utf8.decode(decompressed);
  } catch (e) {
    // If decompression fails, return original
    return html;
  }
}

void main() {
  group('CloudFunctionsMailProvider - Decompression', () {
    test('should return original HTML when isCompressed is false', () {
      const originalHtml = '<html><body>Test content</body></html>';
      final result = _testDecompressHtml(originalHtml, false);
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
      final result = _testDecompressHtml(encoded, true);
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

      final result = _testDecompressHtml(encoded, true);
      expect(result, equals(largeHtml));
    });

    test('should return original on invalid compressed data', () {
      const invalidData = 'not-valid-gzip-data';
      final result = _testDecompressHtml(invalidData, true);
      // Should return the input when decompression fails
      expect(result, equals(invalidData));
    });

    test('should return empty string when decompression receives empty data', () {
      const emptyEncoded = ''; // Empty base64
      final result = _testDecompressHtml(emptyEncoded, true);
      // Empty data should remain empty
      expect(result, equals(emptyEncoded));
    });
  });
}
