import * as tasks from "@google-cloud/tasks";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Cloud Tasks キューへのメールスキャンタスクエンキュー管理。
 * scanAccount は即座に応答し、バックグラウンドで処理を実行。
 */

const tasksClient = new tasks.CloudTasksClient();

/**
 * スキャンタスクをCloud Tasks キューにエンキュー。
 * @param projectId GCP プロジェクトID
 * @param queueName キュー名（デフォルト: "email-scanning"）
 * @param location キューのロケーション（デフォルト: "asia-northeast1"）
 * @param accountId リンク済みアカウントID
 * @param userId ユーザーID
 * @param provider プロバイダ（gmail/outlook/imap）
 */
export async function enqueueScanTask(
  projectId: string,
  queueName: string,
  location: string,
  accountId: string,
  userId: string,
  provider: string
): Promise<string> {
  const parent = tasksClient.queuePath(projectId, location, queueName);

  const task = {
    httpRequest: {
      httpMethod: tasks.protos.google.cloud.tasks.v2.HttpMethod.POST,
      url: `https://${location}-${projectId}.cloudfunctions.net/processScanTask`,
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(
        JSON.stringify({
          accountId,
          userId,
          provider,
        })
      ).toString("base64"),
      // Cloud Functionsのサービスアカウント認証を使用
      oidcToken: {
        serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`,
      },
    },
  };

  try {
    const [response] = await tasksClient.createTask({ parent, task });
    const taskName = response.name || "";
    if (!taskName) {
      throw new Error("Cloud Tasks did not return a task name");
    }
    console.info(`[CloudTasks] Enqueued scan task for account ${accountId}: ${taskName}`);
    return taskName;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[CloudTasks] Failed to enqueue scan task for account ${accountId}:`,
      errorMessage
    );
    throw new HttpsError("internal", "Failed to start background scan");
  }
}

/**
 * キューの存在確認・作成（初回セットアップ時に使用）。
 */
export async function ensureQueueExists(
  projectId: string,
  queueName: string,
  location: string
): Promise<void> {
  const parent = tasksClient.locationPath(projectId, location);

  try {
    // キューが存在するか確認
    const [queues] = await tasksClient.listQueues({ parent });
    const exists = queues.some((q) => q.name?.includes(queueName));

    if (!exists) {
      console.info(`[CloudTasks] Creating queue: ${queueName} in ${location}`);
      const [queue] = await tasksClient.createQueue({
        parent,
        queue: {
          name: tasksClient.queuePath(projectId, location, queueName),
        },
      });
      console.info(`[CloudTasks] Queue created: ${queue.name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[CloudTasks] Queue check/creation warning: ${errorMessage}`);
    // キュー作成失敗は致命的ではない（既に存在する場合もある）
  }
}
