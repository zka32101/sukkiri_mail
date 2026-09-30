/**
 * Unit tests for planLimits module
 */

import { HttpsError } from "firebase-functions/v2/https";
import { Firestore } from "firebase-admin/firestore";
import { assertCanAddAccount, FREE_PLAN_ACCOUNT_LIMIT } from "./planLimits";
import * as firestoreModule from "./firestore";

describe("planLimits", () => {
  describe("FREE_PLAN_ACCOUNT_LIMIT constant", () => {
    it("should have correct default value", () => {
      expect(FREE_PLAN_ACCOUNT_LIMIT).toBe(2);
    });

    it("should be a positive integer", () => {
      expect(Number.isInteger(FREE_PLAN_ACCOUNT_LIMIT)).toBe(true);
      expect(FREE_PLAN_ACCOUNT_LIMIT).toBeGreaterThan(0);
    });
  });

  describe("assertCanAddAccount", () => {
    let mockGet: jest.Mock;
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockDb: jest.Mock;

    beforeEach(() => {
      mockGet = jest.fn();
      mockDoc = jest.fn().mockReturnValue({ get: mockGet });
      mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      mockDb = jest.fn().mockReturnValue({ collection: mockCollection });
      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as unknown as Firestore);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe("Account Count Below Limit", () => {
      it("should allow adding account when count is 0", async () => {
        await expect(
          assertCanAddAccount("user123", 0)
        ).resolves.not.toThrow();
      });

      it("should allow adding account when count is 1", async () => {
        await expect(
          assertCanAddAccount("user123", 1)
        ).resolves.not.toThrow();
      });

      it("should not query Firestore when below limit", async () => {
        await assertCanAddAccount("user123", 0);
        expect(mockCollection).not.toHaveBeenCalled();
        expect(mockGet).not.toHaveBeenCalled();
      });
    });

    describe("Account Count At Limit - Free Plan", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "free" }),
        });
      });

      it("should reject when at limit with free plan", async () => {
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow(HttpsError);
      });

      it("should throw resource-exhausted error", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.code).toBe("resource-exhausted");
          } else {
            fail("Should throw HttpsError");
          }
        }
      });

      it("should include limit value in error message", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.message).toContain(String(FREE_PLAN_ACCOUNT_LIMIT));
          }
        }
      });

      it("should mention Pro upgrade in error message", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.message).toContain("Pro");
          }
        }
      });

      it("should reject when exceeding limit", async () => {
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT + 1)
        ).rejects.toThrow(HttpsError);
      });

      it("should reject with large account count over limit", async () => {
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT + 100)
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("Account Count At Limit - Pro Plan", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });
      });

      it("should allow adding account when pro plan at limit", async () => {
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).resolves.not.toThrow();
      });

      it("should allow unlimited accounts for pro plan", async () => {
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT + 100)
        ).resolves.not.toThrow();
      });

      it("should query Firestore to check plan", async () => {
        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
        expect(mockCollection).toHaveBeenCalledWith("users");
        expect(mockDoc).toHaveBeenCalledWith("user123");
        expect(mockGet).toHaveBeenCalled();
      });
    });

    describe("Missing User Document - Default to Free Plan", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => undefined,
        });
      });

      it("should treat missing user as free plan", async () => {
        await expect(
          assertCanAddAccount("nonexistent_user", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow(HttpsError);
      });

      it("should reject with resource-exhausted for missing user at limit", async () => {
        try {
          await assertCanAddAccount("nonexistent_user", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.code).toBe("resource-exhausted");
          }
        }
      });
    });

    describe("Null/Undefined Plan Field - Default to Free", () => {
      it("should treat null plan as free", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: null }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow(HttpsError);
      });

      it("should treat undefined plan as free", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: undefined }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow(HttpsError);
      });

      it("should treat missing plan field as free", async () => {
        mockGet.mockResolvedValue({
          data: () => ({}),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("Plan Type Validation", () => {
      it("should handle uppercase plan values", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "FREE" }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle mixed case plan values", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "Free" }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should only accept lowercase 'pro' for unlimited", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "PRO" }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle unknown plan types as free", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "premium" }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle numeric plan values", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: 1 }),
        });

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });
    });

    describe("Edge Cases - User ID", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "free" }),
        });
      });

      it("should handle empty user ID", async () => {
        await expect(
          assertCanAddAccount("", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle very long user ID", async () => {
        const longUid = "a".repeat(10000);
        await expect(
          assertCanAddAccount(longUid, FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle special characters in user ID", async () => {
        await expect(
          assertCanAddAccount("user!@#$%^&*()", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle Unicode characters in user ID", async () => {
        await expect(
          assertCanAddAccount("ユーザー123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });
    });

    describe("Edge Cases - Account Count", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "free" }),
        });
      });

      it("should handle negative account count", async () => {
        await expect(
          assertCanAddAccount("user123", -1)
        ).resolves.not.toThrow();
      });

      it("should handle zero account count", async () => {
        await expect(
          assertCanAddAccount("user123", 0)
        ).resolves.not.toThrow();
      });

      it("should handle very large account count", async () => {
        await expect(
          assertCanAddAccount("user123", Number.MAX_SAFE_INTEGER)
        ).rejects.toThrow();
      });
    });

    describe("Firestore Interaction", () => {
      it("should query users collection", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });

        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
        expect(mockCollection).toHaveBeenCalledWith("users");
      });

      it("should access correct user document", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });

        await assertCanAddAccount("user456", FREE_PLAN_ACCOUNT_LIMIT);
        expect(mockDoc).toHaveBeenCalledWith("user456");
      });

      it("should call get() on document reference", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });

        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
        expect(mockGet).toHaveBeenCalled();
      });

      it("should handle Firestore get() failure gracefully", async () => {
        mockGet.mockRejectedValue(new Error("Firestore error"));

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();
      });

      it("should handle Firestore network errors", async () => {
        mockGet.mockRejectedValue(new Error("Network error"));

        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow("Network error");
      });
    });

    describe("Plan Upgrade Path", () => {
      it("should allow free plan user to upgrade to pro", async () => {
        // First check: free plan at limit
        mockGet.mockResolvedValue({
          data: () => ({ plan: "free" }),
        });
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).rejects.toThrow();

        // Second check: after upgrade to pro
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });
        await expect(
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        ).resolves.not.toThrow();
      });

      it("should allow multiple sequential calls for same user", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });

        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT + 10);
        await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT + 100);

        expect(mockGet).toHaveBeenCalledTimes(3);
      });
    });

    describe("Error Message Content", () => {
      beforeEach(() => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "free" }),
        });
      });

      it("should provide clear error message with limit", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.message).toMatch(/\d+/);
            expect(e.message).toContain("無料プラン");
          }
        }
      });

      it("should indicate Pro as the solution", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.message).toContain("Pro");
            expect(e.message).toContain("アップグレード");
          }
        }
      });

      it("should not leak internal implementation details", async () => {
        try {
          await assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT);
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof HttpsError) {
            expect(e.message).not.toContain("Firestore");
            expect(e.message).not.toContain("linkedAccounts");
          }
        }
      });
    });

    describe("Concurrent Access Patterns", () => {
      it("should handle rapid sequential calls", async () => {
        mockGet.mockResolvedValue({
          data: () => ({ plan: "pro" }),
        });

        const promises = Array.from({ length: 10 }, () =>
          assertCanAddAccount("user123", FREE_PLAN_ACCOUNT_LIMIT)
        );

        await expect(Promise.all(promises)).resolves.toBeDefined();
      });

      it("should handle different users simultaneously", async () => {
        mockGet.mockImplementation(() =>
          Promise.resolve({
            data: () => ({ plan: "pro" }),
          })
        );

        const promises = Array.from({ length: 5 }, (_, i) =>
          assertCanAddAccount(`user${i}`, FREE_PLAN_ACCOUNT_LIMIT)
        );

        await expect(Promise.all(promises)).resolves.toBeDefined();
      });

      it("should handle mixed plan types", async () => {
        const calls: Promise<void>[] = [];

        // First user: free plan, should fail
        mockGet.mockResolvedValueOnce({
          data: () => ({ plan: "free" }),
        });
        calls.push(
          expect(
            assertCanAddAccount("user1", FREE_PLAN_ACCOUNT_LIMIT)
          ).rejects.toThrow()
        );

        // Second user: pro plan, should succeed
        mockGet.mockResolvedValueOnce({
          data: () => ({ plan: "pro" }),
        });
        calls.push(
          expect(
            assertCanAddAccount("user2", FREE_PLAN_ACCOUNT_LIMIT)
          ).resolves.not.toThrow()
        );

        await Promise.all(calls);
      });
    });
  });
});
