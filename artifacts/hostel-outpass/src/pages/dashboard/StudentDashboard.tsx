import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListLeaves, useGetStudentsOutside, getListLeavesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  GraduationCap, Clock, CheckCircle2, QrCode, PlusCircle,
  FileText, Calendar, MapPin, ChevronRight, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    warden_approved: "bg-cyan-50 text-cyan-700 border-cyan-100",
    tutor_approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    hod_approved: "bg-violet-50 text-violet-700 border-violet-100",
    principal_approved: "bg-orange-50 text-orange-700 border-orange-100",
    fully_approved: "bg-blue-50 text-blue-700 border-blue-100",
    rejected: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const STEP_LABELS: Record<string, string> = {
  warden: "Waiting: Warden Initial",
  tutor: "Waiting: Tutor Verification",
  hod: "Waiting: HOD Approval",
  principal: "Waiting: Principal Approval",
  warden_final: "Waiting: Warden Final Approval",
  completed: "Outpass Ready",
  rejected: "Rejected",
};

export default function StudentDashboard() {
  const { user } = useAuth();
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Student Portal</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your leave applications and outpasses</p>
      </motion.div>

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
