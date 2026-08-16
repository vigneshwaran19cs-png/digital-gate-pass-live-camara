import fs from 'fs';
import path from 'path';

const file = './artifacts/hostel-outpass/src/pages/dashboard/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  'useCreateUser, useUpdateUser, useDeleteUser',
  'useCreateUser, useUpdateUser, useDeleteUser, useListDepartments, useListClasses'
);

// 2. Remove static arrays
code = code.replace(
  /const DEPARTMENTS = \[.*?\];\nconst YEARS = \[.*?\];\n/,
  ''
);

// 3. UserFormData
code = code.replace(
  /department: string;\n  registerNumber: string;\n  year: string;\n  hostelRoom: string;/g,
  'departmentId: string;\n  classId: string;\n  registerNumber: string;\n  hostelRoom: string;'
);

code = code.replace(
  /department: "",\n  registerNumber: "", year: "1st Year", hostelRoom: ""/g,
  'departmentId: "", classId: "",\n  registerNumber: "", hostelRoom: ""'
);

// 4. AdminDashboard hooks
code = code.replace(
  /const users = usersRaw as any\[\];\n/,
  `const users = usersRaw as any[];\n\n  const { data: departmentsRaw = [] } = useListDepartments();\n  const { data: classesRaw = [] } = useListClasses();\n  const depList = departmentsRaw as any[];\n  const clsList = classesRaw as any[];\n`
);

// 5. filter logic
code = code.replace(
  /const matchDept = deptFilter === "all" \|\| u\.department === deptFilter;/g,
  'const matchDept = deptFilter === "all" || u.departmentId === parseInt(deptFilter, 10);'
);

// 6. matchDept function and DEPT_STATS
code = code.replace(
  /const matchDept = \(uDept\?: string, dName\?: string\) => \{[\s\S]*?const DEPT_STATS = DEPARTMENTS\.map\(\(deptName, i\) => \{[\s\S]*?color: colors\[i % colors\.length\]\n    \};\n  \}\);/m,
  `const getDeptName = (id: number) => depList.find(d => d.id === id)?.name || "";
  const getClassName = (id: number) => {
    const c = clsList.find(c => c.id === id);
    return c ? \`\${c.year} Year \${c.section}\` : "";
  };

  const DEPT_STATS = depList.map((dept, i) => {
    const deptUsers = users.filter(u => u.departmentId === dept.id);
    const deptStudents = deptUsers.filter(u => u.role === "student");
    const deptStaff = deptUsers.filter(u => u.role !== "student");
    const deptLeaves = allLeaves.filter((l: any) => l.student?.departmentId === dept.id || l.departmentId === dept.id);
    
    const colors = [
      "from-blue-500 to-indigo-500",
      "from-violet-500 to-purple-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-teal-500",
      "from-cyan-500 to-blue-500",
      "from-rose-500 to-pink-500",
      "from-slate-500 to-slate-600"
    ];

    return {
      id: dept.id,
      name: dept.name,
      students: deptStudents.length,
      staff: deptStaff.length,
      leaves: deptLeaves.length,
      color: colors[i % colors.length]
    };
  });`
);

// 7. openEdit
code = code.replace(
  /department: u\.department \|\| "", registerNumber: u\.registerNumber \|\| "", year: "3rd Year",/g,
  'departmentId: u.departmentId?.toString() || "", classId: u.classId?.toString() || "", registerNumber: u.registerNumber || "",'
);

// 8. Create / Update payload
code = code.replace(
  /department: formData\.department \|\| undefined,\n        registerNumber: formData\.registerNumber \|\| undefined,/g,
  'departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,\n        classId: formData.classId ? parseInt(formData.classId, 10) : undefined,\n        registerNumber: formData.registerNumber || undefined,'
);

code = code.replace(
  /department: formData\.department \|\| undefined,\n        password: formData\.password \|\| undefined,/g,
  'departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,\n        classId: formData.classId ? parseInt(formData.classId, 10) : undefined,\n        password: formData.password || undefined,'
);

// 9. Department Filter Select
code = code.replace(
  /\{DEPARTMENTS\.map\(d => <SelectItem key=\{d\} value=\{d\}>\{d\}<\/SelectItem>\)\}/g,
  '{depList.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}'
);

// 10. Student Tab (Display dept name)
code = code.replace(
  /\{u\.department && <span.*?\{u\.department\}<\/span>\}/g,
  '{getDeptName(u.departmentId) && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{getDeptName(u.departmentId)}</span>}'
);

// 11. Staff Tab (Display dept name)
code = code.replace(
  /\{u\.department && <span.*?\{u\.department\}<\/span>\}/g,
  '{getDeptName(u.departmentId) && <span className="text-xs text-muted-foreground">{getDeptName(u.departmentId)}</span>}'
);

// 12. HOD / Tutors assignment display
code = code.replace(
  /const deptHod = hods\.find\(\(h: any\) => h\.department === dept\.name\);\n                  const deptTutors = tutors\.filter\(\(t: any\) => t\.department === dept\.name\);/g,
  'const deptHod = hods.find((h: any) => h.departmentId === dept.id);\n                  const deptTutors = tutors.filter((t: any) => t.departmentId === dept.id);'
);

// 13. UserForm component in AdminDashboard
code = code.replace(
  /function UserForm\(\{ formData, updateForm, isEdit = false \}: \{ formData: UserFormData; updateForm: \(field: keyof UserFormData, value: string\) => void; isEdit\?: boolean \}\) \{/g,
  `function UserForm({ formData, updateForm, isEdit = false }: { formData: UserFormData; updateForm: (field: keyof UserFormData, value: string) => void; isEdit?: boolean }) {
  const { data: departmentsRaw = [] } = useListDepartments();
  const { data: classesRaw = [] } = useListClasses();
  const depList = departmentsRaw as any[];
  const clsList = classesRaw as any[];
  const filteredClasses = formData.departmentId ? clsList.filter(c => c.departmentId === parseInt(formData.departmentId, 10)) : [];
`
);

// Department Select inside UserForm (it's at the end of the file, let's just rewrite the end)
// We know AdminDashboard's UserForm is simple, maybe we can just replace the whole UserForm with the one from users/index.tsx?
// No, let's just do a simple replacement for the department select:
code = code.replace(
  /<Select value=\{formData\.department\} onValueChange=\{v => updateForm\("department", v\)\}>\n            <SelectTrigger className="mt-1\.5"><SelectValue \/><\/SelectTrigger>\n            <SelectContent>\n              \{DEPARTMENTS\.map\(d => <SelectItem key=\{d\} value=\{d\}>\{d\}<\/SelectItem>\)\}\n            <\/SelectContent>\n          <\/Select>/g,
  `<Select value={formData.departmentId} onValueChange={v => { updateForm("departmentId", v); updateForm("classId", ""); }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Department" /></SelectTrigger>
            <SelectContent>
              {depList.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>`
);

// Add class select to UserForm if student
code = code.replace(
  /<div>\n          <Label>Register Number<\/Label>\n          <Input/g,
  `{isStudent && (
          <div>
            <Label>Class</Label>
            <Select value={formData.classId} onValueChange={v => updateForm("classId", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                {filteredClasses.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.year} Year {c.section}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Register Number</Label>
          <Input`
);


fs.writeFileSync(file, code);
console.log("Refactored AdminDashboard.tsx");
