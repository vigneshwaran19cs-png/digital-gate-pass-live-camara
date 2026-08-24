import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListLeaves, useApproveLeave, useRejectLeave, useGetStudentsOutside, useGetActivityFeed,
  useGetSimilarLeaveGroups, useBulkApproveLeaves, useGetHostelOccupancy,
  getListLeavesQueryKey, getGetStudentsOutsideQueryKey, getGetActivityFeedQueryKey,
  getGetSimilarLeaveGroupsQueryKey, getGetHostelOccupancyQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Clock, CheckCircle2, XCircle, UserCheck,
  Calendar, MapPin, ChevronRight, RefreshCw, Activity,
  Users, AlertTriangle, Phone, ArrowRight, UserX, AlertCircle,
} from "lucide-react";
import { format, isBefore } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

import { ForwardingStatusBadge } from "@/components/ForwardingStatusBadge";

function StatusBadge({ status, currentStep, isEmergency }: { status: string; currentStep?: string; isEmergency?: boolean }) {
  return <ForwardingStatusBadge status={status} currentStep={currentStep} isEmergency={isEmergency} />;
}

export default function WardenDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [activeTab, setActiveTab] = useState("initial");
  const [bulkingGroupKey, setBulkingGroupKey] = useState<string | null>(null);

  // Initial Verification: leaves pending warden review
  const { data: initialLeavesData, isLoading: isLoadingInitial } = useListLeaves(
    { status: "pending" },
    { query: { queryKey: getListLeavesQueryKey({ status: "pending" }) } }
  );

  // Final Verification: leaves approved by principal awaiting final gate-pass sign-off
  const { data: finalLeavesData, isLoading: isLoadingFinal } = useListLeaves(
    { status: "principal_approved" },
    { query: { queryKey: getListLeavesQueryKey({ status: "principal_approved" }) } }
  );

  const { data: allData } = useListLeaves(
    {},
    { query: { queryKey: getListLeavesQueryKey({}) } }
  );

  const { data: outsideData } = useGetStudentsOutside(
    { query: { queryKey: getGetStudentsOutsideQueryKey() } }
  );

  const { data: occupancyData, refetch: refetchOccupancy } = useGetHostelOccupancy(
    { query: { queryKey: getGetHostelOccupancyQueryKey() } }
  );

  const { data: activityFeed } = useGetActivityFeed(
    { query: { queryKey: getGetActivityFeedQueryKey() } }
  );

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const bulkApproveLeaves = useBulkApproveLeaves();

  const { data: groupedLeavesData } = useGetSimilarLeaveGroups({
    query: { queryKey: getGetSimilarLeaveGroupsQueryKey() }
  });

  const rawInitial = (initialLeavesData as any)?.leaves ?? (initialLeavesData as any) ?? [];
  const rawFinal = (finalLeavesData as any)?.leaves ?? (finalLeavesData as any) ?? [];

  const isEmergCheck = (l: any) => l.isEmergency === "true" || l.leaveType === "family_emergency" || l.leaveType === "emergency" || l.leaveType === "medical";

  const initialLeaves = [...rawInitial].sort((a: any, b: any) => {
    const aE = isEmergCheck(a);
    const bE = isEmergCheck(b);
    if (aE && !bE) return -1;
    if (!aE && bE) return 1;
    return 0;
  });

  const finalLeaves = [...rawFinal].sort((a: any, b: any) => {
    const aE = isEmergCheck(a);
    const bE = isEmergCheck(b);
    if (aE && !bE) return -1;
    if (!aE && bE) return 1;
    return 0;
  });
  const allLeaves = (allData as any)?.leaves ?? (allData as any) ?? [];
  const outsideStudents: any[] = (outsideData as any)?.students ?? [];
  const activities: any[] = (activityFeed as any)?.activities ?? [];
  const groups: any[] = Array.isArray(groupedLeavesData) ? groupedLeavesData : [];
  const occupancy = occupancyData as any;

  const pendingInitial = initialLeaves.length;
  const pendingFinal = finalLeaves.length;
  const totalStudents = occupancy?.totalCapacity ?? 250; 
  const outsideCount = occupancy?.currentlyAbsent ?? outsideStudents.length;
  const insideCount = occupancy?.currentlyPresent ?? (totalStudents - outsideCount);
  const occupancyPercentage = occupancy?.occupancyPercent ?? Math.round((insideCount / totalStudents) * 100);

  // Late returns check: students currently outside whose expected return date is passed
  const lateReturns = outsideStudents.filter((s: any) => s.isOverdue);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "pending" }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "principal_approved" }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetStudentsOutsideQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActivityFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetHostelOccupancyQueryKey() });
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    const isEmerg = selectedLeave.isEmergency === "true" || selectedLeave.leaveType === "family_emergency" || selectedLeave.leaveType === "emergency";
    approveLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => {
        if (selectedLeave.currentStep === "warden") {
          toast({
            title: isEmerg ? "Emergency Leave Verified ✓" : "Initial Verification Complete ✓",
            description: isEmerg ? "Priority Forwarded directly to Principal" : "Forwarded to Tutor for Academic Review",
          });
        } else {
          toast({
            title: "Digital Gate Pass Released ✓",
            description: "Final approval complete — Outpass ready for student exit",
          });
        }
        invalidate();
        setSelectedLeave(null);
        setRemarks("");
      },
    });
  };

  const handleReject = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Remarks required", variant: "destructive" }); return; }
    rejectLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave request rejected" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const stats = [
    { label: "Warden Initial Pending", value: pendingInitial, icon: Clock, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
    { label: "Warden Final Pending", value: pendingFinal, icon: Shield, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Students Outside", value: outsideCount, icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Hostel Occupancy", value: `${occupancyPercentage}%`, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600">Warden Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Warden Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Hostel capacity tracking, initial reviews, and final outpass releases</p>
        </div>
        <Button variant="outline" size="sm" onClick={invalidate} className="gap-2 hidden md:flex">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </Button>
      </motion.div>

      {/* 8:00 PM Automatic Daily Report Notification Alert (Requirement 12) */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            📊
          </div>
          <div>
            <div className="font-bold text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
              Daily Entry/Exit Report Generated
              <Badge className="bg-indigo-600 text-white text-[10px]">Generated at: 8:00 PM</Badge>
            </div>
            <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
              The day's complete Student Entry/Exit History report is available in your portal and Reports page.
            </div>
          </div>
        </div>
        <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
          <a href="/reports">View Daily Report</a>
        </Button>
      </motion.div>

      {/* Late Return Warning Alerts */}
      {lateReturns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-rose-400 text-sm">Late Return Alert! ({lateReturns.length})</h3>
            <p className="text-xs text-muted-foreground mt-0.5">The following students have exceeded their approved leave return window:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {lateReturns.map((s: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-xs">
                  <span className="font-semibold">{s.student?.name} ({s.student?.registerNumber})</span>
                  <a href={`tel:${s.student?.phone}`} className="flex items-center gap-1 text-rose-400 hover:underline">
                    <Phone className="w-3 h-3" /> Call Student
                  </a>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card border-border/50">
          <TabsTrigger value="initial">Initial Verification ({pendingInitial})</TabsTrigger>
          <TabsTrigger value="final">Final Gate pass ({pendingFinal})</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy & Live Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="initial" className="space-y-4">

          {/* Smart Bulk Approval Groups */}
          {groups.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden border border-violet-200 bg-violet-50/30">
              <div className="px-6 py-4 border-b border-violet-200/70 bg-violet-500/5 flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-sm text-violet-800">⚡ Smart Bulk Approval Groups</h2>
                  <p className="text-xs text-violet-600 mt-0.5">{groups.length} group{groups.length > 1 ? "s" : ""} detected — same destination, same dates. Approve all at once!</p>
                </div>
              </div>
              <div className="divide-y divide-violet-100">
                {groups.map((group: any) => {
                  const gKey = `${group.destination}|${group.fromDate}|${group.toDate}`;
                  return (
                    <div key={gKey} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white">{group.count} students</span>
                            <span className="text-sm font-semibold text-slate-800">{group.destination}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">📅 {group.fromDate} → {group.toDate} · {group.reason?.substring(0, 60) || "Leave request"}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(group.leaves || []).slice(0, 5).map((l: any) => (
                              <span key={l.id} className="text-xs bg-white border border-violet-200 rounded px-1.5 py-0.5">{l.student?.name?.split(" ")[0]}</span>
                            ))}
                            {group.count > 5 && <span className="text-xs text-muted-foreground">+{group.count - 5} more</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                            disabled={bulkApproveLeaves.isPending && bulkingGroupKey === gKey}
                            onClick={() => {
                              setBulkingGroupKey(gKey);
                              bulkApproveLeaves.mutate(
                                { data: { leaveIds: group.leaveIds, action: "approve", remarks: "Bulk approved by Warden" } },
                                {
                                  onSuccess: (res: any) => {
                                    toast({ title: `✅ Bulk Approved — ${res.succeeded}/${res.processed} forwarded to Tutor` });
                                    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "pending" }) });
                                    queryClient.invalidateQueries({ queryKey: getGetSimilarLeaveGroupsQueryKey() });
                                    setBulkingGroupKey(null);
                                  },
                                  onError: () => { toast({ title: "Bulk approval failed", variant: "destructive" }); setBulkingGroupKey(null); }
                                }
                              );
                            }}
                          >
                            {bulkApproveLeaves.isPending && bulkingGroupKey === gKey ? "Approving..." : `✅ Approve All ${group.count}`}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-8"
                            onClick={() => {
                              bulkApproveLeaves.mutate(
                                { data: { leaveIds: group.leaveIds, action: "reject", remarks: "Bulk rejected by Warden" } },
                                {
                                  onSuccess: (res: any) => {
                                    toast({ title: `❌ Bulk Rejected — ${res.succeeded}/${res.processed}`, variant: "destructive" });
                                    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "pending" }) });
                                    queryClient.invalidateQueries({ queryKey: getGetSimilarLeaveGroupsQueryKey() });
                                  },
                                }
                              );
                            }}
                          >
                            ❌ Reject All
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Queue */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-cyan-500/5">
              <h2 className="font-heading font-semibold text-sm">Warden Initial Verification (Step 1) — Individual Requests</h2>
            </div>
            {isLoadingInitial ? (
              <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading initial queue…</div>
            ) : initialLeaves.length === 0 ? (
              <div className="p-12 text-center"><CheckCircle2 className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" /><p className="text-muted-foreground font-medium">All clear! No pending initial requests.</p></div>
            ) : (
              <div className="divide-y divide-border/30">
                {initialLeaves.map((leave: any, i: number) => {
                  const isEmerg = leave.isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency" || leave.leaveType === "medical";
                  return (
                    <div
                      key={leave.id}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors group cursor-pointer ${
                        isEmerg
                          ? "bg-rose-50 dark:bg-rose-950/40 border-l-4 border-l-rose-600 border-y border-rose-200 dark:border-rose-800"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => setSelectedLeave(leave)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isEmerg ? "bg-rose-600 text-white shadow-md animate-pulse" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-500"
                      }`}>
                        {(leave.student?.name ?? "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`font-bold text-sm ${isEmerg ? "text-rose-900 dark:text-rose-200" : "text-slate-800 dark:text-slate-100"}`}>
                            {leave.student?.name ?? `Student #${leave.studentId}`}
                          </p>
                          {isEmerg && (
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] px-2 py-0.5 shadow-sm animate-pulse flex items-center gap-1">
                              🔴 EMERGENCY LEAVE
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs truncate ${isEmerg ? "text-rose-800 dark:text-rose-300 font-semibold" : "text-muted-foreground"}`}>
                          {leave.reason?.substring(0, 80)}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`flex items-center gap-1 text-xs ${isEmerg ? "text-rose-700 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>
                            <Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${isEmerg ? "text-rose-700 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>
                            <MapPin className="w-3 h-3" />{leave.destination}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-colors shrink-0 ${isEmerg ? "text-rose-600" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Final Queue */}
        <TabsContent value="final" className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 bg-amber-500/5">
              <h2 className="font-heading font-semibold text-sm">Warden Final Approval & Digital Gate-Pass Release (Step 5)</h2>
            </div>
            {isLoadingFinal ? (
              <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading final queue…</div>
            ) : finalLeaves.length === 0 ? (
              <div className="p-12 text-center"><CheckCircle2 className="w-12 h-12 text-amber-500/40 mx-auto mb-3" /><p className="text-muted-foreground font-medium">No requests awaiting final Gate Pass generation.</p></div>
            ) : (
              <div className="divide-y divide-border/30">
                {finalLeaves.map((leave: any, i: number) => {
                  const isEmerg = leave.isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency" || leave.leaveType === "medical";
                  return (
                    <div
                      key={leave.id}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors group cursor-pointer ${
                        isEmerg
                          ? "bg-rose-50 dark:bg-rose-950/40 border-l-4 border-l-rose-600 border-y border-rose-200 dark:border-rose-800"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => setSelectedLeave(leave)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isEmerg ? "bg-rose-600 text-white shadow-md animate-pulse" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      }`}>
                        {(leave.student?.name ?? "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`font-bold text-sm ${isEmerg ? "text-rose-900 dark:text-rose-200" : "text-slate-800 dark:text-slate-100"}`}>
                            {leave.student?.name ?? `Student #${leave.studentId}`}
                          </p>
                          {isEmerg && (
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] px-2 py-0.5 shadow-sm animate-pulse flex items-center gap-1">
                              🔴 EMERGENCY LEAVE
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs truncate ${isEmerg ? "text-rose-800 dark:text-rose-300 font-semibold" : "text-muted-foreground"}`}>
                          {leave.reason}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`flex items-center gap-1 text-xs ${isEmerg ? "text-rose-700 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>
                            <Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${isEmerg ? "text-rose-700 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>
                            <MapPin className="w-3 h-3" />{leave.destination}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-colors shrink-0 ${isEmerg ? "text-rose-600" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Occupancy and Logs */}
        <TabsContent value="occupancy" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Occupancy Tracker Widget */}
            <div className="glass-card rounded-2xl p-6 md:col-span-1 space-y-4">
              <h3 className="font-heading font-semibold text-sm">Hostel Occupancy Capacity</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Inside Hostel ({insideCount})</span>
                  <span>Outside ({outsideCount} / {totalStudents})</span>
                </div>
                <Progress value={occupancyPercentage} className="h-2 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-2xl font-bold text-emerald-400">{insideCount}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Students Inside</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-2xl font-bold text-blue-400">{outsideCount}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Students Outside</p>
                </div>
              </div>
            </div>

            {/* Live Gate Activity Logs */}
            <div className="glass-card rounded-2xl overflow-hidden md:col-span-2">
              <div className="px-6 py-4 border-b border-border/50 bg-emerald-500/5">
                <h3 className="font-heading font-semibold text-sm">Live Gate Activity Logs</h3>
              </div>
              {activities.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No recent gate movements.</div>
              ) : (
                <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto">
                  {activities.slice(0, 10).map((act: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/10 text-xs">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${act.action === 'exit' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {act.action === 'exit' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold">{act.studentName}</span> {act.action === 'exit' ? 'exited through' : 'returned to'} <span className="text-foreground">{act.gateLocation ?? 'Main Gate'}</span>
                      </div>
                      <span className="text-muted-foreground">{format(new Date(act.time || Date.now()), "h:mm a")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={v => !v && setSelectedLeave(null)}>
        <DialogContent className="max-w-lg">
          {selectedLeave && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">
                  Review Request — {selectedLeave.currentStep === "warden" ? "Initial Verification" : "Final Approval"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-xs">
                <div><p className="text-muted-foreground mb-0.5">Student</p><p className="font-semibold text-sm">{selectedLeave.student?.name}</p></div>
                <div><p className="text-muted-foreground mb-0.5">Register No.</p><p className="font-semibold text-sm">{selectedLeave.student?.registerNumber}</p></div>
                <div><p className="text-muted-foreground mb-0.5">Room & Hostel</p><p className="font-semibold">Room {selectedLeave.student?.hostelRoom ?? "—"}</p></div>
                <div><p className="text-muted-foreground mb-0.5">Department</p><p className="font-semibold">{selectedLeave.student?.department ?? "—"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground mb-0.5">Leave Period & Destination</p><p className="font-semibold">{format(new Date(selectedLeave.fromDate), "MMM d, h:mm a")} – {format(new Date(selectedLeave.toDate), "MMM d, yyyy 'at' h:mm a")} → {selectedLeave.destination}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground mb-0.5">Reason</p><p className="text-sm bg-background p-2 rounded mt-1 border border-border/50">{selectedLeave.reason}</p></div>
              </div>

              {selectedLeave.currentStep === "warden_final" && (
                <div className="space-y-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs">
                  <p className="font-semibold text-amber-400">Previous Signatures:</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                    <div>Warden (Init): <span className="text-foreground">✓ Approved</span></div>
                    <div>Tutor: <span className="text-foreground">✓ {selectedLeave.parentCallStatus === 'confirmed' ? 'Parent Confirmed' : 'Approved'}</span></div>
                    <div>HOD: <span className="text-foreground">✓ Approved</span></div>
                    <div>Principal: <span className="text-foreground">✓ Approved</span></div>
                  </div>
                </div>
              )}

              <Separator />
              <div className="space-y-3">
                <Textarea placeholder="Add remarks/comments (required for rejection)…" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white gap-2" onClick={handleApprove} disabled={approveLeave.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> {selectedLeave.currentStep === "warden" ? "Approve Initial" : "Approve Final & Release pass"}
                  </Button>
                  <Button variant="outline" className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-2" onClick={handleReject} disabled={rejectLeave.isPending}>
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
