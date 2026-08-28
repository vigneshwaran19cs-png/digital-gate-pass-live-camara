import { Router, type IRouter } from "express";
import { eq, and, SQL, inArray, count, gte } from "drizzle-orm";
import { db, leavesTable, usersTable, outpassesTable, gateLogsTable, notificationsTable, departmentsTable, classesTable, activityLogsTable } from "@workspace/db";
import {
  ListLeavesQueryParams,
  CreateLeaveBody,
  GetLeaveParams,
  UpdateLeaveParams,
  UpdateLeaveBody,
  DeleteLeaveParams,
  ApproveLeaveParams,
  ApproveLeaveBody,
  RejectLeaveParams,
  RejectLeaveBody,
  RecordParentCallParams,
  RecordParentCallBody,
  BulkApproveLeavesBody,
} from "@workspace/api-zod";
import { generateOutpassCode } from "../lib/outpass";
import { processLeaveNotifications, sendEmailNotification, sendSmsNotification, sendWhatsAppNotification } from "../lib/notifications";
import { parseToken, resolveUserId } from "./auth";

const router: IRouter = Router();

async function generateAndAttachOutpass(leaveId: number, studentId: number, approverName = "Super Admin") {
  const [existing] = await db.select().from(outpassesTable).where(eq(outpassesTable.leaveId, leaveId));
  if (existing) return existing;

  const year = new Date().getFullYear();
  const [{ value: existingCount }] = await db.select({ value: count() }).from(outpassesTable)
    .where(gte(outpassesTable.createdAt, new Date(`${year}-01-01`)));
  const { code, qrData, gatePassNumber } = generateOutpassCode(leaveId, studentId, (existingCount ?? 0) + 1);

  const [tutorUser] = await db.select().from(usersTable).where(eq(usersTable.role, "tutor")).limit(1);
  const [hodUser] = await db.select().from(usersTable).where(eq(usersTable.role, "hod")).limit(1);
  const [principalUser] = await db.select().from(usersTable).where(eq(usersTable.role, "principal")).limit(1);
  const [wardenUser] = await db.select().from(usersTable).where(eq(usersTable.role, "warden")).limit(1);
  const now = new Date().toISOString();

  const staffDetails = JSON.stringify({
    tutor: { name: tutorUser?.name ?? "Class Tutor", designation: "Tutor", approvedAt: now },
    hod: { name: hodUser?.name ?? "Head of Department", designation: "HOD", approvedAt: now },
    principal: { name: principalUser?.name ?? "Dr. Principal", designation: "Principal", approvedAt: now },
    warden: { name: wardenUser?.name ?? "Hostel Warden", designation: "Warden", approvedAt: now },
    admin: { name: approverName, designation: "Super Admin", approvedAt: now },
  });

  const [{ id: outpassId }] = await db.insert(outpassesTable).values({
    leaveId,
    studentId,
    outpassCode: code,
    gatePassNumber,
    qrData,
    staffDetails,
    status: "verified",
    approvedByWarden: wardenUser?.name ?? "Hostel Warden",
    approvedByTutor: tutorUser?.name ?? "Class Tutor",
    approvedByHod: hodUser?.name ?? "Head of Department",
    approvedByPrincipal: principalUser?.name ?? "Principal",
  }).$returningId();

  await db.update(leavesTable).set({ outpassId, status: "fully_approved", currentStep: "completed" }).where(eq(leavesTable.id, leaveId));
  return { id: outpassId, code, gatePassNumber };
}

async function getLeaveWithStudent(id: number) {
  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, id));
  if (!leave) return null;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
  const { passwordHash: _, ...safeStudent } = student ?? {};
  return { ...leave, student: safeStudent };
}

async function createNotification(userId: number, type: any, title: string, message: string, leaveId?: number, outpassId?: number) {
  await db.insert(notificationsTable).values({ userId, type, title, message, isRead: false, leaveId, outpassId });
}

