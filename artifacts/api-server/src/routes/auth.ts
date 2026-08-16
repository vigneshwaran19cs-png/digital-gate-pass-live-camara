import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

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
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Auto-seed missing demo users if they try to log in with them
  if (!user && password === "password") {
    let role = null;
    if (email === "tutor@example.com") role = "tutor";
    else if (email === "warden@example.com") role = "warden";
    else if (email === "hod@example.com") role = "hod";
    else if (email === "principal@example.com") role = "principal";
    else if (email === "security@example.com") role = "security";
    else if (email === "john@example.com") role = "student";

    if (role) {
      await db.insert(usersTable).values({
        name: `Demo ${role}`,
        email: email,
        passwordHash: hashPassword(password),
        role: role as any,
      });
      [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    }
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
