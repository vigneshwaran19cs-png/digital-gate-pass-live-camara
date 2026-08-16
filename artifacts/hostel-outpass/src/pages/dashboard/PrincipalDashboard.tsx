import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListLeaves, useApproveLeave, useRejectLeave, useBulkApproveLeaves,
  useGetStudentsOutside, useGetSimilarLeaveGroups, getListLeavesQueryKey,
  getGetStudentsOutsideQueryKey, getGetSimilarLeaveGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Crown, Clock, CheckCircle2, XCircle, Users, AlertTriangle,
  ChevronRight, RefreshCw, Zap, ArrowLeft, UserCheck, UserX,
  Calendar, MapPin, Activity, TrendingUp, FileText,
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

const APPROVAL_STEPS = [
  { label: "Student Applied", key: "pending" },
  { label: "Warden (Initial)", key: "warden" },
  { label: "Tutor Approved", key: "tutor" },
  { label: "HOD Approved", key: "hod" },
  { label: "Principal Approved", key: "principal" },
  { label: "Warden (Final)", key: "warden_final" },
];

function ApprovalTimeline({ leave }: { leave: any }) {
  const stepOrder = ["warden", "tutor", "hod", "principal", "warden_final", "completed"];
  const currentIdx = stepOrder.indexOf(leave.currentStep);
  return (
    <div className="space-y-2">
      {APPROVAL_STEPS.map((step, i) => {
        const done = i === 0 || currentIdx > i - 1;
        const current = stepOrder[currentIdx] === step.key;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
              done ? (current ? "bg-amber-600 text-white ring-2 ring-amber-100" : "bg-emerald-50 border border-emerald-200 text-emerald-700") : "bg-slate-100 border border-slate-200 text-slate-400"
            }`}>
              {done && !current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-sm ${done ? (current ? "text-amber-800 font-semibold" : "text-slate-800") : "text-slate-400"}`}>
              {step.label}
              {current && <span className="ml-2 text-xs text-amber-600 font-medium">← Awaiting</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}




export default function PrincipalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const { data: leavesData, isLoading } = useListLeaves(
    { status: "hod_approved" },
    { query: { queryKey: getListLeavesQueryKey({ status: "hod_approved" }) } }
  );
  const { data: allData } = useListLeaves(
    {},
    { query: { queryKey: getListLeavesQueryKey({}) } }
  );
  const { data: outsideData } = useGetStudentsOutside(
    { query: { queryKey: getGetStudentsOutsideQueryKey() } }
  );
  const { data: similarGroups } = useGetSimilarLeaveGroups(
    { query: { queryKey: getGetSimilarLeaveGroupsQueryKey() } }
  );

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const bulkApprove = useBulkApproveLeaves();

  const leaves = (leavesData as any)?.leaves ?? (leavesData as any) ?? [];
  const allLeaves = (allData as any)?.leaves ?? (allData as any) ?? [];
  const outsideStudents: any[] = (outsideData as any)?.students ?? [];
  const groups: any[] = Array.isArray(similarGroups) ? similarGroups : [];

  const pending = (leaves as any[]).length;
  const approved = (allLeaves as any[]).filter((l: any) => l.status === "fully_approved" || l.status === "principal_approved").length;
  const emergency = (leaves as any[]).filter((l: any) => l.leaveType === "medical" || l.leaveType === "hospital_visit").length;
  const outside = outsideStudents.length;

  // Dynamically compute monthly trends from allLeaves (approved vs rejected)
  const monthlyMap: Record<string, { approved: number; rejected: number }> = {};
  allLeaves.forEach((l: any) => {
    if (l.fromDate) {
      try {
        const m = format(new Date(l.fromDate), "MMM");
        if (!monthlyMap[m]) {
          monthlyMap[m] = { approved: 0, rejected: 0 };
        }
        if (l.status === "fully_approved" || l.status === "principal_approved") {
          monthlyMap[m].approved++;
        } else if (l.status === "rejected") {
          monthlyMap[m].rejected++;
        }
      } catch (e) {}
    }
  });
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHLY_DATA = MONTHS.map(m => ({
    month: m,
    approved: monthlyMap[m]?.approved || 0,
    rejected: monthlyMap[m]?.rejected || 0,
  }));

  // Dynamically compute leave types distribution from allLeaves
  const leaveTypesMap: Record<string, number> = {};
  allLeaves.forEach((l: any) => {
    const t = l.leaveType || "other";
    leaveTypesMap[t] = (leaveTypesMap[t] || 0) + 1;
  });
  const totalLeavesCount = allLeaves.length || 1;
  const PIE_DATA = Object.entries(leaveTypesMap).map(([name, count]) => {
    const colors: Record<string, string> = {
      semester_holiday: "#3b82f6",
      medical: "#10b981",
      hospital_visit: "#f43f5e",
      family_function: "#8b5cf6",
      festival: "#f59e0b",
      internship: "#06b6d4",
      project_work: "#84cc16",
      other: "#64748b",
    };
    const cleanName = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      name: cleanName,
      value: Math.round((count / totalLeavesCount) * 100),
      color: colors[name] ?? "#64748b",
    };
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "hod_approved" }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetSimilarLeaveGroupsQueryKey() });
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    approveLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Approved — forwarded to Warden for Final Verification ✓" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleReject = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Please add remarks", variant: "destructive" }); return; }
    rejectLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave rejected" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleBulkApproveAll = () => {
    const ids = (leaves as any[]).map((l: any) => l.id);
    bulkApprove.mutate({ data: { leaveIds: ids, action: "approve", remarks: "Bulk approved by Principal" } }, {
      onSuccess: () => { toast({ title: `${ids.length} leaves approved and forwarded for Warden Final Verification ✓` }); invalidate(); },
    });
  };

  const handleBulkApprove = (leaveIds: number[]) => {
    bulkApprove.mutate({ data: { leaveIds, action: "approve", remarks: "Bulk approved by Principal — same destination/dates" } }, {
      onSuccess: () => { toast({ title: `${leaveIds.length} leaves approved in bulk ✓` }); invalidate(); },
    });
  };

  const handleBulkReject = (leaveIds: number[]) => {
    bulkApprove.mutate({ data: { leaveIds, action: "reject", remarks: "Bulk rejected by Principal" } }, {
      onSuccess: () => { toast({ title: `${leaveIds.length} leaves rejected` }); invalidate(); },
    });
  };

  const stats = [
    { label: "Pending Final Approval", value: pending, icon: Clock, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", glow: "shadow-sm" },
    { label: "Fully Approved", value: approved, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", glow: "shadow-sm" },
    { label: "Emergency / Medical", value: emergency, icon: AlertTriangle, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", glow: "shadow-sm" },
    { label: "Students Outside", value: outside, icon: UserCheck, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", glow: "shadow-sm" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-700" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">Principal Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">Principal Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Final approval authority · {format(new Date(), "EEEE, MMMM d yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          {(leaves as any[]).length > 0 && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-2 hidden md:flex" onClick={handleBulkApproveAll}>
              <Zap className="w-3.5 h-3.5" /> Approve All ({(leaves as any[]).length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={invalidate} className="gap-2 hidden md:flex">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
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

      {/* Live: Students Outside */}
      {outsideStudents.length > 0 && (
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl p-5 border border-blue-200 bg-blue-50/30 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-700 animate-pulse" />
            <h3 className="font-heading font-semibold text-sm text-blue-900">Live — Students Currently Outside</h3>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 ml-auto">{outsideStudents.length} out</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {outsideStudents.slice(0, 6).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-blue-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {(s.student?.name ?? "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.student?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{s.student?.department} · Out since {s.exitTime ? format(new Date(s.exitTime), "h:mm a") : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {/* Bulk Approval Alert */}
      {groups.length > 0 && (
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
          {groups.map((group: any, gi: number) => (
            <div key={gi} className="glass-card rounded-2xl p-5 border border-amber-200 bg-amber-50/50 mb-3 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-amber-900">
                      {group.count ?? group.leaveIds?.length ?? 0} Similar Requests Found
                    </h3>
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">Bulk Action Available</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Same destination: <strong className="text-slate-900">{group.destination}</strong> · 
                    Dates: <strong className="text-slate-900">{format(new Date(group.fromDate || Date.now()), "MMM d")} – {format(new Date(group.toDate || Date.now()), "MMM d")}</strong>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleBulkApprove(group.leaveIds ?? [])}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
                    </Button>
                    <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2" onClick={() => handleBulkReject(group.leaveIds ?? [])}>
                      <XCircle className="w-3.5 h-3.5" /> Reject All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="glass-card border-border/50">
          <TabsTrigger value="queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div>
                <h2 className="font-heading font-semibold text-slate-800">Final Approval Queue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">These requests have passed Warden → Tutor → HOD</p>
              </div>
              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">{(leaves as any[]).length} pending</Badge>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading…</div>
            ) : (leaves as any[]).length === 0 ? (
              <div className="p-12 text-center"><CheckCircle2 className="w-12 h-12 text-amber-300 mx-auto mb-3" /><p className="text-muted-foreground">No requests awaiting final approval.</p></div>
            ) : (
              <div className="divide-y divide-border/30">
                {(leaves as any[]).map((leave: any, i: number) => (
                  <motion.div
                    key={leave.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedLeave(leave); setRemarks(""); }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 font-bold text-amber-700 text-sm">
                        {(leave.student?.name ?? "?").charAt(0)}
                      </div>
                      {leave.leaveType === "medical" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-background flex items-center justify-center">
                          <AlertTriangle className="w-2.5 h-2.5 text-white" />
                         </div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{leave.student?.name ?? `#${leave.studentId}`}</span>
                        <StatusBadge status={leave.status} />
                        {leave.leaveType === "medical" && <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Emergency</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{leave.reason}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{leave.destination}</span>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-7 px-3 text-xs" onClick={e => { e.stopPropagation(); approveLeave.mutate({ id: leave.id, data: { remarks: "Approved by Principal" } }, { onSuccess: () => { toast({ title: "Approved ✓" }); invalidate(); } }); }}>
                        One-click Approve
                      </Button>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map(p => (
              <Button key={p} size="sm" variant={reportPeriod === p ? "default" : "outline"} onClick={() => setReportPeriod(p)} className="capitalize">{p}</Button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-amber-700" />
                <h3 className="font-heading font-semibold text-sm text-slate-800">Approval Trends</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={MONTHLY_DATA}>
                  <defs>
                    <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="approved" stroke="#f59e0b" fill="url(#approvedGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="rejected" stroke="#f43f5e" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-amber-700" />
                <h3 className="font-heading font-semibold text-sm text-slate-800">Leave Type Breakdown</h3>
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={160}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {PIE_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {PIE_DATA.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Leave Detail Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={v => !v && setSelectedLeave(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedLeave && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">Final Review — {selectedLeave.student?.name ?? `#${selectedLeave.studentId}`}</DialogTitle>
              </DialogHeader>

              {/* Approval Timeline */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Approval Chain</h4>
                <ApprovalTimeline leave={selectedLeave} />
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div><p className="text-xs text-muted-foreground mb-0.5">Student</p><p className="text-sm font-semibold">{selectedLeave.student?.name}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Department</p><p className="text-sm font-semibold">{selectedLeave.student?.department}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Period & Destination</p><p className="text-sm font-semibold">{format(new Date(selectedLeave.fromDate), "MMM d")} – {format(new Date(selectedLeave.toDate), "MMM d, yyyy")} → {selectedLeave.destination}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Reason</p><p className="text-sm">{selectedLeave.reason}</p></div>
              </div>

              {selectedLeave.hodRemarks && (
                <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <p className="text-xs text-violet-700 font-medium mb-1">HOD Remarks</p>
                  <p className="text-sm text-violet-800 italic">"{selectedLeave.hodRemarks}"</p>
                </div>
              )}

              <Separator />
              <div className="space-y-3">
                <Textarea placeholder="Principal remarks (optional for approval)…" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={handleApprove} disabled={approveLeave.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Return to HOD
                  </Button>
                  <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5" onClick={handleReject} disabled={rejectLeave.isPending}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