router.get("/leaves", async (req, res): Promise<void> => {
  const parsed = ListLeavesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, studentId, departmentId, classId } = parsed.data;

  // Resolve the authenticated caller from JWT token (or x-user-id fallback)
  const callerId = resolveUserId(req);
  let requesterRole: string | null = null;
  let requesterClassId: number | null = null;
  let requesterDeptId: number | null = null;

  if (callerId) {
    const [requester] = await db.select().from(usersTable).where(eq(usersTable.id, callerId));
    if (requester) {
      requesterRole = requester.role;
      if (requester.role === "hod") {
        const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.hodId, callerId));
        if (dept) requesterDeptId = dept.id;
      } else if (requester.role === "tutor") {
        const [cls] = await db.select().from(classesTable).where(eq(classesTable.tutorId, callerId));
        if (cls) requesterClassId = cls.id;
      }
    }
  }

  // Explicit query-param overrides (admin / student use cases)
  const forcedDepartmentId = departmentId || requesterDeptId || null;
  // Only use forcedClassId when a class is actually assigned to the tutor
  const forcedClassId = classId || requesterClassId || null;

  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(leavesTable.status, status as any));

    // Enforce sequential step filtering so each role only sees actionable requests
    if (requesterRole === "tutor" && status === "warden_approved") {
      conditions.push(eq(leavesTable.currentStep, "tutor"));
    } else if (requesterRole === "hod" && status === "tutor_approved") {
      conditions.push(eq(leavesTable.currentStep, "hod"));
    } else if (requesterRole === "principal" && status === "hod_approved") {
      conditions.push(eq(leavesTable.currentStep, "principal"));
    } else if (requesterRole === "warden") {
      if (status === "pending") conditions.push(eq(leavesTable.currentStep, "warden"));
      else if (status === "principal_approved") conditions.push(eq(leavesTable.currentStep, "warden_final"));
    }
  }
  if (studentId) conditions.push(eq(leavesTable.studentId, studentId));

  const leaves = conditions.length > 0
    ? await db.select().from(leavesTable).where(and(...conditions)).orderBy(leavesTable.createdAt)
    : await db.select().from(leavesTable).orderBy(leavesTable.createdAt);

  // Requirement 3: Sort emergency leaves to the TOP of the list
  leaves.sort((a: any, b: any) => {
    const aEmerg = a.isEmergency === "true" || a.leaveType === "family_emergency" || a.leaveType === "emergency";
    const bEmerg = b.isEmergency === "true" || b.leaveType === "family_emergency" || b.leaveType === "emergency";
    if (aEmerg && !bEmerg) return -1;
    if (!aEmerg && bEmerg) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter out Emergency leaves for Tutor and HOD roles (Emergency routing is Student -> Warden -> Principal)
  const filteredLeaves = leaves.filter((l: any) => {
    const isEmerg = l.isEmergency === "true" || l.leaveType === "family_emergency" || l.leaveType === "emergency";
    if ((requesterRole === "tutor" || requesterRole === "hod") && isEmerg) {
      return false;
    }
    return true;
  });

  // Attach student info and apply department/class scoping
  const withStudents = await Promise.all(filteredLeaves.map(async (leave) => {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
    if (!student) return null;

    // Scope HOD to their department (only when they have one assigned)
    if (forcedDepartmentId && student.departmentId !== forcedDepartmentId) return null;

    // Scope Tutor to their assigned class — but ONLY when the tutor has an
    // actual class assignment AND the student also has a classId.
    // If neither is set (demo seed), skip class filtering so the tutor can
    // still see the requests.
    if (forcedClassId && student.classId != null && student.classId !== forcedClassId) return null;

    const { passwordHash: _, ...safeStudent } = student;
    return { ...leave, student: safeStudent };
  }));

  res.json(withStudents.filter(Boolean));
});

