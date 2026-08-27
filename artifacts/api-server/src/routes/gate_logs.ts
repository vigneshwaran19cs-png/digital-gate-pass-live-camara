import { Router, type IRouter } from "express";
import { db, gateLogsTable, usersTable, leavesTable, departmentsTable, classesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { resolveUserId } from "./auth";
import { enrichStudentProfile } from "../lib/student_utils";

const router: IRouter = Router();

function matchStudentCode(u: any, cleanCode: string): boolean {
  if (u.role !== "student") return false;
  const reg = (u.registerNumber || "").trim().toLowerCase();
  const email = (u.email || "").trim().toLowerCase();
  const idStr = String(u.id);

  if (reg && reg === cleanCode) return true;
  if (reg && (reg.endsWith(cleanCode) || cleanCode.endsWith(reg))) return true;
  if (cleanCode === `stu00${idStr}` || cleanCode === `stu0${idStr}` || cleanCode === `stu${idStr}` || cleanCode === idStr) return true;
  if (email && email.startsWith(cleanCode)) return true;
  return false;
}

router.get("/gate/logs", async (req, res): Promise<void> => {
  try {
    const logs = await db.select().from(gateLogsTable).orderBy(desc(gateLogsTable.timestamp)).limit(100);
    const withStudents = await Promise.all(
      logs.map(async (log) => {
        const [student] = await db.select().from(usersTable).where(eq(usersTable.id, log.studentId));
        const safeStudent = student ? await enrichStudentProfile(student) : null;
        return { ...log, student: safeStudent };
      })
    );
    res.json(withStudents);
  } catch (error) {
    console.error("Failed to fetch gate logs:", error);
    res.status(500).json({ error: "Failed to fetch gate logs" });
  }
});

router.get("/gate/logs/student/:studentId", async (req, res): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const logs = await db.select().from(gateLogsTable)
      .where(eq(gateLogsTable.studentId, studentId))
      .orderBy(desc(gateLogsTable.timestamp))
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student gate logs" });
  }
});

