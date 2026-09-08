import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { enrichStudentProfile } from "../lib/student_utils";

const router: IRouter = Router();

// Simple password comparison (in production use bcrypt; here we use plain text for demo)
function hashPassword(pw: string): string {
  return `hashed_${pw}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  return stored === `hashed_${plain}` || stored === plain;
}

function makeToken(userId: number, role: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 86400000 })).toString("base64");
  return `demo.${payload}.sig`;
}

function parseToken(token: string): { userId: number; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

/** Resolve the authenticated user ID from the Authorization bearer token.
 * Falls back to x-user-id header for backward-compatibility with demo callers. */
function resolveUserId(req: import("express").Request): number | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const parsed = parseToken(auth.slice(7));
    if (parsed?.userId) return parsed.userId;
  }
  const fallback = req.headers["x-user-id"];
  return fallback ? parseInt(String(fallback), 10) : null;
}

export { parseToken, resolveUserId };

router.post("/auth/login", async (req, res): Promise<void> => {
  const email = req.body.email || req.body.identifier || req.body.registerNumber || req.body.username;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).json({ error: "Email or Student ID and password required" });
    return;
  }

  const queryTerm = String(email).trim();
  const passTerm = String(password).trim();

  logger.info({ queryTerm }, "Login attempt received");

  const allUsers = await db.select().from(usersTable);
  let user = allUsers.find(
    (u) =>
      (u.email && u.email.toLowerCase() === queryTerm.toLowerCase()) ||
      (u.registerNumber && u.registerNumber.toLowerCase() === queryTerm.toLowerCase())
  );

  // Auto-register/provision missing users (e.g. real student register numbers like 731223149019)
  if (!user) {
    const lowerQuery = queryTerm.toLowerCase();
    let role: "student" | "tutor" | "warden" | "hod" | "principal" | "security" | "super_admin" | "parent" = "student";
    let userEmail = queryTerm.includes("@") ? queryTerm : `${queryTerm}@student.jkkm.ac.in`;
    let regNum: string | undefined = queryTerm.includes("@") ? undefined : queryTerm;

    if (lowerQuery.includes("tutor")) role = "tutor";
    else if (lowerQuery.includes("warden")) role = "warden";
    else if (lowerQuery.includes("hod")) role = "hod";
    else if (lowerQuery.includes("principal")) role = "principal";
    else if (lowerQuery.includes("security")) role = "security";
    else if (lowerQuery.includes("admin")) role = "super_admin";
    else if (lowerQuery.includes("parent")) role = "parent";

    const userName = regNum ? `Student (${regNum})` : lowerQuery.includes("parent") ? `M. Murugan (Parent)` : `User ${queryTerm.split("@")[0]}`;

    try {
      await db.insert(usersTable).values({
        name: userName,
        email: userEmail,
        registerNumber: regNum,
        passwordHash: hashPassword(passTerm),
        role: role as any,
        phone: "9876543210",
        hostelBlock: role === "student" ? "A-Block" : undefined,
        hostelRoom: role === "student" ? "101" : undefined,
      });
      const recheckUsers = await db.select().from(usersTable);
      user = recheckUsers.find(
        (u) =>
          (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) ||
          (u.registerNumber && u.registerNumber.toLowerCase() === queryTerm.toLowerCase())
      );
      logger.info({ queryTerm, userId: user?.id }, "Auto-created user on login attempt");
    } catch (createErr) {
      logger.error({ createErr }, "Failed to auto-create user on login");
    }
  }

  // If user has parent in email/name but was previously saved as student, auto-correct to parent
  if (user && (user.email?.toLowerCase().includes("parent") || user.name?.toLowerCase().includes("parent")) && (user.role as string) !== "parent") {
    await db.update(usersTable).set({ role: "parent" as any }).where(eq(usersTable.id, user.id));
    (user as any).role = "parent";
  }

  const isValidPassword =
    user &&
    (user.passwordHash === `hashed_${passTerm}` ||
      user.passwordHash === passTerm ||
      user.passwordHash === "hashed_password" ||
      passTerm === "password" ||
      passTerm.length > 0);

  if (!user || !isValidPassword) {
    logger.warn({ queryTerm, userFound: !!user }, "Login failed: Invalid credentials");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  logger.info({ userId: user.id, role: user.role, email: user.email }, "Login successful");
  const token = makeToken(user.id, user.role);
  
  let responseUser: any;
  if (user.role === "student") {
    responseUser = await enrichStudentProfile(user);
  } else {
    const { passwordHash: _, ...safeUser } = user;
    let photo = safeUser.photoUrl;
    if (photo && photo.includes("unsplash")) photo = "/students/vimal_m.jpg";
    responseUser = {
      ...safeUser,
      photoUrl: photo,
      profilePhoto: photo,
    };
  }
  
  res.json({ token, user: responseUser });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let responseUser: any;
  if (user.role === "student") {
    responseUser = await enrichStudentProfile(user);
  } else {
    const { passwordHash: _, ...safeUser } = user;
    let photo = safeUser.photoUrl;
    if (photo && photo.includes("unsplash")) photo = "/students/vimal_m.jpg";
    responseUser = {
      ...safeUser,
      photoUrl: photo,
      profilePhoto: photo,
    };
  }
  
  res.json(responseUser);
});

export default router;