router.post("/leaves", async (req, res): Promise<void> => {
  // Support studentId from body (for admin manual entry) or header
  const studentId = req.body.studentId ? Number(req.body.studentId) : (req.headers["x-student-id"] ? parseInt(String(req.headers["x-student-id"]), 10) : 1);

  if (!req.body.reason || !req.body.destination || !req.body.fromDate || !req.body.toDate) {
    res.status(400).json({ error: "Reason, destination, fromDate, and toDate are required" });
    return;
  }

  const fromDateStr = typeof req.body.fromDate === "string" ? req.body.fromDate.split("T")[0] : new Date(req.body.fromDate).toISOString().split("T")[0];
  const toDateStr = typeof req.body.toDate === "string" ? req.body.toDate.split("T")[0] : new Date(req.body.toDate).toISOString().split("T")[0];
  const passType = req.body.passType || "hostel_leave";
  const leaveType = req.body.leaveType || "personal_work";
  const initialStatus = req.body.status || "pending";
  const initialStep = req.body.currentStep || (initialStatus === "fully_approved" ? "completed" : "warden");

  // Calculate AI Risk Score
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  const durationDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)));
  
  let riskScore = 15;
  if (durationDays > 7) riskScore += 40;
  else if (durationDays > 3) riskScore += 20;

  if (["family_emergency", "hospital_visit", "medical_leave"].includes(leaveType)) {
    riskScore += 25;
  }

  const pastLeaves = await db.select({ value: count() }).from(leavesTable).where(eq(leavesTable.studentId, studentId));
  const pastCount = pastLeaves[0]?.value ?? 0;
  if (pastCount > 5) riskScore += 20;

  let riskLevel: "low" | "medium" | "high" = "low";
  if (riskScore >= 60) riskLevel = "high";
  else if (riskScore >= 35) riskLevel = "medium";

  const aiValidationNotes = `AI Risk Score: ${riskScore}/100 (${riskLevel.toUpperCase()}). Evaluated ${durationDays} day(s) duration & ${pastCount} past leave history.`;

  const isEmergencyFlag = (req.body.isEmergency === true || req.body.isEmergency === "true" || ["emergency", "family_emergency"].includes(leaveType)) ? "true" : "false";

  const [{ id }] = await db.insert(leavesTable).values({
    studentId,
    passType: passType as any,
    leaveType: leaveType as any,
    reason: req.body.reason,
    destination: req.body.destination,
    fromDate: fromDateStr,
    toDate: toDateStr,
    status: initialStatus as any,
    currentStep: initialStep as any,
    riskScore,
    riskLevel,
    aiValidationNotes,
    medicalDocUrl: req.body.medicalDocUrl || null,
    fraudStatus: "genuine",
    fraudNotes: "Genuine / Verified",
    isEmergency: isEmergencyFlag,
    tutorRemarks: req.body.tutorRemarks || null,
    hodRemarks: req.body.hodRemarks || null,
    principalRemarks: req.body.principalRemarks || null,
    wardenRemarks: req.body.wardenRemarks || null,
    parentCallStatus: req.body.parentCallStatus || (initialStatus === "fully_approved" ? "confirmed" : "pending"),
    parentCallNotes: req.body.parentCallNotes || null,
    aiGeneratedLetter: req.body.aiGeneratedLetter || null,
  }).$returningId();

  // If created directly as fully_approved (by Super Admin), auto-generate outpass
  if (initialStatus === "fully_approved") {
    await generateAndAttachOutpass(id, studentId, "Super Admin (Direct Creation)");
  }

  // Retrieve student and details for log
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  if (student) {
    await db.insert(activityLogsTable).values({
      userId: student.id,
      role: student.role,
      action: initialStatus === "fully_approved" ? "Admin Created Approved Leave" : "Student Applied Leave",
      details: { leaveId: id, destination: req.body.destination },
      ipAddress: req.ip || null,
      device: req.headers["user-agent"] || null,
    });
  }

  res.status(201).json(await getLeaveWithStudent(id));
});

