import { Router, type IRouter } from "express";
import crypto from "crypto";
import {
  db,
  journeysTable,
  journeyLocationsTable,
  locationEventsTable,
  usersTable,
  outpassesTable,
  leavesTable,
  journeySettingsTable,
  locationLogsTable,
} from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { resolveUserId } from "./auth";
import { sendWhatsAppNotification, WhatsAppNotificationPayload } from "../lib/whatsapp";
import { checkGeofenceTrigger } from "../lib/geofence";

const router: IRouter = Router();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 1. Start Journey
router.post("/journeys/start", async (req, res): Promise<void> => {
  try {
    const studentId = resolveUserId(req) || req.body.studentId;
    const { outpassId, leaveId, startLocation = "Hostel Gate", destination } = req.body;

    if (!studentId) {
      res.status(400).json({ error: "Student authorization or studentId required" });
      return;
    }

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
    if (!student) {
      res.status(404).json({ error: "Student record not found" });
      return;
    }

    // Determine destination from outpass or leave if not explicitly provided
    let finalDest = destination;
    let passTypeStr = "Hostel Outpass";

    if (!finalDest && outpassId) {
      const [op] = await db.select().from(outpassesTable).where(eq(outpassesTable.id, outpassId));
      if (op?.leaveId) {
        const [lv] = await db.select().from(leavesTable).where(eq(leavesTable.id, op.leaveId));
        if (lv?.destination) finalDest = lv.destination;
        if (lv?.passType) passTypeStr = lv.passType === "outing_pass" ? "Outing Pass" : "Hostel Leave";
      }
    } else if (!finalDest && leaveId) {
      const [lv] = await db.select().from(leavesTable).where(eq(leavesTable.id, leaveId));
      if (lv?.destination) finalDest = lv.destination;
      if (lv?.passType) passTypeStr = lv.passType === "outing_pass" ? "Outing Pass" : "Hostel Leave";
    }

    if (!finalDest) finalDest = "Destination";

    // Generate token and token hash
    const rawToken = crypto.randomBytes(16).toString("hex");
    const tokenHash = hashToken(rawToken);

    // Expiry default 24h or settings value
    const [settings] = await db.select().from(journeySettingsTable).limit(1);
    const expiryHours = settings?.trackingExpiryHours ?? 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const [inserted] = await db.insert(journeysTable).values({
      studentId,
      outpassId: outpassId ? Number(outpassId) : null,
      leaveId: leaveId ? Number(leaveId) : null,
      startLocation,
      destination: finalDest,
      status: "active",
      trackingTokenHash: tokenHash,
      startedAt: new Date(),
      expiresAt,
    });

    const journeyId = inserted.insertId;

    // Build tracking URL
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers.host || "localhost:5173";
    const trackingUrl = `${protocol}://${host}/track/${rawToken}`;

    // Record JOURNEY_STARTED event
    await db.insert(locationEventsTable).values({
      journeyId,
      locationName: startLocation,
      eventType: "JOURNEY_STARTED",
      triggeredAt: new Date(),
      notificationStatus: "sent",
    });

    // Send WhatsApp Notifications according to settings
    const notifyParent = settings?.notifyParent !== "false";
    const notifyTutor = settings?.notifyTutor !== "false";
    const notifyHod = settings?.notifyHod !== "false";
    const notifyWarden = settings?.notifyWarden !== "false";
    const whatsappEnabled = settings?.whatsappEnabled !== "false";

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (whatsappEnabled) {
      // 1. Parent
      if (notifyParent && (student.parentWhatsapp || student.parentPhone)) {
        await sendWhatsAppNotification({
          journeyId,
          recipientPhone: student.parentWhatsapp || student.parentPhone!,
          recipientRole: "parent",
          messageType: "JOURNEY_STARTED",
          studentName: student.name,
          passType: passTypeStr,
          startLocation,
          destination: finalDest,
          trackingUrl,
          timeStr,
        });
      }

      // 2. Tutor
      if (notifyTutor) {
        const tutors = await db.select().from(usersTable).where(eq(usersTable.role, "tutor"));
        for (const t of tutors) {
          if (!student.departmentId || t.departmentId === student.departmentId) {
            if (t.phone) {
              await sendWhatsAppNotification({
                journeyId,
                recipientPhone: t.phone,
                recipientRole: "tutor",
                messageType: "JOURNEY_STARTED",
                studentName: student.name,
                passType: passTypeStr,
                startLocation,
                destination: finalDest,
                trackingUrl,
                timeStr,
              });
            }
          }
        }
      }

      // 3. HOD
      if (notifyHod) {
        const hods = await db.select().from(usersTable).where(eq(usersTable.role, "hod"));
        for (const h of hods) {
          if (!student.departmentId || h.departmentId === student.departmentId) {
            if (h.phone) {
              await sendWhatsAppNotification({
                journeyId,
                recipientPhone: h.phone,
                recipientRole: "hod",
                messageType: "JOURNEY_STARTED",
                studentName: student.name,
                passType: passTypeStr,
                startLocation,
                destination: finalDest,
                trackingUrl,
                timeStr,
              });
            }
          }
        }
      }

      // 4. Warden
      if (notifyWarden) {
        const wardens = await db.select().from(usersTable).where(eq(usersTable.role, "warden"));
        for (const w of wardens) {
          if (w.phone) {
            await sendWhatsAppNotification({
              journeyId,
              recipientPhone: w.phone,
              recipientRole: "warden",
              messageType: "JOURNEY_STARTED",
              studentName: student.name,
              passType: passTypeStr,
              startLocation,
              destination: finalDest,
              trackingUrl,
              timeStr,
            });
          }
        }
      }
    }

    res.json({
      success: true,
      journeyId,
      trackingToken: rawToken,
      trackingUrl,
      status: "active",
      message: "Journey started. WhatsApp tracking notifications sent.",
    });
  } catch (error) {
    console.error("Start journey error:", error);
    res.status(500).json({ error: "Failed to start journey" });
  }
});

