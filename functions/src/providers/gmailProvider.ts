import { google, gmail_v1 } from "googleapis";
import { db } from "../db";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { getSecret } from "../secrets";
import { categorizeMessage, pickNextAccountColor } from "../categorize";

type GmailMessagePart = gmail_v1.Schema$MessagePart;

function findPartByMimeType(
  part: GmailMessagePart | undefined,
  mimeType: string
): GmailMessagePart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPartByMimeType(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function collectAttachmentNames(part: GmailMessagePart | undefined): string[] {
  if (!part) return [];
  const names: string[] = [];
  if (part.filename) names.push(part.filename);
  for (const child of part.parts ?? []) {
    names.push(...collectAttachmentNames(child));
  }
  return names;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
    if (!data.refreshToken) {
      // refresh_tokenが無いと期限切れのaccess_tokenをそのまま使うことになり、
      // 401が出続けてもoauthStatusがexpiredへ更新されずユーザーに気づかれない
      // （実際に発生した事故）。refresh_token欠如はここで即座にexpired扱いにする。
      await db()
        .collection("linkedAccounts")
        .doc(accountId)
        .update({ oauthStatus: "expired" })
        .catch(() => {
          /* ignore */
        });
      throw new Error("oauth refresh token missing; user must re-authenticate");
    }

    oauth2Client.setCredentials({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });

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
    // 同一メールアドレス・同一プロバイダの既存連携があれば新規作成せず更新する
    // （以前は常に新規addしていたため、再連携のたびに重複ドキュメントが増え、
    // 古い重複がrefreshToken:nullのまま残って401が直らない不具合があった）。
    const existingDoc = existing.docs.find(
      (d) => d.data().provider === "gmail" && d.data().emailAddress === emailAddress,
    );
    const colorHex =
      existingDoc?.data().colorHex ??
      pickNextAccountColor(existing.docs.map((d) => d.data().colorHex));

    // 再認可時、Googleはrefresh_tokenを再発行しないことがある（既に同意済みのため）。
    // その場合は既存のrefreshTokenを維持する（nullで上書きしない）。
    const refreshToken = tokens.refresh_token ?? existingDoc?.data().refreshToken ?? null;
    const payload = {
      userId,
      provider: "gmail",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
      lastScanAt: existingDoc?.data().lastScanAt ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken,
    };

    const ref = existingDoc
      ? existingDoc.ref
      : await db().collection("linkedAccounts").add(payload);
    if (existingDoc) {
      await existingDoc.ref.set(payload, { merge: true });
    }

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
    const htmlPart = findPartByMimeType(part, "text/html");
    const plainPart = findPartByMimeType(part, "text/plain");
    const chosen = htmlPart ?? plainPart;
    const decoded = Buffer.from(chosen?.body?.data ?? "", "base64").toString("utf-8");
    const html = htmlPart
      ? decoded
      : decoded
          .split("\n")
          .map((line) => escapeHtml(line))
          .join("<br>");
    const attachmentNames = collectAttachmentNames(part);
    return { html, attachmentNames };
  }
}
