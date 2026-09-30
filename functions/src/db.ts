import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

/**
 * このプロジェクト(app1-6c108)は複数アプリ共存のため、Firestoreは名前付き
 * データベース "sukkirimail" を使う（Flutter側もfirestoreProviderで同じ名前を
 * 指定している）。admin.firestore()は引数なしだと(default)DBを見てしまい、
 * アプリからは何も見えなくなる(linkedAccounts/emailMetaが実質書き込めない)ため、
 * このアプリのFirestoreアクセスは必ずこのヘルパー経由にする。
 */
export function db() {
  return getFirestore(admin.app(), "sukkirimail");
}