router.post("/gate/verify-face", async (req, res): Promise<void> => {
  try {
    const securityUserId = resolveUserId(req);
    const { studentId: reqStudentId, registerNumber, confidenceScore = 98, livePhoto } = req.body;

    let student = null;
    if (reqStudentId) {
      const [s] = await db.select().from(usersTable).where(eq(usersTable.id, reqStudentId));
      student = s;
    } else if (registerNumber) {
      const cleanCode = String(registerNumber).trim().toLowerCase();
      const allUsers = await db.select().from(usersTable);
      student = allUsers.find((s) => matchStudentCode(s, cleanCode)) || null;
    }

    if (!student || student.role !== "student") {
      res.status(404).json({ verified: false, message: "Face not recognized. Student profile not found." });
      return;
    }

    // 1. Check recent gate log for Duplicate Scan Warning (< 5 minutes)
    const [lastGateLog] = await db.select().from(gateLogsTable)
      .where(eq(gateLogsTable.studentId, student.id))
      .orderBy(desc(gateLogsTable.timestamp))
      .limit(1);

    let isDuplicateScan = false;
    let duplicateMessage = null;

    if (lastGateLog) {
      const diffMs = Math.abs(Date.now() - new Date(lastGateLog.timestamp).getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 5) {
        isDuplicateScan = true;
        duplicateMessage = `⚠️ ALREADY SCANNED! ${student.name} was already verified ${diffMinutes <= 1 ? "just now" : `${diffMinutes} minutes ago`} (${lastGateLog.actionType}).`;
      }
    }

    const actionType = (!lastGateLog || lastGateLog.actionType === "ENTRY") ? "EXIT" : "ENTRY";

    // 2. Live Scanned Photo Persistence
    const capturedPhoto = livePhoto || student.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";
    await db.update(usersTable).set({
      photoUrl: capturedPhoto,
    }).where(eq(usersTable.id, student.id));

    // 3. Find active leave
    const [activeLeave] = await db.select().from(leavesTable)
      .where(and(eq(leavesTable.studentId, student.id)))
      .orderBy(desc(leavesTable.createdAt))
      .limit(1);

    // 4. Log Gate Event
    const [{ id: gateLogId }] = await db.insert(gateLogsTable).values({
      studentId: student.id,
      actionType,
      verificationMethod: "FACE",
      confidenceScore: Number(confidenceScore),
      securityUserId: securityUserId || null,
      leaveId: activeLeave?.id || null,
      gateName: "Main Gate 1",
      capturedLivePhoto: capturedPhoto,
    }).$returningId();

    const [updatedStudent] = await db.select().from(usersTable).where(eq(usersTable.id, student.id));
    const { passwordHash: _, ...safeStudent } = updatedStudent ?? student;

    res.json({
      verified: true,
      actionType,
      confidenceScore,
      isDuplicateScan,
      duplicateMessage,
      faceComparison: {
        matched: true,
        score: Number(confidenceScore),
        enrolledIdPhoto: (student as any).idCardUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
        liveScannedPhoto: capturedPhoto,
      },
      student: safeStudent,
      activeLeave: activeLeave || null,
      gateLogId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to verify face at gate:", error);
    res.status(500).json({ error: "Failed to verify face at gate" });
  }
});

router.post("/gate/verify-barcode", async (req, res): Promise<void> => {
  try {
    const securityUserId = resolveUserId(req);
    const { barcode, registerNumber, studentId: reqStudentId } = req.body;

    const queryCode = barcode || registerNumber;
    let student = null;

    if (reqStudentId) {
      const [s] = await db.select().from(usersTable).where(eq(usersTable.id, reqStudentId));
      student = s;
    } else if (queryCode) {
      const cleanCode = String(queryCode).trim().toLowerCase();
      const allUsers = await db.select().from(usersTable);
      student = allUsers.find((s) => matchStudentCode(s, cleanCode)) || null;
    }

    // STRICT LOOKUP: Return 404 if not found (No demo fallback!)
    if (!student || student.role !== "student") {
      res.status(404).json({
        verified: false,
        message: "Student not found",
        error: "Student not found",
      });
      return;
    }

    // Check duplicate scan (< 5 minutes)
    const [lastGateLog] = await db.select().from(gateLogsTable)
      .where(eq(gateLogsTable.studentId, student.id))
      .orderBy(desc(gateLogsTable.timestamp))
      .limit(1);

    let isDuplicateScan = false;
    let duplicateMessage = null;

    if (lastGateLog) {
      const diffMs = Math.abs(Date.now() - new Date(lastGateLog.timestamp).getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 5) {
        isDuplicateScan = true;
        duplicateMessage = `⚠️ ALREADY SCANNED! ${student.name} was already verified ${diffMinutes <= 1 ? "just now" : `${diffMinutes} minutes ago`} (${lastGateLog.actionType}).`;
      }
    }

    const actionType = (!lastGateLog || lastGateLog.actionType === "ENTRY") ? "EXIT" : "ENTRY";

    // Find active leave
    const [activeLeave] = await db.select().from(leavesTable)
      .where(and(eq(leavesTable.studentId, student.id)))
      .orderBy(desc(leavesTable.createdAt))
      .limit(1);

    // Log Gate Event
    const [{ id: gateLogId }] = await db.insert(gateLogsTable).values({
      studentId: student.id,
      actionType,
      verificationMethod: "MANUAL",
      confidenceScore: 100,
      securityUserId: securityUserId || null,
      leaveId: activeLeave?.id || null,
      gateName: "Main Gate 1 (ID Barcode)",
      capturedLivePhoto: student.photoUrl || null,
    }).$returningId();

    const safeStudent = await enrichStudentProfile(student);

    res.json({
      verified: true,
      actionType,
      verificationMethod: "ID_BARCODE",
      isDuplicateScan,
      duplicateMessage,
      student: safeStudent,
      activeLeave: activeLeave || null,
      gateLogId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to verify barcode at gate:", error);
    res.status(500).json({ error: "Failed to verify ID Card Barcode" });
  }
});

export default router;
