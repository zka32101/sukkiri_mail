/**
 * Unit tests for linkedAccountUpsert module
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */

import { Firestore } from "firebase-admin/firestore";
import { upsertLinkedAccount, LinkedAccountUpsertResult } from "./linkedAccountUpsert";
import * as firestoreModule from "./firestore";
import * as linkedAccountIdModule from "./linkedAccountId";
import * as categorizeModule from "./categorize";
import * as planLimitsModule from "./planLimits";

interface MockTransaction {
  get: jest.Mock;
  set: jest.Mock;
}

interface MockDocumentSnapshot {
  exists: boolean;
  data: jest.Mock;
}

// Helper function to call upsert with proper type casting
async function callUpsert(
  userId: string,
  provider: string,
  emailAddress: string,
  buildUpdateData: (isNew: boolean) => Record<string, unknown>
): Promise<LinkedAccountUpsertResult> {
  return upsertLinkedAccount(userId, provider, emailAddress, buildUpdateData);
}

describe("linkedAccountUpsert", () => {
  let mockTransaction: Partial<MockTransaction>;
  let mockDb: jest.Mock;
  let mockDocRef: any;
  let mockCollection: jest.Mock;
  let mockLinkedAccountDocId: jest.Mock;
  let mockPickNextAccountColor: jest.Mock;
  let mockAssertCanAddAccount: jest.Mock;

  beforeEach(() => {
    mockDocRef = {
      id: "test-doc-id",
    };

    mockCollection = jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnValue("mocked-query"),
    });

    mockDb = jest.fn().mockReturnValue({
      collection: mockCollection,
      runTransaction: jest.fn(),
    });

    mockTransaction = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockLinkedAccountDocId = jest.fn().mockReturnValue("deterministic-doc-id");
    mockPickNextAccountColor = jest.fn().mockReturnValue("#FF0000");
    mockAssertCanAddAccount = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as unknown as Firestore);
    jest.spyOn(linkedAccountIdModule, "linkedAccountDocId").mockImplementation(
      mockLinkedAccountDocId
    );
    jest.spyOn(categorizeModule, "pickNextAccountColor").mockImplementation(
      mockPickNextAccountColor
    );
    jest.spyOn(planLimitsModule, "assertCanAddAccount").mockImplementation(
      mockAssertCanAddAccount
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Upsert Existing Account", () => {
    beforeEach(() => {
      // Mock: existing account found
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });
    });

    it("should reuse existing account color", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({ accessToken: "new-token" });

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.colorHex).toBe("#0000FF");
      expect(result.isNew).toBe(false);
    });

    it("should call buildUpdateData with isNew=false", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(buildUpdateData).toHaveBeenCalledWith(false);
    });

    it("should merge update data with color", async () => {
      const buildUpdateData = jest
        .fn()
        .mockReturnValue({ accessToken: "token", refreshToken: "refresh" });

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      const setCall = (mockTransaction.set as jest.Mock).mock.calls[0];
      expect(setCall[1]).toEqual({
        accessToken: "token",
        refreshToken: "refresh",
        colorHex: "#0000FF",
      });
    });

    it("should use merge: true option in set call", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      const setCall = (mockTransaction.set as jest.Mock).mock.calls[0];
      expect(setCall[2]).toEqual({ merge: true });
    });

    it("should not check plan limits for existing account", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockAssertCanAddAccount).not.toHaveBeenCalled();
    });

    it("should handle missing colorHex in existing data", async () => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({}), // No colorHex
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      mockPickNextAccountColor.mockReturnValue("#00FF00");

      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.colorHex).toBe("#00FF00");
      expect(mockPickNextAccountColor).toHaveBeenCalledWith([]);
    });
  });

  describe("Upsert New Account", () => {
    beforeEach(() => {
      // Mock: no existing account
      const noExistingSnap: Partial<MockDocumentSnapshot> = {
        exists: false,
      };

      // Mock: query results for user's existing accounts
      const querySnap = {
        docs: [
          {
            data: () => ({ colorHex: "#FF0000" }),
          },
          {
            data: () => ({ colorHex: "#00FF00" }),
          },
        ],
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const txGet = jest.fn();
        txGet.mockResolvedValueOnce(noExistingSnap); // First get: check existing doc
        txGet.mockResolvedValueOnce(querySnap); // Second get: query user's accounts

        mockTransaction.get = txGet;
        return callback(mockTransaction);
      });
    });

    it("should detect new account correctly", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.isNew).toBe(true);
    });

    it("should call buildUpdateData with isNew=true", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(buildUpdateData).toHaveBeenCalledWith(true);
    });

    it("should check plan limits for new account", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockAssertCanAddAccount).toHaveBeenCalledWith("user123", 2);
    });

    it("should select next color from existing colors", async () => {
      mockPickNextAccountColor.mockReturnValue("#0000FF");

      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockPickNextAccountColor).toHaveBeenCalledWith(["#FF0000", "#00FF00"]);
      expect(result.colorHex).toBe("#0000FF");
    });

    it("should handle first account (no existing colors)", async () => {
      // Mock: user has no existing accounts
      const querySnap = {
        docs: [],
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const txGet = jest.fn();
        txGet.mockResolvedValueOnce({ exists: false }); // No existing doc
        txGet.mockResolvedValueOnce(querySnap); // Empty query results

        mockTransaction.get = txGet;
        return callback(mockTransaction);
      });

      mockPickNextAccountColor.mockReturnValue("#FF0000");

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockPickNextAccountColor).toHaveBeenCalledWith([]);
    });
  });

  describe("Document ID Generation", () => {
    beforeEach(() => {
      const noExistingSnap: Partial<MockDocumentSnapshot> = {
        exists: false,
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock)
          .mockResolvedValueOnce(noExistingSnap)
          .mockResolvedValueOnce({ docs: [] });
        return callback(mockTransaction);
      });
    });

    it("should use linkedAccountDocId to generate deterministic ID", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockLinkedAccountDocId).toHaveBeenCalledWith("user123", "gmail", "test@example.com");
    });

    it("should use same ID for same user/provider/email combination", async () => {
      mockLinkedAccountDocId.mockReturnValue("same-deterministic-id");

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);
      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockLinkedAccountDocId).toHaveBeenCalledTimes(2);
      expect(mockLinkedAccountDocId.mock.results[0].value).toBe("same-deterministic-id");
      expect(mockLinkedAccountDocId.mock.results[1].value).toBe("same-deterministic-id");
    });

    it("should access linkedAccounts collection", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockCollection).toHaveBeenCalledWith("linkedAccounts");
    });
  });

  describe("Transaction Handling", () => {
    beforeEach(() => {
      const noExistingSnap: Partial<MockDocumentSnapshot> = {
        exists: false,
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock)
          .mockResolvedValueOnce(noExistingSnap)
          .mockResolvedValueOnce({ docs: [] });
        return callback(mockTransaction);
      });
    });

    it("should use runTransaction for atomic operations", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockDb().runTransaction).toHaveBeenCalled();
    });

    it("should get existing document in transaction", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockTransaction.get).toHaveBeenCalledWith(mockDocRef);
    });

    it("should set document in transaction with merge option", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({ data: "test" });

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      const setCalls = (mockTransaction.set as jest.Mock).mock.calls;
      expect(setCalls.length).toBeGreaterThan(0);
      expect(setCalls[0][2]).toEqual({ merge: true });
    });

    it("should handle transaction callback errors", async () => {
      (mockDb().runTransaction as jest.Mock).mockImplementation(() => {
        throw new Error("Transaction failed");
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await expect(
        callUpsert("user123", "gmail", "test@example.com", buildUpdateData)
      ).rejects.toThrow("Transaction failed");
    });
  });

  describe("BuildUpdateData Function", () => {
    beforeEach(() => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });
    });

    it("should call buildUpdateData for updating", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({ token: "abc123" });

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(buildUpdateData).toHaveBeenCalled();
    });

    it("should use buildUpdateData return value in update", async () => {
      const customData = { accessToken: "token123", refreshToken: "refresh456" };
      const buildUpdateData = jest.fn().mockReturnValue(customData);

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      const setCall = (mockTransaction.set as jest.Mock).mock.calls[0];
      expect(setCall[1]).toMatchObject(customData);
    });

    it("should handle buildUpdateData returning empty object", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert(
        "user123",
        "gmail",
        "test@example.com",
        buildUpdateData
      );

      expect(result.colorHex).toBe("#0000FF");
    });

    it("should handle buildUpdateData throwing error", async () => {
      const buildUpdateData = jest.fn().mockImplementation(() => {
        throw new Error("Build data failed");
      });

      // Note: The actual implementation calls buildUpdateData inside transaction
      // So the error should propagate
      (mockDb().runTransaction as jest.Mock).mockImplementation((callback) =>
        callback(mockTransaction)
      );

      (mockTransaction.get as jest.Mock)
        .mockResolvedValueOnce({ exists: true, data: () => ({ colorHex: "#0000FF" }) });

      await expect(
        callUpsert("user123", "gmail", "test@example.com", buildUpdateData)
      ).rejects.toThrow("Build data failed");
    });
  });

  describe("Result Object", () => {
    beforeEach(() => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#FF5733" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });
    });

    it("should return LinkedAccountUpsertResult", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result).toHaveProperty("ref");
      expect(result).toHaveProperty("colorHex");
      expect(result).toHaveProperty("isNew");
    });

    it("should return correct ref", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.ref).toBe(mockDocRef);
    });

    it("should return correct colorHex", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.colorHex).toBe("#FF5733");
    });

    it("should return correct isNew flag", async () => {
      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.isNew).toBe(false);
    });
  });

  describe("Plan Limits Integration", () => {
    beforeEach(() => {
      const noExistingSnap: Partial<MockDocumentSnapshot> = {
        exists: false,
      };

      const querySnap = {
        docs: [] as any[],
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const txGet = jest.fn();
        txGet.mockResolvedValueOnce(noExistingSnap);
        txGet.mockResolvedValueOnce(querySnap);

        mockTransaction.get = txGet;
        return callback(mockTransaction);
      });
    });

    it("should not call assertCanAddAccount for existing account", async () => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockAssertCanAddAccount).not.toHaveBeenCalled();
    });

    it("should call assertCanAddAccount with correct user and count for new account", async () => {
      const querySnap = {
        docs: [{ data: () => ({ colorHex: "#FF0000" }) }],
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock)
          .mockResolvedValueOnce({ exists: false })
          .mockResolvedValueOnce(querySnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user456", "gmail", "test@example.com", buildUpdateData);

      expect(mockAssertCanAddAccount).toHaveBeenCalledWith("user456", 1);
    });

    it("should propagate assertCanAddAccount errors", async () => {
      mockAssertCanAddAccount.mockRejectedValue(
        new Error("resource-exhausted: Free plan limit reached")
      );

      (mockDb().runTransaction as jest.Mock).mockImplementation((callback) =>
        callback(mockTransaction)
      );

      (mockTransaction.get as jest.Mock)
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ docs: [] });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await expect(
        callUpsert("user123", "gmail", "test@example.com", buildUpdateData)
      ).rejects.toThrow("resource-exhausted");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long user ID", async () => {
      const longUserId = "a".repeat(1000);
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert(longUserId, "gmail", "test@example.com", buildUpdateData);

      expect(mockLinkedAccountDocId).toHaveBeenCalledWith(
        longUserId,
        "gmail",
        "test@example.com"
      );
    });

    it("should handle special characters in provider", async () => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail-custom!@#", "test@example.com", buildUpdateData);

      expect(mockLinkedAccountDocId).toHaveBeenCalledWith(
        "user123",
        "gmail-custom!@#",
        "test@example.com"
      );
    });

    it("should handle Unicode in email address", async () => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "テスト@example.com", buildUpdateData);

      expect(mockLinkedAccountDocId).toHaveBeenCalledWith(
        "user123",
        "gmail",
        "テスト@example.com"
      );
    });

    it("should handle empty buildUpdateData", async () => {
      const existingSnap: Partial<MockDocumentSnapshot> = {
        exists: true,
        data: jest.fn().mockReturnValue({ colorHex: "#0000FF" }),
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock).mockResolvedValueOnce(existingSnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      const result = await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(result.colorHex).toBe("#0000FF");
    });

    it("should handle large number of existing accounts", async () => {
      const manyDocs = Array.from({ length: 100 }, (_, i) => ({
        data: () => ({ colorHex: `#${String(i).padStart(6, "0")}` }),
      }));

      const querySnap = {
        docs: manyDocs,
      };

      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        (mockTransaction.get as jest.Mock)
          .mockResolvedValueOnce({ exists: false })
          .mockResolvedValueOnce(querySnap);
        return callback(mockTransaction);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      await callUpsert("user123", "gmail", "test@example.com", buildUpdateData);

      expect(mockAssertCanAddAccount).toHaveBeenCalledWith("user123", 100);
    });
  });

  describe("Concurrency and Race Conditions", () => {
    it("should handle concurrent upserts via transaction atomicity", async () => {
      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        // Create a fresh transaction for each call
        const txGet = jest.fn();
        txGet.mockResolvedValue({ exists: false });
        txGet.mockResolvedValueOnce({ exists: false });
        txGet.mockResolvedValueOnce({ docs: [] });

        const tx = {
          get: txGet,
          set: jest.fn(),
        };

        return callback(tx);
      });

      const buildUpdateData1 = jest.fn().mockReturnValue({ token1: "abc" });
      const buildUpdateData2 = jest.fn().mockReturnValue({ token2: "def" });

      const result1 = callUpsert("user123", "gmail", "test@example.com", buildUpdateData1);
      const result2 = callUpsert("user123", "gmail", "test@example.com", buildUpdateData2);

      // Both should complete without errors
      const results = await Promise.all([result1, result2]);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.colorHex).toBeDefined();
        expect(result.isNew).toBeDefined();
      });
    });

    it("should handle different providers concurrently", async () => {
      (mockDb().runTransaction as jest.Mock).mockImplementation(async (callback) => {
        // Create a fresh transaction for each call
        const txGet = jest.fn();
        txGet.mockResolvedValueOnce({ exists: false });
        txGet.mockResolvedValueOnce({ docs: [] });

        const tx = {
          get: txGet,
          set: jest.fn(),
        };

        return callback(tx);
      });

      const buildUpdateData = jest.fn().mockReturnValue({});

      const result1 = callUpsert("user123", "gmail", "test@gmail.com", buildUpdateData);
      const result2 = callUpsert("user123", "outlook", "test@outlook.com", buildUpdateData);

      const results = await Promise.all([result1, result2]);

      expect(results).toHaveLength(2);
      expect(mockLinkedAccountDocId).toHaveBeenCalledTimes(2);
    });
  });
});