router.get("/leaves/similar-groups", async (req, res): Promise<void> => {
  const leaves = await db.select().from(leavesTable)
    .where(and(eq(leavesTable.status, "pending")));

  // Group by destination + fromDate + toDate
  const groupMap = new Map<string, typeof leaves>();
  for (const leave of leaves) {
    const key = `${leave.destination}|${leave.fromDate}|${leave.toDate}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(leave);
  }

  const groups = [];
  for (const [key, groupLeaves] of groupMap.entries()) {
    if (groupLeaves.length > 1) {
      const withStudents = await Promise.all(groupLeaves.map(async (l) => {
        const [student] = await db.select().from(usersTable).where(eq(usersTable.id, l.studentId));
        const { passwordHash: _, ...safeStudent } = student ?? {};
        return { ...l, student: safeStudent };
      }));
      groups.push({
        destination: groupLeaves[0].destination,
        fromDate: groupLeaves[0].fromDate,
        toDate: groupLeaves[0].toDate,
        reason: groupLeaves[0].reason,
        department: null,
        count: groupLeaves.length,
        leaveIds: groupLeaves.map(l => l.id),
        leaves: withStudents,
      });
    }
  }

  res.json(groups);
});

router.get("/leaves/:id", async (req, res): Promise<void> => {
  const params = GetLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const leave = await getLeaveWithStudent(params.data.id);
  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  res.json(leave);
});

router.patch("/leaves/:id", async (req, res): Promise<void> => {
  const params = UpdateLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existingLeave] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));
  if (!existingLeave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  const updateData: any = { ...req.body };
  if (updateData.fromDate) {
    updateData.fromDate = typeof updateData.fromDate === "string" ? updateData.fromDate.split("T")[0] : new Date(updateData.fromDate).toISOString().split("T")[0];
  }
  if (updateData.toDate) {
    updateData.toDate = typeof updateData.toDate === "string" ? updateData.toDate.split("T")[0] : new Date(updateData.toDate).toISOString().split("T")[0];
  }
  if (updateData.isEmergency !== undefined) {
    updateData.isEmergency = updateData.isEmergency === true || updateData.isEmergency === "true" ? "true" : "false";
  }

  await db.update(leavesTable)
    .set(updateData)
    .where(eq(leavesTable.id, params.data.id));

  // If status is updated to fully_approved, ensure an outpass exists
  if (updateData.status === "fully_approved") {
    await generateAndAttachOutpass(params.data.id, existingLeave.studentId, "Super Admin Master Update");
  }

  const updated = await getLeaveWithStudent(params.data.id);
  res.json(updated);
});

router.delete("/leaves/:id", async (req, res): Promise<void> => {
  const params = DeleteLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));
  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  // Hard delete related gate logs, outpasses, and leave record
  await db.delete(gateLogsTable).where(eq(gateLogsTable.leaveId, params.data.id));
  await db.delete(outpassesTable).where(eq(outpassesTable.leaveId, params.data.id));
  await db.delete(leavesTable).where(eq(leavesTable.id, params.data.id));

  res.sendStatus(204);
});

// Super Admin Direct Force Approval
router.post("/leaves/:id/super-approve", async (req, res): Promise<void> => {
  const leaveId = parseInt(req.params.id, 10);
  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, leaveId));
  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  const remarks = req.body.remarks || "Direct Super Admin Bypass & Instant Gate Pass Issued";
  await db.update(leavesTable).set({
    status: "fully_approved",
    currentStep: "completed",
    tutorRemarks: leave.tutorRemarks || remarks,
    hodRemarks: leave.hodRemarks || remarks,
    principalRemarks: leave.principalRemarks || remarks,
    wardenRemarks: leave.wardenRemarks ? `${leave.wardenRemarks} | Super Admin: ${remarks}` : remarks,
    parentCallStatus: "confirmed",
    parentCallNotes: leave.parentCallNotes || "Verified & Authorized by Super Admin ERP",
  }).where(eq(leavesTable.id, leaveId));

  await generateAndAttachOutpass(leaveId, leave.studentId, "Super Admin ERP");
  res.json(await getLeaveWithStudent(leaveId));
});

router.post("/leaves/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ApproveLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));
  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized: No valid authentication" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized: User not found" });
    return;
  }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
  if (!student) {
    res.status(400).json({ error: "Student not found" });
    return;
  }

  const remarksField = parsed.data.remarks || null;
  let newStatus: typeof leave.status = leave.status;
  let newStep: typeof leave.currentStep = leave.currentStep;
  let updateFields: Partial<typeof leavesTable.$inferSelect> = {};

  const isOuting = leave.passType === "outing_pass";
  const isEmergencyLeave = (leave as any).isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency";

  switch (leave.currentStep) {
    case "warden":
      if (user.role !== "warden") {
        res.status(403).json({ error: "Only wardens can verify leave requests initially" });
        return;
      }
      if (isOuting) {
        newStatus = "fully_approved";
        newStep = "completed";
        updateFields = { wardenRemarks: remarksField, status: newStatus, currentStep: newStep };
      } else if (isEmergencyLeave) {
        // Requirement 4 & 7: Emergency Leave workflow goes directly from Warden -> Principal
        newStatus = "warden_approved";
        newStep = "principal";
        updateFields = { wardenRemarks: remarksField, status: newStatus, currentStep: newStep };
      } else {
        newStatus = "warden_approved";
        newStep = "tutor";
        updateFields = { wardenRemarks: remarksField, status: newStatus, currentStep: newStep };
      }
      break;
    case "tutor":
      if (user.role !== "tutor") {
        res.status(403).json({ error: "Only tutors can approve leave requests at this stage" });
        return;
      }
      if (isEmergencyLeave) {
        newStatus = "warden_approved";
        newStep = "principal";
        updateFields = { tutorRemarks: remarksField || "Forwarded emergency leave to Principal", status: newStatus, currentStep: newStep };
        break;
      }
      // Verify assigned tutor (Relaxed for demo: allow if student has no class, or tutor is not assigned to any class)
      if (student.classId) {
        const [studentClass] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
        const [myClass] = await db.select().from(classesTable).where(eq(classesTable.tutorId, user.id));
        if (studentClass && myClass && studentClass.tutorId !== user.id) {
          res.status(403).json({ error: "You are not the assigned tutor for this student" });
          return;
        }
      }
      // Verify parent permission
      if (!leave.parentCallStatus || !["confirmed", "not_reachable", "completed"].includes(leave.parentCallStatus)) {
        res.status(400).json({ error: "Parent call verification must be completed before tutor approval" });
        return;
      }
      newStatus = "tutor_approved";
      newStep = "hod";
      updateFields = { tutorRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    case "hod":
      if (user.role !== "hod") {
        res.status(403).json({ error: "Only HODs can approve leave requests at this stage" });
        return;
      }
      if (isEmergencyLeave) {
        newStatus = "hod_approved";
        newStep = "principal";
        updateFields = { hodRemarks: remarksField || "Forwarded emergency leave to Principal", status: newStatus, currentStep: newStep };
        break;
      }
      // Verify assigned HOD (Relaxed for demo)
      if (student.departmentId) {
        const [studentDept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, student.departmentId));
        const [myDept] = await db.select().from(departmentsTable).where(eq(departmentsTable.hodId, user.id));
        if (studentDept && myDept && studentDept.hodId !== user.id) {
          res.status(403).json({ error: "You are not the assigned HOD for this student's department" });
          return;
        }
      }
      newStatus = "hod_approved";
      newStep = "principal";
      updateFields = { hodRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    case "principal":
      if (user.role !== "principal") {
        res.status(403).json({ error: "Only the principal can approve leave requests at this stage" });
        return;
      }
      if (isEmergencyLeave) {
        // Requirement 4 & 7: Emergency leave principal approval completes the leave directly
        newStatus = "fully_approved";
        newStep = "completed";
        updateFields = { principalRemarks: remarksField, status: newStatus, currentStep: newStep };
      } else {
        newStatus = "principal_approved";
        newStep = "warden_final";
        updateFields = { principalRemarks: remarksField, status: newStatus, currentStep: newStep };
      }
      break;
    case "warden_final":
      if (user.role !== "warden") {
        res.status(403).json({ error: "Only wardens can perform final verification" });
        return;
      }
      newStatus = "fully_approved";
      newStep = "completed";
      updateFields = { 
        wardenRemarks: leave.wardenRemarks ? `${leave.wardenRemarks} | Final: ${remarksField}` : remarksField, 
        status: newStatus, 
        currentStep: newStep 
      };
      break;
    default:
      res.status(400).json({ error: "Leave is not in an approvable state" });
      return;
  }
  
  // Mapping currentStep (which is now newStep) to the actual role string in DB
  const stepToRole: Record<string, string> = {
    "tutor": "tutor",
    "hod": "hod",
    "principal": "principal",
    "warden_final": "warden"
  };
  const nextRoleToNotify = stepToRole[newStep];

  await db.update(leavesTable)
    .set(updateFields)
    .where(eq(leavesTable.id, params.data.id));

  const [updated] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));

  // Activity Log
  const stepLabels: Record<string, string> = {
    warden: "Warden Verification",
    tutor: "Tutor Approved Leave",
    hod: "HOD Approved Leave",
    principal: "Principal Approved Leave",
    warden_final: "Final Warden Verified"
  };
  await db.insert(activityLogsTable).values({
    userId: user.id,
    role: user.role,
    action: stepLabels[leave.currentStep] || "Approved Leave Request",
    details: { leaveId: updated.id, remarks: remarksField, fromStep: leave.currentStep, toStep: newStep },
    ipAddress: req.ip || null,
    device: req.headers["user-agent"] || null,
  });

  // Generate outpass when fully approved
  if (newStatus === "fully_approved") {
    const year = new Date().getFullYear();
    const [{ value: existingCount }] = await db.select({ value: count() }).from(outpassesTable)
      .where(gte(outpassesTable.createdAt, new Date(`${year}-01-01`)));
    const { code, qrData, gatePassNumber } = generateOutpassCode(updated.id, updated.studentId, (existingCount ?? 0) + 1);

    const [tutorUser] = await db.select().from(usersTable).where(eq(usersTable.role, "tutor")).limit(1);
    const [hodUser] = await db.select().from(usersTable).where(eq(usersTable.role, "hod")).limit(1);
    const [principalUser] = await db.select().from(usersTable).where(eq(usersTable.role, "principal")).limit(1);
    const [wardenUser] = await db.select().from(usersTable).where(eq(usersTable.role, "warden")).limit(1);
    const now = new Date().toISOString();

    let staffDetailsObj: any = {};
    if (isEmergencyLeave) {
      staffDetailsObj = {
        warden: { name: wardenUser?.name ?? "Hostel Warden", designation: "Warden", approvedAt: now },
        principal: { name: principalUser?.name ?? "Dr. Principal", designation: "Principal", approvedAt: now },
      };
    } else {
      staffDetailsObj = {
        tutor: { name: tutorUser?.name ?? "Class Tutor", designation: "Tutor", approvedAt: now },
        hod: { name: hodUser?.name ?? "Head of Department", designation: "HOD", approvedAt: now },
        principal: { name: principalUser?.name ?? "Dr. Principal", designation: "Principal", approvedAt: now },
        warden: { name: wardenUser?.name ?? "Hostel Warden", designation: "Warden", approvedAt: now },
      };
    }
    const staffDetails = JSON.stringify(staffDetailsObj);

    const [{ id: outpassId }] = await db.insert(outpassesTable).values({
      leaveId: updated.id,
      studentId: updated.studentId,
      outpassCode: code,
      gatePassNumber,
      qrData,
      staffDetails,
      status: "generated",
    }).$returningId();

    await db.update(leavesTable).set({ outpassId }).where(eq(leavesTable.id, updated.id));
    
    // Add Activity Log for outpass generation
    await db.insert(activityLogsTable).values({
      userId: user.id,
      role: user.role,
      action: "Outpass Generated",
      details: { leaveId: updated.id, outpassId },
      ipAddress: req.ip || null,
      device: req.headers["user-agent"] || null,
    });

    await createNotification(updated.studentId, "outpass_generated", "Outpass Ready!", "Your leave has been fully approved and your digital outpass is ready.", updated.id, outpassId);
    
    // Notify Student and Parent
    await processLeaveNotifications(updated.studentId, updated.id, "outpass_generated", "Outpass Ready!", "Your leave has been fully approved and your digital outpass is ready.");
  } else if (leave.currentStep === "warden" && newStep === "tutor") {
    // Initial Warden verification approved -> Send parent notification & request remains pending on parent verification
    if (student.parentEmail) {
      await sendEmailNotification(student.id, updated.id, student.parentEmail, "Leave Request Verification", `Your ward ${student.name} has requested leave to ${updated.destination}. Please respond.`);
    }
    if (student.parentPhone) {
      await sendSmsNotification(student.id, updated.id, student.parentPhone, `Your ward ${student.name} has requested leave to ${updated.destination}.`);
    }
    if (student.parentWhatsapp) {
      await sendWhatsAppNotification(student.id, updated.id, student.parentWhatsapp, `Your ward ${student.name} has requested leave to ${updated.destination}.`);
    }
    // Record parent notified in notifications table
    await createNotification(student.id, "parent_notified", "Parent Notified", `Parent notification sent for ${student.name}'s leave request.`, updated.id);
  } else {
    await createNotification(updated.studentId, "leave_approved", "Leave Approved", `Your leave request has been approved at the ${leave.currentStep} stage.`, updated.id);
    
    // Notify next role
    await processLeaveNotifications(updated.studentId, updated.id, "leave_approved", "Leave Approved", `Your leave request has been approved at the ${leave.currentStep} stage.`, nextRoleToNotify);
  }

  res.json(await getLeaveWithStudent(params.data.id));
});

