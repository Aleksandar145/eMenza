import type { ReferentActionType } from "@/lib/referent-cards-mock";
import { getDb } from "@/server/db";
import { cardActionLogs } from "@/server/db/schema";

export type CardActionLogType = ReferentActionType;

type DbExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export async function appendCardActionLogDb(
  input: {
    cardId: string;
    action: CardActionLogType;
    detail: string;
    referentName: string;
    amountRsd?: number;
    reversalOfId?: string;
    reversed?: boolean;
  },
  executor: DbExecutor = getDb(),
) {
  await executor.insert(cardActionLogs).values({
    cardId: input.cardId,
    action: input.action,
    detail: input.detail,
    referentName: input.referentName,
    amountRsd: input.amountRsd === undefined ? null : String(input.amountRsd),
    reversalOfId: input.reversalOfId,
    reversed: input.reversed ?? false,
  });
}
