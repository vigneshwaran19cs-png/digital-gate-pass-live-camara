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

export { parseToken };

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
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
