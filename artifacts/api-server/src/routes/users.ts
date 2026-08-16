import { Router, type IRouter } from "express";
import { eq, like, and, SQL } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(pw: string): string {
  return `hashed_${pw}`;
}

function sanitize(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

router.get("/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, departmentId } = parsed.data;
  const conditions: SQL[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (departmentId) conditions.push(eq(usersTable.departmentId, departmentId));

  const users = conditions.length > 0
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);

  res.json(users.map(sanitize));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data as any;
  const [{ id }] = await db.insert(usersTable).values({
    ...rest,
    passwordHash: hashPassword(password || "password123"),
  }).$returningId();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));

  res.status(201).json(sanitize(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(sanitize(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(sanitize(user));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (user) {
    await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  }
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
