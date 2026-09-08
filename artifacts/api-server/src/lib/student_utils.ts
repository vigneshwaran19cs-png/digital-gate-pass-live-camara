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
  const rawStudentType = (safe as any).studentType || (safe.hostelBlock && safe.hostelBlock.toLowerCase().includes("day") ? "DAY_SCHOLAR" : "HOSTELLER");
  const studentType: "HOSTELLER" | "DAY_SCHOLAR" = rawStudentType === "DAY_SCHOLAR" ? "DAY_SCHOLAR" : "HOSTELLER";
  const isDayScholar = studentType === "DAY_SCHOLAR";
  const barcode = (safe as any).barcode || safe.registerNumber || `BC-${safe.id}`;
  const bedNumber = (safe as any).bedNumber || (isDayScholar ? "N/A" : "Bed-1");

  const resolvedHostelBlock = isDayScholar ? "Day Scholar" : (safe.hostelBlock || "Boys Hostel - A Block");
  const resolvedHostelRoom = isDayScholar ? "N/A" : (safe.hostelRoom || "A-101");
  const attPct = safe.attendancePercentage ?? 87;
  const totalDays = 200;
  const presentDays = Math.round((attPct / 100) * totalDays);
  const absentDays = totalDays - presentDays;
  const leaveDays = Math.max(2, Math.round(absentDays * 0.45));

  let resolvedPhoto = safe.photoUrl;
  if (!resolvedPhoto || resolvedPhoto.includes("unsplash") || resolvedPhoto === "") {
    if (safe.registerNumber) {
      resolvedPhoto = `/students/${safe.registerNumber}.jpg`;
    } else if ((safe as any).barcode) {
      resolvedPhoto = `/students/${(safe as any).barcode}.jpg`;
    } else {
      resolvedPhoto = null;
    }
  }

  return {
    ...safe,
    id: safe.id,
    studentId: safe.id,
    studentType,
    isDayScholar,
    barcode,
    bedNumber,
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
    hostelDetails: isDayScholar ? "Day Scholar (Hostel Pass Not Applicable)" : `${resolvedHostelBlock} - Room ${resolvedHostelRoom} (${bedNumber})`,
    phone: safe.phone || "",
    phoneNumber: safe.phone || "",
    photoUrl: resolvedPhoto,
    profilePhoto: resolvedPhoto,
    idCardUrl: safe.idCardUrl || (safe.registerNumber ? `/students/${safe.registerNumber}_card.jpg` : "/students/id_card_sheet.jpg"),
    parentName: safe.parentName || null,
    parentPhone: safe.parentPhone || null,
    parentWhatsapp: safe.parentWhatsapp || null,
    parentEmail: safe.parentEmail || null,
    address: safe.address || null,
    isFaceEnrolled: safe.isFaceEnrolled || "false",
    attendancePercentage: attPct,
    totalLeaveDays: leaveDays,
    attendanceTotalDays: totalDays,
    attendancePresentDays: presentDays,
    attendanceAbsentDays: absentDays,
    attendanceLeaveDays: leaveDays,
    collegeType: safe.collegeType || "Engineering",
  };
}

export type EnrichedStudentProfile = Awaited<ReturnType<typeof enrichStudentProfile>>;
