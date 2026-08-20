import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { db } from "./firestore";

const client = new SecretManagerServiceClient();

interface CachedSecret {
  value: string;
  fetchedAt: number;
}
const cache = new Map<string, CachedSecret>();

// シークレットローテーション（漏洩時の値変更等）を、温まったCloud Functionsインスタンスが
// キャッシュを永久に保持し続けることで無効化してしまわないよう、TTL付きキャッシュにする。
// 呼び出し頻度に対してSecret Managerへの負荷・レイテンシを抑えつつ、
// ローテーション後は最大でもこの時間内に新しい値へ切り替わることを保証する。
const CACHE_TTL_MS = 15 * 60 * 1000; // 15分

/**
 * Secret Manager からOAuthクライアントシークレット等を取得する。
 * OAuthトークン・IMAPアプリパスワードはクライアントに平文で渡さない原則をここで担保する。
 */
export async function getSecret(name: string): Promise<string> {
  const cached = cache.get(name);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

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

    cache.set(name, { value, fetchedAt: Date.now() });

    // 監査ログ（秘密の値は記録しない）
    db().collection("_audit").add({
      timestamp: new Date(),
      action: "secret_access",
      secretName: name,
      status: "success",
    }).catch(err => console.error("Audit log failed:", err));

    return value;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // エラーログ
    db().collection("_audit").add({
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
