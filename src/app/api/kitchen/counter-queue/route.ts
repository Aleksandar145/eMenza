import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk, requireKitchenStaff } from "@/server/auth/session";
import {
  clearCounterQueueManualOverride,
  getCounterQueueSnapshot,
  recordCounterQueueLookup,
  setCounterQueueManualLevel,
} from "@/server/repositories/counter-queue";

function toApiSnapshot(now = Date.now()) {
  const snapshot = getCounterQueueSnapshot(now);
  return {
    level: snapshot.level,
    source: snapshot.source,
    count: snapshot.count,
    manualExpiresAt: snapshot.manualExpiresAt,
    timestamps: snapshot.timestamps,
    manualOverride: snapshot.manualOverride,
  };
}

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  const kitchen = await requireKitchenStaff();

  if (!student && "error" in kitchen) {
    return kitchen.error;
  }

  return jsonOk(toApiSnapshot());
}

const patchSchema = z.union([
  z.object({ level: z.enum(["calm", "busy", "crowded"]) }),
  z.object({ clearManual: z.literal(true) }),
]);

const postSchema = z.object({
  action: z.literal("lookup"),
});

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const kitchen = await requireKitchenStaff();
  if ("error" in kitchen) {
    return kitchen.error;
  }

  try {
    const body = patchSchema.parse(await request.json());

    if ("clearManual" in body) {
      clearCounterQueueManualOverride();
      return jsonOk(toApiSnapshot());
    }

    setCounterQueueManualLevel(body.level);
    return jsonOk(toApiSnapshot());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Ažuriranje nije uspelo.", 400);
  }
}

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const kitchen = await requireKitchenStaff();
  if ("error" in kitchen) {
    return kitchen.error;
  }

  try {
    postSchema.parse(await request.json());
    recordCounterQueueLookup();
    return jsonOk(toApiSnapshot());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Evidentiranje nije uspelo.", 400);
  }
}
