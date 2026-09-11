import { eq } from "drizzle-orm";
import { db, usersTable, departmentsTable, classesTable } from "@workspace/db";
import { lookupRealStudentName, STUDENT_CANDIDATE_MAP } from "./student_candidates";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let cachedFilesMap: Map<string, string> | null = null;

function getStudentFilesMap(): Map<string, string> {
  if (cachedFilesMap) return cachedFilesMap;
  const map = new Map<string, string>();
  try {
    const currentDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    const studentDir = path.resolve(currentDir, "../../../hostel-outpass/public/students");
    if (fs.existsSync(studentDir)) {
      const files = fs.readdirSync(studentDir);
      files.forEach((f) => map.set(f.toLowerCase(), f));
    }
  } catch (e) {}
  cachedFilesMap = map;
  return map;
}

export function resolveStudentPhotoFile(user: { registerNumber?: string | null; barcode?: string | null; name?: string | null; photoUrl?: string | null }): string | null {
  const fileMap = getStudentFilesMap();
  const reg = (user.registerNumber || "").trim();
  const bar = (user.barcode || "").trim();
  const realName = lookupRealStudentName(reg || bar, user.name) || user.name || "";
  
  if (user.photoUrl && (user.photoUrl.startsWith("data:image/") || user.photoUrl.startsWith("http://") || user.photoUrl.startsWith("https://"))) {
    return user.photoUrl;
  }

  const shortReg = reg.replace(/^7312/, "");
  const fullReg = reg.length <= 8 && !reg.startsWith("7312") ? `7312${reg}` : reg;
  const slug = realName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const firstNameSlug = slug.split("_")[0];

  const candidates: string[] = [];
  if (user.photoUrl && !user.photoUrl.includes("unsplash")) {
    candidates.push(path.basename(user.photoUrl));
  }
  if (reg) {
    candidates.push(`${reg}.jpg`, `${shortReg}.jpg`, `${fullReg}.jpg`);
  }
  if (bar && bar !== reg) {
    candidates.push(`${bar}.jpg`);
  }

  // Lookup in student candidate map
  const candObj = (STUDENT_CANDIDATE_MAP as any)[shortReg] || (STUDENT_CANDIDATE_MAP as any)[fullReg] || (STUDENT_CANDIDATE_MAP as any)[reg];
  if (candObj?.barcode) candidates.push(`${candObj.barcode}.jpg`);
  if (candObj?.reg) candidates.push(`${candObj.reg}.jpg`);

  // ONLY Exact Full Name Slug (e.g., "aravindhan_s.jpg" for ARAVINDHAN S)
  // NEVER use loose first-name prefix matching (e.g., "aravindhan_a.jpg" for ARAVINDHAN S)
  if (slug) {
    candidates.push(`${slug}.jpg`);
  }

  for (const c of candidates) {
    const matchedFile = fileMap.get(c.toLowerCase());
    if (matchedFile) {
      return `/students/${matchedFile}`;
    }
  }

  return null;
}

