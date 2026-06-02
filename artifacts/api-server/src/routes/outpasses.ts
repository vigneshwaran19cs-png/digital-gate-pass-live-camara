import { Router, type IRouter } from "express";
import { eq, or, ilike, and, SQL } from "drizzle-orm";
import { db, outpassesTable, usersTable, leavesTable, notificationsTable } from "@workspace/db";
import {
  ListOutpassesQueryParams,
  GetOutpassParams,
  LookupOutpassQueryParams,
  VerifyOutpassParams,
  VerifyOutpassBody,
  RecordReturnParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getFullOutpass(id: number) {
  const [outpass] = await db.select().from(outpassesTable).where(eq(outpassesTable.id, id));
  if (!outpass) return null;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, outpass.studentId));
  const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, outpass.leaveId));
  const { passwordHash: _, ...safeStudent } = student ?? {};
  return { ...outpass, student: safeStudent, leave };
}

router.get("/outpasses", async (req, res): Promise<void> => {
  const parsed = ListOutpassesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, studentId } = parsed.data;
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(outpassesTable.status, status as any));
  if (studentId) conditions.push(eq(outpassesTable.studentId, studentId));

  const outpasses = conditions.length > 0
    ? await db.select().from(outpassesTable).where(and(...conditions)).orderBy(outpassesTable.createdAt)
    : await db.select().from(outpassesTable).orderBy(outpassesTable.createdAt);

  const withDetails = await Promise.all(outpasses.map(async (o) => {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, o.studentId));
    const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, o.leaveId));
    const { passwordHash: _, ...safeStudent } = student ?? {};
    return { ...o, student: safeStudent, leave };
  }));

  res.json(withDetails);
});

router.get("/outpasses/lookup", async (req, res): Promise<void> => {
  const parsed = LookupOutpassQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { outpassCode, registerNumber, studentName } = parsed.data;

  if (outpassCode) {
    const results = await db.select().from(outpassesTable).where(eq(outpassesTable.outpassCode, outpassCode));
    const withDetails = await Promise.all(results.map(async (o) => {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, o.studentId));
      const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, o.leaveId));
      const { passwordHash: _, ...safeStudent } = student ?? {};
      return { ...o, student: safeStudent, leave };
    }));
    res.json(withDetails);
    return;
  }

  if (registerNumber || studentName) {
    const conditions: SQL[] = [];
    if (registerNumber) conditions.push(eq(usersTable.registerNumber, registerNumber));
    if (studentName) conditions.push(ilike(usersTable.name, `%${studentName}%`));

    const students = await db.select().from(usersTable).where(and(...conditions));
    const studentIds = students.map(s => s.id);

    if (studentIds.length === 0) {
      res.json([]);
      return;
    }

    const results = await db.select().from(outpassesTable);
    const filtered = results.filter(o => studentIds.includes(o.studentId));
    const withDetails = await Promise.all(filtered.map(async (o) => {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, o.studentId));
      const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, o.leaveId));
      const { passwordHash: _, ...safeStudent } = student ?? {};
      return { ...o, student: safeStudent, leave };
    }));
    res.json(withDetails);
    return;
  }

  res.json([]);
});

router.get("/outpasses/:id", async (req, res): Promise<void> => {
  const params = GetOutpassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const outpass = await getFullOutpass(params.data.id);
  if (!outpass) {
    res.status(404).json({ error: "Outpass not found" });
    return;
  }

  res.json(outpass);
});

router.post("/outpasses/:id/verify", async (req, res): Promise<void> => {
  const params = VerifyOutpassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = VerifyOutpassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(outpassesTable)
    .set({
      status: "verified",
      exitTime: new Date(),
      gateLocation: parsed.data.gateLocation,
    })
    .where(eq(outpassesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Outpass not found" });
    return;
  }

  // Notify wardens
  const wardens = await db.select().from(usersTable).where(eq(usersTable.role, "warden"));
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, updated.studentId));
  for (const w of wardens) {
    await db.insert(notificationsTable).values({
      userId: w.id,
      type: "exit_recorded",
      title: "Student Exit Recorded",
      message: `${student?.name ?? "Student"} (${student?.registerNumber ?? ""}) exited at ${parsed.data.gateLocation}`,
      isRead: false,
      outpassId: updated.id,
    });
  }

  res.json(await getFullOutpass(updated.id));
});

router.post("/outpasses/:id/return", async (req, res): Promise<void> => {
  const params = RecordReturnParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db.update(outpassesTable)
    .set({ status: "returned", returnTime: new Date() })
    .where(eq(outpassesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Outpass not found" });
    return;
  }

  res.json(await getFullOutpass(updated.id));
});

export default router;
