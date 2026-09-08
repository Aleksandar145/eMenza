import { z } from "zod";
import { jsonError } from "@/server/auth/session";

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return { error: jsonError("Neispravan JSON u zahtevu.", 400) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { error: jsonError("Neispravni podaci u zahtevu.", 400) };
  }

  return { data: parsed.data };
}
