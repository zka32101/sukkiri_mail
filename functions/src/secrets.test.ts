/**
 * Unit tests for secrets module
 */

import * as firestoreModule from "./firestore";

// Mock modules before any code imports them
let mockAccessSecretVersion: jest.Mock;

jest.mock("@google-cloud/secret-manager", () => {
  mockAccessSecretVersion = jest.fn();
  return {
    SecretManagerServiceClient: jest.fn(() => ({
      accessSecretVersion: mockAccessSecretVersion,
    })),
  };
});

jest.mock("./firestore");

// Now safe to import after mocks are defined
import { getSecret, __clearSecretCache } from "./secrets";

describe("secrets", () => {
  describe("getSecret", () => {
    let mockCollection: jest.Mock;
    let mockAdd: jest.Mock;
    let originalGcloudProject: string | undefined;

    beforeEach(() => {
      // Store original env var
      originalGcloudProject = process.env.GCLOUD_PROJECT;
      process.env.GCLOUD_PROJECT = "test-project";

      // Clear all mocks
      jest.clearAllMocks();

      // Clear the internal cache
      __clearSecretCache();

      // Setup mock for Firestore
      mockAdd = jest.fn().mockResolvedValue({});
      mockCollection = jest.fn().mockReturnValue({ add: mockAdd });
      const mockDbInstance = { collection: mockCollection };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      jest.spyOn(firestoreModule, "db").mockReturnValue(mockDbInstance as any);

      // Setup mock for Secret Manager to return proper async response
      mockAccessSecretVersion.mockResolvedValue([
        { payload: { data: Buffer.from("default-value") } },
      ]);
    });

    afterEach(() => {
      // Restore original env var
      if (originalGcloudProject !== undefined) {
        process.env.GCLOUD_PROJECT = originalGcloudProject;
      } else {
        delete process.env.GCLOUD_PROJECT;
      }
    });

    describe("Basic Functionality", () => {
      it("should retrieve secret from Secret Manager", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("secret-value") } },
        ]);

        const result = await getSecret("test-secret");

        expect(result).toBe("secret-value");
      });

      it("should return secret as string", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("my-secret") } },
        ]);

        const result = await getSecret("api-key");

        expect(typeof result).toBe("string");
        expect(result).toBe("my-secret");
      });

      it("should call Secret Manager with correct project and secret name", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        await getSecret("oauth-secret");

        expect(mockAccessSecretVersion).toHaveBeenCalledWith({
          name: "projects/test-project/secrets/oauth-secret/versions/latest",
        });
      });

      it("should handle different secret names", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const secret1 = await getSecret("secret-1");
        const secret2 = await getSecret("secret-2");

        expect(secret1).toBe("value");
        expect(secret2).toBe("value");
      });
    });

    describe("Caching Behavior", () => {
      it("should cache secret after first retrieval", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("cached-value") } },
        ]);

        // First call should fetch from Secret Manager
        const result1 = await getSecret("test-secret");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);

        // Second call should use cache (immediate return)
        const result2 = await getSecret("test-secret");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1); // Still 1, not 2

        expect(result1).toBe("cached-value");
        expect(result2).toBe("cached-value");
      });

      it("should return same value from cache without calling Secret Manager", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        await getSecret("test");
        const cachedResult = await getSecret("test");

        expect(cachedResult).toBe("value");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);
      });

      it("should maintain separate cache entries for different secrets", async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        mockAccessSecretVersion.mockImplementation((params: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const secretName = (params.name as string).split("/")[3]; // Extract secret name (projects/test-project/secrets/SECRET-NAME/versions/latest)
          return Promise.resolve([
            { payload: { data: Buffer.from(`value-${secretName}`) } },
          ]);
        });

        const secret1 = await getSecret("secret-1");
        const secret2 = await getSecret("secret-2");

        expect(secret1).toBe("value-secret-1");
        expect(secret2).toBe("value-secret-2");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(2);
      });

      it("should cache independently for each secret", async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        mockAccessSecretVersion.mockImplementation((params: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const secretName = (params.name as string).split("/")[3];
          return Promise.resolve([
            { payload: { data: Buffer.from(`value-${secretName}`) } },
          ]);
        });

        // Fetch different secrets
        await getSecret("secret-a");
        await getSecret("secret-b");
        await getSecret("secret-a"); // Should use cache
        await getSecret("secret-b"); // Should use cache

        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(2);
      });
    });

    describe("TTL (Time-To-Live) Cache Expiration", () => {
      it("should respect cache TTL and fetch fresh value after expiration", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("initial-value") } },
        ]);

        const result1 = await getSecret("test");
        expect(result1).toBe("initial-value");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);

        // Mock time passage beyond TTL (15 minutes)
        const originalDateNow = Date.now;
        let currentTime = Date.now();
        jest.spyOn(Date, "now").mockImplementation(() => {
          return currentTime;
        });

        // Advance time by 15 minutes + 1 second
        currentTime += 15 * 60 * 1000 + 1000;

        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("refreshed-value") } },
        ]);

        const result2 = await getSecret("test");
        expect(result2).toBe("refreshed-value");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(2);

        Date.now = originalDateNow;
      });

      it("should use cache for calls within TTL window", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const originalDateNow = Date.now;
        let currentTime = Date.now();
        jest.spyOn(Date, "now").mockImplementation(() => {
          return currentTime;
        });

        // First call
        await getSecret("test");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);

        // Advance time by 14 minutes (still within 15-minute TTL)
        currentTime += 14 * 60 * 1000;

        // Second call should use cache
        await getSecret("test");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);

        Date.now = originalDateNow;
      });

      it("should fetch fresh value immediately after TTL expiration", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const originalDateNow = Date.now;
        let currentTime = Date.now();
        jest.spyOn(Date, "now").mockImplementation(() => {
          return currentTime;
        });

        await getSecret("test");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);

        // Advance exactly to TTL boundary (15 minutes)
        currentTime += 15 * 60 * 1000;

        // Next call should fetch fresh value
        await getSecret("test");
        expect(mockAccessSecretVersion).toHaveBeenCalledTimes(2);

        Date.now = originalDateNow;
      });
    });

    describe("Error Handling", () => {
      it("should throw error when GCLOUD_PROJECT env var is not set", async () => {
        delete process.env.GCLOUD_PROJECT;

        await expect(getSecret("test")).rejects.toThrow(
          "Secret retrieval failed"
        );
      });

      it("should throw error when Secret Manager returns empty value", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("") } },
        ]);

        await expect(getSecret("empty-secret")).rejects.toThrow(
          "Secret retrieval failed"
        );
      });

      it("should throw error when Secret Manager returns null/undefined payload", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: {} },
        ]);

        await expect(getSecret("null-secret")).rejects.toThrow(
          "Secret retrieval failed"
        );
      });

      it("should throw error when Secret Manager API fails", async () => {
        mockAccessSecretVersion.mockRejectedValue(
          new Error("Permission denied")
        );

        await expect(getSecret("forbidden-secret")).rejects.toThrow(
          "Secret retrieval failed"
        );
      });

      it("should throw error with descriptive message on failure", async () => {
        mockAccessSecretVersion.mockRejectedValue(
          new Error("Access denied to secret")
        );

        try {
          await getSecret("test");
          fail("Should have thrown");
        } catch (e) {
          if (e instanceof Error) {
            expect(e.message).toContain("Secret retrieval failed");
            expect(e.message).toContain("test");
          }
        }
      });

      it("should handle non-Error exceptions", async () => {
        mockAccessSecretVersion.mockRejectedValue("string error");

        await expect(getSecret("test")).rejects.toThrow(
          "Secret retrieval failed"
        );
      });
    });

    describe("Audit Logging", () => {
      it("should log successful secret access to audit collection", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("secret") } },
        ]);

        await getSecret("oauth-key");

        expect(mockCollection).toHaveBeenCalledWith("_audit");
        expect(mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "secret_access",
            secretName: "oauth-key",
            status: "success",
          })
        );
      });

      it("should not log secret value in audit log", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("super-secret-value") } },
        ]);

        await getSecret("test-secret");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const callArgs = mockAdd.mock.calls[0]?.[0] as Record<string, unknown>;
        // Verify the secret value is not in the logged data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(callArgs?.value).toBeUndefined();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect(Object.values(callArgs ?? {}).join(",")).not.toContain(
          "super-secret-value"
        );
        // Only secretName should be logged, not the value
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(callArgs?.secretName).toBe("test-secret");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(callArgs?.status).toBe("success");
      });

      it("should include timestamp in audit log", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("secret") } },
        ]);

        await getSecret("test");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const callArgs = mockAdd.mock.calls[0]?.[0] as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(callArgs?.timestamp).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(callArgs?.timestamp instanceof Date).toBe(true);
      });

      it("should log failed secret access", async () => {
        mockAccessSecretVersion.mockRejectedValue(
          new Error("API error")
        );

        try {
          await getSecret("failing-secret");
        } catch {
          // Expected
        }

        expect(mockCollection).toHaveBeenCalledWith("_audit");
        expect(mockAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            action: "secret_access",
            secretName: "failing-secret",
            status: "failed",
            error: "API error",
          })
        );
      });

      it("should continue even if audit logging fails", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("secret") } },
        ]);
        mockAdd.mockRejectedValueOnce(new Error("Audit log write failed"));

        const result = await getSecret("test");

        expect(result).toBe("secret");
      });

      it("should not throw on audit log failure after error", async () => {
        mockAccessSecretVersion.mockRejectedValue(new Error("Secret error"));
        mockAdd.mockRejectedValue(new Error("Audit log error"));

        await expect(getSecret("test")).rejects.toThrow("Secret retrieval failed");
      });
    });

    describe("Concurrent Calls", () => {
      it("should handle multiple concurrent calls for same secret", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const calls = Array.from({ length: 5 }, () =>
          getSecret("shared-secret")
        );

        const results = await Promise.all(calls);

        // All should return same value
        results.forEach((result) => {
          expect(result).toBe("value");
        });

        // Secret Manager might be called multiple times due to race condition,
        // but cache should eventually be used
        expect(mockAccessSecretVersion.mock.calls.length).toBeGreaterThan(0);
        expect(mockAccessSecretVersion.mock.calls.length).toBeLessThanOrEqual(5);
      });

      it("should handle concurrent calls for different secrets", async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        mockAccessSecretVersion.mockImplementation((params: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const secretName = (params.name as string).split("/")[3];
          return Promise.resolve([
            { payload: { data: Buffer.from(`value-${secretName}`) } },
          ]);
        });

        const calls = Array.from({ length: 3 }, (_, i) =>
          getSecret(`secret-${i}`)
        );

        const results = await Promise.all(calls);

        expect(results[0]).toBe("value-secret-0");
        expect(results[1]).toBe("value-secret-1");
        expect(results[2]).toBe("value-secret-2");
      });
    });

    describe("Return Type Validation", () => {
      it("should always return a string", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const result = await getSecret("test");

        expect(typeof result).toBe("string");
      });

      it("should never return empty string for valid secret", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("non-empty") } },
        ]);

        const result = await getSecret("test");

        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle buffer conversion correctly", async () => {
        const testValue = "test-secret-123!@#";
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from(testValue) } },
        ]);

        const result = await getSecret("test");

        expect(result).toBe(testValue);
      });
    });

    describe("Edge Cases", () => {
      it("should handle secret names with special characters", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("value") } },
        ]);

        const result = await getSecret("oauth-secret-prod_v2");

        expect(result).toBe("value");
        expect(mockAccessSecretVersion).toHaveBeenCalledWith({
          name: "projects/test-project/secrets/oauth-secret-prod_v2/versions/latest",
        });
      });

      it("should handle very long secret values", async () => {
        const longValue = "x".repeat(10000);
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from(longValue) } },
        ]);

        const result = await getSecret("large-secret");

        expect(result).toBe(longValue);
        expect(result.length).toBe(10000);
      });

      it("should handle secret with newlines", async () => {
        const secretWithNewlines = "line1\nline2\nline3";
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from(secretWithNewlines) } },
        ]);

        const result = await getSecret("multiline-secret");

        expect(result).toBe(secretWithNewlines);
      });

      it("should handle secret with special characters", async () => {
        const specialSecret = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from(specialSecret) } },
        ]);

        const result = await getSecret("special-secret");

        expect(result).toBe(specialSecret);
      });

      it("should handle Unicode in secret values", async () => {
        const unicodeSecret = "秘密データ🔐";
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from(unicodeSecret, "utf-8") } },
        ]);

        const result = await getSecret("unicode-secret");

        expect(result).toBe(unicodeSecret);
      });
    });

    describe("Real-World Scenarios", () => {
      it("should retrieve OAuth client secret", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("google-oauth-secret-xyz") } },
        ]);

        const secret = await getSecret("google-oauth-secret");

        expect(secret).toBe("google-oauth-secret-xyz");
      });

      it("should retrieve IMAP app password", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("app-password-123") } },
        ]);

        const secret = await getSecret("imap-app-password");

        expect(secret).toBe("app-password-123");
      });

      it("should retrieve API keys", async () => {
        mockAccessSecretVersion.mockResolvedValue([
          { payload: { data: Buffer.from("api-key-abcdef123456") } },
        ]);

        const secret = await getSecret("external-api-key");

        expect(secret).toBe("api-key-abcdef123456");
      });
    });
  });
});