// 2. Post Real-Time Location Ping & Check Geofences
router.post("/journeys/location", async (req, res): Promise<void> => {
  try {
    const { token, latitude, longitude, accuracy = 10, batteryLevel = 90 } = req.body;

    if (!token || !latitude || !longitude) {
      res.status(400).json({ error: "Tracking token, latitude, and longitude required" });
      return;
    }

    const tokenHash = hashToken(token);
    const [journey] = await db.select().from(journeysTable).where(eq(journeysTable.trackingTokenHash, tokenHash));

    if (!journey) {
      res.status(404).json({ error: "Invalid tracking token" });
      return;
    }

    if (journey.status !== "active") {
      res.status(400).json({ error: `Journey is ${journey.status}` });
      return;
    }

    if (new Date() > new Date(journey.expiresAt)) {
      await db.update(journeysTable).set({ status: "expired" }).where(eq(journeysTable.id, journey.id));
      res.status(400).json({ error: "Tracking session expired" });
      return;
    }

    const latStr = String(latitude);
    const lngStr = String(longitude);

    // Save location ping
    await db.insert(journeyLocationsTable).values({
      journeyId: journey.id,
      latitude: latStr,
      longitude: lngStr,
      accuracy: Number(accuracy),
      batteryLevel: Number(batteryLevel),
      timestamp: new Date(),
    });

    // Also write to location_logs for main campus location viewer compatibility
    await db.insert(locationLogsTable).values({
      studentId: journey.studentId,
      status: "On the Way",
      latitude: latStr,
      longitude: lngStr,
      batteryLevel: Number(batteryLevel),
      notes: `Live journey tracking update`,
    });

    // Check geofence arrival triggers
    const numLat = parseFloat(latStr);
    const numLng = parseFloat(lngStr);
    const triggeredGeofences = await checkGeofenceTrigger(journey.id, numLat, numLng);

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers.host || "localhost:5173";
    const trackingUrl = `${protocol}://${host}/track/${token}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, journey.studentId));
    const [settings] = await db.select().from(journeySettingsTable).limit(1);

    const whatsappEnabled = settings?.whatsappEnabled !== "false";
    const notifyParent = settings?.notifyParent !== "false";

    for (const gf of triggeredGeofences) {
      // Record location event
      await db.insert(locationEventsTable).values({
        journeyId: journey.id,
        geofenceId: gf.geofenceId,
        locationName: gf.name,
        latitude: gf.latitude,
        longitude: gf.longitude,
        eventType: "LOCATION_ARRIVED",
        triggeredAt: new Date(),
        notificationStatus: "sent",
      });

      // Send WhatsApp location arrival update to parent & staff if enabled
      if (whatsappEnabled && student) {
        if (notifyParent && (student.parentWhatsapp || student.parentPhone)) {
          await sendWhatsAppNotification({
            journeyId: journey.id,
            recipientPhone: student.parentWhatsapp || student.parentPhone!,
            recipientRole: "parent",
            messageType: "LOCATION_ARRIVED",
            studentName: student.name,
            currentLocationName: gf.name,
            trackingUrl,
            timeStr,
          });
        }
      }
    }

    res.json({
      success: true,
      message: "Location update recorded",
      triggeredGeofences: triggeredGeofences.map((g) => g.name),
    });
  } catch (error) {
    console.error("Post location ping error:", error);
    res.status(500).json({ error: "Failed to record location" });
  }
});

// 3. End / Complete Journey
router.post("/journeys/end", async (req, res): Promise<void> => {
  try {
    const { token, journeyId } = req.body;
    let journey: any;

    if (token) {
      const tokenHash = hashToken(token);
      [journey] = await db.select().from(journeysTable).where(eq(journeysTable.trackingTokenHash, tokenHash));
    } else if (journeyId) {
      [journey] = await db.select().from(journeysTable).where(eq(journeysTable.id, Number(journeyId)));
    }

    if (!journey) {
      res.status(404).json({ error: "Journey not found" });
      return;
    }

    if (journey.status === "completed" || journey.status === "cancelled") {
      res.json({ success: true, message: `Journey is already ${journey.status}` });
      return;
    }

    // Mark as completed
    await db
      .update(journeysTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(journeysTable.id, journey.id));

    // Record JOURNEY_COMPLETED event
    await db.insert(locationEventsTable).values({
      journeyId: journey.id,
      locationName: journey.destination,
      eventType: "JOURNEY_COMPLETED",
      triggeredAt: new Date(),
      notificationStatus: "sent",
    });

    // Send final WhatsApp Notification
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, journey.studentId));
    const [settings] = await db.select().from(journeySettingsTable).limit(1);

    const whatsappEnabled = settings?.whatsappEnabled !== "false";
    const notifyParent = settings?.notifyParent !== "false";
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (whatsappEnabled && student) {
      if (notifyParent && (student.parentWhatsapp || student.parentPhone)) {
        await sendWhatsAppNotification({
          journeyId: journey.id,
          recipientPhone: student.parentWhatsapp || student.parentPhone!,
          recipientRole: "parent",
          messageType: "JOURNEY_COMPLETED",
          studentName: student.name,
          destination: journey.destination,
          timeStr,
        });
      }
    }

    res.json({
      success: true,
      message: "Journey completed successfully. WhatsApp notification sent.",
    });
  } catch (error) {
    console.error("End journey error:", error);
    res.status(500).json({ error: "Failed to end journey" });
  }
});

// 4. Public Live Tracking Details Page API (Unprotected)
router.get("/track/:token", async (req, res): Promise<void> => {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      res.status(400).json({ error: "Tracking token required" });
      return;
    }

    const tokenHash = hashToken(rawToken);
    const [journey] = await db.select().from(journeysTable).where(eq(journeysTable.trackingTokenHash, tokenHash));

    if (!journey) {
      res.status(404).json({ error: "Invalid or expired tracking link" });
      return;
    }

    // Check expiry
    if (journey.status === "active" && new Date() > new Date(journey.expiresAt)) {
      await db.update(journeysTable).set({ status: "expired" }).where(eq(journeysTable.id, journey.id));
      journey.status = "expired";
    }

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, journey.studentId));

    // Fetch full path history
    const locations = await db
      .select()
      .from(journeyLocationsTable)
      .where(eq(journeyLocationsTable.journeyId, journey.id))
      .orderBy(desc(journeyLocationsTable.timestamp));

    // Fetch events history
    const events = await db
      .select()
      .from(locationEventsTable)
      .where(eq(locationEventsTable.journeyId, journey.id))
      .orderBy(desc(locationEventsTable.triggeredAt));

    const latestPos = locations[0] || null;

    // Mask student sensitive info for public security
    const studentName = student?.name || "Student";
    const maskedReg = student?.registerNumber
      ? `${student.registerNumber.substring(0, 4)}****${student.registerNumber.slice(-2)}`
      : "";

    res.json({
      journey: {
        id: journey.id,
        status: journey.status,
        startLocation: journey.startLocation,
        destination: journey.destination,
        startedAt: journey.startedAt,
        completedAt: journey.completedAt,
        expiresAt: journey.expiresAt,
      },
      student: {
        name: studentName,
        registerNumberMasked: maskedReg,
        hostelBlock: student?.hostelBlock || "",
      },
      currentPosition: latestPos,
      route: locations.reverse(), // ascending order for polyline drawing
      events,
    });
  } catch (error) {
    console.error("Public track API error:", error);
    res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

// 5. Active Journeys Overview (Authenticated)
router.get("/journeys/active", async (req, res): Promise<void> => {
  try {
    const activeJourneys = await db
      .select()
      .from(journeysTable)
      .where(eq(journeysTable.status, "active"))
      .orderBy(desc(journeysTable.startedAt));

    const result = [];
    for (const j of activeJourneys) {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, j.studentId));
      const [latestLoc] = await db
        .select()
        .from(journeyLocationsTable)
        .where(eq(journeyLocationsTable.journeyId, j.id))
        .orderBy(desc(journeyLocationsTable.timestamp))
        .limit(1);

      result.push({
        ...j,
        studentName: student?.name || "Student",
        registerNumber: student?.registerNumber || "",
        parentPhone: student?.parentPhone || "",
        latestLocation: latestLoc || null,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active journeys" });
  }
});

// 6. Admin Revoke Journey
router.post("/journeys/:id/revoke", async (req, res): Promise<void> => {
  try {
    const journeyId = parseInt(req.params.id, 10);
    await db.update(journeysTable).set({ status: "cancelled" }).where(eq(journeysTable.id, journeyId));

    res.json({ success: true, message: "Journey tracking session revoked by administrator." });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke journey session" });
  }
});

export default router;
