/**
 * Unit tests for ImapProvider
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { ImapProvider } from "./imapProvider";
import { db } from "../firestore";
import { categorizeMessage } from "../categorize";
import { upsertLinkedAccount } from "../linkedAccountUpsert";
import * as ImapFlowModule from "imapflow";

// Mock dependencies
jest.mock("../firestore");
jest.mock("../categorize");
jest.mock("../linkedAccountUpsert");
jest.mock("imapflow");

describe("ImapProvider", () => {
  let provider: ImapProvider;
  let mockImapFlow: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ImapProvider();

    // Setup mock IMAP client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      getMailboxLock: jest.fn(),
      fetch: jest.fn(),
      messageMove: jest.fn().mockResolvedValue(undefined),
      download: jest.fn(),
      mailbox: {
        exists: 10,
      },
    };

    mockImapFlow = jest.fn().mockReturnValue(mockClient);
    (ImapFlowModule.ImapFlow as unknown as jest.Mock) = mockImapFlow;
  });

  describe("connect", () => {
    it("should validate required parameters", async () => {
      await expect(
        provider.connect("user123", { emailAddress: "test@example.com" })
      ).rejects.toThrow("emailAddress, appPassword, imapHost are required");
    });

    it("should throw for missing appPassword", async () => {
      await expect(
        provider.connect("user123", {
          emailAddress: "test@example.com",
          imapHost: "imap.example.com",
        })
      ).rejects.toThrow("emailAddress, appPassword, imapHost are required");
    });

    it("should throw for missing imapHost", async () => {
      await expect(
        provider.connect("user123", {
          emailAddress: "test@example.com",
          appPassword: "password123",
        })
      ).rejects.toThrow("emailAddress, appPassword, imapHost are required");
    });

    it("should connect to IMAP server with correct credentials", async () => {
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.logout.mockResolvedValue(undefined);

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#FF5733",
      });

      await provider.connect("user123", {
        emailAddress: "test@example.com",
        appPassword: "password123",
        imapHost: "imap.example.com",
      });

      expect(mockImapFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "imap.example.com",
          port: 993,
          secure: true,
          auth: { user: "test@example.com", pass: "password123" },
          logger: false,
        })
      );

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.logout).toHaveBeenCalled();
    });

    it("should throw if IMAP connection fails", async () => {
      const connectionError = new Error("Connection refused");
      mockClient.connect.mockRejectedValue(connectionError);

      await expect(
        provider.connect("user123", {
          emailAddress: "test@example.com",
          appPassword: "password123",
          imapHost: "imap.example.com",
        })
      ).rejects.toThrow("Connection refused");
    });

    it("should call upsertLinkedAccount with correct parameters", async () => {
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.logout.mockResolvedValue(undefined);

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#FF5733",
      });

      const result = await provider.connect("user123", {
        emailAddress: "test@example.com",
        appPassword: "password123",
        imapHost: "imap.example.com",
      });

      expect(upsertLinkedAccount).toHaveBeenCalledWith(
        "user123",
        "imap",
        "test@example.com",
        expect.any(Function)
      );

      expect(result).toEqual({
        id: "account123",
        userId: "user123",
        provider: "imap",
        authMethod: "app_password",
        emailAddress: "test@example.com",
        imapHost: "imap.example.com",
        colorHex: "#FF5733",
      });
    });

    it("should return ConnectedAccountResult with correct structure", async () => {
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.logout.mockResolvedValue(undefined);

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "new-account-id" },
        colorHex: "#ABC123",
      });

      const result = await provider.connect("user456", {
        emailAddress: "user@icloud.com",
        appPassword: "apppass456",
        imapHost: "imap.mail.me.com",
      });

      expect(result.id).toBe("new-account-id");
      expect(result.userId).toBe("user456");
      expect(result.provider).toBe("imap");
      expect(result.authMethod).toBe("app_password");
      expect(result.emailAddress).toBe("user@icloud.com");
      expect(result.imapHost).toBe("imap.mail.me.com");
      expect(result.colorHex).toBe("#ABC123");
    });
  });

  describe("scan", () => {
    beforeEach(() => {
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);
    });

    it("should require valid account", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => undefined,
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await expect(provider.scan("invalid-account")).rejects.toThrow(
        "account not found"
      );
    });

    it("should throw for incomplete IMAP configuration", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          emailAddress: "test@example.com",
          // missing imapHost and appPassword
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await expect(provider.scan("account123")).rejects.toThrow(
        "IMAP configuration incomplete"
      );
    });

    it("should return empty array for empty mailbox", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      mockClient.mailbox = { exists: 0 };
      mockClient.fetch.mockReturnValue((async function* () {})());

      const result = await provider.scan("account123");

      expect(result).toEqual([]);
      expect(mockClient.logout).toHaveBeenCalled();
    });

    it("should fetch and categorize messages", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("promotion");

      mockClient.mailbox = { exists: 2 };
      mockClient.fetch.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/require-await
        (async function* () {
          yield {
            uid: 1001,
            flags: new Set(["\\Seen"]),
            envelope: {
              from: [{ address: "sender@example.com" }],
              subject: "Special offer",
              date: new Date("2026-01-01").toISOString(),
            },
          };
          yield {
            uid: 1002,
            flags: new Set(),
            envelope: {
              from: [{ address: "news@example.com" }],
              subject: "Newsletter",
              date: new Date("2026-01-02").toISOString(),
            },
          };
        })()
      );

      const result = await provider.scan("account123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1001");
      expect(result[0].senderEmail).toBe("sender@example.com");
      expect(result[0].isUnread).toBe(false);
      expect(result[1].id).toBe("1002");
      expect(result[1].isUnread).toBe(true);
      expect(mockClient.logout).toHaveBeenCalled();
    });

    it("should handle messages with missing envelope data", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      mockClient.mailbox = { exists: 1 };
      mockClient.fetch.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/require-await
        (async function* () {
          yield {
            uid: 1001,
            flags: new Set(),
            envelope: {},
          };
        })()
      );

      const result = await provider.scan("account123");

      expect(result).toHaveLength(1);
      expect(result[0].senderEmail).toBe("");
      expect(result[0].subject).toBe("");
    });

    it("should limit scan to last 50 messages", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      mockClient.mailbox = { exists: 200 };
      mockClient.fetch.mockReturnValue((async function* () {})());

      await provider.scan("account123");

      expect(mockClient.fetch).toHaveBeenCalledWith(
        { seq: "151:200" },
        { envelope: true, uid: true, flags: true }
      );
    });
  });

  describe("archive", () => {
    beforeEach(() => {
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);
    });

    it("should require valid account", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => undefined,
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await expect(provider.archive("invalid-account", [])).rejects.toThrow(
        "account not found"
      );
    });

    it("should move messages to Archive folder", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await provider.archive("account123", ["1001", "1002", "1003"]);

      expect(mockClient.messageMove).toHaveBeenCalledWith(
        [1001, 1002, 1003],
        "Archive",
        { uid: true }
      );

      expect(mockClient.logout).toHaveBeenCalled();
    });

    it("should handle empty email ID list", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await provider.archive("account123", []);

      expect(mockClient.messageMove).toHaveBeenCalledWith([], "Archive", {
        uid: true,
      });
    });

    it("should release lock on error", async () => {
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);
      mockClient.messageMove.mockRejectedValue(new Error("Move failed"));

      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await expect(provider.archive("account123", ["1001"])).rejects.toThrow(
        "Move failed"
      );

      expect(mockLock.release).toHaveBeenCalled();
    });
  });

  describe("restore", () => {
    beforeEach(() => {
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);
    });

    it("should move messages from Archive to INBOX", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await provider.restore("account123", ["2001", "2002"]);

      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("Archive");
      expect(mockClient.messageMove).toHaveBeenCalledWith(
        [2001, 2002],
        "INBOX",
        { uid: true }
      );
    });

    it("should use UID flag for message identification", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await provider.restore("account123", ["3001"]);

      // Verify uid: true is passed to prevent sequence number misinterpretation
      expect(mockClient.messageMove).toHaveBeenCalledWith(
        [3001],
        "INBOX",
        { uid: true }
      );
    });
  });

  describe("fetchMessageBody", () => {
    beforeEach(() => {
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);
    });

    it("should fetch message body as HTML", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const mockContent = {
        // eslint-disable-next-line @typescript-eslint/require-await
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from("<h1>Hello</h1>");
          yield Buffer.from("<p>World</p>");
        },
      };

      mockClient.download.mockResolvedValue({
        content: mockContent,
      });

      const result = await provider.fetchMessageBody("account123", "4001");

      expect(mockClient.download).toHaveBeenCalledWith("4001", undefined, {
        uid: true,
      });

      expect(result.html).toBe("<h1>Hello</h1><p>World</p>");
      expect(result.attachmentNames).toEqual([]);
    });

    it("should handle large message bodies", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const largeContent = "<html>" + "x".repeat(10000) + "</html>";
      const mockContent = {
        // eslint-disable-next-line @typescript-eslint/require-await
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(largeContent);
        },
      };

      mockClient.download.mockResolvedValue({
        content: mockContent,
      });

      const result = await provider.fetchMessageBody("account123", "4002");

      expect(result.html).toBe(largeContent);
    });

    it("should use UID for message identification", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const mockContent = {
        // eslint-disable-next-line @typescript-eslint/require-await
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from("Content");
        },
      };

      mockClient.download.mockResolvedValue({
        content: mockContent,
      });

      await provider.fetchMessageBody("account123", "5001");

      // Verify uid: true prevents sequence number misinterpretation
      expect(mockClient.download).toHaveBeenCalledWith("5001", undefined, {
        uid: true,
      });
    });
  });

  describe("MailProviderAdapter interface compliance", () => {
    it("should implement all required methods", () => {
      expect(typeof provider.connect).toBe("function");
      expect(typeof provider.scan).toBe("function");
      expect(typeof provider.archive).toBe("function");
      expect(typeof provider.restore).toBe("function");
      expect(typeof provider.fetchMessageBody).toBe("function");
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    it("should have correct method signatures", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          imapHost: "imap.example.com",
          emailAddress: "test@example.com",
          appPassword: "password123",
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      mockClient.mailbox = { exists: 0 };
      // eslint-disable-next-line @typescript-eslint/require-await
      mockClient.fetch.mockReturnValue(async function* () {});
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockClient.getMailboxLock.mockResolvedValue(mockLock);

      // Test that methods return promises
      const connectPromise = provider.connect("user", {
        emailAddress: "test@example.com",
        appPassword: "pass",
        imapHost: "host",
      });
      expect(connectPromise).toBeInstanceOf(Promise);

      // Don't wait for it since upsertLinkedAccount is not fully mocked
    });
  });
});
