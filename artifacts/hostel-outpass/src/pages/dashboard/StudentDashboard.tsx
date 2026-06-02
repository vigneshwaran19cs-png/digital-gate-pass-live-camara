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
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    warden_approved: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    tutor_approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    hod_approved: "bg-violet-500/15 text-violet-400 border-violet-500/25",
    fully_approved: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    rejected: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const STEP_LABELS: Record<string, string> = {
  warden: "Waiting: Warden",
  tutor: "Waiting: Tutor",
  hod: "Waiting: HOD",
  principal: "Waiting: Principal",
  completed: "Fully Approved",
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
    { label: "Pending Requests", value: pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "Approved Leaves", value: approved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Active Outpasses", value: activeOutpass, icon: QrCode, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Total Requests", value: (leaves as any[]).length, icon: FileText, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">Student Portal</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Welcome, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your leave applications and outpasses</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <div className={`glass-card rounded-2xl p-5 border ${s.border}`}>
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
          <div className="glass-card rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5 cursor-pointer hover:border-blue-500/40 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mb-3">
                  <PlusCircle className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-heading font-semibold">Apply for Leave</h3>
                <p className="text-xs text-muted-foreground mt-1">Submit a new leave request</p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
        <Link href="/outpasses">
          <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-3">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-heading font-semibold">My Outpasses</h3>
                <p className="text-xs text-muted-foreground mt-1">View & show your digital outpass</p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-400/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent Leaves */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-semibold text-sm">Recent Leave Requests</h2>
          <Link href="/leaves">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
        {(leaves as any[]).length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            <Link href="/apply"><Button size="sm" className="mt-3">Apply for Leave</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {(leaves as any[]).slice(0, 5).map((leave: any, i: number) => (
              <Link key={leave.id} href={`/leaves/${leave.id}`}>
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 capitalize text-blue-400 text-xs font-bold">
                    {leave.leaveType?.charAt(0) ?? "L"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate capitalize">{leave.leaveType} Leave</p>
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
