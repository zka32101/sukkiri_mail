/**
 * Unit tests for categorizeMessage and pickNextAccountColor
 */

import { categorizeMessage, pickNextAccountColor } from './categorize';

describe('categorizeMessage', () => {
  describe('invoice detection', () => {
    it('should detect "請求" (billing) in subject', () => {
      expect(categorizeMessage('月額請求のお知らせ', 'no-reply@example.com')).toBe('invoice');
    });

    it('should detect "invoice" in subject', () => {
      expect(categorizeMessage('Your Monthly Invoice', 'billing@example.com')).toBe('invoice');
    });

    it('should detect "receipt" in subject', () => {
      expect(categorizeMessage('Order Receipt #12345', 'shop@example.com')).toBe('invoice');
    });

    it('should detect "領収書" (receipt) in subject', () => {
      expect(categorizeMessage('ご購入ありがとうございました 領収書', 'shop@example.jp')).toBe('invoice');
    });

    it('should detect "お支払い" (payment) in subject', () => {
      expect(categorizeMessage('お支払い確認のご連絡', 'billing@example.jp')).toBe('invoice');
    });
  });

  describe('notification detection', () => {
    it('should detect "no-reply" in sender email', () => {
      expect(categorizeMessage('Hello', 'no-reply@example.com')).toBe('notification');
    });

    it('should detect "noreply" (without hyphen) in sender email', () => {
      expect(categorizeMessage('Alert', 'noreply@example.com')).toBe('notification');
    });

    it('should detect "notification" in sender email', () => {
      expect(categorizeMessage('Update', 'notification@example.com')).toBe('notification');
    });

    it('should detect "通知" (notification) in subject', () => {
      expect(categorizeMessage('システム通知', 'support@example.jp')).toBe('notification');
    });

    it('should detect "お知らせ" (news/announcement) in subject', () => {
      expect(categorizeMessage('重要なお知らせです', 'info@example.jp')).toBe('notification');
    });
  });

  describe('promotion detection', () => {
    it('should detect "セール" (sale) in subject', () => {
      expect(categorizeMessage('今月のセール情報', 'marketing@example.jp')).toBe('promotion');
    });

    it('should detect "割引" (discount) in subject', () => {
      expect(categorizeMessage('限定割引キャンペーン', 'sales@example.jp')).toBe('promotion');
    });

    it('should detect "off" in subject', () => {
      expect(categorizeMessage('50% Off Sale This Week', 'deals@example.com')).toBe('promotion');
    });

    it('should detect "sale" in subject', () => {
      expect(categorizeMessage('Flash Sale Alert!', 'shop@example.com')).toBe('promotion');
    });

    it('should detect "campaign" in subject', () => {
      expect(categorizeMessage('Special Campaign for You', 'marketing@example.com')).toBe('promotion');
    });

    it('should detect "キャンペーン" (campaign) in subject', () => {
      expect(categorizeMessage('新商品キャンペーン開始', 'shop@example.jp')).toBe('promotion');
    });

    it('should detect "メルマガ" (newsletter) in subject', () => {
      expect(categorizeMessage('今週のメルマガ', 'newsletter@example.jp')).toBe('promotion');
    });

    it('should detect "newsletter" in subject', () => {
      expect(categorizeMessage('Weekly Newsletter', 'news@example.com')).toBe('promotion');
    });
  });

  describe('other/default categorization', () => {
    it('should return "other" for generic business email', () => {
      expect(categorizeMessage('Meeting Request', 'john@example.com')).toBe('other');
    });

    it('should return "other" for personal email', () => {
      expect(categorizeMessage('How are you?', 'friend@example.com')).toBe('other');
    });

    it('should return "other" for empty subject', () => {
      expect(categorizeMessage('', 'someone@example.com')).toBe('other');
    });

    it('should return "other" for empty email', () => {
      expect(categorizeMessage('Random Subject', '')).toBe('other');
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase "INVOICE"', () => {
      expect(categorizeMessage('INVOICE #12345', 'billing@example.com')).toBe('invoice');
    });

    it('should handle mixed case "InVoice"', () => {
      expect(categorizeMessage('InVoice Notification', 'billing@example.com')).toBe('invoice');
    });

    it('should handle uppercase "NOTIFICATION" in email', () => {
      expect(categorizeMessage('Alert', 'NOTIFICATION@EXAMPLE.COM')).toBe('notification');
    });
  });

  describe('priority rules', () => {
    it('should prioritize invoice over promotion when both keywords present', () => {
      const result = categorizeMessage('Invoice for your recent sale', 'shop@example.com');
      expect(result).toBe('invoice');
    });

    it('should prioritize invoice over notification when both keywords present', () => {
      const result = categorizeMessage('Invoice Notification', 'no-reply@example.com');
      expect(result).toBe('invoice');
    });

    it('should prioritize notification over promotion', () => {
      const result = categorizeMessage('Promotion notification', 'notification@example.com');
      expect(result).toBe('notification');
    });
  });
});

describe('pickNextAccountColor', () => {
  const palette = ['#3457C9', '#1F8A5F', '#C9344A', '#9A7B1F', '#7A3FC9', '#0F9AA6'];

  it('should return first color when no colors used', () => {
    const result = pickNextAccountColor([]);
    expect(result).toBe(palette[0]);
  });

  it('should skip colors already in use', () => {
    const result = pickNextAccountColor([palette[0], palette[1]]);
    expect(result).toBe(palette[2]);
  });

  it('should handle undefined colors in the list', () => {
    const result = pickNextAccountColor([undefined, palette[0], undefined, palette[1]]);
    expect(result).toBe(palette[2]);
  });

  it('should cycle back to palette start when all colors used', () => {
    const allColors = [...palette];
    const result = pickNextAccountColor(allColors);
    // Should cycle: palette.length % palette.length = 0, so palette[0]
    expect(result).toBe(palette[0]);
  });

  it('should cycle correctly with more accounts than colors', () => {
    const result = pickNextAccountColor([...palette, ...palette]);
    // Should cycle: (12) % 6 = 0, so palette[0]
    expect(result).toBe(palette[0]);
  });

  it('should handle single account existing', () => {
    const result = pickNextAccountColor([palette[2]]);
    expect(result).toBe(palette[0]);
  });

  it('should skip null values in the array', () => {
    const result = pickNextAccountColor([null as unknown as undefined, palette[0]]);
    expect(result).toBe(palette[1]);
  });

  it('should always return a valid palette color', () => {
    const testCases = [
      [],
      [palette[0]],
      [palette[0], palette[2], palette[4]],
      [...palette],
      [...palette, ...palette, palette[0], palette[3]],
    ];

    testCases.forEach((colors) => {
      const result = pickNextAccountColor(colors);
      expect(palette).toContain(result);
    });
  });
});