router.post("/leaves/:id/reject", async (req, res): Promise<void> => {
  const params = RejectLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RejectLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));
  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized: No valid authentication" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized: User not found" });
    return;
  }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
  if (!student) {
    res.status(400).json({ error: "Student not found" });
    return;
  }

  // Authorization check for rejection
  switch (leave.currentStep) {
    case "warden":
      if (user.role !== "warden") {
        res.status(403).json({ error: "Only wardens can reject leave requests at this stage" });
        return;
      }
      break;
    case "tutor":
      if (user.role !== "tutor") {
        res.status(403).json({ error: "Only tutors can reject leave requests at this stage" });
        return;
      }
      // Verify assigned tutor (Relaxed for demo)
      if (student.classId) {
        const [studentClass] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
        const [myClass] = await db.select().from(classesTable).where(eq(classesTable.tutorId, user.id));
        if (studentClass && myClass && studentClass.tutorId !== user.id) {
          res.status(403).json({ error: "You are not the assigned tutor for this student" });
          return;
        }
      }
      break;
    case "hod":
      if (user.role !== "hod") {
        res.status(403).json({ error: "Only HODs can reject leave requests at this stage" });
        return;
      }
      // Verify assigned HOD (Relaxed for demo)
      if (student.departmentId) {
        const [studentDept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, student.departmentId));
        const [myDept] = await db.select().from(departmentsTable).where(eq(departmentsTable.hodId, user.id));
        if (studentDept && myDept && studentDept.hodId !== user.id) {
          res.status(403).json({ error: "You are not the assigned HOD for this student's department" });
          return;
        }
      }
      break;
    case "principal":
      if (user.role !== "principal") {
        res.status(403).json({ error: "Only the principal can reject leave requests at this stage" });
        return;
      }
      break;
    case "warden_final":
      if (user.role !== "warden") {
        res.status(403).json({ error: "Only wardens can reject leave requests at this stage" });
        return;
      }
      break;
    default:
      res.status(400).json({ error: "Leave is not in a rejectable state" });
      return;
  }

  const remarksCol = leave.currentStep === "warden_final" ? "wardenRemarks" : `${leave.currentStep}Remarks`;
  await db.update(leavesTable)
    .set({ status: "rejected", currentStep: "rejected", [remarksCol]: parsed.data.remarks })
    .where(eq(leavesTable.id, params.data.id));

  const [updated] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));

  // Activity Log
  await db.insert(activityLogsTable).values({
    userId: user.id,
    role: user.role,
    action: "Leave Request Rejected",
    details: { leaveId: leave.id, remarks: parsed.data.remarks, rejectedBy: user.id, role: user.role },
    ipAddress: req.ip || null,
    device: req.headers["user-agent"] || null,
  });

  // Notify student and parent (if parent permission was already initiated)
  await createNotification(leave.studentId, "leave_rejected", "Leave Rejected", `Your leave request was rejected: ${parsed.data.remarks}`, leave.id);
  if (student.email) {
    await sendEmailNotification(student.id, leave.id, student.email, "Leave Request Rejected", `Your leave request was rejected: ${parsed.data.remarks}`);
  }
  if (leave.parentCallStatus && student.parentEmail) {
    await sendEmailNotification(student.id, leave.id, student.parentEmail, "Leave Request Rejected", `The leave request for your ward ${student.name} was rejected: ${parsed.data.remarks}`);
  }

  res.json(await getLeaveWithStudent(updated.id));
});

