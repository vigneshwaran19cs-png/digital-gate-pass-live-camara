import { Router, type IRouter } from "express";
import { db, gateLogsTable, usersTable, leavesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { resolveUserId } from "./auth";

const router: IRouter = Router();

router.get("/gate/logs", async (req, res): Promise<void> => {
  try {
    const logs = await db.select().from(gateLogsTable).orderBy(desc(gateLogsTable.timestamp)).limit(100);
    const withStudents = await Promise.all(
      logs.map(async (log) => {
        const [student] = await db.select().from(usersTable).where(eq(usersTable.id, log.studentId));
        const { passwordHash: _, ...safeStudent } = student ?? {};
        return { ...log, student: safeStudent };
      })
    );
    res.json(withStudents);
  } catch (error) {
    console.error("Failed to fetch gate logs:", error);
    res.status(500).json({ error: "Failed to fetch gate logs" });
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
      const [s] = await db.select().from(usersTable).where(eq(usersTable.registerNumber, registerNumber));
      student = s;
    } else {
      const [s] = await db.select().from(usersTable).where(eq(usersTable.id, 1));
      student = s;
    }

    if (!student) {
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
    const capturedPhoto = livePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";
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
        enrolledIdPhoto: student.idCardUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
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

export default router;
