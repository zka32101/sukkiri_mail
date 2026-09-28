import { google } from "googleapis";
import { db } from "../db";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { getSecret } from "../secrets";
import { categorizeMessage, pickNextAccountColor } from "../categorize";

/**
 * gmail.modify（sensitive/Tier2） + gmail.labels（non-sensitive）のみ使用。
 * gmail.readonly（restricted）/ gmail.insert（restricted）は使用しない。
 *
 * 【要確認】OAuthクライアントID/シークレットはGoogle Cloud Console側の
 * OAuth同意画面登録（ユーザー作業）待ち。取得後 Secret Manager に
 * `gmail-oauth-client-id` / `gmail-oauth-client-secret` として登録する。
 */
export class GmailProvider implements MailProviderAdapter {
  /**
   * access_tokenの有効期限をFirestoreに保存していないため、google-auth-libraryは
   * 期限切れを事前検知できず自動リフレッシュが働かない（401で失敗するだけ）。
   * ここで明示的にリフレッシュし、新しいaccess_tokenをFirestoreへ書き戻す。
   * refresh_token自体が失効している場合はoauthStatusを"expired"にし、
   * ユーザーに再連携が必要なことを示す。
   */
  private async getClient(accountId: string) {
    const doc = await db().collection("linkedAccounts").doc(accountId).get();
    const data = doc.data();
    if (!data) throw new Error("account not found");

    const clientId = await getSecret("gmail-oauth-client-id");
    const clientSecret = await getSecret("gmail-oauth-client-secret");
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

    if (data.refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await db().collection("linkedAccounts").doc(accountId).update({
          accessToken: credentials.access_token ?? data.accessToken,
          oauthStatus: "connected",
        });
      } catch (e) {
        console.error(`Gmail token refresh failed for account ${accountId}`, e);
        await db()
          .collection("linkedAccounts")
          .doc(accountId)
          .update({ oauthStatus: "expired" })
          .catch(() => {
            /* ignore */
          });
        throw new Error("oauth token expired; user must re-authenticate");
      }
    }

    return google.gmail({ version: "v1", auth: oauth2Client });
  }

  async connect(userId: string, params: Record<string, unknown>): Promise<ConnectedAccountResult> {
    // 実際のOAuthコード交換はクライアント側のgoogle_sign_inで得たauthCodeを
    // ここでトークンに交換し、accessToken/refreshTokenをFirestore（非公開フィールド）に保存する。
    const authCode = params.authCode as string | undefined;
    if (!authCode) throw new Error("authCode is required");

    const clientId = await getSecret("gmail-oauth-client-id");
    const clientSecret = await getSecret("gmail-oauth-client-secret");
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress ?? "";

    const existing = await db()
      .collection("linkedAccounts")
      .where("userId", "==", userId)
      .get();
    const colorHex = pickNextAccountColor(existing.docs.map((d) => d.data().colorHex));

    // 再認可時、Googleはrefresh_tokenを再発行しないことがある（既に同意済みのため）。
    // その場合はnullを保存し、accessToken失効時に再連携を促す。
    const ref = await db().collection("linkedAccounts").add({
      userId,
      provider: "gmail",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
      lastScanAt: null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
    });

    return {
      id: ref.id,
      userId,
      provider: "gmail",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
    };
  }

  /**
   * 連携直後（および将来の定期再スキャン）に、過去30日分の受信メールを
   * まとめて取得する。カテゴリでの絞り込みはしない（メール一覧は全件表示のため）。
   */
  async scan(accountId: string): Promise<ScanResultItem[]> {
    const gmail = await this.getClient(accountId);
    // 検索ボックス既定と同様にSpam/Trashは対象外（-in:spam -in:trash）。
    // 迷惑メールとしてサーバー側に振り分け済みのものは取り込まない。
    const list = await gmail.users.messages.list({
      userId: "me",
      q: "newer_than:30d -in:spam -in:trash",
      maxResults: 200,
    });
    const messages = list.data.messages ?? [];

    const items: ScanResultItem[] = [];
    for (const m of messages) {
      if (!m.id) continue;
      const full = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      });
      const headers = full.data.payload?.headers ?? [];
      // ヘッダー名の大文字小文字が送信元によって揺れることがあるため大小無視で照合する。
      const findHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const subject = findHeader("Subject");
      const from = findHeader("From");
      const senderEmail = (from.match(/<(.+)>/)?.[1] ?? from).trim();
      // Gmailのsnippetは元々短く要約済みのため、そのまま保持する
      // （全文はメール詳細画面からfetchMessageBodyでオンデマンド取得する）。
      const snippet = full.data.snippet ?? "";

      items.push({
        id: m.id,
        accountId,
        category: categorizeMessage(subject, senderEmail),
        receivedAt: Number(full.data.internalDate ?? Date.now()),
        hasAttachment: false,
        snippet,
        subject,
        senderEmail,
      });
    }
    return items;
  }

  async archive(accountId: string, emailIds: string[]): Promise<void> {
    const gmail = await this.getClient(accountId);
    for (const id of emailIds) {
      // アーカイブ = INBOXラベルを外すのみ（gmail.modify範囲内、恒久削除ではない）。
      await gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: { removeLabelIds: ["INBOX"] },
      });
    }
  }

  async restore(accountId: string, emailIds: string[]): Promise<void> {
    const gmail = await this.getClient(accountId);
    for (const id of emailIds) {
      await gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: { addLabelIds: ["INBOX"] },
      });
    }
  }

  async fetchMessageBody(accountId: string, messageId: string): Promise<MessageBodyResult> {
    const gmail = await this.getClient(accountId);
    const full = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    const part = full.data.payload;
    const htmlPart = part?.parts?.find((p) => p.mimeType === "text/html") ?? part;
    const data = htmlPart?.body?.data ?? "";
    const html = Buffer.from(data, "base64").toString("utf-8");
    const attachmentNames =
      part?.parts?.filter((p) => p.filename).map((p) => p.filename as string) ?? [];
    return { html, attachmentNames };
  }
}
