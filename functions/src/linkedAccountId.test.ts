/**
 * Unit tests for linkedAccountId module
 */

import { linkedAccountDocId } from "./linkedAccountId";

describe("linkedAccountId", () => {
  describe("linkedAccountDocId", () => {
    describe("Basic Functionality", () => {
      it("should generate a hash for valid inputs", () => {
        const id = linkedAccountDocId("user123", "google", "test@example.com");
        expect(typeof id).toBe("string");
        expect(id.length).toBe(64); // SHA256 hex is 64 chars
      });

      it("should return consistent hex string format", () => {
        const id = linkedAccountDocId("user1", "gmail", "test@gmail.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should generate different hashes for different inputs", () => {
        const id1 = linkedAccountDocId("user1", "google", "test@example.com");
        const id2 = linkedAccountDocId("user2", "google", "test@example.com");
        const id3 = linkedAccountDocId("user1", "gmail", "test@example.com");
        const id4 = linkedAccountDocId("user1", "google", "other@example.com");

        expect(id1).not.toBe(id2);
        expect(id1).not.toBe(id3);
        expect(id1).not.toBe(id4);
      });
    });

    describe("Deterministic Output", () => {
      it("should return same hash for identical inputs", () => {
        const input1 = { userId: "user123", provider: "google", email: "test@example.com" };
        const input2 = { userId: "user123", provider: "google", email: "test@example.com" };

        const id1 = linkedAccountDocId(input1.userId, input1.provider, input1.email);
        const id2 = linkedAccountDocId(input2.userId, input2.provider, input2.email);

        expect(id1).toBe(id2);
      });

      it("should return same hash across multiple calls", () => {
        const results = Array.from({ length: 5 }, () =>
          linkedAccountDocId("user123", "google", "test@example.com")
        );

        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
        expect(results[2]).toBe(results[3]);
        expect(results[3]).toBe(results[4]);
      });
    });

    describe("Case Insensitivity - Email Address", () => {
      it("should treat uppercase email same as lowercase", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "TEST@EXAMPLE.COM");

        expect(id1).toBe(id2);
      });

      it("should treat mixed case email same as lowercase", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "Test@Example.Com");

        expect(id1).toBe(id2);
      });

      it("should handle various case combinations", () => {
        const id1 = linkedAccountDocId("user", "provider", "user@DOMAIN.COM");
        const id2 = linkedAccountDocId("user", "provider", "USER@domain.com");
        const id3 = linkedAccountDocId("user", "provider", "UsEr@DoMaIn.CoM");

        expect(id1).toBe(id2);
        expect(id2).toBe(id3);
      });

      it("should not normalize case for userId and provider", () => {
        // userId and provider are NOT normalized, only email
        const id1 = linkedAccountDocId("User123", "Google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "test@example.com");

        // These should be different because userId and provider are case-sensitive
        expect(id1).not.toBe(id2);
      });
    });

    describe("Whitespace Handling", () => {
      it("should trim leading whitespace from email", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "  test@example.com");

        expect(id1).toBe(id2);
      });

      it("should trim trailing whitespace from email", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "test@example.com  ");

        expect(id1).toBe(id2);
      });

      it("should trim both leading and trailing whitespace", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "  test@example.com  ");

        expect(id1).toBe(id2);
      });

      it("should handle tabs and newlines", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "\ttest@example.com\n");

        expect(id1).toBe(id2);
      });

      it("should not trim internal whitespace", () => {
        // Email with internal space should produce different hash than without
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "test @example.com");

        expect(id1).not.toBe(id2);
      });

      it("should not affect userId or provider whitespace", () => {
        // userId and provider are not trimmed
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId(" user123", "google", "test@example.com");
        const id3 = linkedAccountDocId("user123", " google", "test@example.com");

        expect(id1).not.toBe(id2);
        expect(id1).not.toBe(id3);
      });
    });

    describe("Email Normalization Combinations", () => {
      it("should normalize email with uppercase and whitespace", () => {
        const id1 = linkedAccountDocId("user", "provider", "test@example.com");
        const id2 = linkedAccountDocId("user", "provider", "  TEST@EXAMPLE.COM  ");

        expect(id1).toBe(id2);
      });

      it("should handle email with plus addressing", () => {
        const id1 = linkedAccountDocId("user", "provider", "test+tag@example.com");
        const id2 = linkedAccountDocId("user", "provider", "TEST+TAG@EXAMPLE.COM");

        expect(id1).toBe(id2);
      });

      it("should handle email with subdomain", () => {
        const id1 = linkedAccountDocId("user", "provider", "test@sub.example.co.uk");
        const id2 = linkedAccountDocId("user", "provider", "TEST@SUB.EXAMPLE.CO.UK");

        expect(id1).toBe(id2);
      });
    });

    describe("Edge Cases - Email Addresses", () => {
      it("should handle empty email address", () => {
        const id = linkedAccountDocId("user123", "google", "");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle whitespace-only email", () => {
        const id = linkedAccountDocId("user123", "google", "   ");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle very long email address", () => {
        const longEmail = "a".repeat(500) + "@" + "b".repeat(500) + ".com";
        const id = linkedAccountDocId("user123", "google", longEmail);
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle email with special characters", () => {
        const specialEmail = "test!#$%&'*+/=?^_`{|}~@example.com";
        const id = linkedAccountDocId("user123", "google", specialEmail);
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle email with Unicode", () => {
        const unicodeEmail = "用户@例え.jp";
        const id = linkedAccountDocId("user123", "google", unicodeEmail);
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle email without @ symbol", () => {
        const id = linkedAccountDocId("user123", "google", "invalidemail");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle email with multiple @ symbols", () => {
        const id = linkedAccountDocId("user123", "google", "test@test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    describe("Edge Cases - userId", () => {
      it("should handle empty userId", () => {
        const id = linkedAccountDocId("", "google", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle very long userId", () => {
        const longUserId = "u".repeat(10000);
        const id = linkedAccountDocId(longUserId, "google", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle userId with special characters", () => {
        const id = linkedAccountDocId("user!@#$%^&*()", "google", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle userId with Unicode", () => {
        const id = linkedAccountDocId("ユーザー123", "google", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle userId with colons", () => {
        const id = linkedAccountDocId("user:123:456", "google", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should differentiate userId with and without colons", () => {
        const id1 = linkedAccountDocId("user123456", "google", "test@example.com");
        const id2 = linkedAccountDocId("user:123:456", "google", "test@example.com");

        expect(id1).not.toBe(id2);
      });
    });

    describe("Edge Cases - provider", () => {
      it("should handle empty provider", () => {
        const id = linkedAccountDocId("user123", "", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle very long provider", () => {
        const longProvider = "p".repeat(10000);
        const id = linkedAccountDocId("user123", longProvider, "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle provider with special characters", () => {
        const id = linkedAccountDocId("user123", "google-oauth2", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle provider with Unicode", () => {
        const id = linkedAccountDocId("user123", "プロバイダー", "test@example.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should differentiate providers", () => {
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "microsoft", "test@example.com");

        expect(id1).not.toBe(id2);
      });
    });

    describe("Real-World Scenarios", () => {
      it("should generate IDs for common email providers", () => {
        const googleId = linkedAccountDocId("user1", "google", "user@gmail.com");
        const microsoftId = linkedAccountDocId("user1", "microsoft", "user@outlook.com");
        const appleId = linkedAccountDocId("user1", "apple", "user@icloud.com");

        expect(googleId).toMatch(/^[0-9a-f]{64}$/);
        expect(microsoftId).toMatch(/^[0-9a-f]{64}$/);
        expect(appleId).toMatch(/^[0-9a-f]{64}$/);
        expect(googleId).not.toBe(microsoftId);
        expect(microsoftId).not.toBe(appleId);
      });

      it("should handle OAuth user IDs", () => {
        const id = linkedAccountDocId("firebase-uid-12345", "google", "user@gmail.com");
        expect(id).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should handle multiple accounts for same user different providers", () => {
        const userId = "user123";
        const email1 = "user@gmail.com";
        const email2 = "user@outlook.com";

        const googleId = linkedAccountDocId(userId, "google", email1);
        const microsoftId = linkedAccountDocId(userId, "microsoft", email2);

        expect(googleId).not.toBe(microsoftId);
      });

      it("should handle same email with different providers", () => {
        const email = "shared@example.com";
        const provider1Id = linkedAccountDocId("user1", "google", email);
        const provider2Id = linkedAccountDocId("user1", "microsoft", email);

        expect(provider1Id).not.toBe(provider2Id);
      });

      it("should handle same email for different users", () => {
        const email = "shared@example.com";
        const user1Id = linkedAccountDocId("user1", "google", email);
        const user2Id = linkedAccountDocId("user2", "google", email);

        expect(user1Id).not.toBe(user2Id);
      });
    });

    describe("Hash Quality", () => {
      it("should produce unique hashes for similar inputs", () => {
        const id1 = linkedAccountDocId("user", "google", "test1@example.com");
        const id2 = linkedAccountDocId("user", "google", "test2@example.com");
        const id3 = linkedAccountDocId("user", "google", "test3@example.com");

        const set = new Set([id1, id2, id3]);
        expect(set.size).toBe(3);
      });

      it("should produce distributed hashes", () => {
        const hashes = Array.from({ length: 100 }, (_, i) =>
          linkedAccountDocId(`user${i}`, "google", `test${i}@example.com`)
        );

        const set = new Set(hashes);
        expect(set.size).toBe(100); // All unique
      });

      it("should have consistent prefix distribution", () => {
        const hashes = Array.from({ length: 100 }, (_, i) =>
          linkedAccountDocId(`user${i}`, "google", `test${i}@example.com`)
        );

        const firstChars = hashes.map((h) => h[0]);
        const uniqueFirstChars = new Set(firstChars);

        // With 100 samples from SHA256, we should see multiple different first characters
        expect(uniqueFirstChars.size).toBeGreaterThan(1);
      });
    });

    describe("Return Type Validation", () => {
      it("should always return a string", () => {
        const result = linkedAccountDocId("user", "provider", "email@example.com");
        expect(typeof result).toBe("string");
      });

      it("should never return empty string", () => {
        const result = linkedAccountDocId("", "", "");
        expect(result.length).toBeGreaterThan(0);
      });

      it("should always return valid hex string", () => {
        const result = linkedAccountDocId("user", "provider", "email@example.com");
        expect(/^[0-9a-f]*$/.test(result)).toBe(true);
      });

      it("should always return 64-character string (SHA256 hex)", () => {
        const testCases = [
          ["user1", "google", "test@example.com"],
          ["", "", ""],
          ["a".repeat(1000), "b".repeat(1000), "c".repeat(1000)],
          ["user", "provider", "特殊@文字.jp"],
        ];

        testCases.forEach(([userId, provider, email]) => {
          const result = linkedAccountDocId(userId, provider, email);
          expect(result.length).toBe(64);
        });
      });
    });

    describe("Deduplication Use Case", () => {
      it("should enable deduplication by returning same ID for identical inputs", () => {
        // Simulating two concurrent requests with identical user/provider/email
        const id1 = linkedAccountDocId("user123", "google", "test@example.com");
        const id2 = linkedAccountDocId("user123", "google", "test@example.com");

        // Both should produce same ID for Firestore doc(id).set with merge
        expect(id1).toBe(id2);
      });

      it("should prevent duplicate accounts with case-insensitive email", () => {
        // User tries to link same account with different email case
        const id1 = linkedAccountDocId("user123", "google", "TEST@EXAMPLE.COM");
        const id2 = linkedAccountDocId("user123", "google", "test@example.com");

        // Should get same ID to prevent duplicate
        expect(id1).toBe(id2);
      });

      it("should prevent duplicate accounts with email whitespace", () => {
        // User somehow pastes email with extra spaces
        const id1 = linkedAccountDocId("user123", "google", "  test@example.com  ");
        const id2 = linkedAccountDocId("user123", "google", "test@example.com");

        // Should get same ID to prevent duplicate
        expect(id1).toBe(id2);
      });
    });
  });
});
