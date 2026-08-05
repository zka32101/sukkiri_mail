import * as admin from "firebase-admin";
import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { getSecret } from "../secrets";
import { categorizeMessage, pickNextAccountColor } from "../categorize";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Microsoft Graph API Mail.ReadWrite（delegated、個人アカウント同意のみで完結）。
 * 第三者セキュリティ監査（CASA相当）は不要。
 *
 * 【要確認】Azure App registration（クライアントID/シークレット）はユーザー作業待ち。
 * 取得後 Secret Manager に `outlook-oauth-client-id` / `outlook-oauth-client-secret`。
 */
export class OutlookProvider implements MailProviderAdapter {
  private async getAccessToken(accountId: string): Promise<string> {
    const doc = await admin.firestore().collection("linkedAccounts").doc(accountId).get();
    const data = doc.data();
    if (!data) throw new Error("account not found");
    // 実運用ではrefreshTokenからaccessTokenを都度更新する（@azure/msal-node の
    // ConfidentialClientApplication#acquireTokenByRefreshToken を使用）。
    return data.accessToken as string;
  }

  private async graphFetch(accountId: string, path: string, init?: RequestInit) {
    const token = await this.getAccessToken(accountId);
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async connect(userId: string, params: Record<string, unknown>): Promise<ConnectedAccountResult> {
    const authCode = params.authCode as string | undefined;
    if (!authCode) throw new Error("authCode is required");

    const clientId = await getSecret("outlook-oauth-client-id");
    const clientSecret = await getSecret("outlook-oauth-client-secret");
    const redirectUri = (params.redirectUri as string) ?? "";

    const tokenRes = await fetch(
      "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authCode,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "Mail.ReadWrite offline_access",
        }),
      }
    );
    const tokens = await tokenRes.json();

    const meRes = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = await meRes.json();
    const emailAddress = me.mail ?? me.userPrincipalName ?? "";

    const existing = await admin
      .firestore()
      .collection("linkedAccounts")
      .where("userId", "==", userId)
      .get();
    const colorHex = pickNextAccountColor(existing.docs.map((d) => d.data().colorHex));

    const ref = await admin.firestore().collection("linkedAccounts").add({
      userId,
      provider: "outlook",
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
      provider: "outlook",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
    };
  }

  async scan(accountId: string): Promise<ScanResultItem[]> {
    const data = await this.graphFetch(
      accountId,
      "/me/mailFolders/inbox/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments"
    );
    const items: ScanResultItem[] = (data.value ?? []).map((m: any) => {
      const senderEmail = m.from?.emailAddress?.address ?? "";
      return {
        id: m.id,
        accountId,
        category: categorizeMessage(m.subject ?? "", senderEmail),
        receivedAt: new Date(m.receivedDateTime).getTime(),
        hasAttachment: !!m.hasAttachments,
        snippet: (m.bodyPreview ?? "").slice(0, 80),
        subject: m.subject ?? "",
        senderEmail,
      };
    });
    return items;
  }

  async archive(accountId: string, emailIds: string[]): Promise<void> {
    for (const id of emailIds) {
      // Graph APIの/archiveアクションでArchivedフォルダへ移動（可逆、恒久削除ではない）。
      await this.graphFetch(accountId, `/me/messages/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ destinationId: "archive" }),
      });
    }
  }

  async restore(accountId: string, emailIds: string[]): Promise<void> {
    for (const id of emailIds) {
      await this.graphFetch(accountId, `/me/messages/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ destinationId: "inbox" }),
      });
    }
  }

  async fetchMessageBody(accountId: string, messageId: string): Promise<MessageBodyResult> {
    const data = await this.graphFetch(
      accountId,
      `/me/messages/${messageId}?$select=body,attachments`
    );
    return {
      html: data.body?.content ?? "",
      attachmentNames: (data.attachments ?? []).map((a: any) => a.name),
    };
  }
}
