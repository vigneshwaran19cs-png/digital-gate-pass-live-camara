import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, ShieldAlert, Upload, Send, CheckCircle2 } from "lucide-react";
import { useCreateLeave } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { DateTimePickerSection } from "@/components/DateTimePickerSection";
import { DistrictLocationSelector } from "@/components/DistrictLocationSelector";

export default function EmergencyLeavePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createLeave = useCreateLeave();
  const { user } = useAuth();

  const [reason, setReason] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("12:00");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("18:00");
  const [destination, setDestination] = useState((user as any)?.address || "");
  const [district, setDistrict] = useState((user as any)?.district || "");
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    const userAddress = (user as any)?.address;
    if (userAddress && !destination) {
      setDestination(userAddress);
    }
    const userDistrict = (user as any)?.district;
    if (userDistrict && !district) {
      setDistrict(userDistrict);
    }
  }, [user]);

  const handleSubmitEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !fromDate || !toDate || !destination) {
      toast({ title: "Missing Details", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }

    createLeave.mutate(
      {
        data: {
          passType: "leave" as any,
          leaveType: "family_emergency" as any,
          reason: `[EMERGENCY LEAVE] ${reason}`,
          fromDate,
          fromTime,
          toDate,
          toTime,
          destination,
          district,
          isEmergency: true,
          medicalDocUrl: docFile ? docFile.name : null,
        } as any,
      },
      {
        onSuccess: () => {
          toast({
            title: "🚨 Emergency Leave Submitted",
            description: "Emergency Leave can be permitted by the Warden immediately. Principal approval may be completed later.",
          });
          setLocation("/leaves");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed to submit emergency leave.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => setLocation("/leaves")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Leaves
      </Button>

      <Card className="glass-card border-rose-200 bg-rose-50/20">
        <CardHeader className="border-b border-rose-100 bg-rose-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="uppercase tracking-widest text-xs px-2.5 py-0.5">
              Priority Hierarchy
            </Badge>
            <span className="text-xs text-rose-600 font-bold">Warden & Principal Approval Only</span>
          </div>
          <CardTitle className="text-2xl text-rose-950 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Apply Emergency Leave
          </CardTitle>
          <CardDescription>
            Emergency leave bypasses standard tutor approval and is reviewed immediately by Warden and Principal.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmitEmergency} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-200 text-xs text-red-900 flex items-start gap-2.5 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-red-950 mb-0.5">⚡ Fast-Track Emergency Leave Notice</strong>
                Emergency Leave can be permitted by the Warden immediately. Principal approval may be completed later.
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Emergency Reason / Details *</label>
              <Textarea
                placeholder="Explain the urgent family or medical emergency in detail..."
                className="min-h-[100px] mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <DateTimePickerSection
              passType="leave"
              fromDate={fromDate}
              onFromDateChange={setFromDate}
              fromTime={fromTime}
              onFromTimeChange={setFromTime}
              toDate={toDate}
              onToDateChange={setToDate}
              toTime={toTime}
              onToTimeChange={setToTime}
            />

            <DistrictLocationSelector
              passType="leave"
              destination={destination}
              onDestinationChange={setDestination}
              district={district}
              onDistrictChange={setDistrict}
              savedNativePlace={(user as any)?.address}
              savedDistrict={(user as any)?.district}
            />

            <div>
              <label className="text-sm font-semibold">Supporting Emergency Document (Optional)</label>
              <div className="border-2 border-dashed border-red-200 rounded-lg p-4 text-center mt-1 bg-white hover:bg-rose-50/50 transition-colors">
                <Upload className="w-6 h-6 text-rose-500 mx-auto mb-1" />
                <div className="text-xs font-semibold text-slate-700">Attach Medical Record / Emergency Proof</div>
                <Input
                  type="file"
                  className="max-w-xs mx-auto mt-2 text-xs"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Misuse of emergency leave for non-urgent matters will trigger disciplinary action by college authorities.
              </span>
            </div>

            <Button type="submit" disabled={createLeave.isPending} className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-2">
              <Send className="w-4 h-4" />
              {createLeave.isPending ? "Submitting Priority Request..." : "Submit Priority Emergency Leave"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
