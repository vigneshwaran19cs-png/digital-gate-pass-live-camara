import fs from 'fs';

const file = './artifacts/hostel-outpass/src/pages/dashboard/TutorDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove states
code = code.replace(/  const \[deptFilter, setDeptFilter\] = useState\("all"\);\n  const \[yearFilter, setYearFilter\] = useState\("all"\);\n/g, '');

// Remove match logic
code = code.replace(/    const matchDept = deptFilter === "all" \|\| l\.student\?\.departmentId === parseInt\(deptFilter, 10\);\n    \n    let year = "3rd Year";\n    if \(l\.student\?\.registerNumber\?\.includes\("22"\) \|\| l\.student\?\.registerNumber === "STU002"\) year = "4th Year";\n    else if \(l\.student\?\.registerNumber\?\.includes\("23"\)\) year = "3rd Year";\n    else if \(l\.student\?\.registerNumber\?\.includes\("24"\)\) year = "2nd Year";\n    else if \(l\.student\?\.registerNumber\?\.includes\("25"\)\) year = "1st Year";\n    \n    const matchYear = yearFilter === "all" \|\| year === yearFilter;\n    return matchSearch && matchStatus && matchDept && matchYear;\n/g, '    return matchSearch && matchStatus;\n');

// Remove JSX for filters
code = code.replace(/        <Select value=\{deptFilter\} onValueChange=\{setDeptFilter\}>\n          <SelectTrigger className="w-full md:w-44">\n            <Filter className="w-4 h-4 mr-2 text-muted-foreground" \/>\n            <SelectValue placeholder="Department" \/>\n          <\/SelectTrigger>\n          <SelectContent>\n            <SelectItem value="all">All Departments<\/SelectItem>\n            <SelectItem value="Computer Science">Computer Science<\/SelectItem>\n            <SelectItem value="Electronics">Electronics<\/SelectItem>\n            <SelectItem value="Mechanical">Mechanical<\/SelectItem>\n            <SelectItem value="Civil">Civil<\/SelectItem>\n          <\/SelectContent>\n        <\/Select>\n        <Select value=\{yearFilter\} onValueChange=\{setYearFilter\}>\n          <SelectTrigger className="w-full md:w-36">\n            <Filter className="w-4 h-4 mr-2 text-muted-foreground" \/>\n            <SelectValue placeholder="Year" \/>\n          <\/SelectTrigger>\n          <SelectContent>\n            <SelectItem value="all">All Years<\/SelectItem>\n            <SelectItem value="1st Year">1st Year<\/SelectItem>\n            <SelectItem value="2nd Year">2nd Year<\/SelectItem>\n            <SelectItem value="3rd Year">3rd Year<\/SelectItem>\n            <SelectItem value="4th Year">4th Year<\/SelectItem>\n          <\/SelectContent>\n        <\/Select>\n/g, '');

fs.writeFileSync(file, code);
console.log("Refactored TutorDashboard.tsx");
