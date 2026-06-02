import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListLeaves, useApproveLeave, useRejectLeave, useRecordParentCall,
  getListLeavesQueryKey,
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
import {
  Clock, CheckCircle2, XCircle, Phone, PhoneCall, PhoneOff,
  PhoneMissed, Search, Filter, User, Calendar, MapPin, BookOpen,
  AlertCircle, MessageSquare, ChevronRight, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

const CALL_STATUS_OPTIONS = [
  { value: "confirmed", label: "Parent Confirmed", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "rejected", label: "Parent Rejected", icon: XCircle, color: "text-rose-400" },
  { value: "not_reachable", label: "Not Reachable", icon: PhoneOff, color: "text-slate-400" },
  { value: "call_scheduled", label: "Call Scheduled", icon: Clock, color: "text-amber-400" },
  { value: "completed", label: "Call Completed", icon: PhoneCall, color: "text-blue-400" },
];

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

function CallBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const opt = CALL_STATUS_OPTIONS.find(o => o.value === status);
  if (!opt) return <span className="text-xs text-muted-foreground">{status}</span>;
  const Ic = opt.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${opt.color}`}>
      <Ic className="w-3 h-3" /> {opt.label}
    </span>
  );
}

export default function TutorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [callNotes, setCallNotes] = useState("");

  const { data: leavesData, isLoading } = useListLeaves(
    { status: "warden_approved" },
    { query: { queryKey: getListLeavesQueryKey({ status: "warden_approved" }) } }
  );
  const { data: allData } = useListLeaves(
    { department: user?.department ?? undefined },
    { query: { queryKey: getListLeavesQueryKey({ department: user?.department ?? undefined }) } }
  );

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const recordParentCall = useRecordParentCall();

  const leaves = (leavesData as any)?.leaves ?? (leavesData as any) ?? [];
  const allLeaves = (allData as any)?.leaves ?? (allData as any) ?? [];

  const pending = leaves.length;
  const parentPending = leaves.filter((l: any) => !l.parentCallStatus || l.parentCallStatus === "pending").length;
  const approved = (allLeaves as any[]).filter((l: any) => ["tutor_approved","hod_approved","fully_approved"].includes(l.status)).length;
  const rejected = (allLeaves as any[]).filter((l: any) => l.status === "rejected").length;

  const filtered = (leaves as any[]).filter((l: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.student?.name ?? "").toLowerCase().includes(q) || (l.reason ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.parentCallStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "warden_approved" }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ department: user?.department ?? undefined }) });
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    approveLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave approved ✓" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleReject = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Remarks required", variant: "destructive" }); return; }
    rejectLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave rejected" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleRecordCall = () => {
    if (!selectedLeave || !callStatus) return;
    recordParentCall.mutate({ id: selectedLeave.id, data: { callStatus: callStatus as any, notes: callNotes } }, {
      onSuccess: () => { toast({ title: "Call status recorded ✓" }); invalidate(); setCallStatus(""); setCallNotes(""); },
    });
  };

  const stats = [
    { label: "Pending Requests", value: pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
    { label: "Parent Verification Pending", value: parentPending, icon: PhoneMissed, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-rose-500/10" },
    { label: "Approved by Me", value: approved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/10" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", glow: "shadow-slate-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Tutor Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Parent verification & first-level approval dashboard</p>
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
              <div className={`glass-card rounded-2xl p-5 border ${s.border} shadow-lg ${s.glow}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <div className={`text-3xl font-heading font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by student name or reason…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Parent call status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            {CALL_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Leaves Table */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-semibold text-base">Pending Approval Queue</h2>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">{filtered.length} requests</Badge>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading leave requests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">All clear! No pending requests.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((leave: any, i: number) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => { setSelectedLeave(leave); setRemarks(""); setCallStatus(""); setCallNotes(""); }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 font-bold text-emerald-400 text-sm">
                  {(leave.student?.name ?? "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{leave.student?.name ?? `Student #${leave.studentId}`}</span>
                    <StatusBadge status={leave.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{leave.reason}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {leave.destination}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <CallBadge status={leave.parentCallStatus} />
                  {leave.student?.parentPhone && (
                    <a
                      href={`tel:${leave.student.parentPhone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      {leave.student.parentPhone}
                    </a>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Leave Detail Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={v => !v && setSelectedLeave(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedLeave && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Leave Request — {selectedLeave.student?.name ?? `#${selectedLeave.studentId}`}</DialogTitle>
              </DialogHeader>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div><p className="text-xs text-muted-foreground mb-0.5">Register No.</p><p className="text-sm font-semibold">{selectedLeave.student?.registerNumber ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Department</p><p className="text-sm font-semibold">{selectedLeave.student?.department ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Hostel Room</p><p className="text-sm font-semibold">{selectedLeave.student?.hostelRoom ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Parent Phone</p>
                  <a href={`tel:${selectedLeave.student?.parentPhone}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {selectedLeave.student?.parentPhone ?? "—"}
                  </a>
                </div>
              </div>

              {/* Leave Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Leave Type</span>
                  <Badge variant="outline" className="capitalize">{selectedLeave.leaveType}</Badge>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-24 pt-0.5">Reason</span>
                  <p className="text-sm flex-1">{selectedLeave.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Period</span>
                  <span className="text-sm">{format(new Date(selectedLeave.fromDate), "MMM d")} – {format(new Date(selectedLeave.toDate), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24">Destination</span>
                  <span className="text-sm">{selectedLeave.destination}</span>
                </div>
                {selectedLeave.wardenRemarks && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-24 pt-0.5">Warden Note</span>
                    <p className="text-sm text-cyan-400 italic flex-1">"{selectedLeave.wardenRemarks}"</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Parent Call Recording */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-sm">Parent Verification</h3>
                  <div className="ml-auto"><CallBadge status={selectedLeave.parentCallStatus} /></div>
                </div>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Record call status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_STATUS_OPTIONS.map(o => {
                      const Icon = o.icon;
                      return (
                        <SelectItem key={o.value} value={o.value}>
                          <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${o.color}`} />{o.label}</div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Call notes (optional)…" rows={2} value={callNotes} onChange={e => setCallNotes(e.target.value)} />
                <Button size="sm" variant="outline" onClick={handleRecordCall} disabled={!callStatus || recordParentCall.isPending} className="gap-2">
                  <PhoneCall className="w-3.5 h-3.5" /> Save Call Record
                </Button>
              </div>

              <Separator />

              {/* Approval */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-sm">Approval Decision</h3>
                </div>
                <Textarea
                  placeholder="Add your remarks before approving or rejecting…"
                  rows={3}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleApprove} disabled={approveLeave.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2">
                    <AlertCircle className="w-4 h-4" /> Request Clarification
                  </Button>
                  <Button variant="outline" className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-2" onClick={handleReject} disabled={rejectLeave.isPending}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>

              {/* Full detail link */}
              <Link href={`/leaves/${selectedLeave.id}`}>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <ChevronRight className="w-4 h-4" /> View Full Leave History
                </Button>
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
