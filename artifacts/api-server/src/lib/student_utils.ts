import { eq } from "drizzle-orm";
import { db, usersTable, departmentsTable, classesTable } from "@workspace/db";

export async function enrichStudentProfile(user: typeof usersTable.$inferSelect) {
  let departmentName: string | null = null;
  let departmentCode: string | null = null;

  if (user.departmentId) {
    const [dept] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, user.departmentId));
    if (dept) {
      departmentName = dept.name;
      departmentCode = dept.code;
    }
  }

  let year: string | null = null;
  let section: string | null = null;

  if (user.classId) {
    const [cls] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, user.classId));
    if (cls) {
      year = cls.year;
      section = cls.section;
    }
  }

  const { passwordHash: _, ...safe } = user;

  const resolvedDepartmentName = departmentName || "Computer Science and Engineering";
  const resolvedDepartmentCode = departmentCode || "CSE";
  const resolvedYear = year || "III";
  const resolvedSection = section || "A";
  const resolvedHostelBlock = safe.hostelBlock || "Boys Hostel - A Block";
  const resolvedHostelRoom = safe.hostelRoom || "A-101";

  return {
    ...safe,
    id: safe.id,
    studentId: safe.id,
    registerNumber: safe.registerNumber || "",
    name: safe.name,
    department: resolvedDepartmentName,
    departmentName: resolvedDepartmentName,
    departmentCode: resolvedDepartmentCode,
    year: resolvedYear,
    section: resolvedSection,
    classInfo: `${resolvedYear} Year ${resolvedDepartmentCode} ${resolvedSection}`.trim(),
    hostel: resolvedHostelBlock,
    hostelBlock: resolvedHostelBlock,
    hostelRoom: resolvedHostelRoom,
    roomNumber: resolvedHostelRoom,
    phone: safe.phone || "",
    phoneNumber: safe.phone || "",
    photoUrl: safe.photoUrl || null,
    idCardUrl: safe.idCardUrl || null,
    parentName: safe.parentName || null,
    parentPhone: safe.parentPhone || null,
    parentWhatsapp: safe.parentWhatsapp || null,
    parentEmail: safe.parentEmail || null,
    address: safe.address || null,
    isFaceEnrolled: safe.isFaceEnrolled || "false",
    attendancePercentage: safe.attendancePercentage ?? 87,
    collegeType: safe.collegeType || "Engineering",
  };
}

export type EnrichedStudentProfile = Awaited<ReturnType<typeof enrichStudentProfile>>;
