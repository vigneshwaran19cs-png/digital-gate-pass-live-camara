import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, useListLeaves } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { LiveStudentLocationTracker } from "@/components/LiveStudentLocationTracker";
import {
  Users, GraduationCap, Building, Phone, Calendar, Clock,
  CheckCircle2, ShieldCheck, MapPin, AlertTriangle, MessageSquare,
  QrCode, ExternalLink, Sparkles, Home, UserCheck
} from "lucide-react";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

export default function ParentDashboard() {
  const { user } = useAuth();
  const { data: usersRaw = [] } = useListUsers();
  const allUsers = usersRaw as any[];

  // Filter student users
  const studentUsers = allUsers.filter((u: any) => u.role === "student");

  // Find linked student (matched by parentPhone / parentEmail / or first student)
  const linkedStudent = studentUsers.find(
    (s: any) =>
      (user?.phone && (s.parentPhone === user.phone || s.parentWhatsapp === user.phone)) ||
      (user?.email && s.parentEmail === user.email)
  ) || studentUsers[0] || user;

  const [selectedStudentId, setSelectedStudentId] = useState<number>(linkedStudent?.id || 1);

  const currentStudent = studentUsers.find((s: any) => s.id === selectedStudentId) || linkedStudent;

  const { data: leavesRaw = [] } = useListLeaves({ studentId: currentStudent?.id });
  const leaves = (leavesRaw as any)?.leaves ?? (leavesRaw as any) ?? [];

  const pendingLeaves = (leaves as any[]).filter((l: any) => !["fully_approved", "rejected", "completed"].includes(l.status));
  const activeOutpasses = (leaves as any[]).filter((l: any) => l.outpassId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Parent Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl backdrop-blur-md shadow-inner">
            👨‍👩‍👧
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-semibold">
                Verified Parent Portal
              </Badge>
              <span className="text-xs text-blue-200">JKKM Educational Institutions</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">
              Welcome, {user?.name || currentStudent?.parentName || "Parent / Guardian"}
            </h1>
            <p className="text-xs text-blue-200/80">
              Live Monitoring & Safe Transit Portal for your ward: <span className="font-bold text-white">{currentStudent?.name}</span>
            </p>
          </div>
        </div>

        {/* Student Selector (If multiple wards or demo preview) */}
        {studentUsers.length > 1 && (
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 w-full md:w-auto">
            <div className="text-[10px] uppercase font-bold text-blue-200 mb-1 px-1">Select Student Ward:</div>
            <Select
              value={selectedStudentId.toString()}
              onValueChange={(val) => setSelectedStudentId(parseInt(val, 10))}
            >
              <SelectTrigger className="bg-white text-slate-800 font-semibold h-8 text-xs border-0 min-w-48">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {studentUsers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name} ({s.registerNumber || `STU${s.id}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Ward Profile & Live Status Card */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
        <Card className="glass-card border shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StudentProfilePhoto
                  photoUrl={currentStudent?.photoUrl}
                  name={currentStudent?.name || "Student"}
                  size="xl"
                  className="w-16 h-16 rounded-2xl border-2 border-blue-500 shadow-sm shrink-0 bg-white"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentStudent?.name}</h2>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-mono">
                      {currentStudent?.registerNumber || "STU001"}
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      {currentStudent?.attendancePercentage || 92}% Attendance
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      III Year - Mechanical / Automobile Engg
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      {currentStudent?.hostelBlock || "Boys Hostel - Main Block"} ({currentStudent?.hostelRoom || "Room A-204"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Current Status</div>
                  <div className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    En Route (Traveling Home)
                  </div>
                  <div className="text-[10px] text-muted-foreground">Outpass Verified at Main Gate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Live GPS Location & Safe Tracking Map */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
        <LiveStudentLocationTracker
          studentId={currentStudent?.id || 1}
          studentName={currentStudent?.name || "Student"}
          studentRegisterNumber={currentStudent?.registerNumber || ""}
          destinationAddress={currentStudent?.address || "Salem / Erode Main Road, Tamil Nadu"}
          isParentView={true}
        />
      </motion.div>

      {/* Ward's Leave Requests & Approval Timeline */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="glass-card border shadow-sm">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Ward's Leave History & Outpass Approvals
                </CardTitle>
                <CardDescription className="text-xs">
                  All official leave letters & tutor/warden verification logs
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {(leaves as any[]).length} Total Requests
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(leaves as any[]).length > 0 ? (
                (leaves as any[]).slice(0, 3).map((l: any) => (
                  <div
                    key={l.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 bg-white dark:bg-slate-900/60 shadow-xs space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>{l.reason || "Festival & Home Visit"}</span>
                        {l.leaveType && (
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {l.leaveType.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <Badge className={
                        l.status === "fully_approved" || l.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }>
                        {l.status === "fully_approved" ? "Outpass Ready ✓" : l.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        From: {l.fromDate ? format(new Date(l.fromDate), "dd MMM yyyy") : "N/A"}
                      </span>
                      <span>→</span>
                      <span className="flex items-center gap-1 font-mono">
                        To: {l.toDate ? format(new Date(l.toDate), "dd MMM yyyy") : "N/A"}
                      </span>
                    </div>

                    {l.tutorRemarks && (
                      <div className="text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-slate-600 dark:text-slate-300 border">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Tutor Verified:</span> "{l.tutorRemarks}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No active or past leave requests for this student.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Emergency & Campus Helpline Quick Contacts */}
        <div className="space-y-4">
          <Card className="glass-card border shadow-sm">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" /> Campus Direct Contacts
              </CardTitle>
              <CardDescription className="text-xs">
                Reach hostel authorities directly
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 rounded-xl space-y-1">
                <div className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  🏢 Hostel Chief Warden
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">+91 94433 11223</div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400">Available 24x7 for Hostel Emergencies</div>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 rounded-xl space-y-1">
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  👨‍🏫 Class Tutor / Mentor
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">+91 98765 43210</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Academic & Leave Approver</div>
              </div>

              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 rounded-xl space-y-1">
                <div className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                  🚨 Main Gate Security Desk
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">+91 4288 261234</div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400">Gate Pass & Security Verification</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
