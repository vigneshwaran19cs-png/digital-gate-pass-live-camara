import { Router, type IRouter } from "express";
import { db, journeySettingsTable, whatsappLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getWhatsAppConfig, sendWhatsAppNotification } from "../lib/whatsapp";

const router: IRouter = Router();

// 1. Get Settings & Integration status
router.get("/whatsapp/settings", async (_req, res): Promise<void> => {
  try {
    const [settings] = await db.select().from(journeySettingsTable).limit(1);
    const config = await getWhatsAppConfig();

    res.json({
      settings: settings || {
        notifyParent: "true",
        notifyTutor: "true",
        notifyHod: "true",
        notifyWarden: "true",
        geofenceCooldownMinutes: 15,
        trackingExpiryHours: 24,
        whatsappEnabled: "true",
        googleMapsApiKey: "",
        whatsappAccessToken: "",
        whatsappPhoneNumberId: "",
        whatsappBusinessAccountId: "",
        gpsSignalTimeoutMinutes: 5,
        redZoneAlertEnabled: "true",
      },
      integrationConfig: {
        isConfigured: config.isConfigured,
        phoneNumberId: config.phoneNumberId || "Not set",
        businessAccountId: config.businessAccountId || "Not set",
        apiVersion: config.apiVersion,
        googleMapsApiKey: config.googleMapsApiKey || "",
        gpsSignalTimeoutMinutes: config.gpsSignalTimeoutMinutes || 5,
        mode: config.isConfigured ? "Meta Cloud API (Production Active)" : "Simulated / Test Mode (No Credentials)",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch WhatsApp & API settings" });
  }
});

// 2. Save Settings
router.post("/whatsapp/settings", async (req, res): Promise<void> => {
  try {
    const {
      notifyParent = "true",
      notifyTutor = "true",
      notifyHod = "true",
      notifyWarden = "true",
      geofenceCooldownMinutes = 15,
      trackingExpiryHours = 24,
      whatsappEnabled = "true",
      googleMapsApiKey,
      whatsappAccessToken,
      whatsappPhoneNumberId,
      whatsappBusinessAccountId,
      gpsSignalTimeoutMinutes = 5,
      redZoneAlertEnabled = "true",
    } = req.body;

    const [existing] = await db.select().from(journeySettingsTable).limit(1);

    const updatePayload: any = {
      notifyParent: notifyParent === true || notifyParent === "true" ? "true" : "false",
      notifyTutor: notifyTutor === true || notifyTutor === "true" ? "true" : "false",
      notifyHod: notifyHod === true || notifyHod === "true" ? "true" : "false",
      notifyWarden: notifyWarden === true || notifyWarden === "true" ? "true" : "false",
      geofenceCooldownMinutes: Number(geofenceCooldownMinutes),
      trackingExpiryHours: Number(trackingExpiryHours),
      whatsappEnabled: whatsappEnabled === true || whatsappEnabled === "true" ? "true" : "false",
      gpsSignalTimeoutMinutes: Number(gpsSignalTimeoutMinutes),
      redZoneAlertEnabled: redZoneAlertEnabled === true || redZoneAlertEnabled === "true" ? "true" : "false",
    };

    if (googleMapsApiKey !== undefined) updatePayload.googleMapsApiKey = String(googleMapsApiKey).trim();
    if (whatsappAccessToken !== undefined) updatePayload.whatsappAccessToken = String(whatsappAccessToken).trim();
    if (whatsappPhoneNumberId !== undefined) updatePayload.whatsappPhoneNumberId = String(whatsappPhoneNumberId).trim();
    if (whatsappBusinessAccountId !== undefined) updatePayload.whatsappBusinessAccountId = String(whatsappBusinessAccountId).trim();

    if (existing) {
      await db
        .update(journeySettingsTable)
        .set(updatePayload)
        .where(eq(journeySettingsTable.id, existing.id));
    } else {
      await db.insert(journeySettingsTable).values(updatePayload);
    }

    res.json({ success: true, message: "System API & WhatsApp Settings saved successfully!" });
  } catch (error) {
    console.error("Failed to save whatsapp settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// 3. WhatsApp Logs
router.get("/whatsapp/logs", async (_req, res): Promise<void> => {
  try {
    const logs = await db.select().from(whatsappLogsTable).orderBy(desc(whatsappLogsTable.sentAt)).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch WhatsApp logs" });
  }
});

// 4. Test WhatsApp Notification Send
router.post("/whatsapp/test-send", async (req, res): Promise<void> => {
  try {
    const { phone = "919876543210", role = "parent" } = req.body;
    const result = await sendWhatsAppNotification({
      recipientPhone: phone,
      recipientRole: role as any,
      messageType: "JOURNEY_STARTED",
      studentName: "Vimal M.",
      passType: "Test Outpass",
      startLocation: "JKKM College Gate",
      destination: "Erode Bus Stand",
      trackingUrl: `${req.protocol}://${req.get("host")}/track/demo-test-token`,
      timeStr: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send test message" });
  }
});

export default router;
