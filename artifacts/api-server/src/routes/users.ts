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
  const bar = ((u as any).barcode || "").trim().toLowerCase();
  const email = (u.email || "").trim().toLowerCase();
  const idStr = String(u.id);

  if (bar && bar === cleanCode) return true;
  if (reg && reg === cleanCode) return true;
  if (reg && (reg.endsWith(cleanCode) || cleanCode.endsWith(reg))) return true;
  if (bar && (bar.endsWith(cleanCode) || cleanCode.endsWith(bar))) return true;
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

// Super Admin Student ID Card Data Upload & Registration Endpoint
router.post("/students/id-card-register", async (req, res): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      phone,
      departmentId,
      classId,
      registerNumber,
      studentType = "HOSTELLER",
      barcode,
      hostelBlock,
      hostelRoom,
      bedNumber,
      parentName,
      parentPhone,
      parentWhatsapp,
      parentEmail,
      address,
      collegeType,
      photoUrl,
      idCardUrl,
      attendancePercentage,
    } = req.body;

    if (!name || !email || !registerNumber) {
      res.status(400).json({ error: "Missing required fields", message: "Name, email, and register number are required." });
      return;
    }

    const allUsers = await db.select().from(usersTable);
    const existingByReg = allUsers.find(
      (u) => u.registerNumber && u.registerNumber.trim().toLowerCase() === String(registerNumber).trim().toLowerCase()
    );

    const finalBarcode = barcode?.trim() || registerNumber.trim();
    const resolvedPhoto = photoUrl || `/students/${registerNumber.trim()}.jpg`;

    if (existingByReg) {
      // Requirement 4: Update missing info, attach photo if missing, keep existing student
      const updatePayload: any = {};
      if (!existingByReg.photoUrl || existingByReg.photoUrl.includes("unsplash") || existingByReg.photoUrl === "") {
        updatePayload.photoUrl = resolvedPhoto;
        updatePayload.isFaceEnrolled = "true";
      }
      if (!existingByReg.idCardUrl) updatePayload.idCardUrl = idCardUrl || `/students/${registerNumber.trim()}_card.jpg`;
      if (!existingByReg.phone && phone) updatePayload.phone = phone;
      if (!existingByReg.parentName && parentName) updatePayload.parentName = parentName;
      if (!existingByReg.parentPhone && parentPhone) updatePayload.parentPhone = parentPhone;
      if (!existingByReg.parentWhatsapp && parentWhatsapp) updatePayload.parentWhatsapp = parentWhatsapp;
      if (!existingByReg.parentEmail && parentEmail) updatePayload.parentEmail = parentEmail;
      if (!existingByReg.address && address) updatePayload.address = address;
      if (!existingByReg.departmentId && departmentId) updatePayload.departmentId = Number(departmentId);
      if (!existingByReg.classId && classId) updatePayload.classId = Number(classId);
      if (studentType) updatePayload.studentType = studentType;
      if (studentType === "HOSTELLER" && hostelBlock) updatePayload.hostelBlock = hostelBlock;
      if (studentType === "HOSTELLER" && hostelRoom) updatePayload.hostelRoom = hostelRoom;
      if (studentType === "HOSTELLER" && bedNumber) updatePayload.bedNumber = bedNumber;

      if (Object.keys(updatePayload).length > 0) {
        await db.update(usersTable).set(updatePayload).where(eq(usersTable.id, existingByReg.id));
      }

      const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, existingByReg.id));
      const enriched = await enrichStudentProfile(updatedUser);
      res.status(200).json({
        success: true,
        updated: true,
        message: `Student "${name}" (${registerNumber}) already exists. Missing profile details & ID-card photo updated successfully without creating duplicate!`,
        student: enriched,
        alreadyExists: true,
      });
      return;
    }

    const finalStudentType = studentType || "HOSTELLER";
    if (finalStudentType === "HOSTELLER" && (!hostelBlock || !hostelRoom)) {
      // Set defaults for hostellers if not specified
    }

    // Duplicate check on Barcode
    if (finalBarcode) {
      const existingByBarcode = allUsers.find(
        (u) => (u as any).barcode && (u as any).barcode.trim().toLowerCase() === finalBarcode.toLowerCase()
      );
      if (existingByBarcode) {
        const enriched = await enrichStudentProfile(existingByBarcode);
        res.status(200).json({
          success: true,
          message: `ID card barcode "${finalBarcode}" matches existing student "${existingByBarcode.name}". Identity verified.`,
          student: enriched,
          alreadyExists: true,
        });
        return;
      }
    }

    // Duplicate check on Email
    const existingByEmail = allUsers.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (existingByEmail) {
      const enriched = await enrichStudentProfile(existingByEmail);
      res.status(200).json({
        success: true,
        message: `Email "${email}" is associated with existing student "${existingByEmail.name}". Profile mapped.`,
        student: enriched,
        alreadyExists: true,
      });
      return;
    }

    const insertData: any = {
      name: name.trim(),
      email: email.trim(),
      passwordHash: hashPassword(password || "password123"),
      role: "student",
      studentType,
      barcode: finalBarcode,
      registerNumber: registerNumber.trim(),
      departmentId: departmentId ? Number(departmentId) : null,
      classId: classId ? Number(classId) : null,
      hostelBlock: studentType === "DAY_SCHOLAR" ? "Day Scholar" : (hostelBlock || "Boys Hostel - A Block"),
      hostelRoom: studentType === "DAY_SCHOLAR" ? "N/A" : (hostelRoom || "A-101"),
      bedNumber: studentType === "DAY_SCHOLAR" ? "N/A" : (bedNumber || "Bed-1"),
      phone: phone || null,
      parentName: parentName || null,
      parentPhone: parentPhone || null,
      parentWhatsapp: parentWhatsapp || null,
      parentEmail: parentEmail || null,
      address: address || null,
      collegeType: collegeType || "Engineering",
      photoUrl: resolvedPhoto,
      idCardUrl: idCardUrl || `/students/${registerNumber.trim()}_card.jpg`,
      attendancePercentage: attendancePercentage ? Number(attendancePercentage) : 88,
      isFaceEnrolled: "true",
    };

    const [{ id }] = await db.insert(usersTable).values(insertData).$returningId();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));

    const enriched = await enrichStudentProfile(user);
    res.status(201).json({
      success: true,
      message: `Student "${name}" (${studentType === "HOSTELLER" ? "Hosteller" : "Day Scholar"}) registered successfully!`,
      student: enriched,
    });
  } catch (err: any) {
    console.error("Failed to register student via ID card upload:", err);
    res.status(500).json({ error: "Failed to register student", message: err.message });
  }
});

