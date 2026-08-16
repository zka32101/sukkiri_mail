import { google } from "googleapis";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { getSecret } from "../secrets";
import { categorizeMessage, pickNextAccountColor } from "../categorize";
import { db } from "../firestore";

/**
 * gmail.modify（sensitive/Tier2） + gmail.labels（non-sensitive）のみ使用。
 * gmail.readonly（restricted）/ gmail.insert（restricted）は使用しない。
 *
 * 【要確認】OAuthクライアントID/シークレットはGoogle Cloud Console側の
 * OAuth同意画面登録（ユーザー作業）待ち。取得後 Secret Manager に
 * `gmail-oauth-client-id` / `gmail-oauth-client-secret` として登録する。
 * クライアント（Flutter）側は同じOAuthクライアントの「Web」タイプclient_id（非秘密）を
 * Firebase Remote Configの `gmail_oauth_server_client_id` としても登録する必要がある
 * （GoogleSignInのserverAuthCode取得に必須。lib/views/account_link_view.dart参照）。
 */
export class GmailProvider implements MailProviderAdapter {
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

    const ref = await db().collection("linkedAccounts").add({
      userId,
      provider: "gmail",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
      lastScanAt: null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
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

  async scan(accountId: string): Promise<ScanResultItem[]> {
    const gmail = await this.getClient(accountId);
    const list = await gmail.users.messages.list({
      userId: "me",
      q: "category:promotions OR category:updates",
      maxResults: 50,
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
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const senderEmail = (from.match(/<(.+)>/)?.[1] ?? from).trim();
      const snippet = (full.data.snippet ?? "").slice(0, 80);
      // labelIdsはformatに関わらず常に返る。UNREADラベルの有無で未読判定する。
      const isUnread = (full.data.labelIds ?? []).includes("UNREAD");

      items.push({
        id: m.id,
        accountId,
        category: categorizeMessage(subject, senderEmail),
        receivedAt: Number(full.data.internalDate ?? Date.now()),
        hasAttachment: false,
        snippet,
        subject,
        senderEmail,
        isUnread,
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
