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

/**
 * Notifies ALL stakeholders when a student exits campus / goes home ("oorukku poittana").
 * Roles notified: Student, Parent, Tutor, HOD, Principal, Warden, Super Admin.
 * EXCLUDES: Security / Watchman ("watchman anna na thavira").
 */
export async function notifyStudentExit(
  studentId: number,
  leaveId?: number | null,
  gateLocation: string = "Main Gate 1"
) {
  try {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
    if (!student) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const title = `🏡 Student Departed / Left for Home (Oorukku Poiyacha)`;
    const message = `Student ${student.name} (${student.registerNumber || "Reg No N/A"}) has checked out and departed campus via ${gateLocation} at ${timeStr}.`;

    // Fetch all users
    const allUsers = await db.select().from(usersTable);

    // Filter: EXCLUDE Watchman / Security role ("watchman anna na thavira")
    const eligibleUsers = allUsers.filter((u) => u.role !== "security");

    for (const user of eligibleUsers) {
      let shouldNotify = false;

      if (user.id === student.id) {
        shouldNotify = true; // Student
      } else if (user.role === "parent" && (user.email === student.parentEmail || user.phone === student.parentPhone || user.phone === student.parentWhatsapp)) {
        shouldNotify = true; // Parent account
      } else if (user.role === "tutor") {
        if (student.classId) {
          const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
          if (cls && cls.tutorId === user.id) shouldNotify = true;
        } else {
          shouldNotify = true;
        }
      } else if (user.role === "hod") {
        if (student.departmentId) {
          const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, student.departmentId));
          if (dept && dept.hodId === user.id) shouldNotify = true;
        } else {
          shouldNotify = true;
        }
      } else if (user.role === "warden" || user.role === "principal" || user.role === "super_admin") {
        shouldNotify = true; // All wardens, principals, super admins informed
      }

      if (shouldNotify) {
        await db.insert(notificationsTable).values({
          userId: user.id,
          type: "exit_recorded",
          title,
          message,
          isRead: false,
          leaveId: leaveId || undefined,
        });

        if (user.email) {
          await sendEmailNotification(user.id, leaveId || undefined, user.email, title, message);
        }
      }
    }

    // Direct Parent Alerts (Email / SMS / WhatsApp)
    if (student.parentEmail) {
      await sendEmailNotification(student.id, leaveId || undefined, student.parentEmail, title, message);
    }
    if (student.parentPhone) {
      await sendSmsNotification(student.id, leaveId || undefined, student.parentPhone, message);
    }
    if (student.parentWhatsapp) {
      await sendWhatsAppNotification(student.id, leaveId || undefined, student.parentWhatsapp, message);
    }
  } catch (error) {
    console.error("Failed to notify student exit:", error);
  }
}

