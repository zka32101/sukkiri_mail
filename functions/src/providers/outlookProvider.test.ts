/**
 * Unit tests for OutlookProvider
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { OutlookProvider } from "./outlookProvider";
import { db } from "../firestore";
import { categorizeMessage } from "../categorize";
import { upsertLinkedAccount } from "../linkedAccountUpsert";
import { getSecret } from "../secrets";

// Mock dependencies
jest.mock("../firestore");
jest.mock("../categorize");
jest.mock("../linkedAccountUpsert");
jest.mock("../secrets");

// Mock fetch globally
const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
global.fetch = mockFetch as any;

describe("OutlookProvider", () => {
  let provider: OutlookProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OutlookProvider();
    mockFetch.mockClear();
    (getSecret as jest.Mock).mockResolvedValue("secret-value");
  });

  describe("connect", () => {
    it("should validate authCode parameter", async () => {
      await expect(provider.connect("user123", {})).rejects.toThrow(
        "authCode is required"
      );
    });

    it("should exchange authCode for tokens", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access123",
            refresh_token: "refresh123",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            mail: "user@outlook.com",
          }),
        });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#FF5733",
      });

      await provider.connect("user123", {
        authCode: "auth-code-xyz",
        redirectUri: "https://example.com/callback",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should fetch user profile from Graph API", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            mail: "test@outlook.com",
          }),
        });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account" },
        colorHex: "#000",
      });

      await provider.connect("user", { authCode: "code", redirectUri: "uri" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me",
        expect.any(Object)
      );
    });

    it("should use userPrincipalName if mail is not available", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            userPrincipalName: "user@outlook.com",
          }),
        });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account" },
        colorHex: "#000",
      });

      const result = await provider.connect("user", {
        authCode: "code",
        redirectUri: "uri",
      });

      expect(result.emailAddress).toBe("user@outlook.com");
    });

    it("should call upsertLinkedAccount with correct parameters", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            mail: "user@outlook.com",
          }),
        });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#ABC123",
      });

      const result = await provider.connect("user123", {
        authCode: "auth",
        redirectUri: "uri",
      });

      expect(upsertLinkedAccount).toHaveBeenCalledWith(
        "user123",
        "outlook",
        "user@outlook.com",
        expect.any(Function)
      );

      expect(result).toEqual({
        id: "account123",
        userId: "user123",
        provider: "outlook",
        authMethod: "oauth",
        emailAddress: "user@outlook.com",
        oauthStatus: "connected",
        colorHex: "#ABC123",
      });
    });

    it("should throw if token exchange fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue("Invalid code"),
      });

      await expect(
        provider.connect("user", { authCode: "invalid", redirectUri: "uri" })
      ).rejects.toThrow("Outlook token exchange failed");
    });

    it("should throw if profile fetch fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: jest.fn().mockResolvedValue("Unauthorized"),
        });

      await expect(
        provider.connect("user", { authCode: "code", redirectUri: "uri" })
      ).rejects.toThrow("Outlook profile fetch failed");
    });

    it("should throw if email address is missing", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });

      await expect(
        provider.connect("user", { authCode: "code", redirectUri: "uri" })
      ).rejects.toThrow("did not include an email address");
    });
  });

  describe("scan", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "valid-token",
          refreshToken: "refresh-token",
          tokenExpiresAt: Date.now() + 3600000,
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
    });

    it("should fetch messages from inbox", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          value: [
            {
              id: "msg1",
              subject: "Test email",
              from: { emailAddress: { address: "sender@example.com" } },
              receivedDateTime: "2026-01-01T00:00:00Z",
              bodyPreview: "This is a test",
              hasAttachments: false,
              isRead: true,
            },
          ],
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=100&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead",
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("msg1");
      expect(result[0].senderEmail).toBe("sender@example.com");
      expect(result[0].isUnread).toBe(false);
    });

    it("should handle empty message list", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ value: [] }),
      });

      const result = await provider.scan("account123");

      expect(result).toEqual([]);
    });

    it("should handle messages with missing value field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await provider.scan("account123");

      expect(result).toEqual([]);
    });

    it("should detect unread status correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          value: [
            {
              id: "msg1",
              subject: "Unread",
              from: { emailAddress: { address: "test@example.com" } },
              receivedDateTime: "2026-01-01T00:00:00Z",
              bodyPreview: "content",
              isRead: false,
            },
            {
              id: "msg2",
              subject: "Read",
              from: { emailAddress: { address: "test@example.com" } },
              receivedDateTime: "2026-01-02T00:00:00Z",
              bodyPreview: "content",
              isRead: true,
            },
          ],
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].isUnread).toBe(true);
      expect(result[1].isUnread).toBe(false);
    });

    it("should handle messages with missing from field", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          value: [
            {
              id: "msg1",
              subject: "No sender",
              from: {},
              receivedDateTime: "2026-01-01T00:00:00Z",
              bodyPreview: "content",
              isRead: true,
            },
          ],
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].senderEmail).toBe("");
    });

    it("should mark messages with attachments", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          value: [
            {
              id: "msg1",
              subject: "With attachment",
              from: { emailAddress: { address: "test@example.com" } },
              receivedDateTime: "2026-01-01T00:00:00Z",
              bodyPreview: "content",
              hasAttachments: true,
              isRead: true,
            },
          ],
        }),
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].hasAttachment).toBe(true);
    });

    it("should throw if account not found", async () => {
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
  });

  describe("archive", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "valid-token",
          refreshToken: "refresh-token",
          tokenExpiresAt: Date.now() + 3600000,
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
    });

    it("should move messages to archive", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await provider.archive("account123", ["msg1", "msg2"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/messages/msg1/move",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ destinationId: "archive" }),
        })
      );
    });

    it("should handle empty email list", async () => {
      await provider.archive("account123", []);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw if graph fetch fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue("Unauthorized"),
      });

      await expect(provider.archive("account123", ["msg1"])).rejects.toThrow(
        "Graph API error"
      );
    });
  });

  describe("restore", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "valid-token",
          refreshToken: "refresh-token",
          tokenExpiresAt: Date.now() + 3600000,
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
    });

    it("should move messages back to inbox", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await provider.restore("account123", ["msg1", "msg2"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/messages/msg1/move",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ destinationId: "inbox" }),
        })
      );
    });

    it("should handle empty email list", async () => {
      await provider.restore("account123", []);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle single message", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      await provider.restore("account123", ["single-msg"]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchMessageBody", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "valid-token",
          refreshToken: "refresh-token",
          tokenExpiresAt: Date.now() + 3600000,
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });
    });

    it("should fetch message body and attachments", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          body: {
            content: "<h1>Hello World</h1>",
          },
          attachments: [
            { name: "document.pdf" },
            { name: "photo.png" },
          ],
        }),
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe("<h1>Hello World</h1>");
      expect(result.attachmentNames).toEqual(["document.pdf", "photo.png"]);
    });

    it("should handle missing body content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          body: {},
          attachments: [],
        }),
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe("");
      expect(result.attachmentNames).toEqual([]);
    });

    it("should handle missing attachments", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          body: { content: "text" },
        }),
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.attachmentNames).toEqual([]);
    });

    it("should handle large message bodies", async () => {
      const largeContent = "<html>" + "x".repeat(100000) + "</html>";

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          body: { content: largeContent },
          attachments: [],
        }),
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe(largeContent);
    });
  });

  describe("Token refresh mechanism", () => {
    it("should use cached token if still valid", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "cached-token",
          refreshToken: "refresh",
          tokenExpiresAt: Date.now() + 3600000, // 1 hour from now
        }),
      });

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          value: [],
        }),
      });

      await provider.scan("account123");

      // Token refresh should not be called (fetch only called once for the Graph API call)
      const graphApiCalls = mockFetch.mock.calls.filter(
        (call: any[]) => call[0]?.includes("graph.microsoft.com")
      );
      expect(graphApiCalls.length).toBe(1);
    });

    it("should refresh token if expired", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "old-token",
          refreshToken: "refresh-token",
          tokenExpiresAt: Date.now() - 1000, // Already expired
        }),
      });

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: mockUpdate,
          }),
        }),
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "new-token",
            refresh_token: "new-refresh",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            value: [],
          }),
        });

      await provider.scan("account123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
        expect.any(Object)
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "new-token",
        })
      );
    });

    it("should update oauthStatus on refresh failure", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          refreshToken: "invalid-refresh",
          tokenExpiresAt: Date.now() - 1000,
        }),
      });

      const mockUpdate = jest.fn().mockResolvedValue(undefined);

      (db as jest.Mock).mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGet,
            update: mockUpdate,
          }),
        }),
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue("Invalid refresh token"),
      });

      await expect(provider.scan("account123")).rejects.toThrow(
        "oauth token expired"
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        oauthStatus: "expired",
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
  });
});
