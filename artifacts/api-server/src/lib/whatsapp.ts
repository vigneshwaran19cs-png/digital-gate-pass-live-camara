import { db, whatsappLogsTable, journeySettingsTable } from "@workspace/db";

export interface WhatsAppNotificationPayload {
  journeyId?: number;
  recipientPhone: string;
  recipientRole: "parent" | "tutor" | "hod" | "warden" | "student";
  messageType: "JOURNEY_STARTED" | "LOCATION_ARRIVED" | "JOURNEY_COMPLETED" | "JOURNEY_CANCELLED" | "TRACKING_EXPIRED" | "RED_ZONE_ALERT" | "GPS_DISCONNECTED";
  studentName: string;
  passType?: string;
  startLocation?: string;
  destination?: string;
  currentLocationName?: string;
  trackingUrl?: string;
  timeStr?: string;
  timeoutMins?: number;
}

/**
 * Checks WhatsApp & Google Maps credentials from database settings or environment variables
 */
export async function getWhatsAppConfig() {
  try {
    const [dbSettings] = await db.select().from(journeySettingsTable).limit(1);
    if (dbSettings) {
      const accessToken = (dbSettings as any).whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = (dbSettings as any).whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const businessAccountId = (dbSettings as any).whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      const apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
      const googleMapsApiKey = (dbSettings as any).googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || "";
      const gpsSignalTimeoutMinutes = (dbSettings as any).gpsSignalTimeoutMinutes || 5;

      return {
        accessToken,
        phoneNumberId,
        businessAccountId,
        apiVersion,
        googleMapsApiKey,
        gpsSignalTimeoutMinutes,
        isConfigured: Boolean(accessToken && phoneNumberId),
      };
    }
  } catch (e) {
    // Fallback to env
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v18.0";
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

  return {
    accessToken,
    phoneNumberId,
    businessAccountId,
    apiVersion,
    googleMapsApiKey,
    gpsSignalTimeoutMinutes: 5,
    isConfigured: Boolean(accessToken && phoneNumberId),
  };
}

/**
 * Construct WhatsApp notification message bodies
 */
export function formatWhatsAppMessage(payload: WhatsAppNotificationPayload): string {
  const {
    messageType,
    studentName,
    passType = "Outpass",
    startLocation = "Hostel Gate",
    destination = "Destination",
    currentLocationName = "En-route",
    trackingUrl = "",
    timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timeoutMins = 5,
  } = payload;

  switch (messageType) {
    case "JOURNEY_STARTED":
      return (
        `🚌 *STUDENT JOURNEY STARTED*\n\n` +
        `Student: *${studentName}*\n` +
        `Journey: *${passType}*\n` +
        `From: ${startLocation}\n` +
        `Destination: ${destination}\n` +
        `Time: ${timeStr}\n\n` +
        `📍 *Live tracking is now active.*\n\n` +
        `🗺️ *Track Live Location:*\n${trackingUrl}`
      );

    case "LOCATION_ARRIVED":
      return (
        `📍 *LOCATION UPDATE (MAIN PLACE)*\n\n` +
        `Student: *${studentName}*\n` +
        `Arrived near: *${currentLocationName}*\n` +
        `Time: ${timeStr}\n\n` +
        `🗺️ *Track Live Location:*\n${trackingUrl}`
      );

    case "RED_ZONE_ALERT":
      return (
        `⚠️ *RED ZONE / RESTRICTED AREA ALERT*\n\n` +
        `Student: *${studentName}*\n` +
        `Alert: Student entered restricted red zone / strayed off-route!\n` +
        `Location: ${currentLocationName}\n` +
        `Time: ${timeStr}\n\n` +
        `🚨 *Parent & HOD Intimated Immediately.*\n` +
        `🗺️ *View Live Location:*\n${trackingUrl}`
      );

    case "GPS_DISCONNECTED":
      return (
        `🚨 *GPS SIGNAL LOST / DISCONNECTED ALERT*\n\n` +
        `Student: *${studentName}*\n` +
        `Alert: Phone GPS signal lost for over ${timeoutMins} mins!\n` +
        `Last Known Location: ${currentLocationName}\n` +
        `Last Ping Time: ${timeStr}\n\n` +
        `⚠️ *Immediate alert dispatched to Parent & HOD.*\n` +
        `🗺️ *View Last Known Location:*\n${trackingUrl}`
      );

    case "JOURNEY_COMPLETED":
      return (
        `✅ *JOURNEY COMPLETED*\n\n` +
        `Student: *${studentName}*\n\n` +
        `The journey has been completed successfully.\n` +
        `Final Location: ${destination}\n` +
        `Time: ${timeStr}`
      );

    case "JOURNEY_CANCELLED":
      return (
        `⚠️ *JOURNEY CANCELLED*\n\n` +
        `Student: *${studentName}*\n` +
        `The journey was ended/cancelled at ${timeStr}.`
      );

    case "TRACKING_EXPIRED":
      return (
        `⏳ *TRACKING EXPIRED*\n\n` +
        `The live tracking link for *${studentName}* has expired.`
      );

    default:
      return `Notification regarding ${studentName}'s journey at ${timeStr}.`;
  }
}

/**
 * Send WhatsApp Notification (via Meta Cloud API or Simulated Developer Mode)
 */
export async function sendWhatsAppNotification(payload: WhatsAppNotificationPayload) {
  const config = await getWhatsAppConfig();
  const messageBody = formatWhatsAppMessage(payload);

  let recipient = payload.recipientPhone ? payload.recipientPhone.replace(/\D/g, "") : "";
  if (!recipient) {
    console.log(`[WhatsApp] No valid phone number for recipient role: ${payload.recipientRole}`);
    return { success: false, status: "failed", error: "Missing recipient phone number" };
  }

  if (recipient.length === 10) {
    recipient = "91" + recipient;
  }

  if (config.isConfigured) {
    try {
      const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { preview_url: true, body: messageBody },
        }),
      });

      const resData: any = await response.json();

      if (response.ok) {
        await db.insert(whatsappLogsTable).values({
          journeyId: payload.journeyId,
          recipientPhone: recipient,
          recipientRole: payload.recipientRole,
          messageType: payload.messageType,
          messageBody,
          status: "sent",
          apiResponse: JSON.stringify(resData),
        });
        return { success: true, status: "sent", data: resData };
      } else {
        const errorMsg = resData?.error?.message || "Meta API request failed";
        await db.insert(whatsappLogsTable).values({
          journeyId: payload.journeyId,
          recipientPhone: recipient,
          recipientRole: payload.recipientRole,
          messageType: payload.messageType,
          messageBody,
          status: "failed",
          errorMessage: errorMsg,
          apiResponse: JSON.stringify(resData),
        });
        return { success: false, status: "failed", error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Network error sending WhatsApp API request";
      await db.insert(whatsappLogsTable).values({
        journeyId: payload.journeyId,
        recipientPhone: recipient,
        recipientRole: payload.recipientRole,
        messageType: payload.messageType,
        messageBody,
        status: "failed",
        errorMessage: errorMsg,
      });
      return { success: false, status: "failed", error: errorMsg };
    }
  } else {
    console.log(`[WhatsApp Test Mode] Simulated send to ${recipient} (${payload.recipientRole}):\n${messageBody}`);

    await db.insert(whatsappLogsTable).values({
      journeyId: payload.journeyId,
      recipientPhone: recipient,
      recipientRole: payload.recipientRole,
      messageType: payload.messageType,
      messageBody,
      status: "simulated",
      apiResponse: JSON.stringify({ note: "WhatsApp Cloud API credentials not configured (Developer/Test mode)" }),
    });

    return {
      success: true,
      status: "simulated",
      message: "Simulated send logged to database (WhatsApp credentials not configured)",
    };
  }
}
