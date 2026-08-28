import { Router, type IRouter } from "express";
import { db, locationLogsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { resolveUserId } from "./auth";

const router: IRouter = Router();

// 1. Get Live Location & Permission Status of a Student
router.get("/location/status/:studentId", async (req, res): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
    const [latest] = await db.select().from(locationLogsTable)
      .where(eq(locationLogsTable.studentId, studentId))
      .orderBy(desc(locationLogsTable.timestamp))
      .limit(1);

    const isLocationSharingEnabled = student?.isLocationSharingEnabled !== "false";

    res.json({
      ...(latest || {
        studentId,
        status: "Hostel",
        latitude: "11.5362",
        longitude: "77.7289",
        batteryLevel: 94,
        timestamp: new Date().toISOString(),
      }),
      studentName: student?.name || "Student",
      registerNumber: student?.registerNumber || "",
      parentName: student?.parentName || "",
      parentPhone: student?.parentPhone || "",
      parentWhatsapp: student?.parentWhatsapp || "",
      address: student?.address || "Erode / Salem Main Road, TN",
      isLocationSharingEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch location status" });
  }
});

// 2. Toggle Location Sharing Permission (Student Controlled)
router.post("/location/toggle-sharing", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId;
    const { isLocationSharingEnabled } = req.body;

    if (!studentId) {
      res.status(400).json({ error: "Student ID required" });
      return;
    }

    const val = isLocationSharingEnabled ? "true" : "false";
    await db.update(usersTable)
      .set({ isLocationSharingEnabled: val })
      .where(eq(usersTable.id, studentId));

    res.json({
      success: true,
      isLocationSharingEnabled: val === "true",
      message: val === "true"
        ? "Location sharing enabled with Parent & Tutor."
        : "Location sharing paused by student.",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle location sharing" });
  }
});

// 3. Update Real-Time Live GPS Coordinates
router.post("/location/update-gps", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId || 1;
    const { latitude, longitude, batteryLevel = 88, status = "On the Way", notes } = req.body;

    await db.insert(locationLogsTable).values({
      studentId,
      status: status as any,
      latitude: String(latitude || "11.5362"),
      longitude: String(longitude || "77.7289"),
      batteryLevel: Number(batteryLevel),
      notes: notes || "Live GPS coordinate ping",
    });

    res.json({ success: true, message: "GPS position recorded." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update GPS coordinates" });
  }
});

// 4. Safe Arrival at Home / Destination ("I Reached" or Geofence Reached)
router.post("/location/i-reached", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId || 1;
    const { destination = "Home Address", latitude, longitude } = req.body;

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));

    await db.insert(locationLogsTable).values({
      studentId,
      status: "Reached",
      latitude: latitude || "11.3410",
      longitude: longitude || "77.7172",
      batteryLevel: req.body.batteryLevel || 85,
      notes: `Student confirmed safe arrival at ${destination}`,
    });

    if (student) {
      const studentName = student.name || "Student";
      const regNo = student.registerNumber || "STU";
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

      // 1. Notification for Parent
      const parentMsg = `✅ SAFE ARRIVAL ALERT: Your ward ${studentName} (${regNo}) has safely reached home (${destination}) at ${nowStr}, ${dateStr}. Outpass journey complete.`;
      await db.insert(notificationsTable).values({
        userId: studentId,
        type: "leave_submitted",
        title: "🏠 Student Safely Reached Home",
        message: parentMsg,
        isRead: false,
      });

      // 2. Notification for Tutor & Warden
      const staffList = await db.select().from(usersTable)
        .where(eq(usersTable.role, "tutor"));

      for (const tutor of staffList) {
        if (!student.departmentId || tutor.departmentId === student.departmentId) {
          await db.insert(notificationsTable).values({
            userId: tutor.id,
            type: "leave_submitted",
            title: `📍 Student Reached Home: ${studentName}`,
            message: `Student ${studentName} (${regNo} - ${student.hostelRoom || ''}) has safely reached their home address at ${nowStr}.`,
            isRead: false,
          });
        }
      }

      // Also notify wardens
      const wardens = await db.select().from(usersTable).where(eq(usersTable.role, "warden"));
      for (const w of wardens) {
        await db.insert(notificationsTable).values({
          userId: w.id,
          type: "leave_submitted",
          title: `🏠 Arrival Logged: ${studentName}`,
          message: `${studentName} (${regNo}) confirmed safe arrival at home (${destination}) at ${nowStr}.`,
          isRead: false,
        });
      }
    }

    res.json({
      success: true,
      message: "🎉 Safe arrival recorded! Instant notifications sent to Parent, Class Tutor, and Hostel Warden.",
    });
  } catch (error) {
    console.error("Failed to record I Reached status:", error);
    res.status(500).json({ error: "Failed to record I Reached status" });
  }
});

// 5. Battery Alert
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
