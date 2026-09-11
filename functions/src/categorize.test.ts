/**
 * Unit tests for categorize module
 */

import { categorizeMessage, pickNextAccountColor, MailCategory } from "./categorize";

describe("categorize", () => {
  describe("categorizeMessage", () => {
    describe("Invoice Detection", () => {
      it("should detect 'invoice' keyword in subject", async () => {
        expect(await categorizeMessage("Monthly invoice", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should detect 'receipt' keyword in subject", async () => {
        expect(await categorizeMessage("Your receipt is ready", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should detect Japanese invoice keyword '請求' in subject", async () => {
        expect(await categorizeMessage("今月の請求書です", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should detect Japanese receipt keyword '領収書' in subject", async () => {
        expect(await categorizeMessage("領収書を添付しています", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should detect Japanese payment keyword 'お支払い' in subject", async () => {
        expect(await categorizeMessage("お支払いのご案内", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should handle mixed case invoice keywords", async () => {
        expect(await categorizeMessage("INVOICE #12345", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should prioritize invoice over other categories", async () => {
        expect(
await categorizeMessage(
            "Special Invoice Sale 50% OFF",
            "noreply@example.com"
          )
        ).toBe("invoice");
      });
    });

    describe("Notification Detection", () => {
      it("should detect 'no-reply' in sender email", async () => {
        expect(await categorizeMessage("Hello", "noreply@example.com")).toBe(
          "notification"
        );
      });

      it("should detect 'no-reply' variations in sender email", async () => {
        // Regex is /no-?reply/ which matches "noreply" and "no-reply" but NOT "no_reply"
        expect(await categorizeMessage("Hello", "noreply@example.com")).toBe(
          "notification"
        );
        expect(await categorizeMessage("Hello", "no-reply@example.com")).toBe(
          "notification"
        );
        // no_reply (with underscore) won't match
        expect(await categorizeMessage("Hello", "no_reply@example.com")).toBe("other");
      });

      it("should detect 'notification' in sender email", async () => {
        expect(await categorizeMessage("Hello", "notification@example.com")).toBe(
          "notification"
        );
      });

      it("should detect notification only from sender address or Japanese keywords", async () => {
        // The regex checks sender first: /no-?reply|notification|通知|お知らせ/
        // So "notification@" in sender domain would NOT match (no-?reply does)
        // English "notification" keyword in subject is NOT checked, only Japanese keywords
        expect(
await categorizeMessage("You have a new notification", "sender@example.com")
        ).toBe("other");
        // But notification from noreply sender should work
        expect(
await categorizeMessage("system update", "noreply@example.com")
        ).toBe("notification");
      });

      it("should detect Japanese notification keyword '通知' in subject", async () => {
        // Note: Japanese keywords are only detected in subject when not matched by sender pattern
        expect(await categorizeMessage("システム通知です", "noreply@example.com")).toBe(
          "notification"
        );
      });

      it("should detect Japanese notification keyword 'お知らせ' in subject", async () => {
        expect(await categorizeMessage("重要なお知らせ", "noreply@example.com")).toBe(
          "notification"
        );
      });

      it("should detect notification pattern when Japanese keyword in subject", async () => {
        // The code checks sender first, then subject for Japanese keywords
        expect(
await categorizeMessage("User notifications available", "info@example.com")
        ).toBe("other");
        // Japanese keywords in subject trigger notification
        expect(await categorizeMessage("通知内容です", "info@example.com")).toBe(
          "notification"
        );
      });

      it("should prioritize notification over promotion", async () => {
        expect(
await categorizeMessage(
            "Special notification about our sale",
            "noreply@example.com"
          )
        ).toBe("notification");
      });
    });

    describe("Promotion Detection", () => {
      it("should detect 'sale' keyword in subject", async () => {
        expect(await categorizeMessage("Big Sale Today!", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect 'off' keyword in subject", async () => {
        expect(await categorizeMessage("50% off this weekend", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect 'campaign' keyword in subject", async () => {
        expect(await categorizeMessage("New campaign announcement", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect Japanese promotion keyword 'セール' in subject", async () => {
        expect(await categorizeMessage("春のセール開始!", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect Japanese promotion keyword '割引' in subject", async () => {
        expect(await categorizeMessage("今月の割引クーポン", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect Japanese promotion keyword 'キャンペーン' in subject", async () => {
        expect(
await categorizeMessage("新しいキャンペーンが始まりました", "sender@example.com")
        ).toBe("promotion");
      });

      it("should detect Japanese promotion keyword 'メルマガ' in subject", async () => {
        expect(await categorizeMessage("今週のメルマガ", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should detect 'newsletter' keyword in subject", async () => {
        expect(await categorizeMessage("Weekly newsletter #42", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should handle mixed case promotion keywords", async () => {
        expect(await categorizeMessage("LIMITED-TIME SALE", "sender@example.com")).toBe(
          "promotion"
        );
      });

      it("should handle hyphenated discount", async () => {
        expect(await categorizeMessage("Special 30-off promotion", "sender@example.com")).toBe(
          "promotion"
        );
      });
    });

    describe("Other Category (Default)", () => {
      it("should return 'other' for generic subject", async () => {
        expect(await categorizeMessage("Hello", "sender@example.com")).toBe("other");
      });

      it("should return 'other' for empty subject", async () => {
        expect(await categorizeMessage("", "sender@example.com")).toBe("other");
      });

      it("should return 'other' for work email", async () => {
        expect(
await categorizeMessage("Meeting tomorrow at 2pm", "boss@company.com")
        ).toBe("other");
      });

      it("should return 'other' for personal email", async () => {
        expect(
await categorizeMessage("How are you doing?", "friend@example.com")
        ).toBe("other");
      });
    });

    describe("Case Insensitivity", () => {
      it("should handle UPPERCASE subject", async () => {
        expect(await categorizeMessage("INVOICE CONFIRMATION", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should handle MixedCase subject", async () => {
        expect(await categorizeMessage("InVoIcE Notice", "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should handle UPPERCASE sender", async () => {
        expect(await categorizeMessage("Hello", "NOREPLY@EXAMPLE.COM")).toBe(
          "notification"
        );
      });

      it("should handle MixedCase sender", async () => {
        expect(await categorizeMessage("Hello", "NoReply@Example.Com")).toBe(
          "notification"
        );
      });
    });

    describe("Priority and Conflict Resolution", () => {
      it("should prioritize invoice over notification", async () => {
        expect(
await categorizeMessage("Invoice notification", "noreply@example.com")
        ).toBe("invoice");
      });

      it("should prioritize invoice over promotion", async () => {
        expect(
await categorizeMessage("Invoice sale confirmation", "sender@example.com")
        ).toBe("invoice");
      });

      it("should prioritize notification over promotion", async () => {
        expect(
await categorizeMessage("Special notification sale", "noreply@example.com")
        ).toBe("notification");
      });

      it("should handle multiple keywords in subject", async () => {
        expect(
await categorizeMessage(
            "Invoice for your promotion campaign",
            "sender@example.com"
          )
        ).toBe("invoice");
      });
    });

    describe("Edge Cases", () => {
      it("should handle very long subject", async () => {
        const longSubject = "A".repeat(1000) + " invoice " + "B".repeat(1000);
        expect(await categorizeMessage(longSubject, "sender@example.com")).toBe(
          "invoice"
        );
      });

      it("should handle very long email address", async () => {
        const longEmail = "noreply+" + "x".repeat(1000) + "@example.com";
        expect(await categorizeMessage("Hello", longEmail)).toBe("notification");
      });

      it("should handle special characters in subject", async () => {
        expect(
await categorizeMessage("Invoice #123!@#$%^&*()", "sender@example.com")
        ).toBe("invoice");
      });

      it("should handle special characters in email", async () => {
        expect(await categorizeMessage("Hello", "noreply+tag@example.co.uk")).toBe(
          "notification"
        );
      });

      it("should handle unicode in subject", async () => {
        expect(
await categorizeMessage("請求書のお支払いについて🎉", "sender@example.com")
        ).toBe("invoice");
      });

      it("should handle substring keyword matches", async () => {
        // The regex /請求|invoice|receipt|領収書|お支払い/ will match "invoice"
        expect(await categorizeMessage("invoice pending", "sender@example.com")).toBe(
          "invoice"
        );
        // "reinvoice" contains "invoice" and should be matched
        expect(await categorizeMessage("reinvoice required", "sender@example.com")).toBe(
          "invoice"
        );
        // Test with receipt as well
        expect(await categorizeMessage("receipt attached", "sender@example.com")).toBe(
          "invoice"
        );
      });
    });

    describe("Return Type Validation", () => {
      it("should always return valid MailCategory type", async () => {
        const validCategories: MailCategory[] = [
          "invoice",
          "notification",
          "promotion",
          "other",
        ];
        const testCases = [
          ["invoice test", "test@example.com"],
          ["notification test", "test@example.com"],
          ["sale test", "test@example.com"],
          ["random", "test@example.com"],
        ];
        for (const [subject, email] of testCases) {
          const result = await categorizeMessage(subject, email);
          expect(validCategories).toContain(result);
        }
      });
    });
  });

  describe("pickNextAccountColor", () => {
    describe("Basic Color Selection", () => {
      it("should return first color when no colors exist", async () => {
        const color = pickNextAccountColor([]);
        expect(color).toBe("#3457C9");
      });

      it("should return second color when first is used", async () => {
        const color = pickNextAccountColor(["#3457C9"]);
        expect(color).toBe("#1F8A5F");
      });

      it("should return third color when first two are used", async () => {
        const color = pickNextAccountColor(["#3457C9", "#1F8A5F"]);
        expect(color).toBe("#C9344A");
      });

      it("should return fourth color when first three are used", async () => {
        const color = pickNextAccountColor(["#3457C9", "#1F8A5F", "#C9344A"]);
        expect(color).toBe("#9A7B1F");
      });

      it("should return fifth color when first four are used", async () => {
        const color = pickNextAccountColor([
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
        ]);
        expect(color).toBe("#7A3FC9");
      });

      it("should return sixth color when first five are used", async () => {
        const color = pickNextAccountColor([
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
          "#7A3FC9",
        ]);
        expect(color).toBe("#0F9AA6");
      });
    });

    describe("Undefined/Null Handling", () => {
      it("should skip undefined colors", async () => {
        const color = pickNextAccountColor([undefined]);
        expect(color).toBe("#3457C9");
      });

      it("should skip null colors", async () => {
        const color = pickNextAccountColor([null as unknown as string]);
        expect(color).toBe("#3457C9");
      });

      it("should skip multiple undefined colors", async () => {
        const color = pickNextAccountColor([undefined, undefined]);
        expect(color).toBe("#3457C9");
      });

      it("should skip undefined and use next available", async () => {
        const color = pickNextAccountColor([undefined, "#3457C9"]);
        expect(color).toBe("#1F8A5F");
      });

      it("should handle mixed undefined and colors", async () => {
        const color = pickNextAccountColor([undefined, "#3457C9", undefined]);
        expect(color).toBe("#1F8A5F");
      });
    });

    describe("Wrapping Behavior", () => {
      it("should wrap to palette start when all colors used", async () => {
        const allColors = [
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
          "#7A3FC9",
          "#0F9AA6",
        ];
        const color = pickNextAccountColor(allColors);
        expect(color).toBe("#3457C9");
      });

      it("should wrap correctly for 7 existing colors", async () => {
        const colors = [
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
          "#7A3FC9",
          "#0F9AA6",
          "#UNKNOWN",
        ];
        const color = pickNextAccountColor(colors);
        expect(color).toBe("#1F8A5F");
      });

      it("should wrap correctly for 8 existing colors", async () => {
        const colors = [
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
          "#7A3FC9",
          "#0F9AA6",
          "#UNKNOWN1",
          "#UNKNOWN2",
        ];
        const color = pickNextAccountColor(colors);
        expect(color).toBe("#C9344A");
      });
    });

    describe("Case Sensitivity", () => {
      it("should be case-sensitive for color matching", async () => {
        const color = pickNextAccountColor(["#3457c9"]);
        expect(color).toBe("#3457C9");
      });

      it("should handle uppercase color codes", async () => {
        const color = pickNextAccountColor(["#3457C9"]);
        expect(color).toBe("#1F8A5F");
      });
    });

    describe("Deduplication", () => {
      it("should return next color when some are duplicated", async () => {
        const color = pickNextAccountColor(["#3457C9", "#3457C9", "#3457C9"]);
        expect(color).toBe("#1F8A5F");
      });

      it("should handle duplicates at different positions", async () => {
        const color = pickNextAccountColor([
          "#3457C9",
          "#1F8A5F",
          "#3457C9",
          "#1F8A5F",
        ]);
        expect(color).toBe("#C9344A");
      });

      it("should not reuse colors even if duplicated in input", async () => {
        const colors = [
          "#3457C9",
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
        ];
        const color = pickNextAccountColor(colors);
        expect(color).toBe("#9A7B1F");
      });
    });

    describe("Empty String Handling", () => {
      it("should treat empty string as a used color", async () => {
        const color = pickNextAccountColor([""]);
        expect(color).toBe("#3457C9");
      });

      it("should treat multiple empty strings as single used color", async () => {
        const color = pickNextAccountColor(["", ""]);
        expect(color).toBe("#3457C9");
      });
    });

    describe("Return Value Validation", () => {
      it("should always return a string", async () => {
        const result = pickNextAccountColor([]);
        expect(typeof result).toBe("string");
      });

      it("should always return a valid hex color from palette", async () => {
        const validPalette = [
          "#3457C9",
          "#1F8A5F",
          "#C9344A",
          "#9A7B1F",
          "#7A3FC9",
          "#0F9AA6",
        ];
        const result = pickNextAccountColor([]);
        expect(validPalette).toContain(result);
      });

      it("should always return hex format color", async () => {
        const result = pickNextAccountColor([]);
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
      });

      it("should never return undefined or null", async () => {
        const result = pickNextAccountColor([undefined, null as unknown as string]);
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
      });
    });

    describe("Large Input Lists", () => {
      it("should handle very large existing colors array", async () => {
        const largeArray: (string | undefined)[] = Array(10000).fill(
          "#3457C9"
        ) as (string | undefined)[];
        const color = pickNextAccountColor(largeArray);
        // With 10000 duplicates of #3457C9, the Set deduplicates to just 1 color
        // So it returns the first unused color from the palette, which is #1F8A5F
        expect(color).toBe("#1F8A5F");
      });

      it("should have reasonable performance with 1000 entries", async () => {
        const largeArray: (string | undefined)[] = Array(1000).fill(
          undefined
        ) as (string | undefined)[];
        const start = Date.now();
        const color = pickNextAccountColor(largeArray);
        const duration = Date.now() - start;
        expect(color).toBe("#3457C9");
        expect(duration).toBeLessThan(100);
      });
    });

    describe("Edge Cases", () => {
      it("should handle single element array", async () => {
        const color = pickNextAccountColor(["#3457C9"]);
        expect(color).toBe("#1F8A5F");
      });

      it("should handle array with only undefined", async () => {
        const color = pickNextAccountColor([undefined, undefined, undefined]);
        expect(color).toBe("#3457C9");
      });

      it("should handle numeric string colors", async () => {
        const color = pickNextAccountColor(["123456"]);
        expect(color).toBe("#3457C9");
      });
    });

    describe("Type Safety", () => {
      it("should accept array of strings with undefined", async () => {
        const colors: (string | undefined)[] = ["#3457C9", undefined];
        expect(() => pickNextAccountColor(colors)).not.toThrow();
      });

      it("should return string result", async () => {
        const result: string = pickNextAccountColor([]);
        expect(typeof result).toBe("string");
      });
    });
  });
});