router.post("/leaves/:id/parent-call", async (req, res): Promise<void> => {
  const params = RecordParentCallParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RecordParentCallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(leavesTable)
    .set({ parentCallStatus: parsed.data.callStatus as any, parentCallNotes: parsed.data.notes || null })
    .where(eq(leavesTable.id, params.data.id));

  const [updated] = await db.select().from(leavesTable).where(eq(leavesTable.id, params.data.id));

  if (!updated) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  // Get student info for class and tutor lookup
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, updated.studentId));

  // Activity Log
  const userId = resolveUserId(req);
  if (userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user) {
      await db.insert(activityLogsTable).values({
        userId: user.id,
        role: user.role,
        action: "Parent Permission Recorded",
        details: { leaveId: updated.id, callStatus: parsed.data.callStatus, notes: parsed.data.notes },
        ipAddress: req.ip || null,
        device: req.headers["user-agent"] || null,
      });
    }
  }

  // If parent call is confirmed: trigger next step notification to the Tutor!
  if (["confirmed", "not_reachable", "completed"].includes(parsed.data.callStatus)) {
    // Notify the assigned Tutor
    await processLeaveNotifications(
      updated.studentId,
      updated.id,
      "leave_approved", 
      "Leave Request Requires Your Approval",
      `Leave request from ${student?.name || "Student"} has parent permission confirmed and requires your approval.`,
      "tutor"
    );
  }

  res.json(await getLeaveWithStudent(updated.id));
});