export async function enrichStudentProfile(user: typeof usersTable.$inferSelect) {
  let departmentName: string | null = null;
  let departmentCode: string | null = null;

  if (user.departmentId) {
    try {
      const [dept] = await db
        .select()
        .from(departmentsTable)
        .where(eq(departmentsTable.id, user.departmentId));
      if (dept) {
        departmentName = dept.name;
        departmentCode = dept.code;
      }
    } catch (e) {}
  }

  let year: string | null = null;
  let section: string | null = null;

  if (user.classId) {
    try {
      const [cls] = await db
        .select()
        .from(classesTable)
        .where(eq(classesTable.id, user.classId));
      if (cls) {
        year = cls.year;
        section = cls.section;
      }
    } catch (e) {}
  }

  const { passwordHash: _, ...safe } = user;

  const regUpper = (safe.registerNumber || (safe as any).barcode || safe.email || safe.name || "").toUpperCase();

  // Infer Department from register number string (overrides generic defaults)
  let regDeptName: string | null = null;
  let regDeptCode: string | null = null;
  let regYear: string | null = null;

  if (regUpper.includes("IT")) { regDeptName = "Information Technology"; regDeptCode = "IT"; regYear = "III"; }
  else if (regUpper.includes("AD")) { regDeptName = "Artificial Intelligence & Data Science"; regDeptCode = "AI & DS"; regYear = "II"; }
  else if (regUpper.includes("CB")) { regDeptName = "Computer Science and Business Systems"; regDeptCode = "CSE"; regYear = "II"; }
  else if (regUpper.includes("CS")) { regDeptName = "Computer Science and Engineering"; regDeptCode = "CSE"; regYear = "III"; }
  else if (regUpper.includes("EC")) { regDeptName = "Electronics and Communication Engineering"; regDeptCode = "ECE"; regYear = "III"; }
  else if (regUpper.includes("EE")) { regDeptName = "Electrical and Electronics Engineering"; regDeptCode = "EEE"; regYear = "II"; }
  else if (regUpper.includes("ME")) { regDeptName = "Mechanical Engineering"; regDeptCode = "MECH"; regYear = "I"; }
  else if (regUpper.includes("AU")) { regDeptName = "Automobile Engineering"; regDeptCode = "AUTO"; regYear = "I"; }
  else if (regUpper.includes("CE")) { regDeptName = "Civil Engineering"; regDeptCode = "CIVIL"; regYear = "IV"; }

  if (regDeptName && regDeptCode) {
    departmentName = regDeptName;
    departmentCode = regDeptCode;
    if (regYear) year = regYear;
  }

  const resolvedDepartmentName = departmentName || "Computer Science and Engineering";
  const resolvedDepartmentCode = departmentCode || "CSE";
  const resolvedYear = year || "III";
  const resolvedSection = section || "A";
  const rawStudentType = (safe as any).studentType || (safe.hostelBlock && safe.hostelBlock.toLowerCase().includes("day") ? "DAY_SCHOLAR" : "HOSTELLER");
  const studentType: "HOSTELLER" | "DAY_SCHOLAR" = rawStudentType === "DAY_SCHOLAR" ? "DAY_SCHOLAR" : "HOSTELLER";
  const isDayScholar = studentType === "DAY_SCHOLAR";
  const barcode = (safe as any).barcode || safe.registerNumber || `BC-${safe.id}`;

  const digitsMatch = regUpper.match(/\d+/);
  const num = digitsMatch ? parseInt(digitsMatch[0], 10) : 101;

  const resolvedHostelBlock = isDayScholar ? "Day Scholar" : (safe.hostelBlock && safe.hostelBlock !== "A-Block" ? safe.hostelBlock : "Kaveri Boys Hostel (Block A)");
  const resolvedHostelRoom = isDayScholar ? "N/A" : (safe.hostelRoom && safe.hostelRoom !== "101" && safe.hostelRoom !== "A-101" ? safe.hostelRoom : `A-${101 + (num % 300)}`);
  const bedNumber = (safe as any).bedNumber || (isDayScholar ? "N/A" : "Bed-1");

  const attPct = safe.attendancePercentage ?? 87;
  const totalDays = 200;
  const presentDays = Math.round((attPct / 100) * totalDays);
  const absentDays = totalDays - presentDays;
  const leaveDays = Math.max(2, Math.round(absentDays * 0.45));

  const resolvedStudentName = lookupRealStudentName(safe.registerNumber || (safe as any).barcode || safe.email, safe.name);
  const photoFromDisk = resolveStudentPhotoFile({
    registerNumber: safe.registerNumber,
    barcode,
    name: resolvedStudentName,
    photoUrl: safe.photoUrl,
  });

  const resolvedPhoto = photoFromDisk || (safe.photoUrl && !safe.photoUrl.includes("unsplash") ? safe.photoUrl : `/students/${safe.registerNumber || barcode || "vimal_m"}.jpg`);

  // Persist resolved photo to DB if missing or pointing to unsplash
  if (photoFromDisk && (!safe.photoUrl || safe.photoUrl.includes("unsplash"))) {
    try {
      await db.update(usersTable).set({ photoUrl: photoFromDisk, isFaceEnrolled: "true" }).where(eq(usersTable.id, safe.id));
    } catch (e) {}
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
    name: resolvedStudentName,
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
