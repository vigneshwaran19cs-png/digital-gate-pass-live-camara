import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListLeaves, useGetStudentsOutside, getListLeavesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  GraduationCap, Clock, CheckCircle2, QrCode, PlusCircle,
  FileText, Calendar, MapPin, ChevronRight, ArrowRight, Pencil, AlertCircle, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { StudentProfileSetupModal } from "@/components/StudentProfileSetupModal";
import { ForwardingStatusBadge } from "@/components/ForwardingStatusBadge";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

function StatusBadge({ status, currentStep, isEmergency }: { status: string; currentStep?: string; isEmergency?: boolean }) {
  return <ForwardingStatusBadge status={status} currentStep={currentStep} isEmergency={isEmergency} />;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Check if profile has any missing vital fields
  const isProfileIncomplete = (
    !user?.registerNumber ||
    !user?.departmentId ||
    !(user as any)?.parentPhone ||
    !(user as any)?.hostelRoom
  );

  useEffect(() => {
    // Auto-prompt modal if critical profile data is missing
    if (isProfileIncomplete) {
      setShowProfileModal(true);
    }
  }, [isProfileIncomplete]);

  const { data: leavesData } = useListLeaves(
    { studentId: user?.id },
    { query: { queryKey: getListLeavesQueryKey({ studentId: user?.id }) } }
  );

  const leaves = (leavesData as any)?.leaves ?? (leavesData as any) ?? [];
  const pending = (leaves as any[]).filter((l: any) => !["fully_approved", "rejected"].includes(l.status)).length;
  const approved = (leaves as any[]).filter((l: any) => l.status === "fully_approved").length;
  const rejected = (leaves as any[]).filter((l: any) => l.status === "rejected").length;
  const activeOutpass = (leaves as any[]).filter((l: any) => l.outpassId).length;

  const stats = [
    { label: "Pending Requests", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Approved Leaves", value: approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Active Outpasses", value: activeOutpass, icon: QrCode, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Total Requests", value: (leaves as any[]).length, icon: FileText, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Incomplete Banner */}
      {isProfileIncomplete && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
              ⚠️
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm">Action Required: Complete Your Student Profile</div>
              <div className="text-xs text-amber-900">
                Please fill in your Department, Hostel Room, and Parent Phone to enable automated leave approvals & SMS alerts.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            onClick={() => setShowProfileModal(true)}
          >
            <Pencil className="w-3.5 h-3.5" /> Fill Full Details Now
          </Button>
        </div>
      )}

      {/* Header Profile Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <StudentProfilePhoto photoUrl={user?.photoUrl} name={user?.name} size="lg" className="shrink-0 shadow-sm" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Student Portal</span>
            </div>
            <h1 className="text-2xl font-heading font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
            <p className="text-muted-foreground text-xs font-mono mt-0.5">
              Reg No: <span className="font-bold text-slate-800 dark:text-slate-200">{user?.registerNumber || "Not Set"}</span> · Room <span className="font-bold text-slate-800 dark:text-slate-200">{(user as any)?.hostelRoom || "Not Set"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
            onClick={() => setShowProfileModal(true)}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit / Update My Details
          </Button>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-slate-500">Attendance</div>
              <div className="text-lg font-extrabold text-emerald-600">{(user as any)?.attendancePercentage || 87}%</div>
              <div className="text-[9px] text-muted-foreground">Present</div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-slate-500">Leave Taken</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-200">{(leaves as any[]).length} Days</div>
              <div className="text-[9px] text-muted-foreground">Academic Year</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Self-Service Profile Setup Modal */}
      <StudentProfileSetupModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <div className={`glass-card rounded-2xl p-5 border ${s.border} bg-white shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className={`text-3xl font-heading font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-4">
        <Link href="/apply">
          <div className="glass-card rounded-2xl p-5 border border-blue-100 bg-blue-50/20 cursor-pointer hover:border-blue-300 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-heading font-semibold text-slate-800">Apply for Leave</h3>
                <p className="text-xs text-muted-foreground mt-1">Submit standard leave or outing request</p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600/50 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
        <Link href="/leaves/emergency">
          <div className="glass-card rounded-2xl p-5 border border-rose-100 bg-rose-50/20 cursor-pointer hover:border-rose-300 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3">
                  <PlusCircle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-heading font-semibold text-slate-800">Apply Emergency Leave</h3>
                <p className="text-xs text-muted-foreground mt-1">Urgent Warden & Principal priority routing</p>
              </div>
              <ArrowRight className="w-5 h-5 text-rose-600/50 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
        <Link href="/outpasses">
          <div className="glass-card rounded-2xl p-5 border border-emerald-100 bg-emerald-50/20 cursor-pointer hover:border-emerald-300 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-heading font-semibold text-slate-800">My Outpasses</h3>
                <p className="text-xs text-muted-foreground mt-1">View & show your digital outpass</p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-600/50 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent Leaves */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-semibold text-sm text-slate-800">Recent Leave Requests</h2>
          <Link href="/leaves">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-500 hover:text-slate-800">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        {(leaves as any[]).length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No leave requests yet.</p>
            <Link href="/apply"><Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">Apply for Leave</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {(leaves as any[]).slice(0, 5).map((leave: any, i: number) => (
              <Link key={leave.id} href={`/leaves/${leave.id}`}>
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 capitalize text-blue-600 text-xs font-bold">
                    {leave.leaveType?.charAt(0) ?? "L"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate capitalize">{leave.leaveType} Leave</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{leave.destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={leave.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
