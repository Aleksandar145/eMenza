import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import {
  listStudentNotificationsDb,
  markAllStudentNotificationsReadDb,
  markStudentNotificationReadDb,
} from "@/server/repositories/notifications";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  if (!student) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const notifications = await listStudentNotificationsDb(student.id, student.email);
  return jsonOk({ notifications });
}

const patchSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ all: z.literal(true) }),
]);

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  if (!student) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  try {
    const body = patchSchema.parse(await request.json());

    if ("all" in body) {
      await markAllStudentNotificationsReadDb(student.id, student.email);
      const notifications = await listStudentNotificationsDb(student.id, student.email);
      return jsonOk({ notifications });
    }

    const notification = await markStudentNotificationReadDb(
      body.id,
      student.id,
      student.email,
    );

    if (!notification) {
      return jsonStudentError(student.id, "notificationNotFound", 404);
    }

    return jsonOk({ notification });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Update failed", 400);
  }
}
