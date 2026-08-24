import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { User, Calendar, GraduationCap, AlertCircle, FileText, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";

interface StudentSidePanelProps {
  student: {
    id?: number;
    name?: string | null;
    registerNumber?: string | null;
    departmentId?: number | null;
    departmentName?: string | null;
    photoUrl?: string | null;
    attendancePercentage?: number | null;
    collegeType?: string | null;
    hostelBlock?: string | null;
    hostelRoom?: string | null;
    parentPhone?: string | null;
  } | null;
  userRole?: string | null;
  currentLeave?: any | null;
  previousLeaves?: any[] | null;
}

export function StudentSidePanel({
  student,
  userRole,
  currentLeave,
  previousLeaves = [],
}: StudentSidePanelProps) {
  if (!student) return null;

  // Role visibility for attendance percentage:
  // Student, Tutor, HOD, Principal, Admin can view.
  // Warden & Security MUST NOT see attendance percentage.
  const isAuthorizedToViewAttendance = ["student", "tutor", "hod", "principal", "super_admin", "admin"].includes(
    userRole || ""
  );

  const totalLeavesCount = previousLeaves ? previousLeaves.length : 0;
  const approvedLeavesCount = previousLeaves
    ? previousLeaves.filter((l) => l.status === "fully_approved").length
    : 0;

  return (
    <Card className="glass-card shadow-lg border-blue-100 dark:border-blue-900/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
        <div className="flex items-center gap-3">
          <StudentProfilePhoto
            photoUrl={student.photoUrl}
            name={student.name || "Student"}
            size="lg"
            className="border-2 border-white/80 shadow-md shrink-0"
          />
          <div className="space-y-0.5 overflow-hidden">
            <CardTitle className="text-lg font-bold text-white truncate">
              {student.name || "Student Details"}
            </CardTitle>
            <div className="text-xs text-blue-100 font-mono">
              Reg: {student.registerNumber || "STU-REG"}
            </div>
            <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] border-none mt-1">
              {student.departmentName || "Engineering"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Academic Details */}
        <div className="space-y-2 border-b pb-3 dark:border-slate-800">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Department:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {student.departmentName || "CSE"}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground">Year / Class:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              III Year (A Sec)
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-muted-foreground">Hostel & Room:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {student.hostelBlock || "Block A"} - {student.hostelRoom || "101"}
            </span>
          </div>
        </div>

        {/* Attendance Percentage & Leave Stats (Scoped by Role) */}
        {isAuthorizedToViewAttendance ? (
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-center p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Attendance</div>
              <div className="text-lg font-extrabold text-emerald-600">
                {student.attendancePercentage ?? 87}%
              </div>
              <div className="text-[9px] text-muted-foreground">174 / 200 Days</div>
            </div>

            <div className="text-center p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Leaves Taken</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {totalLeavesCount} Days
              </div>
              <div className="text-[9px] text-muted-foreground">{approvedLeavesCount} Approved</div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border text-center">
            <span className="text-[11px] font-semibold text-slate-500 italic">
              Academic attendance stats strictly restricted for this role
            </span>
          </div>
        )}

        {/* Current Leave Request Summary */}
        {currentLeave && (
          <div className="space-y-1.5 border-b pb-3 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Current Leave Request
            </div>
            <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300 capitalize">
                  {currentLeave.leaveType?.replace("_", " ")}
                </span>
                {currentLeave.isEmergency === "true" || currentLeave.leaveType === "family_emergency" ? (
                  <Badge className="bg-red-600 text-white text-[9px] animate-pulse">
                    🔴 EMERGENCY
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px]">
                    {currentLeave.status}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                📅 {currentLeave.fromDate} → {currentLeave.toDate}
              </div>
              <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                "{currentLeave.reason}"
              </div>
            </div>
          </div>
        )}

        {/* Previous Leave Summary */}
        <div className="space-y-1.5">
          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-600" /> Previous Leave Summary
          </div>
          {previousLeaves && previousLeaves.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {previousLeaves.slice(0, 3).map((prev: any) => (
                <div
                  key={prev.id}
                  className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded border flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold truncate">{prev.reason || prev.leaveType}</div>
                    <div className="text-[10px] text-muted-foreground">{prev.fromDate}</div>
                  </div>
                  <Badge
                    variant={prev.status === "fully_approved" ? "default" : "secondary"}
                    className="text-[9px] shrink-0"
                  >
                    {prev.status === "fully_approved" ? "Approved" : prev.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground italic text-[11px]">No prior leave records.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
