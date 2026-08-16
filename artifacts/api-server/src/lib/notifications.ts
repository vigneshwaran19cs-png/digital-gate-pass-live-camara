import {
  db,
  usersTable,
  classesTable,
  departmentsTable,
  notificationLogsTable,
  leavesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { logger } from "./logger"; // Assumes logger exists, or we can use console.log

/**
 * Sends an email notification (mock).
 * Real integration: SendGrid, AWS SES, or similar.
 */
export async function sendEmailNotification(
  userId: number,
  leaveId: number | undefined,
  emailAddress: string,
  subject: string,
  body: string
) {
  try {
    // Mock sending email
    console.log(`[EMAIL] Sending to ${emailAddress} | Subject: ${subject}`);

    // Log success
    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "email",
      recipient: emailAddress,
      status: "sent",
      sentAt: new Date(),
    });
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send to ${emailAddress}:`, error);
    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "email",
      recipient: emailAddress,
      status: "failed",
      errorMessage: error.message || "Unknown error",
    });
  }
}

/**
 * Sends an SMS notification (mock).
 * Real integration: Twilio, AWS SNS, etc.
 */
export async function sendSmsNotification(
  userId: number,
  leaveId: number | undefined,
  phoneNumber: string,
  message: string
) {
  try {
    console.log(`[SMS] Sending to ${phoneNumber} | Message: ${message}`);

    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "sms",
      recipient: phoneNumber,
      status: "sent",
      sentAt: new Date(),
    });
  } catch (error: any) {
    console.error(`[SMS] Failed to send to ${phoneNumber}:`, error);
    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "sms",
      recipient: phoneNumber,
      status: "failed",
      errorMessage: error.message || "Unknown error",
    });
  }
}

/**
 * Sends a WhatsApp notification (mock).
 * Real integration: Twilio WhatsApp API, Meta Cloud API, etc.
 */
export async function sendWhatsAppNotification(
  userId: number,
  leaveId: number | undefined,
  whatsappNumber: string,
  message: string
) {
  try {
    console.log(`[WHATSAPP] Sending to ${whatsappNumber} | Message: ${message}`);

    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "whatsapp",
      recipient: whatsappNumber,
      status: "sent",
      sentAt: new Date(),
    });
  } catch (error: any) {
    console.error(`[WHATSAPP] Failed to send to ${whatsappNumber}:`, error);
    await db.insert(notificationLogsTable).values({
      userId,
      leaveId,
      channel: "whatsapp",
      recipient: whatsappNumber,
      status: "failed",
      errorMessage: error.message || "Unknown error",
    });
  }
}

export async function notifyRole(
  role: string,
  leaveId: number,
  subject: string,
  body: string,
  departmentId?: number | null,
  classId?: number | null
) {
  // Resolve classId and departmentId from the leave if not provided
  if (!classId || !departmentId) {
    const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, leaveId));
    if (leave) {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
      if (student) {
        if (!classId) classId = student.classId;
        if (!departmentId) departmentId = student.departmentId;
      }
    }
  }

  let conditions: SQL[] = [eq(usersTable.role, role as any)];

  if (role === "tutor") {
    if (classId) {
      const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
      if (cls?.tutorId) {
        conditions = [eq(usersTable.id, cls.tutorId)];
      } else {
        conditions = [eq(usersTable.id, -1)]; // Force no match
      }
    } else {
      conditions = [eq(usersTable.id, -1)];
    }
  } else if (role === "hod") {
    if (departmentId) {
      const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId));
      if (dept?.hodId) {
        conditions = [eq(usersTable.id, dept.hodId)];
      } else {
        conditions = [eq(usersTable.id, -1)];
      }
    } else {
      conditions = [eq(usersTable.id, -1)];
    }
  }

  const users = await db.select().from(usersTable).where(and(...conditions));
  for (const user of users) {
    // Insert an in-app notification record
    await db.insert(notificationsTable).values({
      userId: user.id,
      type: "leave_submitted",
      title: subject,
      message: body,
      isRead: false,
      leaveId,
    });

    if (user.email) {
      await sendEmailNotification(user.id, leaveId, user.email, subject, body);
    }
    // If staff have phone numbers for SMS
    if (user.phone) {
      await sendSmsNotification(user.id, leaveId, user.phone, body);
    }
  }
}

export async function processLeaveNotifications(
  studentId: number,
  leaveId: number,
  type: string, // 'leave_submitted', 'leave_approved', 'outpass_generated'
  subject: string,
  body: string,
  nextRole?: string // The role that needs to approve next
) {
  // Fetch student info to get parent details
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  if (!student) return;

  if (type === "outpass_generated") {
    // Notify Student
    await db.insert(notificationsTable).values({
      userId: studentId,
      type: "outpass_generated",
      title: subject,
      message: body,
      isRead: false,
      leaveId,
    });
    if (student.email) await sendEmailNotification(studentId, leaveId, student.email, subject, body);

    // Notify Parent
    if (student.parentEmail) await sendEmailNotification(studentId, leaveId, student.parentEmail, subject, body);
    if (student.parentPhone) await sendSmsNotification(studentId, leaveId, student.parentPhone, body);
    if (student.parentWhatsapp) await sendWhatsAppNotification(studentId, leaveId, student.parentWhatsapp, body);
  } else if (type === "leave_submitted") {
    // Notify Student
    if (student.email) await sendEmailNotification(studentId, leaveId, student.email, "Leave Request Submitted", "Your leave request has been submitted successfully.");
    
    // Notify Warden (nextRole for initial verification)
    if (nextRole) {
      await notifyRole(nextRole, leaveId, `New Leave Request`, `New leave request from ${student.name} requires verification.`, student.departmentId, student.classId);
    }
  } else if (type === "leave_approved") {
    // Notify Student
    if (student.email) await sendEmailNotification(studentId, leaveId, student.email, subject, body);
    
    // Notify Next Role
    if (nextRole) {
      await notifyRole(nextRole, leaveId, `Leave Request Pending Approval`, `A leave request from ${student.name} requires your approval.`, student.departmentId, student.classId);
    }
  }
}
