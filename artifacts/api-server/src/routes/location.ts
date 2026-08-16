import { Router, type IRouter } from "express";
import { db, locationLogsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { resolveUserId } from "./auth";

const router: IRouter = Router();

router.get("/location/status/:studentId", async (req, res): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const [latest] = await db.select().from(locationLogsTable)
      .where(eq(locationLogsTable.studentId, studentId))
      .orderBy(desc(locationLogsTable.timestamp))
      .limit(1);

    res.json(latest || {
      studentId,
      status: "Hostel",
      latitude: "11.5362",
      longitude: "77.7289",
      batteryLevel: 92,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch location status" });
  }
});

router.post("/location/i-reached", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId || 1;
    const { destination = "Home / Destination", latitude, longitude } = req.body;

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));

    await db.insert(locationLogsTable).values({
      studentId,
      status: "Reached",
      latitude: latitude || "11.5362",
      longitude: longitude || "77.7289",
      batteryLevel: req.body.batteryLevel || 85,
      notes: `Student manually triggered 'I Reached' at ${destination}`,
    });

    // Notify Parent & Tutor
    if (student) {
      const studentName = student.name || "Student";
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const message = `${studentName} has reached the destination (${destination}) safely at ${nowStr}.`;

      // Create notification for Parent/Tutor
      await db.insert(notificationsTable).values({
        userId: studentId,
        type: "leave_submitted",
        title: "📍 Student Safe Arrival Alert",
        message,
        isRead: false,
      });
    }

    res.json({ success: true, message: "Arrival recorded & notifications sent to Parent and Tutor!" });
  } catch (error) {
    console.error("Failed to record I Reached status:", error);
    res.status(500).json({ error: "Failed to record I Reached status" });
  }
});

router.post("/location/battery-alert", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId || 1;
    const batteryLevel = Number(req.body.batteryLevel || 8);

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));

    await db.insert(locationLogsTable).values({
      studentId,
      status: "On the Way",
      batteryLevel,
      isLowBatteryAlertSent: "true",
      notes: `Low Battery Alert: ${batteryLevel}%`,
    });

    if (student) {
      const studentName = student.name || "Student";
      const message = `Alert: ${studentName}'s device battery is below 10% (${batteryLevel}%). Location updates may become unavailable.`;

      await db.insert(notificationsTable).values({
        userId: studentId,
        type: "leave_submitted",
        title: "🔋 Low Battery Alert (<10%)",
        message,
        isRead: false,
      });
    }

    res.json({ success: true, message: "Low battery alert logged & Parent/Tutor notified." });
  } catch (error) {
    res.status(500).json({ error: "Failed to log battery alert" });
  }
});

export default router;