// Bulk Register / Import multiple Students from ID Card batch processing
router.post("/api/students/bulk-import-idcards", async (req, res): Promise<void> => {
  try {
    const { students = [] } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: "Students list array is required and cannot be empty." });
      return;
    }

    const allExistingUsers = await db.select().from(usersTable);
    const existingUserMap = new Map<string, typeof usersTable.$inferSelect>();
    const existingBarcodeMap = new Map<string, typeof usersTable.$inferSelect>();
    const existingEmailSet = new Set<string>();

    for (const u of allExistingUsers) {
      if (u.registerNumber) existingUserMap.set(u.registerNumber.trim().toLowerCase(), u);
      if (u.email) existingEmailSet.add(u.email.trim().toLowerCase());
      if ((u as any).barcode) existingBarcodeMap.set(String((u as any).barcode).trim().toLowerCase(), u);
    }

    let insertedCount = 0;
    let alreadyExistsCount = 0;
    let failedCount = 0;
    const results: Array<{
      registerNumber: string;
      name: string;
      studentType: string;
      status: "inserted" | "already_exists" | "failed";
      message: string;
      studentId?: number;
    }> = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const rawReg = (s.registerNumber || "").trim();
      const rawName = (s.name || `Student ${i + 1}`).trim();
      const studentType = s.studentType === "DAY_SCHOLAR" ? "DAY_SCHOLAR" : "HOSTELLER";
      const normalizedReg = rawReg.toLowerCase();
      const finalBarcode = (s.barcode || rawReg || `BC-${Date.now()}-${i}`).trim();
      const normalizedBarcode = finalBarcode.toLowerCase();
      const studentPhoto = s.photoUrl || (rawReg ? `/students/${rawReg}.jpg` : "/students/vimal_m.jpg");

      // Duplicate check: Register number or Barcode already exists
      const existingStudent = (rawReg && existingUserMap.get(normalizedReg)) || existingBarcodeMap.get(normalizedBarcode);
      
      if (existingStudent) {
        alreadyExistsCount++;
        // Update photo or missing fields if needed
        const updatePayload: any = {};
        if (!existingStudent.photoUrl || existingStudent.photoUrl.includes("unsplash") || existingStudent.photoUrl === "") {
          updatePayload.photoUrl = studentPhoto;
          updatePayload.isFaceEnrolled = "true";
        }
        if (!existingStudent.phone && s.phone) updatePayload.phone = s.phone;
        if (!existingStudent.parentName && s.parentName) updatePayload.parentName = s.parentName;
        if (!existingStudent.parentPhone && s.parentPhone) updatePayload.parentPhone = s.parentPhone;
        if (!existingStudent.address && s.address) updatePayload.address = s.address;

        if (Object.keys(updatePayload).length > 0) {
          await db.update(usersTable).set(updatePayload).where(eq(usersTable.id, existingStudent.id));
        }

        results.push({
          registerNumber: rawReg,
          name: rawName,
          studentType,
          status: "already_exists",
          studentId: existingStudent.id,
          message: `Recognized Existing Student: "${rawName}" (${rawReg}). Photo and identity mapped without duplicate.`,
        });
        continue;
      }

      // Determine email
      let email = (s.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        const safeRegPart = rawReg.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || `stu${Date.now()}${i}`;
        email = `${safeRegPart}@student.jkkm.ac.in`;
      }

      // If email exists, make it unique
      let attempt = 1;
      let finalEmail = email;
      while (existingEmailSet.has(finalEmail)) {
        finalEmail = `${email.split("@")[0]}_${attempt}@${email.split("@")[1] || "student.jkkm.ac.in"}`;
        attempt++;
      }

      try {
        const insertData: any = {
          name: rawName,
          email: finalEmail,
          passwordHash: hashPassword(s.password || "password123"),
          role: "student",
          studentType,
          barcode: finalBarcode,
          registerNumber: rawReg || `REG-${Date.now()}-${i}`,
          departmentId: s.departmentId ? Number(s.departmentId) : null,
          classId: s.classId ? Number(s.classId) : null,
          hostelBlock: studentType === "DAY_SCHOLAR" ? "Day Scholar" : (s.hostelBlock || "Boys Hostel - A Block"),
          hostelRoom: studentType === "DAY_SCHOLAR" ? "N/A" : (s.hostelRoom || `A-${100 + (insertedCount % 40) + 1}`),
          bedNumber: studentType === "DAY_SCHOLAR" ? "N/A" : (s.bedNumber || `Bed-${(insertedCount % 3) + 1}`),
          phone: s.phone || null,
          parentName: s.parentName || null,
          parentPhone: s.parentPhone || null,
          parentWhatsapp: s.parentWhatsapp || s.parentPhone || null,
          parentEmail: s.parentEmail || null,
          address: s.address || null,
          collegeType: s.collegeType || "Engineering",
          photoUrl: studentPhoto,
          idCardUrl: s.idCardUrl || (rawReg ? `/students/${rawReg}_card.jpg` : "/students/id_card_sheet.jpg"),
          attendancePercentage: s.attendancePercentage ? Number(s.attendancePercentage) : 88,
          isFaceEnrolled: "true",
        };

        const [{ id }] = await db.insert(usersTable).values(insertData).$returningId();
        const [insertedUser] = await db.select().from(usersTable).where(eq(usersTable.id, id));
        
        // Track into memory sets for subsequent batch iterations
        if (rawReg) existingUserMap.set(normalizedReg, insertedUser);
        existingBarcodeMap.set(normalizedBarcode, insertedUser);
        existingEmailSet.add(finalEmail);

        insertedCount++;
        results.push({
          registerNumber: rawReg || insertData.registerNumber,
          name: rawName,
          studentType,
          status: "inserted",
          studentId: id,
          message: `Successfully registered as ${studentType === "HOSTELLER" ? "Hosteller" : "Day Scholar"}.`,
        });
      } catch (insertErr: any) {
        console.error(`Error inserting student in bulk [${rawName} - ${rawReg}]:`, insertErr);
        failedCount++;
        results.push({
          registerNumber: rawReg,
          name: rawName,
          studentType,
          status: "failed",
          message: `Failed to insert: ${insertErr.message || "Database insert error"}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      totalProcessed: students.length,
      insertedCount,
      alreadyExistsCount,
      failedCount,
      message: `Bulk processing complete: ${insertedCount} registered, ${alreadyExistsCount} already existed, ${failedCount} failed.`,
      results,
    });
  } catch (err: any) {
    console.error("Bulk ID Card Import failure:", err);
    res.status(500).json({ error: "Failed to process bulk import", message: err.message });
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

  const studentType = bodyData.studentType || (bodyData.hostelBlock && bodyData.hostelBlock.toLowerCase().includes("day") ? "DAY_SCHOLAR" : "HOSTELLER");
  const barcode = bodyData.barcode || bodyData.registerNumber || null;
  const bedNumber = bodyData.bedNumber || (studentType === "DAY_SCHOLAR" ? "N/A" : "Bed-1");

  // Duplicate checks for student
  if (bodyData.role === "student" && bodyData.registerNumber) {
    const allUsers = await db.select().from(usersTable);
    const existingByReg = allUsers.find(
      (u) => u.registerNumber && u.registerNumber.trim().toLowerCase() === String(bodyData.registerNumber).trim().toLowerCase()
    );
    if (existingByReg) {
      res.status(409).json({ error: "Student already registered.", message: `Student already registered with register number "${bodyData.registerNumber}".` });
      return;
    }
  }

  const insertData: any = {
    name: bodyData.name,
    email: bodyData.email,
    passwordHash: hashPassword(password || "password123"),
    role: bodyData.role,
    studentType,
    barcode,
    bedNumber,
    departmentId: bodyData.departmentId ? Number(bodyData.departmentId) : null,
    classId: bodyData.classId ? Number(bodyData.classId) : null,
    registerNumber: bodyData.registerNumber || null,
    hostelBlock: studentType === "DAY_SCHOLAR" ? "Day Scholar" : (bodyData.hostelBlock || null),
    hostelRoom: studentType === "DAY_SCHOLAR" ? "N/A" : (bodyData.hostelRoom || null),
    phone: bodyData.phone || null,
    parentName: bodyData.parentName || null,
    parentPhone: bodyData.parentPhone || null,
    parentWhatsapp: bodyData.parentWhatsapp || null,
    parentEmail: bodyData.parentEmail || null,
    address: bodyData.address || null,
    designation: bodyData.designation || null,
    collegeType: bodyData.collegeType || "Engineering",
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

// Bulk import student ID cards endpoint
router.post("/students/bulk-import-idcards", async (req, res): Promise<void> => {
  try {
    const { students = [] } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: "Invalid payload", message: "Students array is required." });
      return;
    }

    const allUsers = await db.select().from(usersTable);
    const results = [];
    let importedCount = 0;
    let updatedCount = 0;

    for (const item of students) {
      if (!item.name || !item.registerNumber) continue;

      const regNum = String(item.registerNumber).trim();
      const finalEmail = item.email ? String(item.email).trim() : `${regNum.toLowerCase()}@student.jkkm.ac.in`;
      const finalType = item.studentType === "DAY_SCHOLAR" ? "DAY_SCHOLAR" : "HOSTELLER";
      const resolvedPhoto = item.profilePhoto || item.photoUrl || `/students/${regNum}.jpg`;

      const existing = allUsers.find(
        (u) =>
          (u.registerNumber && u.registerNumber.trim().toLowerCase() === regNum.toLowerCase()) ||
          (u.email && u.email.trim().toLowerCase() === finalEmail.toLowerCase())
      );

      if (existing) {
        // Update missing fields
        const updatePayload: any = {};
        if (!existing.photoUrl || existing.photoUrl.includes("unsplash") || existing.photoUrl === "") {
          updatePayload.photoUrl = resolvedPhoto;
          updatePayload.isFaceEnrolled = "true";
        }
        if (item.phone && !existing.phone) updatePayload.phone = item.phone;
        if (item.departmentId && !existing.departmentId) updatePayload.departmentId = Number(item.departmentId);
        if (item.hostelBlock && !existing.hostelBlock) updatePayload.hostelBlock = item.hostelBlock;
        if (item.hostelRoom && !existing.hostelRoom) updatePayload.hostelRoom = item.hostelRoom;
        if (finalType) updatePayload.studentType = finalType;

        if (Object.keys(updatePayload).length > 0) {
          await db.update(usersTable).set(updatePayload).where(eq(usersTable.id, existing.id));
        }
        const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, existing.id));
        results.push(await enrichStudentProfile(updatedUser));
        updatedCount++;
      } else {
        // Insert new student
        const insertData: any = {
          name: item.name.trim(),
          email: finalEmail,
          passwordHash: hashPassword(item.password || "password123"),
          role: "student",
          studentType: finalType,
          barcode: item.barcode || regNum,
          registerNumber: regNum,
          departmentId: item.departmentId ? Number(item.departmentId) : null,
          classId: item.classId ? Number(item.classId) : null,
          hostelBlock: finalType === "DAY_SCHOLAR" ? "Day Scholar" : (item.hostelBlock || "Boys Hostel - A Block"),
          hostelRoom: finalType === "DAY_SCHOLAR" ? "N/A" : (item.hostelRoom || "A-101"),
          bedNumber: finalType === "DAY_SCHOLAR" ? "N/A" : (item.bedNumber || "Bed-1"),
          phone: item.phone || null,
          parentName: item.parentName || null,
          parentPhone: item.parentPhone || null,
          parentWhatsapp: item.parentWhatsapp || null,
          parentEmail: item.parentEmail || null,
          address: item.address || null,
          collegeType: item.collegeType || "Engineering",
          photoUrl: resolvedPhoto,
          idCardUrl: item.idCardUrl || `/students/${regNum}_card.jpg`,
          attendancePercentage: item.attendancePercentage ? Number(item.attendancePercentage) : 88,
          isFaceEnrolled: "true",
        };

        let newId = 1;
        try {
          const resIns = await db.insert(usersTable).values(insertData);
          if (Array.isArray(resIns) && (resIns[0] as any)?.insertId) {
            newId = (resIns[0] as any).insertId;
          }
        } catch (e) {}

        const [newUser] = await db.select().from(usersTable).where(eq(usersTable.id, newId));
        if (newUser) {
          results.push(await enrichStudentProfile(newUser));
        }
        importedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${results.length} students (${importedCount} new, ${updatedCount} updated).`,
      importedCount,
      updatedCount,
      students: results,
    });
  } catch (error: any) {
    console.error("Bulk ID card import error:", error);
    res.status(500).json({ error: "Failed to bulk import ID cards", message: error.message });
  }
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
