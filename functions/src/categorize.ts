import { GoogleAuth } from "google-auth-library";

export type MailCategory = "promotion" | "notification" | "invoice" | "other";

const kAccountColorPalette = [
  "#3457C9",
  "#1F8A5F",
  "#C9344A",
  "#9A7B1F",
  "#7A3FC9",
  "#0F9AA6",
];

/**
 * 規則ベースのカテゴリ自動判定。件名・送信者ドメインのキーワードで分類する。
 */
export function categorizeMessageByRules(
  subject: string,
  senderEmail: string
): MailCategory {
  const s = subject.toLowerCase();
  const from = senderEmail.toLowerCase();

  if (/請求|invoice|receipt|領収書|お支払い/.test(s)) return "invoice";
  if (/no-?reply|notification|通知|お知らせ/.test(from) || /通知|お知らせ/.test(s)) {
    return "notification";
  }
  if (/セール|割引|off|sale|campaign|キャンペーン|メルマガ|newsletter/.test(s)) {
    return "promotion";
  }
  return "other";
}

/**
 * Vertex AI Text Classification を使用した機械学習分類。
 * 環境変数で制御：
 * - ENABLE_ML_CLASSIFICATION=true (デフォルト: false)
 * - VERTEX_AI_PROJECT_ID
 * - VERTEX_AI_LOCATION (デフォルト: us-central1)
 * - VERTEX_AI_MODEL_ID
 */
export async function categorizeMessage(
  subject: string,
  senderEmail: string
): Promise<MailCategory> {
  // 環境変数でML分類有効化をチェック
  const enableML = process.env.ENABLE_ML_CLASSIFICATION === "true";
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || "us-central1";
  const modelId = process.env.VERTEX_AI_MODEL_ID;

  // ML無効 or 必須環境変数が不足している場合は規則ベース分類を使用
  if (!enableML || !projectId || !modelId) {
    return categorizeMessageByRules(subject, senderEmail);
  }

  try {
    // Vertex AI REST API で分類 (Google Cloud Functions環境で実行)
    // メール件名を入力テキストとして使用
    const textContent = subject || `From: ${senderEmail}`;

    // Cloud Functions環境のADC (Application Default Credentials) を使用
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getIdTokenClient(
      `https://${location}-aiplatform.googleapis.com`
    );

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/endpoints/${modelId}:predict`;

    const response = await client.request({
      url: endpoint,
      method: "POST",
      data: {
        instances: [
          {
            content: textContent,
          },
        ],
      },
    });

    const result = response.data as { predictions?: Array<{ displayNames?: string[]; confidences?: number[] }> };

    if (result.predictions && result.predictions.length > 0) {
      const prediction = result.predictions[0];

      // 最も確信度が高い予測を取得
      if (prediction.displayNames && prediction.displayNames.length > 0) {
        const category = prediction.displayNames[0].toLowerCase();

        // Vertex AI の出力を標準カテゴリにマッピング
        if (
          category === "promotion" ||
          category === "notification" ||
          category === "invoice"
        ) {
          console.info(`[Categorize] ML classified as '${category}': ${subject.slice(0, 50)}`);
          return category as MailCategory;
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Categorize] ML classification failed, falling back to rules: ${errorMessage}`
    );
  }

  // ML失敗時は規則ベース分類にフォールバック
  return categorizeMessageByRules(subject, senderEmail);
}

/** アカウント登録時にパレットから重複回避で自動割当する。 */
export function pickNextAccountColor(existingColors: (string | undefined)[]): string {
  const used = new Set(existingColors.filter(Boolean));
  for (const c of kAccountColorPalette) {
    if (!used.has(c)) return c;
  }
  return kAccountColorPalette[existingColors.length % kAccountColorPalette.length];
}
