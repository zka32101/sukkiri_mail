import { getApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * 【要確認】このFirebaseプロジェクトのFirestoreは既定(default)データベースではなく、
 * 「sukkirimail」という名前で作成された。admin.firestore()（名前空間形式のAPI）は
 * 常にdefaultデータベースへ接続してしまうため、名前付きデータベースを明示的に
 * 指定できるモジュール形式のgetFirestore()を使う。databaseIdを変更する場合は
 * ここだけを直せばよい。
 */
const FIRESTORE_DATABASE_ID = "sukkirimail";

let firestoreInstance: Firestore | undefined;

export function db(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getApp(), FIRESTORE_DATABASE_ID);
  }
  return firestoreInstance;
}
