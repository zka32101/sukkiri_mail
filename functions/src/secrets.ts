import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import * as admin from "firebase-admin";

const client = new SecretManagerServiceClient();
const cache = new Map<string, string>();

/**
 * Secret Manager からOAuthクライアントシークレット等を取得する。
 * OAuthトークン・IMAPアプリパスワードはクライアントに平文で渡さない原則をここで担保する。
 */
export async function getSecret(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name) as string;

  try {
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      throw new Error("GCLOUD_PROJECT environment variable not set");
    }

    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${name}/versions/latest`,
    });

    const value = version.payload?.data?.toString() ?? "";
    if (!value) {
      throw new Error(`Secret "${name}" returned empty value`);
    }

    cache.set(name, value);

    // 監査ログ（秘密の値は記録しない）
    admin.firestore().collection("_audit").add({
      timestamp: new Date(),
      action: "secret_access",
      secretName: name,
      status: "success",
    }).catch(err => console.error("Audit log failed:", err));

    return value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // エラーログ
    admin.firestore().collection("_audit").add({
      timestamp: new Date(),
      action: "secret_access",
      secretName: name,
      status: "failed",
      error: errorMessage,
    }).catch(err => console.error("Audit log failed:", err));

    console.error(`Failed to retrieve secret "${name}":`, errorMessage);
    throw new Error(`Secret retrieval failed for "${name}"`);
  }
}
