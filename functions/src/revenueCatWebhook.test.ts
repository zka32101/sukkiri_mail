/**
 * Unit tests for revenueCatWebhook module
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-type-assertion */

import { Firestore } from "firebase-admin/firestore";
import { revenueCatWebhook } from "./revenueCatWebhook";
import * as firestoreModule from "./firestore";
import * as secretsModule from "./secrets";

interface MockRequest {
  method: string;
  get: jest.Mock;
  body: Record<string, unknown>;
}

interface MockResponse {
  status: jest.Mock;
  send: jest.Mock;
}

// Helper function to call webhook with proper type casting
async function callWebhook(req: MockRequest, res: MockResponse): Promise<void> {
  return revenueCatWebhook(
    req as unknown as Parameters<typeof revenueCatWebhook>[0],
    res as unknown as Parameters<typeof revenueCatWebhook>[1]
  );
}

describe("revenueCatWebhook", () => {
  describe("Request Validation", () => {
    let mockRequest: MockRequest;
    let mockResponse: MockResponse;
    let mockDb: jest.Mock;
    let mockGetSecret: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        method: "POST",
        get: jest.fn(),
        body: {} as Record<string, unknown>,
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
      mockGetSecret = jest.fn().mockResolvedValue("test-secret");

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as unknown as Firestore);
      jest.spyOn(secretsModule, "getSecret").mockImplementation(mockGetSecret);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe("HTTP Method Validation", () => {
      it("should reject GET requests", async () => {
        mockRequest.method = "GET";
        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(405);
        expect(mockResponse.send).toHaveBeenCalledWith("method not allowed");
      });

      it("should reject PUT requests", async () => {
        mockRequest.method = "PUT";
        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(405);
      });

      it("should reject DELETE requests", async () => {
        mockRequest.method = "DELETE";
        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(405);
      });

      it("should reject PATCH requests", async () => {
        mockRequest.method = "PATCH";
        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(405);
      });

      it("should accept POST requests", async () => {
        mockRequest.method = "POST";
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };
        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).not.toHaveBeenCalledWith(405);
      });
    });

    describe("Secret Validation", () => {
      it("should reject request when secret is not configured", async () => {
        mockGetSecret.mockResolvedValue(null);
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith("webhook not configured");
      });

      it("should handle secret retrieval errors", async () => {
        mockGetSecret.mockRejectedValue(new Error("Secret Manager error"));
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });

      it("should query Secret Manager for revenuecat-webhook-secret", async () => {
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };
        mockRequest.get.mockReturnValue("Bearer test-secret");

        await callWebhook(mockRequest, mockResponse);
        expect(mockGetSecret).toHaveBeenCalledWith("revenuecat-webhook-secret");
      });

      it("should reject request with missing Authorization header", async () => {
        mockRequest.get.mockReturnValue(undefined);
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith("unauthorized");
      });

      it("should reject request with wrong Authorization secret", async () => {
        mockRequest.get.mockReturnValue("Bearer wrong-secret");
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });

      it("should reject request with empty Authorization header", async () => {
        mockRequest.get.mockReturnValue("");
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });

      it("should handle Bearer prefix with various casing", async () => {
        mockRequest.get.mockReturnValue("bearer test-secret");
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).not.toHaveBeenCalledWith(401);
      });

      it("should handle Authorization header with extra spaces", async () => {
        mockRequest.get.mockReturnValue("Bearer   test-secret   ");
        mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123", entitlement_ids: ["pro"] } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).not.toHaveBeenCalledWith(401);
      });
    });

    describe("Event Validation", () => {
      beforeEach(() => {
        mockRequest.get.mockReturnValue("Bearer test-secret");
      });

      it("should reject request with missing event", async () => {
        mockRequest.body = {};

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining("ignored: missing event or type"));
      });

      it("should reject request with null event", async () => {
        mockRequest.body = { event: null };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it("should reject request with undefined event", async () => {
        mockRequest.body = { event: undefined };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it("should reject request with missing event.type", async () => {
        mockRequest.body = { event: { app_user_id: "user123" } };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining("ignored: missing event or type"));
      });

      it("should return 200 for invalid events to prevent RevenueCat retry loops", async () => {
        mockRequest.body = { event: null };

        await callWebhook(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe("Pro Event Types", () => {
    let mockRequest: MockRequest;
    let mockResponse: MockResponse;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {} as Record<string, unknown>,
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as unknown as Firestore);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should upgrade to pro on INITIAL_PURCHASE", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("ok");
    });

    it("should upgrade to pro on RENEWAL", async () => {
      mockRequest.body = {
        event: {
          type: "RENEWAL",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should upgrade to pro on UNCANCELLATION", async () => {
      mockRequest.body = {
        event: {
          type: "UNCANCELLATION",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should upgrade to pro on PRODUCT_CHANGE", async () => {
      mockRequest.body = {
        event: {
          type: "PRODUCT_CHANGE",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });
  });

  describe("Free Event Types", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should downgrade to free on EXPIRATION", async () => {
      mockRequest.body = {
        event: {
          type: "EXPIRATION",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "free" }, { merge: true });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("ok");
    });

    it("should not downgrade on CANCELLATION (handles differently)", async () => {
      mockRequest.body = {
        event: {
          type: "CANCELLATION",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining("ignored: no plan change"));
    });
  });

  describe("Entitlement Handling", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should process events with no entitlement_ids (backward compatibility)", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          // No entitlement_ids - should fallback to type-based detection
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should ignore events for non-pro entitlements", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["premium"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining("ignored: INITIAL_PURCHASE not for pro entitlement")
      );
    });

    it("should process events with multiple entitlements including pro", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["premium", "pro", "plus"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should ignore events with empty entitlement_ids", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: [],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("Transfer Events", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle TRANSFER events with single destination", async () => {
      mockRequest.body = {
        event: {
          type: "TRANSFER",
          transferred_to: ["user456"],
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith("ok");
    });

    it("should handle TRANSFER events with multiple destinations", async () => {
      mockSet.mockResolvedValue(undefined);
      mockRequest.body = {
        event: {
          type: "TRANSFER",
          transferred_to: ["user456", "user789", "user999"],
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledTimes(3);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should reject TRANSFER event with missing transferred_to", async () => {
      mockRequest.body = {
        event: {
          type: "TRANSFER",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining("ignored: TRANSFER missing transferred_to")
      );
    });

    it("should ignore TRANSFER for non-pro entitlements", async () => {
      mockRequest.body = {
        event: {
          type: "TRANSFER",
          transferred_to: ["user456"],
          entitlement_ids: ["premium"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining("ignored: TRANSFER not for pro entitlement")
      );
    });

    it("should handle TRANSFER with empty transferred_to array", async () => {
      mockRequest.body = {
        event: {
          type: "TRANSFER",
          transferred_to: [],
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("User ID Handling", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should use app_user_id when available", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          original_app_user_id: "legacy_user",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockDb().collection("users").doc).toHaveBeenCalledWith("user123");
    });

    it("should fallback to original_app_user_id when app_user_id is missing", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          original_app_user_id: "legacy_user",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockDb().collection("users").doc).toHaveBeenCalledWith("legacy_user");
    });

    it("should reject event with no user ID", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining("ignored: missing app_user_id"));
    });

    it("should handle null app_user_id", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: null,
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle very long user IDs", async () => {
      const longId = "a".repeat(10000);
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: longId,
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockDb().collection("users").doc).toHaveBeenCalledWith(longId);
    });

    it("should handle special characters in user ID", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user!@#$%^&*()",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockDb().collection("users").doc).toHaveBeenCalledWith("user!@#$%^&*()");
    });

    it("should handle Unicode characters in user ID", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "ユーザー123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockDb().collection("users").doc).toHaveBeenCalledWith("ユーザー123");
    });
  });

  describe("Ignored Event Types", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should ignore BILLING_ISSUE events", async () => {
      mockRequest.body = {
        event: {
          type: "BILLING_ISSUE",
          app_user_id: "user123",
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining("ignored: no plan change")
      );
    });

    it("should ignore SUBSCRIPTION_PAUSED events", async () => {
      mockRequest.body = {
        event: {
          type: "SUBSCRIPTION_PAUSED",
          app_user_id: "user123",
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should ignore unknown event types", async () => {
      mockRequest.body = {
        event: {
          type: "UNKNOWN_EVENT_TYPE",
          app_user_id: "user123",
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe("Firestore Integration", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;
    let mockDoc: jest.Mock;
    let mockCollection: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDoc = jest.fn().mockReturnValue({ set: mockSet });
      mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
      mockDb = jest.fn().mockReturnValue({ collection: mockCollection });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {
          event: {
            type: "INITIAL_PURCHASE",
            app_user_id: "user123",
            entitlement_ids: ["pro"],
          },
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should update users collection", async () => {
      await callWebhook(mockRequest, mockResponse);
      expect(mockCollection).toHaveBeenCalledWith("users");
    });

    it("should update correct user document", async () => {
      await callWebhook(mockRequest, mockResponse);
      expect(mockDoc).toHaveBeenCalledWith("user123");
    });

    it("should set plan field with merge option", async () => {
      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should handle Firestore write errors", async () => {
      mockSet.mockRejectedValue(new Error("Firestore error"));

      await expect(async () => {
        await callWebhook(mockRequest, mockResponse);
      }).rejects.toThrow("Firestore error");
    });

    it("should use merge: true to preserve other user fields", async () => {
      await callWebhook(mockRequest, mockResponse);
      const call = mockSet.mock.calls[0] as unknown[];
      expect(call[1]).toEqual({ merge: true });
    });
  });

  describe("Error Handling and Logging", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockGetSecret: jest.Mock;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
      mockGetSecret = jest.fn().mockResolvedValue("test-secret");

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockImplementation(mockGetSecret);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it("should log error when secret is not configured", async () => {
      mockGetSecret.mockResolvedValue(null);
      mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123" } };

      await callWebhook(mockRequest, mockResponse);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("revenuecat-webhook-secret")
      );
    });

    it("should log warning for unauthorized requests", async () => {
      mockRequest.get.mockReturnValue("Bearer wrong-secret");
      mockRequest.body = { event: { type: "INITIAL_PURCHASE", app_user_id: "user123" } };

      await callWebhook(mockRequest, mockResponse);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("rejected: invalid Authorization header")
      );
    });

    it("should log warning for missing event", async () => {
      mockRequest.body = {};

      await callWebhook(mockRequest, mockResponse);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("missing event or event.type")
      );
    });

    it("should log warning for missing app_user_id", async () => {
      mockRequest.body = { event: { type: "INITIAL_PURCHASE" } };

      await callWebhook(mockRequest, mockResponse);
      expect(consoleWarnSpy).toHaveBeenCalled();
      const calls = consoleWarnSpy.mock.calls;
      expect(calls.some(call =>
        typeof call[0] === 'string' && call[0].includes("missing app_user_id")
      )).toBe(true);
    });
  });

  describe("Security and Authentication", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;

    beforeEach(() => {
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn(),
        body: {
          event: {
            type: "INITIAL_PURCHASE",
            app_user_id: "user123",
            entitlement_ids: ["pro"],
          },
        },
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should require exact secret match (timing-safe comparison)", async () => {
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("correct-secret");

      mockRequest.get.mockReturnValue("Bearer wrong-secret");
      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(401);

      mockRequest.get.mockReturnValue("Bearer correct-secret");
      mockResponse.status.mockClear();
      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).not.toHaveBeenCalledWith(401);
    });

    it("should prevent authorization bypass with null bytes", async () => {
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");

      mockRequest.get.mockReturnValue("Bearer test-secret\x00extra");
      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should be case-sensitive for secret", async () => {
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("Test-Secret");

      mockRequest.get.mockReturnValue("Bearer test-secret");
      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockDb: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
      mockSet = jest.fn().mockResolvedValue(undefined);
      mockDb = jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            set: mockSet,
          }),
        }),
      });

      mockRequest = {
        method: "POST",
        get: jest.fn().mockReturnValue("Bearer test-secret"),
        body: {},
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDb() as any);
      jest.spyOn(secretsModule, "getSecret").mockResolvedValue("test-secret");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle empty request body", async () => {
      mockRequest.body = {};

      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle request body that is not an object", async () => {
      mockRequest.body = "invalid";

      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle null request body", async () => {
      mockRequest.body = null;

      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle very large request body", async () => {
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
          extra_data: "x".repeat(100000),
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should handle Authorization header with no Bearer prefix", async () => {
      mockRequest.get.mockReturnValue("test-secret");

      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      await callWebhook(mockRequest, mockResponse);
      expect(mockSet).toHaveBeenCalledWith({ plan: "pro" }, { merge: true });
    });

    it("should handle case-insensitive HTTP method check", async () => {
      mockRequest.method = "post";
      mockRequest.body = {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "user123",
          entitlement_ids: ["pro"],
        },
      };

      // Note: the actual implementation uses exact "POST" matching
      // so this tests current behavior (case-sensitive)
      await callWebhook(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(405);
    });
  });
});
