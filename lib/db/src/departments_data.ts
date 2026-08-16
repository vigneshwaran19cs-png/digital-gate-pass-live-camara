export interface DepartmentSeed {
  name: string;
  code: string;
  category: string;
}

export const ALL_COLLEGE_DEPARTMENTS: DepartmentSeed[] = [
  // 1. Engineering & Technology
  { name: "Computer Science and Engineering", code: "CSE", category: "Engineering & Technology" },
  { name: "Artificial Intelligence and Data Science", code: "AI & DS", category: "Engineering & Technology" },
  { name: "Cyber Security & Digital Forensics", code: "CYBER", category: "Engineering & Technology" },
  { name: "Information Technology", code: "IT", category: "Engineering & Technology" },
  { name: "Electronics and Communication Engineering", code: "ECE", category: "Engineering & Technology" },
  { name: "Electrical and Electronics Engineering", code: "EEE", category: "Engineering & Technology" },
  { name: "Mechanical Engineering", code: "MECH", category: "Engineering & Technology" },
  { name: "Civil Engineering", code: "CIVIL", category: "Engineering & Technology" },
  { name: "Automobile Engineering", code: "AUTO", category: "Engineering & Technology" },
  { name: "Biomedical Engineering", code: "BIOMED", category: "Engineering & Technology" },
  { name: "Robotics and Automation", code: "ROBOTICS", category: "Engineering & Technology" },
  { name: "Mechatronics Engineering", code: "MCT", category: "Engineering & Technology" },
  { name: "Chemical Engineering", code: "CHEM", category: "Engineering & Technology" },

  // 2. Agricultural Sciences
  { name: "B.Sc (Hons.) Agriculture", code: "AGRI", category: "Agricultural Sciences" },
  { name: "B.Sc (Hons.) Horticulture", code: "HORT", category: "Agricultural Sciences" },
  { name: "Agricultural Engineering", code: "AGRI ENGG", category: "Agricultural Sciences" },
  { name: "Food Technology & Processing", code: "FOOD TECH", category: "Agricultural Sciences" },
  { name: "Forestry & Environmental Science", code: "FORESTRY", category: "Agricultural Sciences" },
  { name: "Sericulture & Agri-Business", code: "SERI", category: "Agricultural Sciences" },

  // 3. Pharmacy & Pharmaceutical Sciences
  { name: "Bachelor of Pharmacy (B.Pharm)", code: "B.PHARM", category: "Pharmacy Colleges" },
  { name: "Doctor of Pharmacy (Pharm.D)", code: "PHARM.D", category: "Pharmacy Colleges" },
  { name: "Diploma in Pharmacy (D.Pharm)", code: "D.PHARM", category: "Pharmacy Colleges" },
  { name: "Pharmaceutics (M.Pharm)", code: "M.PHARM-P", category: "Pharmacy Colleges" },
  { name: "Pharmacology (M.Pharm)", code: "M.PHARM-COL", category: "Pharmacy Colleges" },
  { name: "Pharmaceutical Chemistry", code: "M.PHARM-CHEM", category: "Pharmacy Colleges" },

  // 4. Polytechnic & Diploma
  { name: "Diploma in Mechanical Engineering", code: "D-MECH", category: "Polytechnic Colleges" },
  { name: "Diploma in Civil Engineering", code: "D-CIVIL", category: "Polytechnic Colleges" },
  { name: "Diploma in Electrical & Electronics", code: "D-EEE", category: "Polytechnic Colleges" },
  { name: "Diploma in Electronics & Communication", code: "D-ECE", category: "Polytechnic Colleges" },
  { name: "Diploma in Computer Engineering", code: "D-CSE", category: "Polytechnic Colleges" },
  { name: "Diploma in Automobile Engineering", code: "D-AUTO", category: "Polytechnic Colleges" },
  { name: "Diploma in Tool & Die Making", code: "D-TOOL", category: "Polytechnic Colleges" },

  // 5. Arts, Science, Commerce & Management
  { name: "Computer Applications (BCA / MCA)", code: "BCA/MCA", category: "Arts & Science Colleges" },
  { name: "Business Administration (BBA / MBA)", code: "BBA/MBA", category: "Arts & Science Colleges" },
  { name: "Commerce & Accounting (B.Com / M.Com)", code: "B.COM", category: "Arts & Science Colleges" },
  { name: "Biotechnology & Microbiology", code: "BIOTECH", category: "Arts & Science Colleges" },
  { name: "Physics & Applied Electronics", code: "PHYSICS", category: "Arts & Science Colleges" },
  { name: "Chemistry & Industrial Chemistry", code: "CHEMISTRY", category: "Arts & Science Colleges" },
  { name: "Mathematics & Statistics", code: "MATHS", category: "Arts & Science Colleges" },
  { name: "Nutrition, FSM & Dietetics", code: "NUTRITION", category: "Arts & Science Colleges" },
  { name: "English Literature & Communication", code: "ENGLISH", category: "Arts & Science Colleges" },

  // 6. Nursing & Allied Health Sciences
  { name: "B.Sc Nursing", code: "NURSING", category: "Nursing & Paramedical" },
  { name: "Bachelor of Physiotherapy (BPT)", code: "BPT", category: "Nursing & Paramedical" },
  { name: "Medical Lab Technology (B.Sc MLT)", code: "B.SC MLT", category: "Nursing & Paramedical" },
  { name: "Radiology & Imaging Technology", code: "RADIOLOGY", category: "Nursing & Paramedical" },
  { name: "Operation Theatre & Anaesthesia Tech", code: "OT TECH", category: "Nursing & Paramedical" }
];
