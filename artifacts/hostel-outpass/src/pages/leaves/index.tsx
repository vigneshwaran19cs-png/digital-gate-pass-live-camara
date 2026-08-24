import { useListLeaves } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CalendarIcon, MapPin, UserIcon, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { formatDateTime } from "@/lib/dateUtils";

export default function LeavesPage() {
  const { user } = useAuth();
  const { data: leavesRaw = [], isLoading } = useListLeaves(
    user?.role === "student" ? { studentId: user.id } : {}
  );

  const leaves = [...(leavesRaw as any[])];

  // Requirement 3: Sort Emergency Leaves to the TOP of the leave list
  leaves.sort((a, b) => {
    const aEmerg = a.isEmergency === "true" || a.leaveType === "family_emergency" || a.leaveType === "emergency";
    const bEmerg = b.isEmergency === "true" || b.leaveType === "family_emergency" || b.leaveType === "emergency";
    if (aEmerg && !bEmerg) return -1;
    if (!aEmerg && bEmerg) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Role Forwarding Map Helper
  const getForwardingTarget = (leave: any) => {
    const isEmerg = leave.isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency";
    if (leave.status === "fully_approved" || leave.currentStep === "completed") return "Approved & Digital Gate Pass Ready";
    if (leave.status === "rejected") return "Rejected";

    if (isEmerg) {
      if (leave.currentStep === "warden") return "Warden";
      if (leave.currentStep === "principal") return "Principal";
      return "Warden / Principal";
    } else {
      if (leave.currentStep === "warden") return "Warden (Initial)";
      if (leave.currentStep === "tutor") return "Tutor";
      if (leave.currentStep === "hod") return "HOD";
      if (leave.currentStep === "principal") return "Principal";
      if (leave.currentStep === "warden_final") return "Warden (Final)";
      return leave.currentStep;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Leaves Management</h1>
          <p className="text-muted-foreground mt-1">
            Real-time leave tracking, role-specific forwarding timelines & emergency pass control.
          </p>
        </div>
        {user?.role === "student" && (
          <div className="flex items-center gap-2">
            <Link href="/leaves/emergency">
              <Button variant="destructive" className="gap-1.5 bg-red-600 hover:bg-red-700 font-semibold shadow-sm">
                🔴 Emergency Leave
              </Button>
            </Link>
            <Link href="/apply">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Apply Standard Leave</Button>
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : leaves.length === 0 ? (
        <Card className="text-center p-8">
          <p className="text-muted-foreground">No leave requests found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leaves.map((leave) => {
            const isEmergency = leave.isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency";
            const forwardedRole = getForwardingTarget(leave);

            return (
              <Link key={leave.id} href={`/leaves/${leave.id}`}>
                <Card
                  className={`hover:shadow-lg cursor-pointer transition-all duration-200 h-full flex flex-col overflow-hidden relative ${
                    isEmergency
                      ? "border-2 border-red-500/80 bg-red-50/30 dark:bg-red-950/20 shadow-red-100"
                      : "hover:border-blue-300"
                  }`}
                >
                  {/* Top Emergency Indicator Banner */}
                  {isEmergency && (
                    <div className="bg-red-600 text-white text-[11px] font-extrabold px-3 py-1 flex items-center justify-between tracking-wider uppercase">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        🔴 EMERGENCY LEAVE (HIGH PRIORITY)
                      </span>
                      <span className="text-[10px] opacity-90">Warden → Principal Workflow</span>
                    </div>
                  )}

                  <CardHeader className="pb-3 pt-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base font-heading font-bold capitalize flex items-center gap-2">
                          {leave.leaveType?.replace("_", " ")}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          Submitted: {formatDateTime(leave.createdAt)}
                        </div>
                      </div>

                      <Badge
                        className={
                          leave.status === "fully_approved"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : leave.status === "rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : isEmergency
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }
                      >
                        {leave.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between text-xs space-y-3">
                    {/* Student Info Row */}
                    {leave.student && (
                      <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                        <StudentProfilePhoto
                          photoUrl={leave.student.photoUrl}
                          name={leave.student.name}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {leave.student.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            Reg: {leave.student.registerNumber || "STU-REG"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Date & Destination Details */}
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDateTime(leave.fromDate)} → {formatDateTime(leave.toDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{leave.destination}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-slate-700 dark:text-slate-300 font-medium line-clamp-2 italic">
                        "{leave.reason}"
                      </div>
                    </div>

                    {/* Leave Forwarding Status Box (Requirement 5 & 6) */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                        isEmergency
                          ? "bg-red-100/70 text-red-950 border-red-200"
                          : "bg-blue-50/70 text-blue-900 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200"
                      }`}
                    >
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                          Forwarded To
                        </div>
                        <div className="font-extrabold flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          {forwardedRole}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] opacity-75 uppercase font-bold">Role Status</div>
                        <div className="text-[11px] font-bold">
                          {leave.status === "fully_approved" ? "Final Pass Ready" : `Pending ${leave.currentStep}`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
