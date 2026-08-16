import { Router, type IRouter } from "express";
import { db, usersTable, activityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resolveUserId } from "./auth";

const router: IRouter = Router();

router.post("/enrollment/face", async (req, res): Promise<void> => {
  try {
    const userId = resolveUserId(req) || req.body.userId || 1;
    const { faceEmbedding, idCardUrl, photoUrl } = req.body;

    const defaultFacePhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";

    await db.update(usersTable).set({
      isFaceEnrolled: "true",
      photoUrl: photoUrl || defaultFacePhoto,
      faceEmbedding: typeof faceEmbedding === "string" ? faceEmbedding : JSON.stringify(faceEmbedding || { embedding: [0.1, 0.5, 0.9] }),
      idCardUrl: idCardUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    }).where(eq(usersTable.id, userId));

    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    // Audit Log
    await db.insert(activityLogsTable).values({
      userId,
      role: updatedUser?.role || "student",
      action: "Completed First-Time Face Enrollment",
      details: { isFaceEnrolled: true, hasIdCard: Boolean(idCardUrl) },
      ipAddress: req.ip || null,
      device: req.headers["user-agent"] || null,
    });

    const { passwordHash: _, ...safeUser } = updatedUser ?? {};
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Failed to complete face enrollment:", error);
    res.status(500).json({ error: "Failed to complete face enrollment" });
  }
});

export default router;
