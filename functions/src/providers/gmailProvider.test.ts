/**
 * Unit tests for GmailProvider
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { GmailProvider } from "./gmailProvider";
import { db } from "../firestore";
import { categorizeMessage } from "../categorize";
import { upsertLinkedAccount } from "../linkedAccountUpsert";
import { getSecret } from "../secrets";
import * as googleApisModule from "googleapis";

// Mock dependencies
jest.mock("../firestore");
jest.mock("../categorize");
jest.mock("../linkedAccountUpsert");
jest.mock("../secrets");
jest.mock("googleapis");

describe("GmailProvider", () => {
  let provider: GmailProvider;
  let mockGmailClient: any;
  let mockOAuth2: any;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GmailProvider();

    // Setup mock Gmail API client
    mockGmailClient = {
      users: {
        getProfile: jest.fn(),
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          modify: jest.fn(),
        },
      },
    };

    // Setup mock OAuth2 client
    mockOAuth2 = {
      setCredentials: jest.fn(),
      getToken: jest.fn(),
      refreshAccessToken: jest.fn(),
    };

    // Setup Google APIs mock
    (googleApisModule.google as any) = {
      auth: {
        OAuth2: jest.fn().mockReturnValue(mockOAuth2),
      },
      gmail: jest.fn().mockReturnValue(mockGmailClient),
    };

    (getSecret as jest.Mock).mockResolvedValue("secret-value");
  });

  describe("connect", () => {
    it("should validate authCode parameter", async () => {
      await expect(provider.connect("user123", {})).rejects.toThrow(
        "authCode is required"
      );
    });

    it("should exchange authCode for tokens", async () => {
      mockOAuth2.getToken.mockResolvedValue({
        tokens: {
          access_token: "access123",
          refresh_token: "refresh123",
          expiry_date: 1234567890,
        },
      });

      mockGmailClient.users.getProfile.mockResolvedValue({
        data: { emailAddress: "user@gmail.com" },
      });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#FF5733",
      });

      await provider.connect("user123", { authCode: "auth-code-xyz" });

      expect(mockOAuth2.getToken).toHaveBeenCalledWith("auth-code-xyz");
      expect(mockOAuth2.setCredentials).toHaveBeenCalled();
    });

    it("should fetch user profile from Gmail", async () => {
      mockOAuth2.getToken.mockResolvedValue({
        tokens: {
          access_token: "access123",
          refresh_token: "refresh123",
          expiry_date: 1234567890,
        },
      });

      mockGmailClient.users.getProfile.mockResolvedValue({
        data: { emailAddress: "test@gmail.com" },
      });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#FF5733",
      });

      await provider.connect("user123", { authCode: "auth-code" });

      expect(mockGmailClient.users.getProfile).toHaveBeenCalledWith({
        userId: "me",
      });
    });

    it("should call upsertLinkedAccount with correct parameters", async () => {
      mockOAuth2.getToken.mockResolvedValue({
        tokens: {
          access_token: "access123",
          refresh_token: "refresh123",
          expiry_date: 1234567890,
        },
      });

      mockGmailClient.users.getProfile.mockResolvedValue({
        data: { emailAddress: "user@gmail.com" },
      });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account123" },
        colorHex: "#ABC123",
      });

      const result = await provider.connect("user123", { authCode: "auth" });

      expect(upsertLinkedAccount).toHaveBeenCalledWith(
        "user123",
        "gmail",
        "user@gmail.com",
        expect.any(Function)
      );

      expect(result).toEqual({
        id: "account123",
        userId: "user123",
        provider: "gmail",
        authMethod: "oauth",
        emailAddress: "user@gmail.com",
        oauthStatus: "connected",
        colorHex: "#ABC123",
      });
    });

    it("should return ConnectedAccountResult with correct structure", async () => {
      mockOAuth2.getToken.mockResolvedValue({
        tokens: {
          access_token: "token1",
          refresh_token: "token2",
          expiry_date: 9999999999,
        },
      });

      mockGmailClient.users.getProfile.mockResolvedValue({
        data: { emailAddress: "newuser@gmail.com" },
      });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "new-id-456" },
        colorHex: "#DEADBEEF",
      });

      const result = await provider.connect("user456", { authCode: "code" });

      expect(result.id).toBe("new-id-456");
      expect(result.userId).toBe("user456");
      expect(result.provider).toBe("gmail");
      expect(result.authMethod).toBe("oauth");
      expect(result.emailAddress).toBe("newuser@gmail.com");
      expect(result.oauthStatus).toBe("connected");
      expect(result.colorHex).toBe("#DEADBEEF");
    });

    it("should handle missing email address in profile", async () => {
      mockOAuth2.getToken.mockResolvedValue({
        tokens: {
          access_token: "access",
          refresh_token: "refresh",
        },
      });

      mockGmailClient.users.getProfile.mockResolvedValue({
        data: { emailAddress: undefined },
      });

      (upsertLinkedAccount as jest.Mock).mockResolvedValue({
        ref: { id: "account" },
        colorHex: "#000",
      });

      const result = await provider.connect("user", { authCode: "code" });

      expect(result.emailAddress).toBe("");
    });

    it("should throw if token exchange fails", async () => {
      mockOAuth2.getToken.mockRejectedValue(new Error("Invalid auth code"));

      await expect(
        provider.connect("user123", { authCode: "invalid" })
      ).rejects.toThrow("Invalid auth code");
    });
  });

  describe("scan", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          accessToken: "valid-token",
          refreshToken: "refresh-token",
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
    });

    it("should fetch promotion and update messages", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: "msg1" }, { id: "msg2" }],
        },
      });

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          id: "msg1",
          payload: {
            headers: [
              { name: "Subject", value: "Special offer" },
              { name: "From", value: "sales@example.com" },
            ],
          },
          snippet: "Limited time deal",
          internalDate: "1234567890",
          labelIds: [],
        },
      });

      (categorizeMessage as jest.Mock).mockReturnValue("promotion");

      const result = await provider.scan("account123");

      expect(mockGmailClient.users.messages.list).toHaveBeenCalledWith({
        userId: "me",
        q: "category:promotions OR category:updates",
        maxResults: 50,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg1");
    });

    it("should handle empty message list", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: undefined },
      });

      const result = await provider.scan("account123");

      expect(result).toEqual([]);
    });

    it("should extract sender email from From header", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [{ id: "msg1" }] },
      });

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            headers: [
              { name: "From", value: "John Doe <john@example.com>" },
              { name: "Subject", value: "Test" },
            ],
          },
          snippet: "test",
          labelIds: [],
        },
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].senderEmail).toBe("john@example.com");
    });

    it("should handle From header without angle brackets", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [{ id: "msg1" }] },
      });

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            headers: [
              { name: "From", value: "simple@example.com" },
              { name: "Subject", value: "Test" },
            ],
          },
          snippet: "test",
          labelIds: [],
        },
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].senderEmail).toBe("simple@example.com");
    });

    it("should detect unread status via UNREAD label", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [{ id: "msg1" }, { id: "msg2" }] },
      });

      mockGmailClient.users.messages.get
        .mockResolvedValueOnce({
          data: {
            payload: {
              headers: [
                { name: "Subject", value: "Unread" },
                { name: "From", value: "test@example.com" },
              ],
            },
            snippet: "content",
            labelIds: ["UNREAD"],
          },
        })
        .mockResolvedValueOnce({
          data: {
            payload: {
              headers: [
                { name: "Subject", value: "Read" },
                { name: "From", value: "test@example.com" },
              ],
            },
            snippet: "content",
            labelIds: ["INBOX"],
          },
        });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].isUnread).toBe(true);
      expect(result[1].isUnread).toBe(false);
    });

    it("should skip messages without ID", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [{ id: "msg1" }, {}, { id: "msg3" }] },
      });

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: { headers: [
            { name: "Subject", value: "Test" },
            { name: "From", value: "test@example.com" },
          ] },
          snippet: "content",
          labelIds: [],
        },
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result).toHaveLength(2);
    });

    it("should handle missing headers", async () => {
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [{ id: "msg1" }] },
      });

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: { headers: [] },
          snippet: "content",
          labelIds: [],
        },
      });

      (categorizeMessage as jest.Mock).mockReturnValue("other");

      const result = await provider.scan("account123");

      expect(result[0].subject).toBe("");
      expect(result[0].senderEmail).toBe("");
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
          }),
        }),
      });
    });

    it("should remove INBOX label from messages", async () => {
      mockGmailClient.users.messages.modify.mockResolvedValue({});

      await provider.archive("account123", ["msg1", "msg2"]);

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: "me",
        id: "msg1",
        requestBody: { removeLabelIds: ["INBOX"] },
      });

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: "me",
        id: "msg2",
        requestBody: { removeLabelIds: ["INBOX"] },
      });
    });

    it("should handle empty email list", async () => {
      await provider.archive("account123", []);

      expect(mockGmailClient.users.messages.modify).not.toHaveBeenCalled();
    });

    it("should throw if token refresh fails", async () => {
      mockOAuth2.refreshAccessToken.mockRejectedValue(
        new Error("Token expired")
      );

      const mockGet = jest.fn().mockResolvedValue({
        data: () => ({
          refreshToken: "expired-refresh",
          tokenExpiresAt: Date.now() - 1000,
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

      await expect(
        provider.archive("account123", ["msg1"])
      ).rejects.toThrow("oauth token expired");
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
          }),
        }),
      });
    });

    it("should add INBOX label to messages", async () => {
      mockGmailClient.users.messages.modify.mockResolvedValue({});

      await provider.restore("account123", ["msg1", "msg2"]);

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: "me",
        id: "msg1",
        requestBody: { addLabelIds: ["INBOX"] },
      });

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: "me",
        id: "msg2",
        requestBody: { addLabelIds: ["INBOX"] },
      });
    });

    it("should handle empty email list", async () => {
      await provider.restore("account123", []);

      expect(mockGmailClient.users.messages.modify).not.toHaveBeenCalled();
    });

    it("should handle single message", async () => {
      mockGmailClient.users.messages.modify.mockResolvedValue({});

      await provider.restore("account123", ["single-msg"]);

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledTimes(1);
      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: "me",
        id: "single-msg",
        requestBody: { addLabelIds: ["INBOX"] },
      });
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
          }),
        }),
      });
    });

    it("should fetch and decode HTML content", async () => {
      const htmlContent = "<h1>Hello World</h1>";
      const base64Content = Buffer.from(htmlContent).toString("base64");

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            parts: [
              { mimeType: "text/plain", body: { data: "" } },
              { mimeType: "text/html", body: { data: base64Content } },
            ],
          },
        },
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe(htmlContent);
    });

    it("should extract attachment names", async () => {
      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            parts: [
              { mimeType: "text/html", body: { data: "" } },
              { mimeType: "application/pdf", filename: "document.pdf" },
              { mimeType: "image/png", filename: "photo.png" },
            ],
          },
        },
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.attachmentNames).toEqual(["document.pdf", "photo.png"]);
    });

    it("should use main payload if no parts", async () => {
      const htmlContent = "<p>Simple email</p>";
      const base64Content = Buffer.from(htmlContent).toString("base64");

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            mimeType: "text/html",
            body: { data: base64Content },
          },
        },
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe(htmlContent);
    });

    it("should handle missing body data", async () => {
      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            parts: [{ mimeType: "text/html" }],
          },
        },
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.html).toBe("");
    });

    it("should return empty attachment list if none present", async () => {
      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            parts: [
              { mimeType: "text/html", body: { data: "html" } },
              { mimeType: "text/plain" },
            ],
          },
        },
      });

      const result = await provider.fetchMessageBody("account123", "msg123");

      expect(result.attachmentNames).toEqual([]);
    });

    it("should handle large message bodies", async () => {
      const largeContent = "<html>" + "x".repeat(100000) + "</html>";
      const base64Content = Buffer.from(largeContent).toString("base64");

      mockGmailClient.users.messages.get.mockResolvedValue({
        data: {
          payload: {
            parts: [{ mimeType: "text/html", body: { data: base64Content } }],
          },
        },
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

      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await provider.scan("account123");

      expect(mockOAuth2.refreshAccessToken).not.toHaveBeenCalled();
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

      mockOAuth2.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: "new-token",
          refresh_token: "new-refresh",
          expiry_date: Date.now() + 3600000,
        },
      });

      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await provider.scan("account123");

      expect(mockOAuth2.refreshAccessToken).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "new-token",
        })
      );
    });

    it("should update oauthStatus to expired on refresh failure", async () => {
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

      mockOAuth2.refreshAccessToken.mockRejectedValue(
        new Error("Invalid refresh token")
      );

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
