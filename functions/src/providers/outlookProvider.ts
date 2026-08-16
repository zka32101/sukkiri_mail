import {
  ConnectedAccountResult,
  MailProviderAdapter,
  MessageBodyResult,
  ScanResultItem,
} from "./mailProviderInterface";
import { getSecret } from "../secrets";
import { categorizeMessage, pickNextAccountColor } from "../categorize";
import { db } from "../firestore";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Microsoft Graph API Mail.ReadWrite（delegated、個人アカウント同意のみで完結）。
 * 第三者セキュリティ監査（CASA相当）は不要。
 *
 * 【要確認】Azure App registration（クライアントID/シークレット）はユーザー作業待ち。
 * 取得後 Secret Manager に `outlook-oauth-client-id` / `outlook-oauth-client-secret`。
 * リダイレクトURIは `https://login.microsoftonline.com/common/oauth2/nativeclient`
 * （Microsoft提供のネイティブアプリ向け固定URI）をAzure Portal側で登録すること。
 * クライアント（Flutter）側は同じclient_id（非秘密）をFirebase Remote Configの
 * `outlook_oauth_client_id` としても登録する必要がある（lib/views/account_link_view.dart参照）。
 */
export class OutlookProvider implements MailProviderAdapter {
  /**
   * アクセストークンを取得。有効期限切れの場合は refresh token を使用して更新する。
   */
  private async getAccessToken(accountId: string): Promise<string> {
    const doc = await db()
      .collection("linkedAccounts")
      .doc(accountId)
      .get();
    const data = doc.data();
    if (!data) throw new Error("account not found");

    const accessToken = data.accessToken as string | undefined;
    const refreshToken = data.refreshToken as string | undefined;
    const expiresAt = data.tokenExpiresAt as number | undefined;

    // トークン有効期限をチェック（有効期限の 5 分前に更新）
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5分

    if (expiresAt && now < expiresAt - bufferTime && accessToken) {
      // トークンがまだ有効
      return accessToken;
    }

    if (!refreshToken) {
      throw new Error(
        "refresh token not found; user must re-authenticate"
      );
    }

    // Refresh token を使用して新しいアクセストークンを取得
    const clientId = await getSecret("outlook-oauth-client-id");
    const clientSecret = await getSecret("outlook-oauth-client-secret");

    try {
      const tokenRes = await fetch(
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            scope: "Mail.ReadWrite offline_access",
          }),
        }
      );

      if (!tokenRes.ok) {
        throw new Error(`Token refresh failed: ${tokenRes.status}`);
      }

      const tokens = await tokenRes.json();
      const newAccessToken = tokens.access_token as string | undefined;
      const newRefreshToken = tokens.refresh_token as string | undefined;
      const expiresIn = tokens.expires_in as number | undefined; // seconds

      if (!newAccessToken) {
        throw new Error("access token not returned from refresh");
      }

      // 新しいトークンを Firestore に保存
      const updates: Record<string, unknown> = {
        accessToken: newAccessToken,
        tokenExpiresAt: now + ((expiresIn ?? 3600) * 1000),
      };

      if (newRefreshToken) {
        updates.refreshToken = newRefreshToken;
      }

      await db()
        .collection("linkedAccounts")
        .doc(accountId)
        .update(updates);

      console.log(`[Outlook] Token refreshed for account ${accountId}`);
      return newAccessToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[Outlook] Token refresh failed for account ${accountId}:`,
        errorMessage
      );

      // リフレッシュ失敗時は oauthStatus を "expired" に設定
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

    const existing = await db()
      .collection("linkedAccounts")
      .where("userId", "==", userId)
      .get();
    const colorHex = pickNextAccountColor(existing.docs.map((d) => d.data().colorHex));

    // token の有効期限を計算（expires_in は秒数）
    const expiresIn = (tokens.expires_in as number) ?? 3600; // default: 1 hour
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

    const ref = await db().collection("linkedAccounts").add({
      userId,
      provider: "outlook",
      authMethod: "oauth",
      emailAddress,
      oauthStatus: "connected",
      colorHex,
      lastScanAt: null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
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
      "/me/mailFolders/inbox/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,isRead"
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
        isUnread: !m.isRead,
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
