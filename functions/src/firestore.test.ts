/**
 * Unit tests for firestore module
 */

// Mock firebase-admin modules BEFORE importing db
jest.mock("firebase-admin/app");
jest.mock("firebase-admin/firestore");

import * as firestoreAdminModule from "firebase-admin/firestore";
import * as appModule from "firebase-admin/app";
import { db, __resetFirestoreCache } from "./firestore";

describe("firestore", () => {
  let mockGetApp: jest.Mock;
  let mockGetFirestore: jest.Mock;
  let mockFirestoreInstance: Record<string, jest.Mock>;

  beforeEach(() => {
    // Reset the Firestore cache before each test
    __resetFirestoreCache();
    jest.clearAllMocks();

    // Setup mock Firestore instance
    mockFirestoreInstance = {
      collection: jest.fn(),
      doc: jest.fn(),
      batch: jest.fn(),
      runTransaction: jest.fn(),
    };

    // Setup mock functions
    mockGetApp = jest.fn().mockReturnValue({});
    mockGetFirestore = jest.fn().mockReturnValue(mockFirestoreInstance);

    // Assign mocks to modules
    (appModule.getApp as jest.Mock) = mockGetApp;
    (firestoreAdminModule.getFirestore as jest.Mock) = mockGetFirestore;
  });

  describe("db function - basic functionality", () => {
    it("should return a Firestore instance", () => {
      const instance = db();

      expect(instance).toBeDefined();
      expect(typeof instance).toBe("object");
    });

    it("should call getApp() to get Firebase app", () => {
      db();

      expect(mockGetApp).toHaveBeenCalled();
    });

    it("should call getFirestore with app and database ID", () => {
      const mockApp = { name: "test-app" };
      mockGetApp.mockReturnValue(mockApp);

      db();

      // First call args should be app, then database ID
      expect(mockGetFirestore).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const callArgs = mockGetFirestore.mock.calls[0] as unknown[];
      expect(callArgs.length).toBeGreaterThanOrEqual(2);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(callArgs[1]).toBe("sukkirimail");
    });

    it("should use 'sukkirimail' as the database ID", () => {
      db();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const callArgs = mockGetFirestore.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(callArgs[1]).toBe("sukkirimail");
    });

    it("should use module API version getFirestore (not namespace admin.firestore)", () => {
      db();

      // Verify that getFirestore (module API) was called
      expect(firestoreAdminModule.getFirestore).toHaveBeenCalled();
    });
  });

  describe("db function - caching", () => {
    it("should cache the Firestore instance after first call", () => {
      const instance1 = db();
      const instance2 = db();

      expect(instance1).toBe(instance2);
      // Should use cache, so getFirestore called only once per lifecycle
      expect(mockGetFirestore.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it("should return consistent instance on multiple calls", () => {
      const instances = Array.from({ length: 5 }, () => db());

      // All instances should be identical (same reference)
      instances.forEach((instance) => {
        expect(instance).toBe(instances[0]);
      });
    });

    it("should implement singleton pattern", () => {
      const instance1 = db();
      const instance2 = db();
      const instance3 = db();

      expect(instance1 === instance2).toBe(true);
      expect(instance2 === instance3).toBe(true);
    });
  });

  describe("db function - interface", () => {
    it("should return an object with Firestore collection method", () => {
      const instance = db();

      expect(instance).toHaveProperty("collection");
      expect(typeof instance.collection).toBe("function");
    });

    it("should return an object with Firestore doc method", () => {
      const instance = db();

      expect(instance).toHaveProperty("doc");
      expect(typeof instance.doc).toBe("function");
    });

    it("should return an object with Firestore batch method", () => {
      const instance = db();

      expect(instance).toHaveProperty("batch");
      expect(typeof instance.batch).toBe("function");
    });

    it("should return an object with Firestore runTransaction method", () => {
      const instance = db();

      expect(instance).toHaveProperty("runTransaction");
      expect(typeof instance.runTransaction).toBe("function");
    });

    it("should support chaining Firestore operations", () => {
      const instance = db();

      mockFirestoreInstance.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({}),
      });

      const result = instance.collection("users").doc("user123");

      expect(result).toBeDefined();
    });
  });

  describe("Database configuration", () => {
    it("should use named 'sukkirimail' database", () => {
      db();

      // Check that getFirestore was called with 'sukkirimail'
      expect(mockGetFirestore).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const calls = mockGetFirestore.mock.calls;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      const databaseIdArgs = calls.map((call: unknown[]) => call[1]);
      databaseIdArgs.forEach((databaseId) => {
        expect(databaseId).toBe("sukkirimail");
      });
    });

    it("should pass Firebase app instance to getFirestore", () => {
      const mockApp = { name: "default" };
      mockGetApp.mockReturnValue(mockApp);

      db();

      expect(mockGetFirestore).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const firstArg = mockGetFirestore.mock.calls[0][0];
      expect(firstArg).toBe(mockApp);
    });

    it("should consistently use correct database ID on repeated calls", () => {
      db();
      db();
      db();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const callArgs = mockGetFirestore.mock.calls;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      callArgs.forEach((call: unknown[]) => {
        expect(call[1]).toBe("sukkirimail");
      });
    });
  });

  describe("Singleton pattern validation", () => {
    it("should return same instance reference on repeated calls", () => {
      const refs = new Array(10).fill(null).map(() => db());

      const firstRef = refs[0];
      refs.forEach((ref) => {
        expect(ref).toBe(firstRef);
      });
    });

    it("should maintain singleton across multiple call sites", () => {
      const site1 = db();
      const site2 = db();
      const site3 = db();

      expect(site1).toBe(site2);
      expect(site2).toBe(site3);
    });

    it("should cache instance properly (initialize once)", () => {
      // Reset call counts
      mockGetFirestore.mockClear();
      mockGetApp.mockClear();

      // Call db() multiple times
      db();
      db();
      db();
      db();

      // Should initialize only once
      expect(mockGetApp.mock.calls.length).toBeLessThanOrEqual(1);
      expect(mockGetFirestore.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Error propagation", () => {
    it("should propagate getApp errors", () => {
      const testError = new Error("Failed to get Firebase app");
      mockGetApp.mockImplementation(() => {
        throw testError;
      });

      // Reset the module state by clearing mocks
      jest.clearAllMocks();
      (appModule.getApp as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      expect(() => db()).toThrow(testError);
    });

    it("should propagate getFirestore errors", () => {
      const testError = new Error("Database initialization failed");
      mockGetFirestore.mockImplementation(() => {
        throw testError;
      });

      jest.clearAllMocks();
      (firestoreAdminModule.getFirestore as jest.Mock).mockImplementation(
        () => {
          throw testError;
        }
      );

      expect(() => db()).toThrow(testError);
    });

    it("should handle Firebase not initialized error", () => {
      const error = new Error(
        "The default Firebase app does not exist. Make sure Firebase is initialized."
      );
      mockGetApp.mockImplementation(() => {
        throw error;
      });

      jest.clearAllMocks();
      (appModule.getApp as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => db()).toThrow(error);
    });
  });

  describe("Integration scenarios", () => {
    it("should provide accessible Firestore collection reference", () => {
      const instance = db();

      instance.collection("test-collection");

      expect(mockFirestoreInstance.collection).toHaveBeenCalledWith(
        "test-collection"
      );
    });

    it("should provide accessible Firestore document reference", () => {
      const instance = db();

      instance.doc("path/to/doc");

      expect(mockFirestoreInstance.doc).toHaveBeenCalledWith("path/to/doc");
    });

    it("should provide accessible Firestore batch operation", () => {
      const instance = db();

      instance.batch();

      expect(mockFirestoreInstance.batch).toHaveBeenCalled();
    });

    it("should provide accessible Firestore transaction", () => {
      const instance = db();
      const mockCallback = jest.fn();

      void instance.runTransaction(mockCallback);

      expect(mockFirestoreInstance.runTransaction).toHaveBeenCalledWith(
        mockCallback
      );
    });
  });

  describe("Module design", () => {
    it("should export db as a function", () => {
      expect(typeof db).toBe("function");
    });

    it("should implement lazy initialization (singleton)", () => {
      // db() should be callable and return the same instance
      const instance = db();

      expect(instance).toBeDefined();
      expect(db()).toBe(instance);
    });

    it("should work with Firebase Admin SDK types", () => {
      const instance = db();

      // Should have all Firestore interface methods
      expect(instance).toHaveProperty("collection");
      expect(instance).toHaveProperty("doc");
      expect(instance).toHaveProperty("batch");
      expect(instance).toHaveProperty("runTransaction");
    });
  });

  describe("Configuration constants", () => {
    it("should use 'sukkirimail' as database identifier", () => {
      // This documents that the module uses the named database
      // not the default database
      db();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const callArgs = mockGetFirestore.mock.calls[0] as unknown[];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(callArgs[1]).toBe("sukkirimail");
    });

    it("should only use the specified database ID", () => {
      // Multiple calls should all use the same database ID
      db();
      db();
      db();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockGetFirestore.mock.calls.forEach((call: unknown[]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(call[1]).toBe("sukkirimail");
        // Should not be using 'default' or undefined
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(call[1]).not.toBe("default");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(call[1]).toBeDefined();
      });
    });
  });
});
