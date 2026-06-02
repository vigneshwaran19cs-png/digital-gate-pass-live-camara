import { Router, type IRouter } from "express";
import { eq, and, SQL, inArray } from "drizzle-orm";
import { db, leavesTable, usersTable, outpassesTable, notificationsTable } from "@workspace/db";
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

const router: IRouter = Router();

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

  const { status, studentId, department, page = 1, limit = 50 } = parsed.data;
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(leavesTable.status, status as any));
  if (studentId) conditions.push(eq(leavesTable.studentId, studentId));

  let leaves = conditions.length > 0
    ? await db.select().from(leavesTable).where(and(...conditions)).orderBy(leavesTable.createdAt)
    : await db.select().from(leavesTable).orderBy(leavesTable.createdAt);

  // Attach student info
  const withStudents = await Promise.all(leaves.map(async (leave) => {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
    if (!student) return { ...leave, student: null };
    if (department && student.department !== department) return null;
    const { passwordHash: _, ...safeStudent } = student;
    return { ...leave, student: safeStudent };
  }));

  res.json(withStudents.filter(Boolean));
});

router.post("/leaves", async (req, res): Promise<void> => {
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Use studentId 1 as default for demo (no auth middleware)
  const studentIdHeader = req.headers["x-student-id"];
  const studentId = studentIdHeader ? parseInt(String(studentIdHeader), 10) : 1;

  const [leave] = await db.insert(leavesTable).values({
    ...parsed.data,
    studentId,
    status: "pending",
    currentStep: "warden",
  }).returning();

  // Notify warden
  const wardens = await db.select().from(usersTable).where(eq(usersTable.role, "warden"));
  for (const w of wardens) {
    await createNotification(w.id, "leave_submitted", "New Leave Request", `A student has applied for leave to ${leave.destination}`, leave.id);
  }

  res.status(201).json(await getLeaveWithStudent(leave.id));
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

  const parsed = UpdateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(leavesTable)
    .set(parsed.data)
    .where(eq(leavesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  res.json(await getLeaveWithStudent(updated.id));
});

router.delete("/leaves/:id", async (req, res): Promise<void> => {
  const params = DeleteLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [leave] = await db.update(leavesTable)
    .set({ status: "cancelled" })
    .where(eq(leavesTable.id, params.data.id))
    .returning();

  if (!leave) {
    res.status(404).json({ error: "Leave not found" });
    return;
  }

  res.sendStatus(204);
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

  const remarksField = parsed.data.remarks || null;
  let newStatus: typeof leave.status = leave.status;
  let newStep: typeof leave.currentStep = leave.currentStep;
  let updateFields: Partial<typeof leavesTable.$inferSelect> = {};

  switch (leave.currentStep) {
    case "warden":
      newStatus = "warden_approved";
      newStep = "tutor";
      updateFields = { wardenRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    case "tutor":
      newStatus = "tutor_approved";
      newStep = "hod";
      updateFields = { tutorRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    case "hod":
      newStatus = "hod_approved";
      newStep = "principal";
      updateFields = { hodRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    case "principal": {
      newStatus = "fully_approved";
      newStep = "completed";
      updateFields = { principalRemarks: remarksField, status: newStatus, currentStep: newStep };
      break;
    }
    default:
      res.status(400).json({ error: "Leave is not in an approvable state" });
      return;
  }

  const [updated] = await db.update(leavesTable)
    .set(updateFields)
    .where(eq(leavesTable.id, params.data.id))
    .returning();

  // Generate outpass when fully approved
  if (newStatus === "fully_approved") {
    const { code, qrData } = generateOutpassCode(updated.id, updated.studentId);
    const [outpass] = await db.insert(outpassesTable).values({
      leaveId: updated.id,
      studentId: updated.studentId,
      outpassCode: code,
      qrData,
      status: "generated",
    }).returning();

    await db.update(leavesTable).set({ outpassId: outpass.id }).where(eq(leavesTable.id, updated.id));
    await createNotification(updated.studentId, "outpass_generated", "Outpass Ready!", "Your leave has been fully approved and your digital outpass is ready.", updated.id, outpass.id);
  } else {
    await createNotification(updated.studentId, "leave_approved", "Leave Approved", `Your leave request has been approved at the ${leave.currentStep} stage.`, updated.id);
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

  const rejectField = `${leave.currentStep}Remarks` as any;
  const [updated] = await db.update(leavesTable)
    .set({ status: "rejected", currentStep: "rejected", [rejectField]: parsed.data.remarks })
    .where(eq(leavesTable.id, params.data.id))
    .returning();

  await createNotification(leave.studentId, "leave_rejected", "Leave Rejected", `Your leave request was rejected: ${parsed.data.remarks}`, leave.id);

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

  const [updated] = await db.update(leavesTable)
    .set({ parentCallStatus: parsed.data.callStatus as any, parentCallNotes: parsed.data.notes || null })
    .where(eq(leavesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Leave not found" });
    return;
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

        switch (leave.currentStep) {
          case "warden": newStatus = "warden_approved"; newStep = "tutor"; updateFields = { wardenRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "tutor": newStatus = "tutor_approved"; newStep = "hod"; updateFields = { tutorRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "hod": newStatus = "hod_approved"; newStep = "principal"; updateFields = { hodRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          case "principal": newStatus = "fully_approved"; newStep = "completed"; updateFields = { principalRemarks: remarks || null, status: newStatus, currentStep: newStep }; break;
          default: failed++; continue;
        }

        await db.update(leavesTable).set(updateFields).where(eq(leavesTable.id, id));

        if (newStatus === "fully_approved") {
          const { code, qrData } = generateOutpassCode(id, leave.studentId);
          const [outpass] = await db.insert(outpassesTable).values({ leaveId: id, studentId: leave.studentId, outpassCode: code, qrData, status: "generated" }).returning();
          await db.update(leavesTable).set({ outpassId: outpass.id }).where(eq(leavesTable.id, id));
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
