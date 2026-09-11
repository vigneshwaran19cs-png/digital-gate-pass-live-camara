const fs = require('fs');
const path = require('path');

const tsxPath = path.join(__dirname, '../artifacts/hostel-outpass/src/pages/admin/id-card-upload.tsx');
const content = fs.readFileSync(tsxPath, 'utf8');

const regex = /\{\s*name:\s*"([^"]+)",\s*reg:\s*"([^"]+)",\s*barcode:\s*"([^"]+)"(?:,\s*dept:\s*"([^"]+)")?/g;

const entries = {};
let match;
while ((match = regex.exec(content)) !== null) {
  const name = match[1].trim();
  const reg = match[2].trim().toUpperCase();
  const barcode = match[3].trim().toUpperCase();
  const dept = match[4] ? match[4].trim().toUpperCase() : "";

  const shortReg = reg.replace(/^7312/, "");

  entries[reg] = { name, reg, barcode, dept };
  entries[barcode] = { name, reg, barcode, dept };
  entries[shortReg] = { name, reg, barcode, dept };
  entries[`7312${shortReg}`] = { name, reg, barcode, dept };
}

console.log(`Extracted ${Object.keys(entries).length} index mappings for student candidates.`);

const tsContent = `// Auto-generated student candidate lookup map
export interface CandidateStudentInfo {
  name: string;
  reg: string;
  barcode: string;
  dept: string;
}

export const STUDENT_CANDIDATE_MAP: Record<string, CandidateStudentInfo> = ${JSON.stringify(entries, null, 2)};

export function lookupRealStudentName(identifier?: string | null, fallbackName?: string | null): string {
  if (!identifier) return fallbackName || "Student";
  const clean = String(identifier).trim().toUpperCase().split("@")[0].replace(/^7312/, "");

  const found = STUDENT_CANDIDATE_MAP[clean] || STUDENT_CANDIDATE_MAP[\`7312\${clean}\`] || STUDENT_CANDIDATE_MAP[identifier.trim().toUpperCase()];
  if (found && found.name) return found.name;

  if (fallbackName && !fallbackName.startsWith("Student (") && fallbackName !== "Student User" && fallbackName !== "Student") {
    return fallbackName;
  }

  return \`Student \${clean}\`;
}
`;

fs.writeFileSync(path.join(__dirname, '../artifacts/api-server/src/lib/student_candidates.ts'), tsContent);
fs.writeFileSync(path.join(__dirname, '../artifacts/hostel-outpass/src/lib/student_candidates.ts'), tsContent);
console.log('✓ Successfully generated student_candidates.ts for both api-server and hostel-outpass!');
