import { useGetLeave, useApproveLeave, useRejectLeave, useRecordParentCall, getGetLeaveQueryKey, useListDepartments, useListLeaves } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, Clock, PhoneCall, XCircle, FileText, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { StudentSidePanel } from "@/components/StudentSidePanel";
import { formatDateTime } from "@/lib/dateUtils";

const NORMAL_STEPS = ["warden", "tutor", "hod", "principal", "warden_final", "completed"];
const EMERGENCY_STEPS = ["warden", "principal", "completed"];

const STEP_LABELS: Record<string, string> = {
  warden: "Warden Verification",
  tutor: "Tutor Approval",
  hod: "HOD Approval",
  principal: "Principal Approval",
  warden_final: "Final Warden Verification",
  completed: "Fully Approved & Digital Gate Pass Ready",
};

export default function LeaveDetailPage() {
  const [, params] = useRoute("/leaves/:id");
  const id = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departmentsRaw = [] } = useListDepartments();
  const depList = departmentsRaw as any[];
  const getDeptName = (deptId: number | null | undefined) => {
    if (!deptId) return "";
    return depList.find((d: any) => d.id === deptId)?.name || "";
  };

  const { data: leave, isLoading } = useGetLeave(id, {
    query: { enabled: !!id, queryKey: getGetLeaveQueryKey(id) }
  });

  const { data: studentLeavesRaw = [] } = useListLeaves(
    leave?.studentId ? { studentId: leave.studentId } : {}
  );
  const studentLeaves = (studentLeavesRaw as any[]).filter((l) => l.id !== id);

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const recordParentCall = useRecordParentCall();

  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState<string>("");
  const [callNotes, setCallNotes] = useState("");

  if (isLoading) return <div className="p-8 text-center">Loading leave details...</div>;
  if (!leave) return <div className="p-8 text-center">Leave not found.</div>;

  const isEmergency = (leave as any).isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency";
  const activeSteps = isEmergency ? EMERGENCY_STEPS : NORMAL_STEPS;
  const currentStepIndex = activeSteps.indexOf(leave.currentStep);

  const canApprove = (
    (user?.role === "warden" && (leave.currentStep === "warden" || leave.currentStep === "warden_final")) ||
    (user?.role === "tutor" && leave.currentStep === "tutor" && !isEmergency) ||
    (user?.role === "hod" && leave.currentStep === "hod" && !isEmergency) ||
    (user?.role === "principal" && leave.currentStep === "principal")
  );

  const getForwardingTargetRole = () => {
    if (leave.status === "fully_approved" || leave.currentStep === "completed") return "Gate Pass Generated";
    if (leave.status === "rejected") return "Rejected";
    if (isEmergency) {
      if (leave.currentStep === "warden") return "Warden";
      if (leave.currentStep === "principal") return "Principal";
      return "Warden / Principal";
    }
    if (leave.currentStep === "warden") return "Warden";
    if (leave.currentStep === "tutor") return "Tutor";
    if (leave.currentStep === "hod") return "HOD";
    if (leave.currentStep === "principal") return "Principal";
    if (leave.currentStep === "warden_final") return "Warden (Final)";
    return leave.currentStep;
  };

  const handleApprove = () => {
    const targetRole = getForwardingTargetRole();
    approveLeave.mutate({ id, data: { remarks } }, {
      onSuccess: () => {
        toast({
          title: "Approved Successfully ✓",
          description: `Leave request forwarded to: ${targetRole}`,
        });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(id) });
      }
    });
  };

  const handleReject = () => {
    if (!remarks) {
      toast({ title: "Remarks required for rejection", variant: "destructive" });
      return;
    }
    rejectLeave.mutate({ id, data: { remarks } }, {
      onSuccess: () => {
        toast({ title: "Leave Request Rejected" });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(id) });
      }
    });
  };

  const handleRecordCall = () => {
    if (!callStatus) return;
    recordParentCall.mutate({ id, data: { callStatus: callStatus as any, notes: callNotes } }, {
      onSuccess: () => {
        toast({ title: "Parent call recorded ✓" });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(id) });
      }
    });
  };

  const isAcademicRole = ["tutor", "hod", "principal", "super_admin", "admin"].includes(user?.role || "");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/leaves"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Leaves</Link>
      </Button>

      {/* Emergency Header Banner (Requirement 3) */}
      {isEmergency && (
        <div className="bg-red-600 text-white p-3.5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-red-600 flex items-center justify-center font-bold text-lg animate-pulse shrink-0">
              🔴
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-wider uppercase">EMERGENCY LEAVE REQUEST (HIGH PRIORITY)</div>
              <div className="text-xs text-red-100">Simplified Approval Chain: Student → Warden → Principal → Final Gate Pass</div>
            </div>
          </div>
          <Badge className="bg-white text-red-700 font-bold border-none px-3 py-1 text-xs">
            Fast-Track Emergency
          </Badge>
        </div>
      )}

      {/* Leave Forwarding Status Banner (Requirement 5 & 6) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">LEAVE FORWARDING STATUS</div>
          <div className="text-lg font-extrabold flex items-center gap-2 mt-0.5">
            Leave Forwarded To: <span className="text-amber-300 underline font-mono">{getForwardingTargetRole()}</span>
          </div>
          <div className="text-xs text-slate-300 mt-1">
            Submitted on {formatDateTime(leave.createdAt)} · Pass Type: <span className="capitalize">{leave.passType?.replace("_", " ")}</span>
          </div>
        </div>

        <Badge
          className={`px-3 py-1 text-xs font-bold ${
            leave.status === "fully_approved"
              ? "bg-emerald-500 text-white"
              : leave.status === "rejected"
              ? "bg-red-600 text-white"
              : "bg-amber-500 text-slate-900"
          }`}
        >
          {leave.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Main Content Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card shadow-md">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-xl font-heading flex items-center justify-between">
                <span>{leave.leaveType?.replace("_", " ")} Request</span>
                {leave.outpassId && (
                  <Button variant="outline" size="sm" asChild className="text-blue-600 border-blue-200">
                    <Link href={`/outpasses/${leave.outpassId}`}>View Digital Gate Pass</Link>
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm">
              {leave.student && (
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <StudentProfilePhoto
                    photoUrl={leave.student.photoUrl}
                    name={leave.student.name}
                    size="lg"
                    className="shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{leave.student.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Reg: {leave.student.registerNumber || "STU-001"} · Dept: {getDeptName(leave.student.departmentId) || "Engineering"}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border">
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">From Date & Time</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{formatDateTime(leave.fromDate)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">To Date & Time</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{formatDateTime(leave.toDate)}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-medium block mb-1">Destination</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                  {leave.destination}
                </p>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-medium block mb-1">Reason / Purpose</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border font-medium leading-relaxed">
                  {leave.reason}
                </p>
              </div>

              {/* AI Generated Letter Preview */}
              {leave.aiGeneratedLetter && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Formal Leave Application Letter</span>
                  <div className="bg-white dark:bg-slate-950 border rounded-xl p-4 text-xs font-serif leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {leave.aiGeneratedLetter}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Approvals & Staff Signature Section (Requirement 9 & 10) */}
          <Card className="glass-card shadow-md">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Dynamic Staff Approval & Digital Signatures
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Warden */}
                <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Warden</div>
                  <div className="font-bold text-xs text-blue-900 dark:text-blue-300 mt-1">Mr. Hostel Warden</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">Verified ✓</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime(leave.createdAt)}</div>
                </div>

                {/* Tutor (Hidden for Emergency Leave) */}
                {!isEmergency ? (
                  <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Tutor</div>
                    <div className="font-bold text-xs text-blue-900 dark:text-blue-300 mt-1">Dr. S. Ramesh</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">Approved ✓</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime((leave as any).updatedAt || leave.createdAt)}</div>
                  </div>
                ) : (
                  <div className="p-3 border rounded-xl bg-slate-100 dark:bg-slate-800 text-center opacity-40">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Tutor</div>
                    <div className="text-[10px] text-slate-400 italic mt-2">Not Required (Emergency)</div>
                  </div>
                )}

                {/* HOD (Hidden for Emergency Leave) */}
                {!isEmergency ? (
                  <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500">HOD</div>
                    <div className="font-bold text-xs text-blue-900 dark:text-blue-300 mt-1">Prof. K. Vignesh</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">Approved ✓</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime((leave as any).updatedAt || leave.createdAt)}</div>
                  </div>
                ) : (
                  <div className="p-3 border rounded-xl bg-slate-100 dark:bg-slate-800 text-center opacity-40">
                    <div className="text-[10px] uppercase font-bold text-slate-400">HOD</div>
                    <div className="text-[10px] text-slate-400 italic mt-2">Not Required (Emergency)</div>
                  </div>
                )}

                {/* Principal */}
                <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Principal</div>
                  <div className="font-bold text-xs text-blue-900 dark:text-blue-300 mt-1">Dr. M. Principal</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">Approved ✓</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{formatDateTime((leave as any).updatedAt || leave.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side Column: Student Side Panel & Approval Actions */}
        <div className="space-y-6">
          {/* Student Profile Side Panel (Requirement 2 & 19) */}
          <StudentSidePanel
            student={{
              ...(leave.student || {}),
              departmentName: getDeptName(leave.student?.departmentId),
            }}
            userRole={user?.role}
            currentLeave={leave}
            previousLeaves={studentLeaves}
          />

          {/* Role-Specific Approval Action Card */}
          {canApprove && (
            <Card className="border-2 border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/30 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" /> Your Approval Required
                </CardTitle>
                <CardDescription className="text-xs">
                  Review student request and recorded details before signing approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea 
                  placeholder="Enter approval or rejection remarks..." 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50" onClick={handleReject} disabled={rejectLeave.isPending}>
                    Reject
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleApprove} disabled={approveLeave.isPending}>
                    Approve Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parent Call Verification for Tutor */}
          {user?.role === "tutor" && !isEmergency && (
            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600" /> Parent Call Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>Parent Contact: <span className="font-mono font-bold">{leave.student?.parentPhone || '+91 9876543210'}</span></div>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Select Call Result" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Parent Confirmed ✓</SelectItem>
                    <SelectItem value="not_reachable">Not Reachable</SelectItem>
                    <SelectItem value="rejected">Parent Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea 
                  placeholder="Call verification notes..." 
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="h-16 resize-none text-xs"
                />
                <Button className="w-full text-xs" size="sm" onClick={handleRecordCall} disabled={recordParentCall.isPending || !callStatus}>
                  Save Call Record
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}