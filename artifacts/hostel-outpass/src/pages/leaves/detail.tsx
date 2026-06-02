import { useGetLeave, useApproveLeave, useRejectLeave, useRecordParentCall, getGetLeaveQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, Clock, PhoneCall, XCircle } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STEPS = ["warden", "tutor", "hod", "principal", "completed"];

export default function LeaveDetailPage() {
  const [, params] = useRoute("/leaves/:id");
  const id = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leave, isLoading } = useGetLeave(id, {
    query: { enabled: !!id, queryKey: getGetLeaveQueryKey(id) }
  });

  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const recordParentCall = useRecordParentCall();

  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState<string>("");
  const [callNotes, setCallNotes] = useState("");

  if (isLoading) return <div>Loading leave details...</div>;
  if (!leave) return <div>Leave not found.</div>;

  const currentStepIndex = STEPS.indexOf(leave.currentStep);

  const canApprove = (
    (user?.role === "warden" && leave.currentStep === "warden") ||
    (user?.role === "tutor" && leave.currentStep === "tutor") ||
    (user?.role === "hod" && leave.currentStep === "hod") ||
    (user?.role === "principal" && leave.currentStep === "principal")
  );

  const handleApprove = () => {
    approveLeave.mutate({ id, data: { remarks } }, {
      onSuccess: () => {
        toast({ title: "Approved" });
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
        toast({ title: "Rejected" });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(id) });
      }
    });
  };

  const handleRecordCall = () => {
    if (!callStatus) return;
    recordParentCall.mutate({ id, data: { callStatus: callStatus as any, notes: callNotes } }, {
      onSuccess: () => {
        toast({ title: "Call recorded" });
        queryClient.invalidateQueries({ queryKey: getGetLeaveQueryKey(id) });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/leaves"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Leaves</Link>
      </Button>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-heading">{leave.leaveType} Leave</h1>
          <p className="text-muted-foreground mt-1">Requested on {format(new Date(leave.createdAt), "PPP")}</p>
        </div>
        <Badge variant={leave.status === "fully_approved" ? "default" : leave.status === "rejected" ? "destructive" : "secondary"}>
          {leave.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leave.student && (
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                  {leave.student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{leave.student.name}</h3>
                  <p className="text-sm text-muted-foreground">{leave.student.registerNumber} • {leave.student.department}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">From</span>
                <p className="font-medium">{format(new Date(leave.fromDate), "PP p")}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">To</span>
                <p className="font-medium">{format(new Date(leave.toDate), "PP p")}</p>
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Destination</span>
              <p className="font-medium">{leave.destination}</p>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Reason</span>
              <p className="p-3 bg-muted rounded-md mt-1">{leave.reason}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6">
                {/* Timeline line */}
                <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-border -z-10" />
                
                {STEPS.slice(0, 4).map((step, idx) => {
                  const isCompleted = leave.status === "rejected" ? idx <= currentStepIndex : idx < currentStepIndex || leave.status === "fully_approved";
                  const isCurrent = idx === currentStepIndex && leave.status !== "rejected";
                  const isRejected = leave.status === "rejected" && idx === currentStepIndex;

                  return (
                    <div key={step} className="relative">
                      <div className={`absolute -left-[33px] bg-background p-1 rounded-full ${isCompleted ? 'text-primary' : isRejected ? 'text-destructive' : isCurrent ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5 bg-background rounded-full" /> : 
                         isRejected ? <XCircle className="w-5 h-5 bg-background rounded-full" /> :
                         isCurrent ? <Clock className="w-5 h-5 bg-background rounded-full" /> :
                         <Circle className="w-5 h-5 bg-background rounded-full" />}
                      </div>
                      <div>
                        <h4 className="font-medium capitalize">{step}</h4>
                        {/* Remarks logic can be added here based on role */}
                        {leave[`${step}Remarks` as keyof typeof leave] && (
                          <p className="text-sm text-muted-foreground mt-1">
                            "{leave[`${step}Remarks` as keyof typeof leave]}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {user?.role === "tutor" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" /> Parent Call
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Parent Phone: <span className="font-mono">{leave.student?.parentPhone || 'N/A'}</span>
                </div>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Call Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="not_reachable">Not Reachable</SelectItem>
                    <SelectItem value="rejected">Parent Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea 
                  placeholder="Notes..." 
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="h-20 resize-none text-sm"
                />
                <Button className="w-full" size="sm" onClick={handleRecordCall} disabled={recordParentCall.isPending || !callStatus}>
                  Record Call
                </Button>
              </CardContent>
            </Card>
          )}

          {canApprove && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Action Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea 
                  placeholder="Remarks (required for rejection)" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="bg-background"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={handleReject} disabled={rejectLeave.isPending}>
                    Reject
                  </Button>
                  <Button className="flex-1" onClick={handleApprove} disabled={approveLeave.isPending}>
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}