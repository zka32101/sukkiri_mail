/**
 * Unit tests for index module utility functions
 */

import { HttpsError } from "firebase-functions/v2/https";
import {
  resolveProvider,
  emailMetaDocId,
  rawProviderMessageId,
  assertOwnedEmailIds,
  assertAccountOwnership,
} from "./index";
import { db as firestoreDb } from "./firestore";

// Mock firestore
jest.mock("./firestore");

// Mock providers
jest.mock("./providers/gmailProvider");
jest.mock("./providers/outlookProvider");
jest.mock("./providers/imapProvider");

describe("index utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveProvider", () => {
    it("should resolve gmail provider", () => {
      const provider = resolveProvider("gmail");
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("GmailProvider");
    });

    it("should resolve outlook provider", () => {
      const provider = resolveProvider("outlook");
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("OutlookProvider");
    });

    it("should resolve imap provider", () => {
      const provider = resolveProvider("imap");
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("ImapProvider");
    });

    it("should throw HttpsError for unknown provider", () => {
      expect(() => resolveProvider("unknown")).toThrow(HttpsError);
    });

    it("should throw with invalid-argument code", () => {
      try {
        resolveProvider("unknown");
        fail("Should have thrown");
      } catch (error) {
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw with descriptive message", () => {
      try {
        resolveProvider("unknown");
        fail("Should have thrown");
      } catch (error) {
        expect((error as HttpsError).message).toContain("unknown provider");
      }
    });

    it("should return different instances for each call", () => {
      const provider1 = resolveProvider("gmail");
      const provider2 = resolveProvider("gmail");
      expect(provider1).not.toBe(provider2);
    });
  });

  describe("emailMetaDocId", () => {
    it("should combine accountId and itemId with underscore", () => {
      const result = emailMetaDocId("account123", "item456");
      expect(result).toBe("account123_item456");
    });

    it("should handle empty strings", () => {
      const result = emailMetaDocId("", "");
      expect(result).toBe("_");
    });

    it("should preserve special characters in IDs", () => {
      const result = emailMetaDocId("account-123", "item/456");
      expect(result).toBe("account-123_item/456");
    });

    it("should create consistent IDs", () => {
      const id1 = emailMetaDocId("account", "item");
      const id2 = emailMetaDocId("account", "item");
      expect(id1).toBe(id2);
    });

    it("should be reversible with rawProviderMessageId", () => {
      const accountId = "account123";
      const itemId = "item456";
      const compositeId = emailMetaDocId(accountId, itemId);
      const extracted = rawProviderMessageId(accountId, compositeId);
      expect(extracted).toBe(itemId);
    });

    it("should handle IDs with underscores", () => {
      const result = emailMetaDocId("account_123", "item_456");
      expect(result).toBe("account_123_item_456");
    });
  });

  describe("rawProviderMessageId", () => {
    it("should extract provider ID from composite ID", () => {
      const result = rawProviderMessageId("account123", "account123_item456");
      expect(result).toBe("item456");
    });

    it("should handle IDs without matching prefix", () => {
      const result = rawProviderMessageId("account123", "other_item456");
      expect(result).toBe("other_item456");
    });

    it("should return original ID if prefix not found", () => {
      const originalId = "just_an_id";
      const result = rawProviderMessageId("different", originalId);
      expect(result).toBe(originalId);
    });

    it("should handle empty strings", () => {
      const result = rawProviderMessageId("", "_test");
      expect(result).toBe("test");
    });

    it("should preserve special characters after prefix removal", () => {
      const result = rawProviderMessageId("account", "account_message/id");
      expect(result).toBe("message/id");
    });

    it("should be inverse of emailMetaDocId", () => {
      const accountId = "acc";
      const itemId = "item";
      const composite = emailMetaDocId(accountId, itemId);
      const back = rawProviderMessageId(accountId, composite);
      expect(back).toBe(itemId);
    });

    it("should handle prefix that appears in item ID", () => {
      const result = rawProviderMessageId("account123", "account123_account123_data");
      expect(result).toBe("account123_data");
    });
  });

  describe("assertOwnedEmailIds", () => {
    it("should pass for email IDs with correct prefix", () => {
      expect(() => {
        assertOwnedEmailIds("account123", ["account123_email1", "account123_email2"]);
      }).not.toThrow();
    });

    it("should pass for empty array", () => {
      expect(() => {
        assertOwnedEmailIds("account123", []);
      }).not.toThrow();
    });

    it("should pass for single owned email", () => {
      expect(() => {
        assertOwnedEmailIds("acc", ["acc_msg1"]);
      }).not.toThrow();
    });

    it("should throw for unowned email IDs", () => {
      expect(() => {
        assertOwnedEmailIds("account123", ["otherAccount_email1"]);
      }).toThrow(HttpsError);
    });

    it("should throw if any ID is unowned", () => {
      expect(() => {
        assertOwnedEmailIds("account123", [
          "account123_email1",
          "account123_email2",
          "wrongAccount_email3",
        ]);
      }).toThrow(HttpsError);
    });

    it("should throw with permission-denied code", () => {
      try {
        assertOwnedEmailIds("account123", ["wrong_email"]);
        fail("Should have thrown");
      } catch (error) {
        expect((error as HttpsError).code).toBe("permission-denied");
      }
    });

    it("should throw with descriptive message", () => {
      try {
        assertOwnedEmailIds("account123", ["wrong_email"]);
        fail("Should have thrown");
      } catch (error) {
        expect((error as HttpsError).message).toContain(
          "emailId does not belong to accountId"
        );
      }
    });

    it("should validate all IDs in array", () => {
      const validIds = [
        "account_id1",
        "account_id2",
        "account_id3",
        "account_id4",
        "account_id5",
      ];
      expect(() => {
        assertOwnedEmailIds("account", validIds);
      }).not.toThrow();
    });

    it("should fail on first unowned ID", () => {
      expect(() => {
        assertOwnedEmailIds("account", ["account_good", "other_bad"]);
      }).toThrow();
    });

    it("should handle email IDs that start with underscore", () => {
      expect(() => {
        assertOwnedEmailIds("_account", ["_account_id1"]);
      }).not.toThrow();
    });
  });

  describe("assertAccountOwnership", () => {
    it("should pass for owned account", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({ userId: "user123" }),
      });
      const mockDoc = jest.fn().mockReturnValue({
        get: mockGet,
      });
      const mockCollection = jest.fn().mockReturnValue({
        doc: mockDoc,
      });

      (firestoreDb as jest.Mock).mockReturnValue({
        collection: mockCollection,
      });

      await expect(
        assertAccountOwnership("account123", "user123")
      ).resolves.not.toThrow();
    });

    it("should throw for unowned account", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({ userId: "otherUser" }),
      });
      const mockDoc = jest.fn().mockReturnValue({
        get: mockGet,
      });
      const mockCollection = jest.fn().mockReturnValue({
        doc: mockDoc,
      });

      (firestoreDb as jest.Mock).mockReturnValue({
        collection: mockCollection,
      });

      await expect(assertAccountOwnership("account123", "user123")).rejects.toThrow(
        HttpsError
      );
    });

    it("should throw for non-existent account", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => undefined,
      });
      const mockDoc = jest.fn().mockReturnValue({
        get: mockGet,
      });
      const mockCollection = jest.fn().mockReturnValue({
        doc: mockDoc,
      });

      (firestoreDb as jest.Mock).mockReturnValue({
        collection: mockCollection,
      });

      await expect(assertAccountOwnership("account123", "user123")).rejects.toThrow(
        HttpsError
      );
    });

    it("should throw with permission-denied code", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({ userId: "otherUser" }),
      });
      const mockDoc = jest.fn().mockReturnValue({
        get: mockGet,
      });
      const mockCollection = jest.fn().mockReturnValue({
        doc: mockDoc,
      });

      (firestoreDb as jest.Mock).mockReturnValue({
        collection: mockCollection,
      });

      try {
        await assertAccountOwnership("account123", "user123");
        fail("Should have thrown");
      } catch (error) {
        expect((error as HttpsError).code).toBe("permission-denied");
      }
    });
  });

  describe("Integration between functions", () => {
    it("emailMetaDocId and rawProviderMessageId should be inverse operations", () => {
      const accountId = "account_xyz";
      const originalItemId = "message/123";

      const composite = emailMetaDocId(accountId, originalItemId);
      const extracted = rawProviderMessageId(accountId, composite);

      expect(extracted).toBe(originalItemId);
    });

    it("assertOwnedEmailIds should validate emailMetaDocId output", () => {
      const accountId = "myaccount";
      const itemId = "item123";
      const compositeId = emailMetaDocId(accountId, itemId);

      expect(() => {
        assertOwnedEmailIds(accountId, [compositeId]);
      }).not.toThrow();
    });

    it("resolveProvider should not throw for valid providers", () => {
      const validProviders = ["gmail", "outlook", "imap"];

      validProviders.forEach((provider) => {
        expect(() => {
          resolveProvider(provider);
        }).not.toThrow();
      });
    });
  });

  describe("Edge cases and security", () => {
    it("assertOwnedEmailIds should prevent IDOR via ID manipulation", () => {
      expect(() => {
        assertOwnedEmailIds("myaccount", ["anotheraccount_someemail"]);
      }).toThrow();
    });

    it("rawProviderMessageId should handle malformed composite IDs gracefully", () => {
      const result = rawProviderMessageId("account", "invalid_format");
      expect(result).toBe("invalid_format");
    });

    it("resolveProvider should reject invalid provider strings", () => {
      expect(() => resolveProvider("")).toThrow();
      expect(() => resolveProvider("null")).toThrow();
      expect(() => resolveProvider("undefined")).toThrow();
    });
  });
});
