import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListLeaves, useApproveLeave, useRejectLeave, useBulkApproveLeaves,
  useGetSimilarLeaveGroups, getListLeavesQueryKey, getGetSimilarLeaveGroupsQueryKey,
  useGetHostelOccupancy, getGetHostelOccupancyQueryKey,
  useListDepartments,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Building2, Clock, CheckCircle2, XCircle, Layers, Search, Filter,
  Calendar, MapPin, ChevronRight, Zap, Users, RefreshCw, TrendingUp,
  AlertTriangle, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

import { ForwardingStatusBadge } from "@/components/ForwardingStatusBadge";

function StatusBadge({ status, currentStep, isEmergency }: { status: string; currentStep?: string; isEmergency?: boolean }) {
  return <ForwardingStatusBadge status={status} currentStep={currentStep} isEmergency={isEmergency} />;
}




export default function HodDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState<string | null>(null);

  const { data: departments = [] } = useListDepartments();
  const myDept = (departments as any[]).find((d: any) => d.hodId === user?.id);
  const myDeptId = myDept?.id;

  const { data: leavesData, isLoading } = useListLeaves(
    { status: "tutor_approved", departmentId: myDeptId },
    { query: { queryKey: getListLeavesQueryKey({ status: "tutor_approved", departmentId: myDeptId }) } }
  );
  const { data: allData } = useListLeaves(
    { departmentId: myDeptId },
    { query: { queryKey: getListLeavesQueryKey({ departmentId: myDeptId }) } }
  );
  const { data: occupancyData } = useGetHostelOccupancy(
    { query: { queryKey: getGetHostelOccupancyQueryKey() } }
  );
  const { data: similarGroups } = useGetSimilarLeaveGroups(
    { query: { queryKey: getGetSimilarLeaveGroupsQueryKey() } }
  );

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const bulkApprove = useBulkApproveLeaves();

  const leaves = (leavesData as any)?.leaves ?? (leavesData as any) ?? [];
  const allLeaves = (allData as any)?.leaves ?? (allData as any) ?? [];
  const groups: any[] = (similarGroups as any)?.groups ?? [];
  const occupancy = occupancyData as any;

  const pending = (leaves as any[]).length;
  const total = (allLeaves as any[]).length;
  const approved = (allLeaves as any[]).filter((l: any) => ["hod_approved","principal_approved","fully_approved"].includes(l.status)).length;
  const rejected = (allLeaves as any[]).filter((l: any) => l.status === "rejected").length;

  const filtered = (leaves as any[]).filter((l: any) => {
    const q = search.toLowerCase();
    return !q || (l.student?.name ?? "").toLowerCase().includes(q) || (l.reason ?? "").toLowerCase().includes(q);
  });

  // Calculate monthly trends from allLeaves
  const monthlyMap: Record<string, number> = {};
  allLeaves.forEach((l: any) => {
    if (l.fromDate) {
      try {
        const m = format(new Date(l.fromDate), "MMM");
        monthlyMap[m] = (monthlyMap[m] || 0) + 1;
      } catch (e) {}
    }
  });
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHLY_DATA = MONTHS.map(m => ({ month: m, leaves: monthlyMap[m] || 0 }));

  // Calculate department chart data from occupancy
  const deptBreakdown: any[] = occupancy?.departmentBreakdown ?? [];
  const DEPT_CHART_DATA = deptBreakdown.map((d: any, idx: number) => {
    const colors = ["#8b5cf6", "#6d5ef0", "#a78bfa", "#7c3aed", "#c4b5fd", "#f59e0b", "#10b981"];
    return {
      name: d.department,
      leaves: d.onLeave || 0,
      color: colors[idx % colors.length]
    };
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "tutor_approved", departmentId: myDeptId }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ departmentId: myDeptId }) });
    queryClient.invalidateQueries({ queryKey: getGetSimilarLeaveGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetHostelOccupancyQueryKey() });
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    approveLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => {
        toast({
          title: "Leave Approved ✓",
          description: "Forwarded to Principal for Final Approval",
        });
        invalidate();
        setSelectedLeave(null);
        setRemarks("");
      },
    });
  };

  const handleReject = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Please add remarks", variant: "destructive" }); return; }
    rejectLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave rejected" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleReturnToTutor = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Please add remarks", variant: "destructive" }); return; }
    toast({ title: "Returned to Tutor for re-verification" });
    setSelectedLeave(null);
  };

  const handleBulkApprove = (leaveIds: number[]) => {
    bulkApprove.mutate({ data: { leaveIds, action: "approve", remarks: "Bulk approved by HOD — same destination/dates" } }, {
      onSuccess: () => { toast({ title: `${leaveIds.length} leaves approved in bulk ✓` }); invalidate(); setBulkGroupId(null); },
    });
  };

  const handleBulkReject = (leaveIds: number[]) => {
    bulkApprove.mutate({ data: { leaveIds, action: "reject", remarks: "Bulk rejected by HOD" } }, {
      onSuccess: () => { toast({ title: `${leaveIds.length} leaves rejected` }); invalidate(); setBulkGroupId(null); },
    });
  };

  const stats = [
    { label: "Total Requests", value: total, icon: Users, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Pending Approvals", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Approved (All Time)", value: approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">HOD Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">HOD Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Department-level approval & analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={invalidate} className="gap-2 hidden md:flex">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </motion.div>

      {/* Stats */}
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
                    <Button size="sm" variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900">
                      <Layers className="w-3.5 h-3.5" /> Review Individually
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {/* Search */}
          <div className="glass-card rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students, reason, destination…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Leaves */}
          <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h2 className="font-heading font-semibold text-slate-800">Pending Approvals</h2>
              <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50">{filtered.length} requests</Badge>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center"><CheckCircle2 className="w-12 h-12 text-violet-300 mx-auto mb-3" /><p className="text-muted-foreground">No pending requests.</p></div>
            ) : (
              <div className="divide-y divide-border/30">
                {filtered.map((leave: any, i: number) => (
                  <motion.div
                    key={leave.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedLeave(leave); setRemarks(""); }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 font-bold text-violet-700 text-sm">
                      {(leave.student?.name ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{leave.student?.name ?? `Student #${leave.studentId}`}</span>
                        <StatusBadge status={leave.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{leave.reason}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{leave.destination}</span>
                      </div>
                    </div>
                    {leave.tutorRemarks && (
                      <div className="hidden md:block max-w-40">
                        <p className="text-xs text-muted-foreground mb-0.5">Tutor:</p>
                        <p className="text-xs text-emerald-700 italic truncate">"{leave.tutorRemarks}"</p>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                <h3 className="font-heading font-semibold text-sm text-slate-800">Monthly Leave Trends</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="leaves" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-violet-600" />
                <h3 className="font-heading font-semibold text-sm text-slate-800">Leaves by Department</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={DEPT_CHART_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="leaves" radius={[0, 4, 4, 0]}>
                    {DEPT_CHART_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                <DialogTitle className="font-heading">Review — {selectedLeave.student?.name ?? `#${selectedLeave.studentId}`}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div><p className="text-xs text-muted-foreground mb-0.5">Department</p><p className="text-sm font-semibold">{selectedLeave.student?.department ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Leave Type</p><p className="text-sm font-semibold capitalize">{selectedLeave.leaveType}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Period</p><p className="text-sm font-semibold">{format(new Date(selectedLeave.fromDate), "MMM d")} – {format(new Date(selectedLeave.toDate), "MMM d, yyyy")} → {selectedLeave.destination}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Reason</p><p className="text-sm">{selectedLeave.reason}</p></div>
              </div>

              {selectedLeave.tutorRemarks && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700 font-medium mb-1">Tutor Remarks</p>
                  <p className="text-sm text-emerald-800 italic">"{selectedLeave.tutorRemarks}"</p>
                </div>
              )}

              <Separator />
              <div className="space-y-3">
                <Textarea placeholder="Your remarks…" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5" onClick={handleApprove} disabled={approveLeave.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5" onClick={handleReturnToTutor}>
                    <ArrowLeft className="w-4 h-4" /> Return
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
