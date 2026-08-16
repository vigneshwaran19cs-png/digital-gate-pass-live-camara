import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable, notificationLogsTable } from "@workspace/db";
import {
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { resolveUserId } from "./auth";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  // For demo, return all notifications or filter by user from header
  const userId = resolveUserId(req);

  const notifications = userId
    ? await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(notificationsTable.createdAt)
    : await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);

  res.json(notifications.reverse());
});

router.get("/notifications/logs", async (req, res): Promise<void> => {
  // Normally this would require Super Admin authorization middleware
  const logs = await db.select().from(notificationLogsTable).orderBy(notificationLogsTable.createdAt);
  res.json(logs.reverse());
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, params.data.id));

  const [updated] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, params.data.id));

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(updated);
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true });
  res.json({ success: true });
});

export default router;
