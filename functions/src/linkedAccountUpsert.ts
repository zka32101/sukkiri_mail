import { db } from "./firestore";
import { linkedAccountDocId } from "./linkedAccountId";
import { pickNextAccountColor } from "./categorize";
import { assertCanAddAccount } from "./planLimits";

export interface LinkedAccountUpsertResult {
  ref: FirebaseFirestore.DocumentReference;
  colorHex: string;
  isNew: boolean;
}

/**
 * userId+provider+emailAddressから決まる決定的なドキュメントIDを使い、
 * 「既存なら読み取って再利用、新規なら無料プランの上限チェック→カラー割当」を
 * Firestoreトランザクション内でアトミックに行う。
 *
 * 【重要】同一ドキュメント（同じuserId+provider+emailAddress）への同時書き込みは
 * 決定的なドキュメントIDにより自然に排他される。しかし「無料プランのアカウント数
 * 上限」のチェックは`linkedAccounts`コレクション全体に対するクエリであり、
 * 例えばOutlookとIMAPを同時に新規接続するなど、"異なる"ドキュメントへの
 * 同時書き込みリクエストが絡む場合は、単純な「クエリ→判定→書き込み」だと
 * 両方のリクエストが「まだ上限に達していない」と判定してしまい、上限を
 * 超過し得る（TOCTOUレース）。この関数はクエリの読み取りと最終的な書き込みを
 * 同一トランザクションに含めることで、Firestoreがコミット時にクエリ結果の
 * 変化を検知し、競合した側のトランザクションを自動的にリトライさせる
 * （Firestoreのトランザクションはクエリ単位の競合検知に対応している）。
 * これによりこのレースを解消する。
 *
 * `buildUpdateData`は副作用を持たない純粋な関数にすること
 * （Firestoreはコンテンション発生時にトランザクション全体を再実行するため）。
 * OAuthトークン交換など外部APIへのネットワーク呼び出しは、この関数を呼ぶ前に
 * 済ませておくこと。
 */
export async function upsertLinkedAccount(
  userId: string,
  provider: string,
  emailAddress: string,
  buildUpdateData: (isNew: boolean) => Record<string, unknown>
): Promise<LinkedAccountUpsertResult> {
  const docId = linkedAccountDocId(userId, provider, emailAddress);
  const ref = db().collection("linkedAccounts").doc(docId);

  return db().runTransaction(async (tx) => {
    const existingSnap = await tx.get(ref);
    const isNew = !existingSnap.exists;

    let colorHex: string;
    if (!isNew) {
      colorHex =
        (existingSnap.data()?.colorHex as string | undefined) ??
        pickNextAccountColor([]);
    } else {
      const existingForUserSnap = await tx.get(
        db().collection("linkedAccounts").where("userId", "==", userId)
      );
      await assertCanAddAccount(userId, existingForUserSnap.docs.length);
      colorHex = pickNextAccountColor(
        existingForUserSnap.docs.map((d) => d.data().colorHex)
      );
    }

    const updateData = buildUpdateData(isNew);
    tx.set(ref, { ...updateData, colorHex }, { merge: true });

    return { ref, colorHex, isNew };
  });
}