router.post("/leaves/bulk-approve", async (req, res): Promise<void> => {
  const parsed = BulkApproveLeavesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { leaveIds, action, remarks } = parsed.data;
  let succeeded = 0;
  let failed = 0;

  for (const id of leaveIds) {
    try {
      if (action === "approve") {
        const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, id));
        if (!leave) { failed++; continue; }

        let newStatus: typeof leave.status = leave.status;
        let newStep: typeof leave.currentStep = leave.currentStep;
        let updateFields: any = {};

        const isOuting = leave.passType === "outing_pass";

        switch (leave.currentStep) {
          case "warden": 
            if (isOuting) {
              newStatus = "fully_approved"; newStep = "completed"; updateFields = { wardenRemarks: remarks || null, status: newStatus, currentStep: newStep };
            } else {
              newStatus = "warden_approved"; newStep = "tutor"; updateFields = { wardenRemarks: remarks || null, status: newStatus, currentStep: newStep }; 
            }
            break;
          case "tutor": 
            if (isOuting) { failed++; continue; }
            newStatus = "tutor_approved"; newStep = "hod"; updateFields = { tutorRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "hod": newStatus = "hod_approved"; newStep = "principal"; updateFields = { hodRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "principal": newStatus = "principal_approved"; newStep = "warden_final"; updateFields = { principalRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "warden_final": newStatus = "fully_approved"; newStep = "completed"; updateFields = { wardenRemarks: leave.wardenRemarks ? `${leave.wardenRemarks} | Final: ${remarks || ''}` : remarks || null, status: newStatus, currentStep: newStep }; break;
          default: failed++; continue;
        }

        await db.update(leavesTable).set(updateFields).where(eq(leavesTable.id, id));

        if (newStatus === "fully_approved") {
          const yr = new Date().getFullYear();
          const [{ value: cnt }] = await db.select({ value: count() }).from(outpassesTable)
            .where(gte(outpassesTable.createdAt, new Date(`${yr}-01-01`)));
          const { code, qrData, gatePassNumber } = generateOutpassCode(id, leave.studentId, (cnt ?? 0) + 1);
          const [tutorU] = await db.select().from(usersTable).where(eq(usersTable.role, "tutor")).limit(1);
          const [hodU] = await db.select().from(usersTable).where(eq(usersTable.role, "hod")).limit(1);
          const [principalU] = await db.select().from(usersTable).where(eq(usersTable.role, "principal")).limit(1);
          const [wardenU] = await db.select().from(usersTable).where(eq(usersTable.role, "warden")).limit(1);
          const nowIso = new Date().toISOString();
          const sd = JSON.stringify({
            tutor: { name: tutorU?.name ?? "Tutor", designation: "Class Tutor", approvedAt: nowIso },
            hod: { name: hodU?.name ?? "HOD", designation: "Head of Department", approvedAt: nowIso },
            principal: { name: principalU?.name ?? "Principal", designation: "Principal", approvedAt: nowIso },
            warden: { name: wardenU?.name ?? "Warden", designation: "Hostel Warden", approvedAt: nowIso },
          });
          const [{ id: outpassId }] = await db.insert(outpassesTable).values({ leaveId: id, studentId: leave.studentId, outpassCode: code, gatePassNumber, qrData, staffDetails: sd, status: "generated" }).$returningId();
          await db.update(leavesTable).set({ outpassId }).where(eq(leavesTable.id, id));
        }
      } else {
        await db.update(leavesTable).set({ status: "rejected", currentStep: "rejected", wardenRemarks: remarks || "Bulk rejected" }).where(eq(leavesTable.id, id));
      }
      succeeded++;
    } catch {
      failed++;
    }
  }

  res.json({ processed: leaveIds.length, succeeded, failed });
});

export default router;
