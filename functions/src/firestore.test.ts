/**
 * Unit tests for firestore module
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

// Mock firebase-admin before any imports
jest.mock("firebase-admin/app", () => ({
  getApp: jest.fn(),
}));
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
}));


describe("firestore module", () => {
  let mockFirestoreInstance: any;
  let mockApp: any;

  beforeEach(() => {
    // Reset modules to clear the singleton cache
    jest.resetModules();
    jest.clearAllMocks();

    // Re-setup the mocks after resetModules
    const firebase = require("firebase-admin/app");
    const firestoreModule = require("firebase-admin/firestore");

    mockFirestoreInstance = {
      collection: jest.fn(),
      doc: jest.fn(),
      runTransaction: jest.fn(),
      batch: jest.fn(),
    };

    mockApp = {
      name: "default",
    };

    firebase.getApp.mockReturnValue(mockApp);
    firestoreModule.getFirestore.mockReturnValue(mockFirestoreInstance);
  });

  describe("basic behavior", () => {
    it("should return a Firestore instance", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).toBe(mockFirestoreInstance);
    });

    it("should call getApp during first call", () => {
      const firebase = require("firebase-admin/app");
      const { db } = require("./firestore");
      db();
      expect(firebase.getApp).toHaveBeenCalledTimes(1);
    });

    it("should call getFirestore with correct parameters", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      db();
      expect(firestoreModule.getFirestore).toHaveBeenCalledWith(mockApp, "sukkirimail");
    });

    it("should cache the instance", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      const first = db();
      const second = db();
      expect(first).toBe(second);
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
    });

    it("should not reinitialize on subsequent calls", () => {
      const firebase = require("firebase-admin/app");
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      db();
      db();
      db();
      expect(firebase.getApp).toHaveBeenCalledTimes(1);
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
    });
  });

  describe("lazy loading", () => {
    it("should not initialize before first call", () => {
      const firebase = require("firebase-admin/app");
      const firestoreModule = require("firebase-admin/firestore");
      expect(firebase.getApp).not.toHaveBeenCalled();
      expect(firestoreModule.getFirestore).not.toHaveBeenCalled();
      const { db } = require("./firestore");
      expect(firebase.getApp).not.toHaveBeenCalled();
      db();
      expect(firebase.getApp).toHaveBeenCalled();
      expect(firestoreModule.getFirestore).toHaveBeenCalled();
    });

    it("should initialize only once", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      for (let i = 0; i < 5; i++) {
        db();
      }
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
    });

    it("should return same instance", () => {
      const { db } = require("./firestore");
      const instances = Array.from({ length: 10 }, () => db());
      for (let i = 1; i < instances.length; i++) {
        expect(instances[i]).toBe(instances[0]);
      }
    });
  });

  describe("database ID", () => {
    it("should use sukkirimail database", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      db();
      expect(firestoreModule.getFirestore).toHaveBeenCalledWith(mockApp, "sukkirimail");
    });

    it("should pass app and database ID", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      db();
      const calls = firestoreModule.getFirestore.mock.calls;
      expect(calls[0].length).toBe(2);
      expect(calls[0][0]).toBe(mockApp);
      expect(calls[0][1]).toBe("sukkirimail");
    });

    it("should not use default database", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      db();
      const calls = firestoreModule.getFirestore.mock.calls;
      expect(calls[0][1]).not.toBe("default");
      expect(calls[0][1]).toBe("sukkirimail");
    });
  });

  describe("error handling", () => {
    it("should throw when getApp fails", () => {
      const firebase = require("firebase-admin/app");
      firebase.getApp.mockImplementation(() => {
        throw new Error("Firebase app not initialized");
      });
      const { db } = require("./firestore");
      expect(() => db()).toThrow("Firebase app not initialized");
    });

    it("should throw when getFirestore fails", () => {
      const firestoreModule = require("firebase-admin/firestore");
      firestoreModule.getFirestore.mockImplementation(() => {
        throw new Error("Firestore initialization failed");
      });
      const { db } = require("./firestore");
      expect(() => db()).toThrow("Firestore initialization failed");
    });

    it("should propagate custom errors", () => {
      const firebase = require("firebase-admin/app");
      const customError = new Error("Custom error");
      firebase.getApp.mockImplementation(() => {
        throw customError;
      });
      const { db } = require("./firestore");
      expect(() => db()).toThrow(customError);
    });
  });

  describe("Firestore API", () => {
    it("should have collection method", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).toHaveProperty("collection");
    });

    it("should have doc method", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).toHaveProperty("doc");
    });

    it("should have runTransaction method", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).toHaveProperty("runTransaction");
    });

    it("should have batch method", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).toHaveProperty("batch");
    });
  });

  describe("return value", () => {
    it("should return same reference", () => {
      const { db } = require("./firestore");
      const ref1 = db();
      const ref2 = db();
      const ref3 = db();
      expect(ref1 === ref2).toBe(true);
      expect(ref2 === ref3).toBe(true);
    });

    it("should not return null", () => {
      const { db } = require("./firestore");
      const result = db();
      expect(result).not.toBeNull();
    });
  });

  describe("Firebase integration", () => {
    it("should call getApp before getFirestore", () => {
      const firebase = require("firebase-admin/app");
      const firestoreModule = require("firebase-admin/firestore");
      const callOrder: string[] = [];

      firebase.getApp.mockImplementation(() => {
        callOrder.push("getApp");
        return mockApp;
      });
      firestoreModule.getFirestore.mockImplementation(() => {
        callOrder.push("getFirestore");
        return mockFirestoreInstance;
      });

      const { db } = require("./firestore");
      db();

      expect(callOrder[0]).toBe("getApp");
      expect(callOrder[1]).toBe("getFirestore");
    });

    it("should call getApp with no parameters", () => {
      const firebase = require("firebase-admin/app");
      const { db } = require("./firestore");
      db();
      expect(firebase.getApp).toHaveBeenCalledWith();
    });
  });

  describe("singleton pattern", () => {
    it("should implement lazy singleton", () => {
      const firestoreModule = require("firebase-admin/firestore");
      expect(firestoreModule.getFirestore).not.toHaveBeenCalled();
      const { db } = require("./firestore");
      const instance1 = db();
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
      const instance2 = db();
      expect(instance1).toBe(instance2);
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
    });

    it("should cache and reuse instance", () => {
      const { db } = require("./firestore");
      const first = db();
      const second = db();
      const third = db();
      expect(first === second && second === third).toBe(true);
    });
  });

  describe("concurrent calls", () => {
    it("should handle rapid calls", () => {
      const { db } = require("./firestore");
      const results: any[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(db());
      }
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0]);
      }
    });

    it("should maintain singleton during loop", () => {
      const { db } = require("./firestore");
      const first = db();
      for (let i = 0; i < 100; i++) {
        const result = db();
        expect(result).toBe(first);
      }
    });
  });

  describe("performance", () => {
    it("should initialize only once", () => {
      const firestoreModule = require("firebase-admin/firestore");
      const { db } = require("./firestore");
      for (let i = 0; i < 100; i++) {
        db();
      }
      expect(firestoreModule.getFirestore).toHaveBeenCalledTimes(1);
    });

    it("should have fast access after init", () => {
      const { db } = require("./firestore");
      db(); // Warm up
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        db();
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});
