import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListLeaves, useApproveLeave, useRejectLeave, useGetStudentsOutside,
  getListLeavesQueryKey, getGetStudentsOutsideQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Clock, CheckCircle2, XCircle, UserCheck,
  Calendar, MapPin, ChevronRight, RefreshCw, Activity,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

export default function WardenDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");

  const { data: leavesData, isLoading } = useListLeaves(
    { status: "pending" },
    { query: { queryKey: getListLeavesQueryKey({ status: "pending" }) } }
  );
  const { data: allData } = useListLeaves(
    {},
    { query: { queryKey: getListLeavesQueryKey({}) } }
  );
  const { data: outsideData } = useGetStudentsOutside(
    { query: { queryKey: getGetStudentsOutsideQueryKey() } }
  );

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const leaves = (leavesData as any)?.leaves ?? (leavesData as any) ?? [];
  const allLeaves = (allData as any)?.leaves ?? (allData as any) ?? [];
  const outsideStudents: any[] = (outsideData as any)?.students ?? [];

  const pending = (leaves as any[]).length;
  const approved = (allLeaves as any[]).filter((l: any) => l.status !== "pending" && l.status !== "rejected").length;
  const outside = outsideStudents.length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({ status: "pending" }) });
    queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey({}) });
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    approveLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Approved — forwarded to Tutor ✓" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const handleReject = () => {
    if (!selectedLeave || !remarks) { toast({ title: "Remarks required", variant: "destructive" }); return; }
    rejectLeave.mutate({ id: selectedLeave.id, data: { remarks } }, {
      onSuccess: () => { toast({ title: "Leave rejected" }); invalidate(); setSelectedLeave(null); setRemarks(""); },
    });
  };

  const stats = [
    { label: "Pending Review", value: pending, icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { label: "Forwarded to Tutor", value: approved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Students Outside", value: outside, icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Total Processed", value: (allLeaves as any[]).length, icon: Activity, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Warden Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Warden Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Hostel management & initial gate approval</p>
        </div>
        <Button variant="outline" size="sm" onClick={invalidate} className="gap-2 hidden md:flex">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
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

      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-semibold">Pending Leave Requests</h2>
          <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">{pending} requests</Badge>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading…</div>
        ) : (leaves as any[]).length === 0 ? (
          <div className="p-12 text-center"><CheckCircle2 className="w-12 h-12 text-cyan-400/40 mx-auto mb-3" /><p className="text-muted-foreground">No pending requests.</p></div>
        ) : (
          <div className="divide-y divide-border/30">
            {(leaves as any[]).map((leave: any, i: number) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => { setSelectedLeave(leave); setRemarks(""); }}
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 font-bold text-cyan-400 text-sm">
                  {(leave.student?.name ?? "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{leave.student?.name ?? `Student #${leave.studentId}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{leave.reason}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{format(new Date(leave.fromDate), "MMM d")} – {format(new Date(leave.toDate), "MMM d")}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{leave.destination}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs hidden md:flex gap-1"
                    onClick={e => { e.stopPropagation(); approveLeave.mutate({ id: leave.id, data: { remarks: "Approved by Warden" } }, { onSuccess: () => { toast({ title: "Approved ✓" }); invalidate(); } }); }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={!!selectedLeave} onOpenChange={v => !v && setSelectedLeave(null)}>
        <DialogContent className="max-w-lg">
          {selectedLeave && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">Review Leave — {selectedLeave.student?.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div><p className="text-xs text-muted-foreground mb-0.5">Hostel Room</p><p className="text-sm font-semibold">{selectedLeave.student?.hostelRoom ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Department</p><p className="text-sm font-semibold">{selectedLeave.student?.department ?? "—"}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Period</p><p className="text-sm font-semibold">{format(new Date(selectedLeave.fromDate), "MMM d")} – {format(new Date(selectedLeave.toDate), "MMM d, yyyy")} → {selectedLeave.destination}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Reason</p><p className="text-sm">{selectedLeave.reason}</p></div>
              </div>
              <Separator />
              <Textarea placeholder="Add remarks before approval or rejection…" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
              <div className="flex gap-2">
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white gap-2" onClick={handleApprove} disabled={approveLeave.isPending}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
                <Button variant="outline" className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-2" onClick={handleReject} disabled={rejectLeave.isPending}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
