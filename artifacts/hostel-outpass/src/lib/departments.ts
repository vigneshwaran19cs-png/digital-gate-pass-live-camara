export interface DepartmentItem {
  id?: number | string;
  name: string;
  code: string;
  category: string;
}

export const MASTER_DEPARTMENTS: DepartmentItem[] = [
  // 1. Engineering & Technology
  { name: "Computer Science & Engineering", code: "CSE", category: "🛠️ Engineering & Technology" },
  { name: "Artificial Intelligence & Data Science", code: "AI & DS", category: "🛠️ Engineering & Technology" },
  { name: "Cyber Security & Digital Forensics", code: "CYBER", category: "🛠️ Engineering & Technology" },
  { name: "Information Technology", code: "IT", category: "🛠️ Engineering & Technology" },
  { name: "Electronics & Communication Engineering", code: "ECE", category: "🛠️ Engineering & Technology" },
  { name: "Electrical & Electronics Engineering", code: "EEE", category: "🛠️ Engineering & Technology" },
  { name: "Mechanical Engineering", code: "MECH", category: "🛠️ Engineering & Technology" },
  { name: "Civil Engineering", code: "CIVIL", category: "🛠️ Engineering & Technology" },
  { name: "Automobile Engineering", code: "AUTO", category: "🛠️ Engineering & Technology" },
  { name: "Biomedical Engineering", code: "BIOMED", category: "🛠️ Engineering & Technology" },
  { name: "Robotics & Automation", code: "ROBOTICS", category: "🛠️ Engineering & Technology" },
  { name: "Mechatronics Engineering", code: "MCT", category: "🛠️ Engineering & Technology" },

  // 2. Agricultural Sciences
  { name: "B.Sc (Hons.) Agriculture", code: "AGRI", category: "🌾 Agricultural Sciences" },
  { name: "B.Sc (Hons.) Horticulture", code: "HORT", category: "🌾 Agricultural Sciences" },
  { name: "Agricultural Engineering", code: "AGRI ENGG", category: "🌾 Agricultural Sciences" },
  { name: "Food Technology & Processing", code: "FOOD TECH", category: "🌾 Agricultural Sciences" },
  { name: "Forestry & Environmental Science", code: "FORESTRY", category: "🌾 Agricultural Sciences" },

  // 3. Pharmacy Colleges
  { name: "Bachelor of Pharmacy (B.Pharm)", code: "B.PHARM", category: "💊 Pharmacy Colleges" },
  { name: "Doctor of Pharmacy (Pharm.D)", code: "PHARM.D", category: "💊 Pharmacy Colleges" },
  { name: "Diploma in Pharmacy (D.Pharm)", code: "D.PHARM", category: "💊 Pharmacy Colleges" },
  { name: "Pharmaceutics (M.Pharm)", code: "M.PHARM-P", category: "💊 Pharmacy Colleges" },

  // 4. Polytechnic & Diploma
  { name: "Diploma in Mechanical Engineering", code: "D-MECH", category: "⚙️ Polytechnic & Diploma" },
  { name: "Diploma in Civil Engineering", code: "D-CIVIL", category: "⚙️ Polytechnic & Diploma" },
  { name: "Diploma in Electrical & Electronics", code: "D-EEE", category: "⚙️ Polytechnic & Diploma" },
  { name: "Diploma in Electronics & Communication", code: "D-ECE", category: "⚙️ Polytechnic & Diploma" },
  { name: "Diploma in Computer Engineering", code: "D-CSE", category: "⚙️ Polytechnic & Diploma" },
  { name: "Diploma in Automobile Engineering", code: "D-AUTO", category: "⚙️ Polytechnic & Diploma" },

  // 5. Arts, Science, Commerce & Management
  { name: "Computer Applications (BCA / MCA)", code: "BCA/MCA", category: "🔬 Arts, Science & Management" },
  { name: "Business Administration (BBA / MBA)", code: "BBA/MBA", category: "🔬 Arts, Science & Management" },
  { name: "Commerce & Accounting (B.Com / M.Com)", code: "B.COM", category: "🔬 Arts, Science & Management" },
  { name: "Biotechnology & Microbiology", code: "BIOTECH", category: "🔬 Arts, Science & Management" },
  { name: "Physics & Applied Sciences", code: "PHYSICS", category: "🔬 Arts, Science & Management" },
  { name: "Chemistry & Industrial Chemistry", code: "CHEMISTRY", category: "🔬 Arts, Science & Management" },
  { name: "Mathematics & Statistics", code: "MATHS", category: "🔬 Arts, Science & Management" },
  { name: "English Literature", code: "ENGLISH", category: "🔬 Arts, Science & Management" },

  // 6. Nursing & Allied Health Sciences
  { name: "B.Sc Nursing", code: "NURSING", category: "🩺 Nursing & Health Sciences" },
  { name: "Bachelor of Physiotherapy (BPT)", code: "BPT", category: "🩺 Nursing & Health Sciences" },
  { name: "Medical Lab Technology (B.Sc MLT)", code: "B.SC MLT", category: "🩺 Nursing & Health Sciences" },
  { name: "Radiology & Imaging Tech", code: "RADIOLOGY", category: "🩺 Nursing & Health Sciences" },
  { name: "Operation Theatre & Anaesthesia Tech", code: "OT TECH", category: "🩺 Nursing & Health Sciences" }
];

export function getGroupedDepartments(apiDepartments?: any[]): Record<string, DepartmentItem[]> {
  const deptsToUse = (apiDepartments && apiDepartments.length > 0) ? apiDepartments : MASTER_DEPARTMENTS;

  const grouped: Record<string, DepartmentItem[]> = {};

  for (const d of deptsToUse) {
    let cat = d.category;
    if (!cat) {
      const code = (d.code || "").toUpperCase();
      const name = (d.name || "").toUpperCase();
      if (code.includes("AGRI") || code.includes("HORT") || name.includes("AGRICULTURE")) cat = "🌾 Agricultural Sciences";
      else if (code.includes("PHARM") || name.includes("PHARMACY")) cat = "💊 Pharmacy Colleges";
      else if (code.includes("D-") || name.includes("DIPLOMA")) cat = "⚙️ Polytechnic & Diploma";
      else if (code.includes("NURS") || code.includes("BPT") || code.includes("MLT") || name.includes("HEALTH") || name.includes("NURSING")) cat = "🩺 Nursing & Health Sciences";
      else if (code.includes("BCA") || code.includes("MBA") || code.includes("COM") || name.includes("ARTS") || name.includes("SCIENCE")) cat = "🔬 Arts, Science & Management";
      else cat = "🛠️ Engineering & Technology";
    }

    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  }

  return grouped;
}
