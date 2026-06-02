import { Router, type IRouter } from "express";
import { eq, and, gte, lt, ne } from "drizzle-orm";
import { db, leavesTable, outpassesTable, usersTable, notificationsTable } from "@workspace/db";
import { GetMonthlyReportQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [allStudents, allLeaves, allOutpasses] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.role, "student")),
    db.select().from(leavesTable),
    db.select().from(outpassesTable),
  ]);

  const totalStudents = allStudents.length;
  const studentsOnLeave = allOutpasses.filter(o => o.status === "verified").length;
  const studentsReturned = allOutpasses.filter(o => o.status === "returned").length;
  const pendingApprovals = allLeaves.filter(l => !["fully_approved", "rejected", "cancelled"].includes(l.status)).length;
  const pendingWarden = allLeaves.filter(l => l.currentStep === "warden" && l.status === "pending").length;
  const pendingTutor = allLeaves.filter(l => l.currentStep === "tutor").length;
  const pendingHod = allLeaves.filter(l => l.currentStep === "hod").length;
  const pendingPrincipal = allLeaves.filter(l => l.currentStep === "principal").length;
  const pendingReturns = allOutpasses.filter(o => o.status === "verified").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayApproved = allLeaves.filter(l => l.status === "fully_approved" && new Date(l.updatedAt) >= today).length;
  const todayRejected = allLeaves.filter(l => l.status === "rejected" && new Date(l.updatedAt) >= today).length;

  const occupancyPercent = totalStudents > 0 ? Math.round(((totalStudents - studentsOnLeave) / totalStudents) * 100) : 100;

  res.json({
    studentsOnLeave,
    studentsReturned,
    pendingApprovals,
    totalStudents,
    occupancyPercent,
    pendingWarden,
    pendingTutor,
    pendingHod,
    pendingPrincipal,
    pendingReturns,
    todayApproved,
    todayRejected,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);
  const recent = notifications.reverse().slice(0, 20);

  const withStudents = await Promise.all(recent.map(async (n, i) => {
    let studentName = null;
    let registerNumber = null;
    if (n.leaveId) {
      const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, n.leaveId));
      if (leave) {
        const [student] = await db.select().from(usersTable).where(eq(usersTable.id, leave.studentId));
        studentName = student?.name ?? null;
        registerNumber = student?.registerNumber ?? null;
      }
    }
    return { id: n.id, type: n.type, description: n.message, studentName, registerNumber, timestamp: n.createdAt };
  }));

  res.json(withStudents);
});

router.get("/dashboard/occupancy", async (req, res): Promise<void> => {
  const students = await db.select().from(usersTable).where(eq(usersTable.role, "student"));
  const outpasses = await db.select().from(outpassesTable).where(eq(outpassesTable.status, "verified"));

  const totalCapacity = students.length;
  const onLeave = outpasses.length;
  const currentlyPresent = totalCapacity - onLeave;
  const occupancyPercent = totalCapacity > 0 ? Math.round((currentlyPresent / totalCapacity) * 100) : 100;

  // Department breakdown
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))];
  const departmentBreakdown = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    const deptOnLeave = outpasses.filter(o => deptStudents.some(s => s.id === o.studentId)).length;
    return { department: dept!, total: deptStudents.length, present: deptStudents.length - deptOnLeave, onLeave: deptOnLeave };
  });

  res.json({ totalCapacity, currentlyPresent, currentlyAbsent: onLeave, onLeave, occupancyPercent, departmentBreakdown });
});

router.get("/dashboard/monthly-report", async (req, res): Promise<void> => {
  const parsed = GetMonthlyReportQueryParams.safeParse(req.query);
  const now = new Date();
  const month = parsed.success && parsed.data.month ? parsed.data.month : now.getMonth() + 1;
  const year = parsed.success && parsed.data.year ? parsed.data.year : now.getFullYear();

  const leaves = await db.select().from(leavesTable);

  // Generate daily report for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const report = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLeaves = leaves.filter(l => {
      const created = new Date(l.createdAt);
      return created.getFullYear() === year && created.getMonth() + 1 === month && created.getDate() === day;
    });
    report.push({
      date: dateStr,
      approved: dayLeaves.filter(l => l.status === "fully_approved").length,
      rejected: dayLeaves.filter(l => l.status === "rejected").length,
      pending: dayLeaves.filter(l => !["fully_approved", "rejected", "cancelled"].includes(l.status)).length,
      total: dayLeaves.length,
    });
  }

  res.json(report);
});

router.get("/dashboard/students-outside", async (req, res): Promise<void> => {
  const outpasses = await db.select().from(outpassesTable).where(eq(outpassesTable.status, "verified"));
  const today = new Date().toISOString().split("T")[0];

  const withDetails = await Promise.all(outpasses.map(async (o) => {
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, o.studentId));
    const [leave] = await db.select().from(leavesTable).where(eq(leavesTable.id, o.leaveId));
    const isOverdue = leave ? leave.toDate < today : false;
    return {
      outpassId: o.id,
      studentName: student?.name ?? "Unknown",
      registerNumber: student?.registerNumber ?? "N/A",
      department: student?.department ?? null,
      hostelRoom: student?.hostelRoom ?? null,
      destination: leave?.destination ?? "Unknown",
      exitTime: o.exitTime?.toISOString() ?? new Date().toISOString(),
      fromDate: leave?.fromDate ?? today,
      toDate: leave?.toDate ?? today,
      isOverdue,
    };
  }));

  res.json(withDetails);
});

export default router;
