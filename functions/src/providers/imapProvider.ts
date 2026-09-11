import { ImapFlow } from "imapflow";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { categorizeMessage } from "../categorize";
import { db } from "../firestore";
import { upsertLinkedAccount } from "../linkedAccountUpsert";
import { LinkedAccountDoc } from "../types";

/**
 * 標準IMAP/SMTP（Yahoo!メール・iCloud等）、アプリ専用パスワード方式。OAuth審査対象外。
 * アプリパスワードはFirestore側の非公開フィールドに保存（クライアントには渡さない）。
 * 【要確認】プロバイダごとの既定IMAPホスト一覧はUI側の入力補助として別途整備する。
 */
export class ImapProvider implements MailProviderAdapter {
  private async openClient(accountId: string): Promise<ImapFlow> {
    const doc = await db().collection("linkedAccounts").doc(accountId).get();
    const data = doc.data() as LinkedAccountDoc | undefined;
    if (!data) throw new Error("account not found");
    if (!data.imapHost || !data.emailAddress || !data.appPassword) {
      throw new Error("IMAP configuration incomplete");
    }
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

    // トランザクション内で「既存なら再利用・新規なら無料プラン上限チェック→
    // カラー割当→書き込み」をアトミックに行う（詳細はlinkedAccountUpsert.ts参照）。
    const { ref, colorHex } = await upsertLinkedAccount(
      userId,
      "imap",
      emailAddress,
      (isNew) => ({
        userId,
        provider: "imap",
        authMethod: "app_password",
        emailAddress,
        imapHost,
        appPassword,
        ...(isNew ? { lastScanAt: null } : {}),
      })
    );

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

  async scan(accountId: string, lastScanAt?: number | null): Promise<ScanResultItem[]> {
    const client = await this.openClient(accountId);
    const items: ScanResultItem[] = [];
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        // Build search criteria for incremental scanning
        // SINCE parameter filters by date, allowing incremental sync
        const searchCriteria: Record<string, unknown> = {};
        if (lastScanAt) {
          searchCriteria.since = new Date(lastScanAt);
        }

        // Use search to get UIDs matching criteria (or all if full scan)
        const uids = await client.search(searchCriteria);

        if (uids && uids.length > 0) {
          // Fetch metadata for all matching messages
          // ImapFlow expects UID array directly, not wrapped in object
          const messages = client.fetch(uids, { envelope: true, uid: true, flags: true });
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
        // emailIds は scan() が返したUID（メッセージの永続的な識別子）であり、
        // メールボックス内の一時的な並び順にすぎないシーケンス番号ではない。
        // { uid: true } を指定しないとimapflowはこれをシーケンス番号として扱ってしまい、
        // ユーザーが選んだメールとは全く別のメールを誤って移動してしまう。
        await client.messageMove(emailIds.map(Number), "Archive", { uid: true });
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
        // archive()と同様、emailIdsはUIDなので{ uid: true }を明示する。
        await client.messageMove(emailIds.map(Number), "INBOX", { uid: true });
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
        // messageIdはscan()が返したUIDなので{ uid: true }を明示する
        // （省略するとシーケンス番号として解釈され、別のメールの本文を返してしまう）。
        const msg = await client.download(messageId, undefined, { uid: true });
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
