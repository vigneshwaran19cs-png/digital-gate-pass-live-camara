import { db, usersTable, leavesTable, outpassesTable, gateLogsTable, departmentsTable, classesTable, hostelBlocksTable } from "../lib/db/src/index.js";
import { ALL_COLLEGE_DEPARTMENTS } from "../lib/db/src/departments_data.js";
import { eq, sql } from "drizzle-orm";

function hashPassword(pw: string): string {
  return `hashed_${pw}`;
}

async function runSeed() {
  console.log("🚀 Starting Realistic Test Data Population (20 Students + JKKM ID Cards)...");

  try {
    // 1. Ensure departments exist
    console.log("📦 1. Verifying Departments...");
    const existingDepts = await db.select().from(departmentsTable);
    const deptMap = new Map<string, number>();

    for (const d of existingDepts) {
      deptMap.set(d.code, d.id);
    }

    for (const d of ALL_COLLEGE_DEPARTMENTS) {
      if (!deptMap.has(d.code)) {
        const [{ insertId }] = await db.insert(departmentsTable).values({
          code: d.code,
          name: d.name,
        });
        deptMap.set(d.code, Number(insertId));
      }
    }

    const mechDeptId = deptMap.get("MECH") || 1;
    const autoDeptId = deptMap.get("AUTO") || 1;
    const cseDeptId = deptMap.get("CSE") || 1;
    const eceDeptId = deptMap.get("ECE") || 1;
    const eeeDeptId = deptMap.get("EEE") || 1;
    const aidsDeptId = deptMap.get("AI & DS") || 1;
    const civilDeptId = deptMap.get("CIVIL") || 1;

    // 2. Ensure Classes exist
    console.log("🏫 2. Verifying Classes...");
    const existingClasses = await db.select().from(classesTable);
    const classMap = new Map<string, number>();
    for (const c of existingClasses) {
      classMap.set(`${c.departmentId}_${c.year}_${c.section}`, c.id);
    }

    async function getOrCreateClass(deptId: number, year: "I" | "II" | "III" | "IV", section: string) {
      const key = `${deptId}_${year}_${section}`;
      if (classMap.has(key)) return classMap.get(key)!;
      const [{ insertId }] = await db.insert(classesTable).values({
        departmentId: deptId,
        year,
        section,
      });
      const id = Number(insertId);
      classMap.set(key, id);
      return id;
    }

    const autoClassI_A = await getOrCreateClass(autoDeptId, "I", "A");
    const mechClassI_A = await getOrCreateClass(mechDeptId, "I", "A");
    const cseClassIII_A = await getOrCreateClass(cseDeptId, "III", "A");
    const aidsClassII_A = await getOrCreateClass(aidsDeptId, "II", "A");
    const eceClassIII_A = await getOrCreateClass(eceDeptId, "III", "A");
    const eeeClassII_A = await getOrCreateClass(eeeDeptId, "II", "A");
    const civilClassIV_A = await getOrCreateClass(civilDeptId, "IV", "A");

    // 3. Create or update Staff Accounts
    console.log("👥 3. Setting up Staff Roles & Hierarchy...");
    const staffAccounts = [
      {
        name: "Super Admin ERP",
        email: "admin@example.com",
        passwordHash: hashPassword("password123"),
        role: "super_admin" as const,
        phone: "9842700001",
        designation: "System Administrator",
      },
      {
        name: "Dr. K. Senthil Kumar (Principal)",
        email: "principal@example.com",
        passwordHash: hashPassword("password123"),
        role: "principal" as const,
        phone: "9842712345",
        designation: "Principal & Academic Head",
      },
      {
        name: "Mr. R. Murugan (Chief Warden)",
        email: "warden@example.com",
        passwordHash: hashPassword("password123"),
        role: "warden" as const,
        phone: "9842754321",
        hostelBlock: "Boys Hostel - Main Block",
        designation: "Hostel Chief Warden",
      },
      {
        name: "Dr. P. Ramesh (HOD Auto & Mech)",
        email: "hod@example.com",
        passwordHash: hashPassword("password123"),
        role: "hod" as const,
        departmentId: autoDeptId,
        phone: "9842767890",
        designation: "Head of the Department",
      },
      {
        name: "Prof. S. Soundar (Tutor Auto)",
        email: "tutor@example.com",
        passwordHash: hashPassword("password123"),
        role: "tutor" as const,
        departmentId: autoDeptId,
        classId: autoClassI_A,
        phone: "9842798765",
        designation: "Assistant Professor & Class Tutor",
      },
      {
        name: "Dr. M. Prakash (HOD CSE)",
        email: "hod.cse@example.com",
        passwordHash: hashPassword("password123"),
        role: "hod" as const,
        departmentId: cseDeptId,
        phone: "9842711223",
        designation: "Head of CSE Department",
      },
      {
        name: "Prof. A. Priya (Tutor CSE)",
        email: "tutor.cse@example.com",
        passwordHash: hashPassword("password123"),
        role: "tutor" as const,
        departmentId: cseDeptId,
        classId: cseClassIII_A,
        phone: "9842733445",
        designation: "Assistant Professor & Class Tutor",
      },
      {
        name: "Mr. K. Palanisamy (Main Gate Security)",
        email: "security@example.com",
        passwordHash: hashPassword("password123"),
        role: "security" as const,
        phone: "9842777889",
        designation: "Chief Security Officer",
      },
    ];

    for (const staff of staffAccounts) {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, staff.email));
      if (existing) {
        await db.update(usersTable).set(staff).where(eq(usersTable.id, existing.id));
      } else {
        await db.insert(usersTable).values(staff);
      }
    }

    // 4. Seed 20 Realistic Students
    console.log("🎓 4. Seeding 20 Realistic Student Profiles...");
    const studentsData = [
      // 5 Real Students from JKKM ID Cards
      {
        name: "VIMAL M",
        registerNumber: "731225ME029",
        email: "731225me029@student.jkkm.ac.in",
        phone: "8667504242",
        parentName: "M. Muthusamy",
        parentPhone: "8667504240",
        parentWhatsapp: "8667504242",
        parentEmail: "muthusamy.m@gmail.com",
        address: "147, KOVIL KARADU, NERINJIPETTAI (PO), ANTHIYUR (TK), ERODE(DT), PIN-638311",
        departmentId: mechDeptId,
        classId: mechClassI_A,
        hostelBlock: "Boys Hostel - B Block",
        hostelRoom: "B-204 (Bed 1)",
        photoUrl: "/students/vimal_m.jpg",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 94,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "AZHAGESAN S",
        registerNumber: "731225AU001",
        email: "731225au001@student.jkkm.ac.in",
        phone: "6381937419",
        parentName: "S. Shanmugam",
        parentPhone: "6381937410",
        parentWhatsapp: "6381937419",
        parentEmail: "shanmugam.s@gmail.com",
        address: "5/126, WEST STREET, ATHIYUR(PO), KUNNAM(TK), PERAMBALLUR(DT), PIN-621108",
        departmentId: autoDeptId,
        classId: autoClassI_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-102 (Bed 2)",
        photoUrl: "/students/azhagesan_s.jpg",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 89,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "CHINRAJ M",
        registerNumber: "731225AU002",
        email: "731225au002@student.jkkm.ac.in",
        phone: "8270106041",
        parentName: "M. Marappan",
        parentPhone: "8270106040",
        parentWhatsapp: "8270106041",
        parentEmail: "marappan.m@gmail.com",
        address: "64, ANAIKKARAI STREET, THIKKARAI, GUTHIYALATHUR, SATHYAMANGALAM(TK), ERODE(DT), PIN-638503",
        departmentId: autoDeptId,
        classId: autoClassI_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-103 (Bed 1)",
        photoUrl: "/students/chinraj_m.jpg",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 82,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "KARTHICK RAJAN S",
        registerNumber: "731225AU003",
        email: "731225au003@student.jkkm.ac.in",
        phone: "9025628724",
        parentName: "S. Selvaraj",
        parentPhone: "9025628720",
        parentWhatsapp: "9025628724",
        parentEmail: "selvaraj.s@gmail.com",
        address: "193, THOTTIAN THOTTAM, KOLATHUPALAYAM, PANDIYAMPALAYAM(PO), GOBICHETTIPALAYAM(TK), ERODE(DT)-638506",
        departmentId: autoDeptId,
        classId: autoClassI_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-104 (Bed 2)",
        photoUrl: "/students/karthick_rajan_s.jpg",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 91,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "KAVIN KAARTHIK M",
        registerNumber: "731225AU004",
        email: "731225au004@student.jkkm.ac.in",
        phone: "9087336723",
        parentName: "M. Manoharan",
        parentPhone: "9087336720",
        parentWhatsapp: "9087336723",
        parentEmail: "manoharan.m@gmail.com",
        address: "348F, GANDHI NAGAR, MANICAMPALAYAM, VEERAPPANPALAYAM(PO) & (TK), ERODE(DT), PIN-638004",
        departmentId: autoDeptId,
        classId: autoClassI_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-105 (Bed 1)",
        photoUrl: "/students/kavin_kaarthik_m.jpg",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 78,
        isFaceEnrolled: "true" as const,
      },

      // Additional 15 Realistic Students
      {
        name: "DINESH KUMAR R",
        registerNumber: "731223104001",
        email: "731223104001@student.jkkm.ac.in",
        phone: "9443123456",
        parentName: "R. Ramasamy",
        parentPhone: "9443123450",
        parentWhatsapp: "9443123456",
        parentEmail: "ramasamy.r@gmail.com",
        address: "12, Bharathi Nagar, Bhavani Main Road, Erode - 638001",
        departmentId: cseDeptId,
        classId: cseClassIII_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-201 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 95,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "PRIYA DHARSHINI S",
        registerNumber: "731223104002",
        email: "731223104002@student.jkkm.ac.in",
        phone: "9443234567",
        parentName: "S. Subramanian",
        parentPhone: "9443234560",
        parentWhatsapp: "9443234567",
        parentEmail: "subramanian.s@gmail.com",
        address: "45, Kamarajar Street, Tiruchengode, Namakkal - 637211",
        departmentId: cseDeptId,
        classId: cseClassIII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-102 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 92,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "SARAVANAN K",
        registerNumber: "731223104003",
        email: "731223104003@student.jkkm.ac.in",
        phone: "9443345678",
        parentName: "K. Krishnan",
        parentPhone: "9443345670",
        parentWhatsapp: "9443345678",
        parentEmail: "krishnan.k@gmail.com",
        address: "78, Anna Nagar, Komarapalayam, Namakkal - 638183",
        departmentId: cseDeptId,
        classId: cseClassIII_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-202 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 87,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "SNEHA R",
        registerNumber: "731224104004",
        email: "731224104004@student.jkkm.ac.in",
        phone: "9443456789",
        parentName: "R. Rajendran",
        parentPhone: "9443456780",
        parentWhatsapp: "9443456789",
        parentEmail: "rajendran.r@gmail.com",
        address: "23, Periyar Street, Salem - 636001",
        departmentId: aidsDeptId,
        classId: aidsClassII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-104 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 96,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "PRAVEEN RAJ V",
        registerNumber: "731224104005",
        email: "731224104005@student.jkkm.ac.in",
        phone: "9443567890",
        parentName: "V. Velusamy",
        parentPhone: "9443567890",
        parentWhatsapp: "9443567890",
        parentEmail: "velusamy.v@gmail.com",
        address: "89, Gandhi Road, Sathyamangalam - 638401",
        departmentId: aidsDeptId,
        classId: aidsClassII_A,
        hostelBlock: "Boys Hostel - B Block",
        hostelRoom: "B-101 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 84,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "NAVEEN KUMAR M",
        registerNumber: "731223106006",
        email: "731223106006@student.jkkm.ac.in",
        phone: "9443678901",
        parentName: "M. Mani",
        parentPhone: "9443678900",
        parentWhatsapp: "9443678901",
        parentEmail: "mani.m@gmail.com",
        address: "56, Nethaji Road, Pollachi - 642001",
        departmentId: eceDeptId,
        classId: eceClassIII_A,
        hostelBlock: "Boys Hostel - B Block",
        hostelRoom: "B-102 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 76,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "MONISHA G",
        registerNumber: "731223106007",
        email: "731223106007@student.jkkm.ac.in",
        phone: "9443789012",
        parentName: "G. Govindaraj",
        parentPhone: "9443789010",
        parentWhatsapp: "9443789012",
        parentEmail: "govindaraj.g@gmail.com",
        address: "34, Thillai Nagar, Tiruchirappalli - 620018",
        departmentId: eceDeptId,
        classId: eceClassIII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-201 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 93,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "GOKULNATH T",
        registerNumber: "731224105008",
        email: "731224105008@student.jkkm.ac.in",
        phone: "9443890123",
        parentName: "T. Thangaraj",
        parentPhone: "9443890120",
        parentWhatsapp: "9443890123",
        parentEmail: "thangaraj.t@gmail.com",
        address: "67, Sengunthar Street, Ammapet, Salem - 636003",
        departmentId: eeeDeptId,
        classId: eeeClassII_A,
        hostelBlock: "Boys Hostel - C Block",
        hostelRoom: "C-101 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 81,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "DIVYA BHARATHI M",
        registerNumber: "731224105009",
        email: "731224105009@student.jkkm.ac.in",
        phone: "9443901234",
        parentName: "M. Murugesan",
        parentPhone: "9443901230",
        parentWhatsapp: "9443901234",
        parentEmail: "murugesan.m@gmail.com",
        address: "12, Raja Street, Gobichettipalayam - 638452",
        departmentId: eeeDeptId,
        classId: eeeClassII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-203 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 88,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "MANIKANDAN P",
        registerNumber: "731222103010",
        email: "731222103010@student.jkkm.ac.in",
        phone: "9443012345",
        parentName: "P. Periyasamy",
        parentPhone: "9443012340",
        parentWhatsapp: "9443012345",
        parentEmail: "periyasamy.p@gmail.com",
        address: "88, Cross Cut Road, Gandhipuram, Coimbatore - 641012",
        departmentId: civilDeptId,
        classId: civilClassIV_A,
        hostelBlock: "Boys Hostel - C Block",
        hostelRoom: "C-102 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 90,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "ANITHA S",
        registerNumber: "731222103011",
        email: "731222103011@student.jkkm.ac.in",
        phone: "9443112233",
        parentName: "S. Sekar",
        parentPhone: "9443112230",
        parentWhatsapp: "9443112233",
        parentEmail: "sekar.s@gmail.com",
        address: "15, VOC Street, Kangayam, Tirupur - 638701",
        departmentId: civilDeptId,
        classId: civilClassIV_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-301 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 85,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "SURYA PRAKASH N",
        registerNumber: "731224114012",
        email: "731224114012@student.jkkm.ac.in",
        phone: "9443223344",
        parentName: "N. Natarajan",
        parentPhone: "9443223340",
        parentWhatsapp: "9443223344",
        parentEmail: "natarajan.n@gmail.com",
        address: "99, Car Street, Mettur Dam, Salem - 636401",
        departmentId: mechDeptId,
        classId: mechClassI_A,
        hostelBlock: "Boys Hostel - B Block",
        hostelRoom: "B-201 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 86,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "KEERTHANA R",
        registerNumber: "731224104013",
        email: "731224104013@student.jkkm.ac.in",
        phone: "9443334455",
        parentName: "R. Radhakrishnan",
        parentPhone: "944334450",
        parentWhatsapp: "9443334455",
        parentEmail: "radhakrishnan.r@gmail.com",
        address: "42, Main Road, Anthiyur, Erode - 638501",
        departmentId: cseDeptId,
        classId: cseClassIII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-304 (Bed 2)",
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 94,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "VIGNESHWARAN C",
        registerNumber: "731224102014",
        email: "731224102014@student.jkkm.ac.in",
        phone: "9443445566",
        parentName: "C. Chandrasekar",
        parentPhone: "9443445560",
        parentWhatsapp: "9443445566",
        parentEmail: "chandrasekar.c@gmail.com",
        address: "71, South Street, Dharapuram, Tirupur - 638656",
        departmentId: autoDeptId,
        classId: autoClassI_A,
        hostelBlock: "Boys Hostel - A Block",
        hostelRoom: "A-106 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 74,
        isFaceEnrolled: "true" as const,
      },
      {
        name: "BHUVANESHWARI T",
        registerNumber: "731223104015",
        email: "731223104015@student.jkkm.ac.in",
        phone: "9443556677",
        parentName: "T. Thirumoorthy",
        parentPhone: "9443556670",
        parentWhatsapp: "9443556677",
        parentEmail: "thirumoorthy.t@gmail.com",
        address: "18, EVR Road, Dindigul - 624001",
        departmentId: aidsDeptId,
        classId: aidsClassII_A,
        hostelBlock: "Girls Hostel - Kaveri Block",
        hostelRoom: "G-401 (Bed 1)",
        photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
        idCardUrl: "/students/id_card_sheet.jpg",
        attendancePercentage: 95,
        isFaceEnrolled: "true" as const,
      },
    ];

    const studentUserIds: { [reg: string]: number } = {};

    for (const stu of studentsData) {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.registerNumber, stu.registerNumber));
      if (existing) {
        await db.update(usersTable).set({
          ...stu,
          passwordHash: hashPassword("password123"),
          role: "student",
        }).where(eq(usersTable.id, existing.id));
        studentUserIds[stu.registerNumber] = existing.id;
      } else {
        const [{ insertId }] = await db.insert(usersTable).values({
          ...stu,
          passwordHash: hashPassword("password123"),
          role: "student",
        });
        studentUserIds[stu.registerNumber] = Number(insertId);
      }
    }

    console.log("✅ 20 Students seeded successfully!");

    // 5. Seed Realistic Multi-Stage Leave Records & Gate Passes
    console.log("📋 5. Setting up Multi-Stage Leaves & Digital Outpasses...");
    
    // Clear old test leaves & outpasses for clean consistent test data
    await db.delete(outpassesTable);
    await db.delete(gateLogsTable);
    await db.delete(leavesTable);

    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const threeDaysLater = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
    const fiveDaysAgo = new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0];

    // Scenario 1: VIMAL M - Completed/Returned Outpass (History)
    const vimalId = studentUserIds["731225ME029"];
    if (vimalId) {
      const [{ insertId: leaveId1 }] = await db.insert(leavesTable).values({
        studentId: vimalId,
        passType: "outing_pass",
        leaveType: "shopping",
        reason: "Purchase of engineering drawing instruments and semester stationery.",
        destination: "Gobichettipalayam Town Center",
        fromDate: twoDaysAgo,
        toDate: twoDaysAgo,
        status: "fully_approved",
        currentStep: "completed",
        parentCallStatus: "completed",
        parentCallNotes: "Spoke with father M. Muthusamy. Confirmed purchase outing.",
        tutorRemarks: "Verified required instruments list. Approved.",
        hodRemarks: "Approved.",
        principalRemarks: "Approved for local market purchase.",
        wardenRemarks: "Returned before 7:00 PM cutoff time.",
        riskScore: 10,
        riskLevel: "low",
      });

      const [{ insertId: outpassId1 }] = await db.insert(outpassesTable).values({
        leaveId: Number(leaveId1),
        studentId: vimalId,
        outpassCode: "OUT-MECH-25001",
        gatePassNumber: "GP-2026-0001",
        qrData: JSON.stringify({ student: "VIMAL M", reg: "731225ME029", pass: "OUT-MECH-25001", status: "returned" }),
        status: "returned",
        exitTime: new Date(Date.now() - 86400000 * 2 + 10 * 3600000), // 10:00 AM
        returnTime: new Date(Date.now() - 86400000 * 2 + 18 * 3600000), // 06:00 PM
        gateLocation: "Main Gate 1",
        approvedByWarden: "Mr. R. Murugan",
        approvedByTutor: "Prof. S. Soundar",
        approvedByHod: "Dr. P. Ramesh",
        approvedByPrincipal: "Dr. K. Senthil Kumar",
      });

      // Historical Gate Logs
      await db.insert(gateLogsTable).values([
        {
          studentId: vimalId,
          actionType: "EXIT",
          verificationMethod: "MANUAL",
          confidenceScore: 100,
          leaveId: Number(leaveId1),
          gateName: "Main Gate 1 (ID Barcode)",
          capturedLivePhoto: "/students/vimal_m.jpg",
          timestamp: new Date(Date.now() - 86400000 * 2 + 10 * 3600000),
        },
        {
          studentId: vimalId,
          actionType: "ENTRY",
          verificationMethod: "FACE",
          confidenceScore: 98,
          leaveId: Number(leaveId1),
          gateName: "Main Gate 1 (Face Camera)",
          capturedLivePhoto: "/students/vimal_m.jpg",
          timestamp: new Date(Date.now() - 86400000 * 2 + 18 * 3600000),
        },
      ]);
    }

    // Scenario 2: AZHAGESAN S - Pending Tutor Approval
    const azhagesanId = studentUserIds["731225AU001"];
    if (azhagesanId) {
      await db.insert(leavesTable).values({
        studentId: azhagesanId,
        passType: "hostel_leave",
        leaveType: "family_function",
        reason: "Attending cousin sister wedding ceremony in Perambalur native town.",
        destination: "Athiyur, Perambalur District",
        fromDate: todayStr,
        toDate: threeDaysLater,
        status: "pending",
        currentStep: "tutor",
        parentCallStatus: "pending",
        parentCallNotes: null,
        riskScore: 20,
        riskLevel: "low",
      });
    }

    // Scenario 3: CHINRAJ M - Active Gate Pass, Currently OUTSIDE
    const chinrajId = studentUserIds["731225AU002"];
    if (chinrajId) {
      const [{ insertId: leaveId3 }] = await db.insert(leavesTable).values({
        studentId: chinrajId,
        passType: "outing_pass",
        leaveType: "hair_cut",
        reason: "Haircut and personal grocery purchase at Sathyamangalam market.",
        destination: "Sathyamangalam Market",
        fromDate: todayStr,
        toDate: todayStr,
        status: "fully_approved",
        currentStep: "warden_final",
        parentCallStatus: "confirmed",
        parentCallNotes: "Spoke with father M. Marappan. Confirmed day outing.",
        tutorRemarks: "Approved. Advised to return by 6:30 PM.",
        hodRemarks: "Approved.",
        principalRemarks: "Approved.",
        wardenRemarks: "Outpass issued. Gate pass verified.",
        riskScore: 15,
        riskLevel: "low",
      });

      await db.insert(outpassesTable).values({
        leaveId: Number(leaveId3),
        studentId: chinrajId,
        outpassCode: "OUT-AUTO-25002",
        gatePassNumber: "GP-2026-0002",
        qrData: JSON.stringify({ student: "CHINRAJ M", reg: "731225AU002", pass: "OUT-AUTO-25002", status: "verified" }),
        status: "verified",
        exitTime: new Date(Date.now() - 3600000 * 2), // Exited 2 hours ago
        gateLocation: "Main Gate 1",
        approvedByWarden: "Mr. R. Murugan",
        approvedByTutor: "Prof. S. Soundar",
        approvedByHod: "Dr. P. Ramesh",
        approvedByPrincipal: "Dr. K. Senthil Kumar",
      });

      // Exit Gate Log
      await db.insert(gateLogsTable).values({
        studentId: chinrajId,
        actionType: "EXIT",
        verificationMethod: "MANUAL",
        confidenceScore: 100,
        leaveId: Number(leaveId3),
        gateName: "Main Gate 1 (ID Barcode: 25AU002)",
        capturedLivePhoto: "/students/chinraj_m.jpg",
        timestamp: new Date(Date.now() - 3600000 * 2),
      });
    }

    // Scenario 4: KARTHICK RAJAN S - Tutor Approved, Pending HOD
    const karthickId = studentUserIds["731225AU003"];
    if (karthickId) {
      await db.insert(leavesTable).values({
        studentId: karthickId,
        passType: "hostel_leave",
        leaveType: "project_work",
        reason: "Automobile CAD modeling workshop and component sourcing in Coimbatore industrial estate.",
        destination: "Coimbatore Industrial Estate",
        fromDate: tomorrowStr,
        toDate: threeDaysLater,
        status: "tutor_approved",
        currentStep: "hod",
        parentCallStatus: "confirmed",
        parentCallNotes: "Father S. Selvaraj confirmed project workshop visit.",
        tutorRemarks: "Verified event brochure and permission slip. Recommended.",
        riskScore: 25,
        riskLevel: "low",
      });
    }

    // Scenario 5: KAVIN KAARTHIK M - Emergency Leave (Warden -> Principal)
    const kavinId = studentUserIds["731225AU004"];
    if (kavinId) {
      await db.insert(leavesTable).values({
        studentId: kavinId,
        passType: "hostel_leave",
        leaveType: "family_emergency",
        reason: "Immediate emergency: Grandfather hospitalized in Erode medical center. Need urgent travel permission.",
        destination: "Veerappanpalayam, Erode",
        fromDate: todayStr,
        toDate: tomorrowStr,
        status: "pending",
        currentStep: "warden",
        isEmergency: "true",
        parentCallStatus: "confirmed",
        parentCallNotes: "Direct emergency intimation received from father M. Manoharan.",
        riskScore: 40,
        riskLevel: "medium",
      });
    }

    // Scenario 6: DINESH KUMAR R - HOD Approved, Pending Principal
    const dineshId = studentUserIds["731223104001"];
    if (dineshId) {
      await db.insert(leavesTable).values({
        studentId: dineshId,
        passType: "hostel_leave",
        leaveType: "study_holiday",
        reason: "Semester examination preparation at native place with study group materials.",
        destination: "Bhavani, Erode",
        fromDate: tomorrowStr,
        toDate: threeDaysLater,
        status: "hod_approved",
        currentStep: "principal",
        parentCallStatus: "confirmed",
        parentCallNotes: "Spoke with father R. Ramasamy. Confirmed leave.",
        tutorRemarks: "Attendance is 95%. Excellent track record.",
        hodRemarks: "Forwarded for Principal approval.",
        riskScore: 10,
        riskLevel: "low",
      });
    }

    // Scenario 7: PRIYA DHARSHINI S - Principal Approved, Pending Warden Final
    const priyaId = studentUserIds["731223104002"];
    if (priyaId) {
      await db.insert(leavesTable).values({
        studentId: priyaId,
        passType: "hostel_leave",
        leaveType: "family_function",
        reason: "Attending elder brother engagement in Tiruchengode.",
        destination: "Tiruchengode, Namakkal",
        fromDate: tomorrowStr,
        toDate: threeDaysLater,
        status: "principal_approved",
        currentStep: "warden_final",
        parentCallStatus: "confirmed",
        parentCallNotes: "Mother called and confirmed the engagement function.",
        tutorRemarks: "Approved.",
        hodRemarks: "Approved.",
        principalRemarks: "Granted. Safe journey.",
        riskScore: 15,
        riskLevel: "low",
      });
    }

    // Scenario 8: VIGNESHWARAN C - Rejected Request (Low Attendance warning)
    const vigneshId = studentUserIds["731224102014"];
    if (vigneshId) {
      await db.insert(leavesTable).values({
        studentId: vigneshId,
        passType: "hostel_leave",
        leaveType: "personal_work",
        reason: "Personal home visit for 4 days.",
        destination: "Dharapuram",
        fromDate: todayStr,
        toDate: threeDaysLater,
        status: "rejected",
        currentStep: "rejected",
        parentCallStatus: "rejected",
        parentCallNotes: "Attendance is below 75% threshold (74%). Parent informed to meet Tutor.",
        tutorRemarks: "Rejected due to attendance shortage (<75%). Must attend special coaching classes.",
        riskScore: 65,
        riskLevel: "high",
      });
    }

    console.log("🎉 Realistic Test Dataset Population Complete!");
    console.log("----------------------------------------------------------------");
    console.log("20 Students, Staff accounts, Leaves & Gate Logs successfully populated in MySQL.");
    console.log("----------------------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

runSeed();
