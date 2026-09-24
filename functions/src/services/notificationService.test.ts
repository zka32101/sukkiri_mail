/**
 * Unit tests for notificationService
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */

import * as admin from "firebase-admin";
import {
  registerFcmTokenForUser,
  unregisterFcmTokenForUser,
  sendPushNotification,
  notifyScanCompleted,
  notifyScanFailed,
} from "./notificationService";
import { db } from "../firestore";

jest.mock("../firestore");
jest.mock("firebase-admin", () => ({
  messaging: jest.fn(),
}));

describe("notificationService", () => {
  let mockDocSet: jest.Mock;
  let mockDocDelete: jest.Mock;
  let mockTokensGet: jest.Mock;
  let mockSendEachForMulticast: jest.Mock;
  let mockBatchDelete: jest.Mock;
  let mockBatchCommit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDocSet = jest.fn().mockResolvedValue(undefined);
    mockDocDelete = jest.fn().mockResolvedValue(undefined);
    mockTokensGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    mockBatchDelete = jest.fn();
    mockBatchCommit = jest.fn().mockResolvedValue(undefined);

    (db as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
              set: mockDocSet,
              delete: mockDocDelete,
            }),
            get: mockTokensGet,
          }),
        }),
      }),
      batch: jest.fn().mockReturnValue({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      }),
    });

    mockSendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 0,
      failureCount: 0,
      responses: [],
    });
    (admin.messaging as jest.Mock).mockReturnValue({
      sendEachForMulticast: mockSendEachForMulticast,
    });
  });

  describe("registerFcmTokenForUser", () => {
    it("should upsert the token document with platform and timestamp", async () => {
      await registerFcmTokenForUser("user1", "token-abc", "ios");

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({ token: "token-abc", platform: "ios" }),
        { merge: true }
      );
    });

    it("should default to android when platform is omitted", async () => {
      await registerFcmTokenForUser("user1", "token-abc");

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({ platform: "android" }),
        { merge: true }
      );
    });
  });

  describe("unregisterFcmTokenForUser", () => {
    it("should delete the token document", async () => {
      await unregisterFcmTokenForUser("user1", "token-abc");
      expect(mockDocDelete).toHaveBeenCalled();
    });
  });

  describe("sendPushNotification", () => {
    it("should return zero counts when the user has no registered tokens", async () => {
      const result = await sendPushNotification("user1", { title: "t", body: "b" });

      expect(result).toEqual({ successCount: 0, failureCount: 0 });
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it("should send to all registered tokens", async () => {
      mockTokensGet.mockResolvedValue({
        empty: false,
        docs: [{ id: "token1" }, { id: "token2" }],
      });
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      });

      const result = await sendPushNotification("user1", {
        title: "Scan done",
        body: "5 emails",
        data: { type: "scan_completed" },
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ["token1", "token2"],
          notification: { title: "Scan done", body: "5 emails" },
          data: { type: "scan_completed" },
        })
      );
      expect(result).toEqual({ successCount: 2, failureCount: 0 });
    });

    it("should prune tokens that are no longer registered", async () => {
      mockTokensGet.mockResolvedValue({
        empty: false,
        docs: [{ id: "stale-token" }, { id: "valid-token" }],
      });
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: false, error: { code: "messaging/registration-token-not-registered" } },
          { success: true },
        ],
      });

      await sendPushNotification("user1", { title: "t", body: "b" });

      expect(mockBatchDelete).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("should not prune tokens for transient errors", async () => {
      mockTokensGet.mockResolvedValue({
        empty: false,
        docs: [{ id: "token1" }],
      });
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: "messaging/internal-error" } }],
      });

      await sendPushNotification("user1", { title: "t", body: "b" });

      expect(mockBatchDelete).not.toHaveBeenCalled();
    });
  });

  describe("notifyScanCompleted", () => {
    it("should include item count in the notification body", async () => {
      mockTokensGet.mockResolvedValue({ empty: false, docs: [{ id: "token1" }] });
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      await notifyScanCompleted("user1", 3);

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({ body: expect.stringContaining("3件") }),
        })
      );
    });

    it("should not throw when sending fails", async () => {
      mockTokensGet.mockRejectedValue(new Error("Firestore error"));

      await expect(notifyScanCompleted("user1", 1)).resolves.toBeUndefined();
    });
  });

  describe("notifyScanFailed", () => {
    it("should include accountId in notification data", async () => {
      mockTokensGet.mockResolvedValue({ empty: false, docs: [{ id: "token1" }] });
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      await notifyScanFailed("user1", "account123");

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "scan_failed", accountId: "account123" }),
        })
      );
    });

    it("should not throw when sending fails", async () => {
      mockTokensGet.mockRejectedValue(new Error("Firestore error"));

      await expect(notifyScanFailed("user1", "account123")).resolves.toBeUndefined();
    });
  });
});
