/**
 * Unit tests for pushSyncService
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */

import {
  enablePushSyncForAccount,
  disablePushSyncForAccount,
  renewExpiringPushSync,
  findAccountByEmail,
  findAccountBySubscriptionId,
} from "./pushSyncService";
import { db } from "../firestore";
import { getSecret } from "../secrets";
import { GmailProvider } from "../providers/gmailProvider";
import { OutlookProvider } from "../providers/outlookProvider";

jest.mock("../firestore");
jest.mock("../secrets");
jest.mock("../providers/gmailProvider");
jest.mock("../providers/outlookProvider");

describe("pushSyncService", () => {
  let mockUpdate: jest.Mock;
  let mockDocGet: jest.Mock;
  let mockGmailWatch: jest.Mock;
  let mockGmailStop: jest.Mock;
  let mockOutlookCreateSub: jest.Mock;
  let mockOutlookRenewSub: jest.Mock;
  let mockOutlookDeleteSub: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockDocGet = jest.fn().mockResolvedValue({
      data: () => ({ provider: "gmail", outlookSubscriptionId: "sub-123" }),
      ref: { update: mockUpdate },
    });

    (db as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: mockDocGet,
          update: mockUpdate,
        }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    });

    (getSecret as jest.Mock).mockResolvedValue("gmail-topic");

    // pushSyncServiceはモジュール読み込み時に`new GmailProvider()`等でシングルトンを
    // 生成するため、beforeEach毎にコンストラクタのmockImplementationを差し替えても
    // 既存のシングルトンには反映されない。自動モックはprototype上のメソッドを
    // 共有jest.fn()として持つため、prototypeを直接差し替えることでシングルトン経由の
    // 呼び出しにも反映させる。
    /* eslint-disable @typescript-eslint/unbound-method */
    mockGmailWatch = GmailProvider.prototype.watch as jest.Mock;
    mockGmailWatch.mockResolvedValue({ historyId: "hist-1", expiration: 1700000000000 });
    mockGmailStop = GmailProvider.prototype.stopWatch as jest.Mock;
    mockGmailStop.mockResolvedValue(undefined);

    mockOutlookCreateSub = OutlookProvider.prototype.createSubscription as jest.Mock;
    mockOutlookCreateSub.mockResolvedValue({ subscriptionId: "sub-abc", expiresAt: 1800000000000 });
    mockOutlookRenewSub = OutlookProvider.prototype.renewSubscription as jest.Mock;
    mockOutlookRenewSub.mockResolvedValue({ expiresAt: 1900000000000 });
    mockOutlookDeleteSub = OutlookProvider.prototype.deleteSubscription as jest.Mock;
    mockOutlookDeleteSub.mockResolvedValue(undefined);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  describe("enablePushSyncForAccount", () => {
    it("should register a Gmail watch and persist historyId/expiration", async () => {
      const result = await enablePushSyncForAccount("account1", "gmail");

      expect(mockGmailWatch).toHaveBeenCalledWith("account1", "gmail-topic");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          pushSyncEnabled: true,
          gmailHistoryId: "hist-1",
          gmailWatchExpiration: 1700000000000,
        })
      );
      expect(result).toEqual({ expiresAt: 1700000000000 });
    });

    it("should create an Outlook subscription and persist its id/expiration", async () => {
      const result = await enablePushSyncForAccount("account2", "outlook");

      expect(mockOutlookCreateSub).toHaveBeenCalledWith(
        "account2",
        expect.stringContaining("outlookPushNotification"),
        expect.any(String)
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          pushSyncEnabled: true,
          outlookSubscriptionId: "sub-abc",
          outlookSubscriptionExpiresAt: 1800000000000,
        })
      );
      expect(result).toEqual({ expiresAt: 1800000000000 });
    });

    it("should throw for unsupported providers", async () => {
      await expect(enablePushSyncForAccount("account3", "imap")).rejects.toThrow(
        "Push sync is not supported for provider: imap"
      );
    });
  });

  describe("disablePushSyncForAccount", () => {
    it("should stop the Gmail watch and clear push sync fields", async () => {
      mockDocGet.mockResolvedValue({
        data: () => ({ provider: "gmail" }),
        ref: { update: mockUpdate },
      });

      await disablePushSyncForAccount("account1", "gmail");

      expect(mockGmailStop).toHaveBeenCalledWith("account1");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ pushSyncEnabled: false, gmailHistoryId: null })
      );
    });

    it("should delete the Outlook subscription and clear push sync fields", async () => {
      mockDocGet.mockResolvedValue({
        data: () => ({ provider: "outlook", outlookSubscriptionId: "sub-123" }),
        ref: { update: mockUpdate },
      });

      await disablePushSyncForAccount("account2", "outlook");

      expect(mockOutlookDeleteSub).toHaveBeenCalledWith("account2", "sub-123");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ pushSyncEnabled: false, outlookSubscriptionId: null })
      );
    });

    it("should still clear Firestore state even if provider unregistration fails", async () => {
      mockGmailStop.mockRejectedValue(new Error("Gmail API error"));
      mockDocGet.mockResolvedValue({
        data: () => ({ provider: "gmail" }),
        ref: { update: mockUpdate },
      });

      await disablePushSyncForAccount("account1", "gmail");

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pushSyncEnabled: false }));
    });
  });

  describe("renewExpiringPushSync", () => {
    it("should renew accounts whose expiration is within the threshold", async () => {
      const now = Date.now();
      const gmailDocRef = { update: jest.fn().mockResolvedValue(undefined) };
      const outlookDocRef = { update: jest.fn().mockResolvedValue(undefined) };

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({ get: mockDocGet, update: mockUpdate }),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: "gmail-account",
                ref: gmailDocRef,
                data: () => ({
                  provider: "gmail",
                  pushSyncEnabled: true,
                  gmailWatchExpiration: now + 1000, // expires very soon
                }),
              },
              {
                id: "outlook-account",
                ref: outlookDocRef,
                data: () => ({
                  provider: "outlook",
                  pushSyncEnabled: true,
                  outlookSubscriptionId: "sub-123",
                  outlookSubscriptionExpiresAt: now + 1000,
                }),
              },
              {
                id: "healthy-account",
                ref: { update: jest.fn() },
                data: () => ({
                  provider: "gmail",
                  pushSyncEnabled: true,
                  gmailWatchExpiration: now + 30 * 24 * 60 * 60 * 1000, // far in the future
                }),
              },
            ],
          }),
        }),
      });

      const summary = await renewExpiringPushSync(24 * 60 * 60 * 1000);

      expect(mockGmailWatch).toHaveBeenCalledWith("gmail-account", "gmail-topic");
      expect(mockOutlookRenewSub).toHaveBeenCalledWith("outlook-account", "sub-123");
      expect(outlookDocRef.update).toHaveBeenCalledWith({ outlookSubscriptionExpiresAt: 1900000000000 });
      expect(summary.renewed).toBe(2);
      expect(summary.failed).toBe(0);
    });

    it("should count failures without throwing", async () => {
      mockGmailWatch.mockRejectedValue(new Error("watch failed"));
      const now = Date.now();

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({ get: mockDocGet, update: mockUpdate }),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: "gmail-account",
                ref: { update: jest.fn() },
                data: () => ({
                  provider: "gmail",
                  pushSyncEnabled: true,
                  gmailWatchExpiration: now + 1000,
                }),
              },
            ],
          }),
        }),
      });

      const summary = await renewExpiringPushSync();

      expect(summary.renewed).toBe(0);
      expect(summary.failed).toBe(1);
    });

    it("should return zero counts when nothing is enabled", async () => {
      const summary = await renewExpiringPushSync();
      expect(summary).toEqual({ renewed: 0, failed: 0 });
    });
  });

  describe("findAccountByEmail", () => {
    it("should resolve an account from provider + emailAddress", async () => {
      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: "account1", data: () => ({ userId: "user1" }) }],
          }),
        }),
      });

      const result = await findAccountByEmail("gmail", "user@gmail.com");
      expect(result).toEqual({ accountId: "account1", userId: "user1" });
    });

    it("should return null when no account matches", async () => {
      const result = await findAccountByEmail("gmail", "unknown@gmail.com");
      expect(result).toBeNull();
    });
  });

  describe("findAccountBySubscriptionId", () => {
    it("should resolve an account from an Outlook subscriptionId", async () => {
      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: "account2",
                data: () => ({ userId: "user2", outlookClientState: "state-xyz" }),
              },
            ],
          }),
        }),
      });

      const result = await findAccountBySubscriptionId("sub-123");
      expect(result).toEqual({ accountId: "account2", userId: "user2", clientState: "state-xyz" });
    });

    it("should return null when subscriptionId is unknown", async () => {
      const result = await findAccountBySubscriptionId("nonexistent-sub");
      expect(result).toBeNull();
    });
  });
});
