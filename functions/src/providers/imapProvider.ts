import { ImapFlow } from "imapflow";
import * as admin from "firebase-admin";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { categorizeMessage, pickNextAccountColor } from "../categorize";

/**
 * 標準IMAP/SMTP（Yahoo!メール・iCloud等）、アプリ専用パスワード方式。OAuth審査対象外。
 * アプリパスワードはFirestore側の非公開フィールドに保存（クライアントには渡さない）。
 * 【要確認】プロバイダごとの既定IMAPホスト一覧はUI側の入力補助として別途整備する。
 */
export class ImapProvider implements MailProviderAdapter {
  private async openClient(accountId: string): Promise<ImapFlow> {
    const doc = await admin.firestore().collection("linkedAccounts").doc(accountId).get();
    const data = doc.data();
    if (!data) throw new Error("account not found");
    const client = new ImapFlow({
      host: data.imapHost,
      port: 993,
      secure: true,
      auth: { user: data.emailAddress, pass: data.appPassword },
      logger: false,
    });
    await client.connect();
    return client;
  }

  async connect(userId: string, params: Record<string, unknown>): Promise<ConnectedAccountResult> {
    const emailAddress = params.emailAddress as string;
    const appPassword = params.appPassword as string;
    const imapHost = params.imapHost as string;
    if (!emailAddress || !appPassword || !imapHost) {
      throw new Error("emailAddress, appPassword, imapHost are required");
    }

    // 接続検証（失敗すればここでエラーを投げてUIに返す）。
    const testClient = new ImapFlow({
      host: imapHost,
      port: 993,
      secure: true,
      auth: { user: emailAddress, pass: appPassword },
      logger: false,
    });
    await testClient.connect();
    await testClient.logout();

    const existing = await admin
      .firestore()
      .collection("linkedAccounts")
      .where("userId", "==", userId)
      .get();
    const colorHex = pickNextAccountColor(existing.docs.map((d) => d.data().colorHex));

    const ref = await admin.firestore().collection("linkedAccounts").add({
      userId,
      provider: "imap",
      authMethod: "app_password",
      emailAddress,
      imapHost,
      colorHex,
      lastScanAt: null,
      appPassword,
    });

    return {
      id: ref.id,
      userId,
      provider: "imap",
      authMethod: "app_password",
      emailAddress,
      imapHost,
      colorHex,
    };
  }

  async scan(accountId: string): Promise<ScanResultItem[]> {
    const client = await this.openClient(accountId);
    const items: ScanResultItem[] = [];
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const messages = client.fetch(
          { seq: "1:50" },
          { envelope: true, uid: true, flags: true }
        );
        for await (const m of messages) {
          const from = m.envelope?.from?.[0];
          const senderEmail = from?.address ?? "";
          const subject = m.envelope?.subject ?? "";
          // IMAPの\Seenフラグが立っていなければ未読。
          const isUnread = !m.flags?.has("\\Seen");
          items.push({
            id: String(m.uid),
            accountId,
            category: categorizeMessage(subject, senderEmail),
            receivedAt: m.envelope?.date ? new Date(m.envelope.date).getTime() : Date.now(),
            hasAttachment: false,
            snippet: subject.slice(0, 80),
            subject,
            senderEmail,
            isUnread,
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    return items;
  }

  async archive(accountId: string, emailIds: string[]): Promise<void> {
    const client = await this.openClient(accountId);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        // アーカイブフォルダへ移動（可逆、恒久削除ではない）。
        await client.messageMove(emailIds.map(Number), "Archive");
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async restore(accountId: string, emailIds: string[]): Promise<void> {
    const client = await this.openClient(accountId);
    try {
      const lock = await client.getMailboxLock("Archive");
      try {
        await client.messageMove(emailIds.map(Number), "INBOX");
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async fetchMessageBody(accountId: string, messageId: string): Promise<MessageBodyResult> {
    const client = await this.openClient(accountId);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const msg = await client.download(messageId);
        const chunks: Buffer[] = [];
        for await (const chunk of msg.content) {
          chunks.push(chunk as Buffer);
        }
        return { html: Buffer.concat(chunks).toString("utf-8"), attachmentNames: [] };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }
}
