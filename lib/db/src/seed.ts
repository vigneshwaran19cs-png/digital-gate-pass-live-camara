import { db } from "./index.js";
import { departmentsTable } from "./schema/departments.js";
import { classesTable } from "./schema/classes.js";
import { ALL_COLLEGE_DEPARTMENTS } from "./departments_data.js";
import { sql } from "drizzle-orm";

const OFFICIAL_DEPARTMENTS = ALL_COLLEGE_DEPARTMENTS;

const YEARS = ["I", "II", "III", "IV"] as const;
const SECTIONS = ["A", "B"] as const;

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Note: In a real system you'd want to be careful about truncating
    // because of foreign keys. For this fresh initialization, we will
    // delete existing classes and departments to insert the clean official ones.
    
    // First, clear existing classes (because they depend on departments)
    await db.delete(classesTable);
    console.log("🧹 Cleared existing classes.");
    
    // Then, clear existing departments
    // If there are foreign key constraints from users, this might fail! 
    // We'll ignore foreign key checks temporarily for this one-time initialization.
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
    await db.delete(departmentsTable);
    console.log("🧹 Cleared existing departments.");
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);

    // Insert new departments
    for (const dept of OFFICIAL_DEPARTMENTS) {
      const [{ insertId: departmentId }] = await db.insert(departmentsTable).values({
        code: dept.code,
        name: dept.name,
      });

      console.log(`✅ Created Department: ${dept.name} (ID: ${departmentId})`);

      // Insert 8 classes for this department
      for (const year of YEARS) {
        for (const section of SECTIONS) {
          await db.insert(classesTable).values({
            departmentId: Number(departmentId),
            year,
            section,
          });
        }
      }
      console.log(`   └─ ✅ Created 8 classes for ${dept.code}`);
    }

    console.log("🎉 Seeding complete! 12 Departments and 96 Classes created.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
