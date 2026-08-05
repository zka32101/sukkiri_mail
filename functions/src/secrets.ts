import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();
const cache = new Map<string, string>();

/**
 * Secret Manager からOAuthクライアントシークレット等を取得する。
 * OAuthトークン・IMAPアプリパスワードはクライアントに平文で渡さない原則をここで担保する。
 */
export async function getSecret(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name) as string;
  const projectId = process.env.GCLOUD_PROJECT;
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`,
  });
  const value = version.payload?.data?.toString() ?? "";
  cache.set(name, value);
  return value;
}
