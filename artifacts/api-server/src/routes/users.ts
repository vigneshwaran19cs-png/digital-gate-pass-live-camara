import { Router, type IRouter } from "express";
import { eq, like, and, SQL } from "drizzle-orm";
import { db, usersTable, departmentsTable, classesTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { enrichStudentProfile } from "../lib/student_utils";
import { populateRealisticTestData } from "../lib/seed_service";

const router: IRouter = Router();

function hashPassword(pw: string): string {
  return `hashed_${pw}`;
}

function sanitize(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

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

// Student barcode / register number lookup endpoint
router.get("/students/barcode/:barcode", async (req, res): Promise<void> => {
  try {
    const rawBarcode = req.params.barcode;
    if (!rawBarcode) {
      res.status(400).json({ error: "Barcode is required", message: "Barcode is required" });
      return;
    }
    const cleanBarcode = String(rawBarcode).trim().toLowerCase();

    const allUsers = await db.select().from(usersTable);
    const student = allUsers.find((u) => matchStudentCode(u, cleanBarcode));

    if (!student) {
      res.status(404).json({ error: "Student not found", message: "Student not found" });
      return;
    }

    const enriched = await enrichStudentProfile(student);
    res.json(enriched);
  } catch (error) {
    console.error("Failed to lookup student by barcode:", error);
    res.status(500).json({ error: "Failed to lookup student by barcode" });
  }
});

// Student general lookup endpoint (?barcode=STU001 or ?registerNumber=STU001 or ?studentId=1)
router.get("/students/lookup", async (req, res): Promise<void> => {
  try {
    const { barcode, registerNumber, studentId } = req.query;
    const queryCode = barcode || registerNumber;

    let student = null;
    if (studentId) {
      const [s] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(String(studentId), 10)));
      student = s;
    } else if (queryCode) {
      const cleanCode = String(queryCode).trim().toLowerCase();
      const allUsers = await db.select().from(usersTable);
      student = allUsers.find((u) => matchStudentCode(u, cleanCode)) || null;
    }

    if (!student || student.role !== "student") {
      res.status(404).json({ error: "Student not found", message: "Student not found" });
      return;
    }

    const enriched = await enrichStudentProfile(student);
    res.json(enriched);
  } catch (error) {
    console.error("Failed to lookup student:", error);
    res.status(500).json({ error: "Failed to lookup student" });
  }
});

// Alias for /users/barcode/:barcode
router.get("/users/barcode/:barcode", async (req, res): Promise<void> => {
  try {
    const rawBarcode = req.params.barcode;
    if (!rawBarcode) {
      res.status(400).json({ error: "Barcode is required", message: "Barcode is required" });
      return;
    }
    const cleanBarcode = String(rawBarcode).trim().toLowerCase();

    const allUsers = await db.select().from(usersTable);
    const user = allUsers.find((u) => matchStudentCode(u, cleanBarcode));

    if (!user) {
      res.status(404).json({ error: "Student not found", message: "Student not found" });
      return;
    }

    const enriched = await enrichStudentProfile(user);
    res.json(enriched);
  } catch (error) {
    console.error("Failed to lookup user by barcode:", error);
    res.status(500).json({ error: "Failed to lookup user by barcode" });
  }
});

router.get("/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, department } = parsed.data;
  const conditions: SQL[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (department) conditions.push(eq(usersTable.departmentId, Number(department)));

  const users = conditions.length > 0
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);

  const enriched = await Promise.all(users.map(enrichStudentProfile));
  res.json(enriched);
});

router.post("/users", async (req, res): Promise<void> => {
  const { password, ...bodyData } = req.body;
  if (!bodyData.name || !bodyData.email || !bodyData.role) {
    res.status(400).json({ error: "Name, email, and role are required" });
    return;
  }

  const insertData: any = {
    name: bodyData.name,
    email: bodyData.email,
    passwordHash: hashPassword(password || "password123"),
    role: bodyData.role,
    departmentId: bodyData.departmentId ? Number(bodyData.departmentId) : null,
    classId: bodyData.classId ? Number(bodyData.classId) : null,
    registerNumber: bodyData.registerNumber || null,
    hostelBlock: bodyData.hostelBlock || null,
    hostelRoom: bodyData.hostelRoom || null,
    phone: bodyData.phone || null,
    parentName: bodyData.parentName || null,
    parentPhone: bodyData.parentPhone || null,
    parentWhatsapp: bodyData.parentWhatsapp || null,
    parentEmail: bodyData.parentEmail || null,
    address: bodyData.address || null,
    designation: bodyData.designation || null,
    photoUrl: bodyData.photoUrl || null,
    idCardUrl: bodyData.idCardUrl || null,
    attendancePercentage: bodyData.attendancePercentage ? Number(bodyData.attendancePercentage) : 87,
    isFaceEnrolled: bodyData.photoUrl ? "true" : "false",
  };

  const [{ id }] = await db.insert(usersTable).values(insertData).$returningId();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));

  res.status(201).json(await enrichStudentProfile(user));
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

  const enriched = await enrichStudentProfile(user);
  res.json(enriched);
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updateData: any = { ...req.body };
  if (updateData.password) {
    updateData.passwordHash = hashPassword(updateData.password);
    delete updateData.password;
  }
  if (updateData.departmentId !== undefined) {
    updateData.departmentId = updateData.departmentId ? Number(updateData.departmentId) : null;
  }
  if (updateData.classId !== undefined) {
    updateData.classId = updateData.classId ? Number(updateData.classId) : null;
  }
  if (updateData.attendancePercentage !== undefined) {
    updateData.attendancePercentage = updateData.attendancePercentage ? Number(updateData.attendancePercentage) : 87;
  }
  if (updateData.photoUrl) {
    updateData.isFaceEnrolled = "true";
  }

  await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));

  res.json(await enrichStudentProfile(user));
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

// Admin endpoint to populate/refresh the 20 realistic student records and test scenarios
router.post("/admin/seed-test-data", async (_req, res): Promise<void> => {
  try {
    const result = await populateRealisticTestData();
    res.json({
      success: true,
      message: "20 Realistic Student profiles + JKKM ID Cards + Multi-Stage workflows populated successfully!",
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to seed realistic test data:", error);
    res.status(500).json({ error: "Failed to seed realistic test data" });
  }
});

export default router;
