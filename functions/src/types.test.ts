/**
 * Unit tests for types module type guards
 */

import {
  isConnectAccountRequest,
  isScanAccountRequest,
  isApplyArchiveRulesRequest,
  isRestoreEmailsRequest,
  isFetchMessageRequest,
  isDisconnectAccountRequest,
  ConnectAccountRequest,



  FetchMessageRequest,
  DisconnectAccountRequest,
} from "./types";

describe("types", () => {
  describe("isConnectAccountRequest", () => {
    it("should validate ConnectAccountRequest with required fields", () => {
      const validRequest = {
        provider: "gmail",
        userId: "user123",
      };
      expect(isConnectAccountRequest(validRequest)).toBe(true);
    });

    it("should validate ConnectAccountRequest with additional fields", () => {
      const validRequest = {
        provider: "outlook",
        userId: "user456",
        extra: "field",
        nested: { data: "value" },
      };
      expect(isConnectAccountRequest(validRequest)).toBe(true);
    });

    it("should reject object missing provider", () => {
      const invalidRequest = {
        userId: "user123",
      };
      expect(isConnectAccountRequest(invalidRequest)).toBe(false);
    });

    it("should reject object missing userId", () => {
      const invalidRequest = {
        provider: "gmail",
      };
      expect(isConnectAccountRequest(invalidRequest)).toBe(false);
    });

    it("should reject null", () => {
      expect(isConnectAccountRequest(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isConnectAccountRequest(undefined)).toBe(false);
    });

    it("should reject primitives", () => {
      expect(isConnectAccountRequest("string")).toBe(false);
      expect(isConnectAccountRequest(123)).toBe(false);
      expect(isConnectAccountRequest(true)).toBe(false);
    });

    it("should reject arrays", () => {
      expect(
        isConnectAccountRequest(["provider", "userId"])
      ).toBe(false);
    });

    it("should accept empty string values", () => {
      const request = {
        provider: "",
        userId: "",
      };
      expect(isConnectAccountRequest(request)).toBe(true);
    });
  });

  describe("isScanAccountRequest", () => {
    it("should validate ScanAccountRequest with required fields", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
      };
      expect(isScanAccountRequest(validRequest)).toBe(true);
    });

    it("should validate ScanAccountRequest with additional fields", () => {
      const validRequest = {
        provider: "outlook",
        accountId: "account456",
        timestamp: 1234567890,
        metadata: { key: "value" },
      };
      expect(isScanAccountRequest(validRequest)).toBe(true);
    });

    it("should reject object missing provider", () => {
      const invalidRequest = {
        accountId: "account123",
      };
      expect(isScanAccountRequest(invalidRequest)).toBe(false);
    });

    it("should reject object missing accountId", () => {
      const invalidRequest = {
        provider: "gmail",
      };
      expect(isScanAccountRequest(invalidRequest)).toBe(false);
    });

    it("should reject null", () => {
      expect(isScanAccountRequest(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isScanAccountRequest(undefined)).toBe(false);
    });

    it("should reject primitives", () => {
      expect(isScanAccountRequest("string")).toBe(false);
      expect(isScanAccountRequest(42)).toBe(false);
      expect(isScanAccountRequest(false)).toBe(false);
    });

    it("should reject arrays", () => {
      expect(isScanAccountRequest(["provider", "accountId"])).toBe(
        false
      );
    });
  });

  describe("isApplyArchiveRulesRequest", () => {
    it("should validate ApplyArchiveRulesRequest with required fields", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
      };
      expect(isApplyArchiveRulesRequest(validRequest)).toBe(true);
    });

    it("should validate ApplyArchiveRulesRequest with emailIds array", () => {
      const validRequest = {
        provider: "outlook",
        accountId: "account456",
        emailIds: ["id1", "id2", "id3"],
      };
      expect(isApplyArchiveRulesRequest(validRequest)).toBe(true);
    });

    it("should validate with empty emailIds array", () => {
      const validRequest = {
        provider: "imap",
        accountId: "account789",
        emailIds: [],
      };
      expect(isApplyArchiveRulesRequest(validRequest)).toBe(true);
    });

    it("should validate with additional fields", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
        emailIds: ["id1"],
        timestamp: 1234567890,
        batchSize: 50,
      };
      expect(isApplyArchiveRulesRequest(validRequest)).toBe(true);
    });

    it("should reject object missing provider", () => {
      const invalidRequest = {
        accountId: "account123",
        emailIds: ["id1"],
      };
      expect(isApplyArchiveRulesRequest(invalidRequest)).toBe(false);
    });

    it("should reject object missing accountId", () => {
      const invalidRequest = {
        provider: "gmail",
        emailIds: ["id1"],
      };
      expect(isApplyArchiveRulesRequest(invalidRequest)).toBe(false);
    });

    it("should reject null", () => {
      expect(isApplyArchiveRulesRequest(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isApplyArchiveRulesRequest(undefined)).toBe(false);
    });
  });

  describe("isRestoreEmailsRequest", () => {
    it("should validate RestoreEmailsRequest with required fields", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
      };
      expect(isRestoreEmailsRequest(validRequest)).toBe(true);
    });

    it("should validate RestoreEmailsRequest with emailIds", () => {
      const validRequest = {
        provider: "outlook",
        accountId: "account456",
        emailIds: ["email1", "email2"],
      };
      expect(isRestoreEmailsRequest(validRequest)).toBe(true);
    });

    it("should validate with undefined emailIds", () => {
      const validRequest = {
        provider: "imap",
        accountId: "account789",
        emailIds: undefined,
      };
      expect(isRestoreEmailsRequest(validRequest)).toBe(true);
    });

    it("should validate with additional metadata", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
        emailIds: ["id1", "id2"],
        priority: "high",
        callback: () => {},
      };
      expect(isRestoreEmailsRequest(validRequest)).toBe(true);
    });

    it("should reject missing provider", () => {
      const invalidRequest = {
        accountId: "account123",
        emailIds: ["id1"],
      };
      expect(isRestoreEmailsRequest(invalidRequest)).toBe(false);
    });

    it("should reject missing accountId", () => {
      const invalidRequest = {
        provider: "gmail",
        emailIds: ["id1"],
      };
      expect(isRestoreEmailsRequest(invalidRequest)).toBe(false);
    });

    it("should reject null", () => {
      expect(isRestoreEmailsRequest(null)).toBe(false);
    });

    it("should reject empty object", () => {
      expect(isRestoreEmailsRequest({})).toBe(false);
    });

    it("should reject primitives", () => {
      expect(isRestoreEmailsRequest("string")).toBe(false);
      expect(isRestoreEmailsRequest(100)).toBe(false);
    });
  });

  describe("isFetchMessageRequest", () => {
    it("should validate FetchMessageRequest with all required fields", () => {
      const validRequest = {
        provider: "gmail",
        accountId: "account123",
        messageId: "msg456",
      };
      expect(isFetchMessageRequest(validRequest)).toBe(true);
    });

    it("should validate with additional fields", () => {
      const validRequest = {
        provider: "outlook",
        accountId: "account456",
        messageId: "msg789",
        format: "full",
        includeBody: true,
      };
      expect(isFetchMessageRequest(validRequest)).toBe(true);
    });

    it("should reject missing provider", () => {
      const invalidRequest = {
        accountId: "account123",
        messageId: "msg456",
      };
      expect(isFetchMessageRequest(invalidRequest)).toBe(false);
    });

    it("should reject missing accountId", () => {
      const invalidRequest = {
        provider: "gmail",
        messageId: "msg456",
      };
      expect(isFetchMessageRequest(invalidRequest)).toBe(false);
    });

    it("should reject missing messageId", () => {
      const invalidRequest = {
        provider: "gmail",
        accountId: "account123",
      };
      expect(isFetchMessageRequest(invalidRequest)).toBe(false);
    });

    it("should reject null", () => {
      expect(isFetchMessageRequest(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isFetchMessageRequest(undefined)).toBe(false);
    });

    it("should reject object missing all required fields", () => {
      expect(isFetchMessageRequest({})).toBe(false);
    });

    it("should accept empty string messageId", () => {
      const request = {
        provider: "gmail",
        accountId: "account123",
        messageId: "",
      };
      expect(isFetchMessageRequest(request)).toBe(true);
    });

    it("should reject array", () => {
      expect(
        isFetchMessageRequest(["gmail", "account123", "msg456"])
      ).toBe(false);
    });

    it("should reject primitives", () => {
      expect(isFetchMessageRequest("string")).toBe(false);
      expect(isFetchMessageRequest(999)).toBe(false);
      expect(isFetchMessageRequest(true)).toBe(false);
    });
  });

  describe("isDisconnectAccountRequest", () => {
    it("should validate DisconnectAccountRequest with accountId", () => {
      const validRequest = {
        accountId: "account123",
      };
      expect(isDisconnectAccountRequest(validRequest)).toBe(true);
    });

    it("should validate with additional fields", () => {
      const validRequest = {
        accountId: "account456",
        force: true,
        timestamp: 1234567890,
        reason: "user requested",
      };
      expect(isDisconnectAccountRequest(validRequest)).toBe(true);
    });

    it("should accept only accountId field", () => {
      const minimalistRequest = {
        accountId: "only-account",
      };
      expect(isDisconnectAccountRequest(minimalistRequest)).toBe(true);
    });

    it("should reject missing accountId", () => {
      const invalidRequest = {
        userId: "user123",
      };
      expect(isDisconnectAccountRequest(invalidRequest)).toBe(false);
    });

    it("should reject empty object", () => {
      expect(isDisconnectAccountRequest({})).toBe(false);
    });

    it("should reject null", () => {
      expect(isDisconnectAccountRequest(null)).toBe(false);
    });

    it("should reject undefined", () => {
      expect(isDisconnectAccountRequest(undefined)).toBe(false);
    });

    it("should reject primitives", () => {
      expect(isDisconnectAccountRequest("account123")).toBe(false);
      expect(isDisconnectAccountRequest(12345)).toBe(false);
      expect(isDisconnectAccountRequest(true)).toBe(false);
    });

    it("should reject arrays", () => {
      expect(isDisconnectAccountRequest(["account123"])).toBe(false);
    });

    it("should accept empty string accountId", () => {
      const request = {
        accountId: "",
      };
      expect(isDisconnectAccountRequest(request)).toBe(true);
    });

    it("should accept null accountId value (only checks presence)", () => {
      const request = {
        accountId: null,
      };
      expect(isDisconnectAccountRequest(request)).toBe(true);
    });
  });

  describe("Cross-function distinction", () => {
    it("should distinguish ConnectAccountRequest from ScanAccountRequest", () => {
      const connectRequest = {
        provider: "gmail",
        userId: "user123",
      };
      const scanRequest = {
        provider: "gmail",
        accountId: "account123",
      };

      expect(isConnectAccountRequest(connectRequest)).toBe(true);
      expect(isScanAccountRequest(connectRequest)).toBe(false);

      expect(isConnectAccountRequest(scanRequest)).toBe(false);
      expect(isScanAccountRequest(scanRequest)).toBe(true);
    });

    it("should distinguish FetchMessageRequest from others", () => {
      const fetchRequest = {
        provider: "gmail",
        accountId: "account123",
        messageId: "msg456",
      };

      expect(isFetchMessageRequest(fetchRequest)).toBe(true);
      expect(isScanAccountRequest(fetchRequest)).toBe(true);
    });

    it("should distinguish DisconnectAccountRequest from others", () => {
      const disconnectRequest = {
        accountId: "account123",
      };

      expect(isDisconnectAccountRequest(disconnectRequest)).toBe(true);
      expect(isConnectAccountRequest(disconnectRequest)).toBe(false);
      expect(isScanAccountRequest(disconnectRequest)).toBe(false);
    });
  });

  describe("Edge cases with special values", () => {
    it("should handle objects with symbol keys", () => {
      const request = {
        provider: "gmail",
        userId: "user123",
        [Symbol.for("custom")]: "value",
      };
      expect(isConnectAccountRequest(request)).toBe(true);
    });

    it("should handle frozen objects", () => {
      const request = Object.freeze({
        provider: "gmail",
        accountId: "account123",
      });

      expect(isScanAccountRequest(request)).toBe(true);
    });

    it("should handle objects created with Object.create(null)", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
      const request = Object.create(null) as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.provider = "gmail";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.accountId = "account123";

      expect(isScanAccountRequest(request)).toBe(true);
    });
  });

  describe("Type narrowing verification", () => {
    it("ConnectAccountRequest type guard narrows type correctly", () => {
      const data: unknown = {
        provider: "gmail",
        userId: "user123",
        extra: "field",
      };

      if (isConnectAccountRequest(data)) {
        const request: ConnectAccountRequest = data;
        expect(request.provider).toEqual("gmail");
        expect(request.userId).toEqual("user123");
      }
    });

    it("FetchMessageRequest type guard narrows type correctly", () => {
      const data: unknown = {
        provider: "gmail",
        accountId: "account123",
        messageId: "msg456",
      };

      if (isFetchMessageRequest(data)) {
        const request: FetchMessageRequest = data;
        expect(request.messageId).toEqual("msg456");
      }
    });

    it("DisconnectAccountRequest type guard narrows type correctly", () => {
      const data: unknown = {
        accountId: "account123",
      };

      if (isDisconnectAccountRequest(data)) {
        const request: DisconnectAccountRequest = data;
        expect(request.accountId).toEqual("account123");
      }
    });
  });
});
