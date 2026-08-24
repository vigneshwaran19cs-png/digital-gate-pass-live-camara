import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function getForwardingInfo(status: string, currentStep?: string, isEmergency?: boolean) {
  if (status === "rejected") {
    return { label: "Rejected", cls: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200", role: "Rejected" };
  }
  if (status === "fully_approved" || currentStep === "completed") {
    return { label: "Final Pass Ready ✓", cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200", role: "Gate Pass Issued" };
  }

  if (isEmergency) {
    if (currentStep === "warden" || status === "pending") {
      return { label: "Forwarded to Warden (Emergency)", cls: "bg-rose-100 text-rose-900 border-rose-300 font-extrabold", role: "Warden Review" };
    }
    if (currentStep === "principal" || status === "warden_approved") {
      return { label: "Forwarded to Principal (Priority)", cls: "bg-purple-100 text-purple-900 border-purple-300 font-extrabold", role: "Principal Approval" };
    }
  }

  switch (status) {
    case "pending":
      return { label: "Forwarded to Warden (Initial)", cls: "bg-cyan-100 text-cyan-800 border-cyan-200", role: "Warden Review" };
    case "warden_approved":
      return { label: "Forwarded to Tutor", cls: "bg-blue-100 text-blue-800 border-blue-200", role: "Tutor Verification" };
    case "tutor_approved":
      return { label: "Forwarded to HOD", cls: "bg-violet-100 text-violet-800 border-violet-200", role: "HOD Approval" };
    case "hod_approved":
      return { label: "Forwarded to Principal", cls: "bg-amber-100 text-amber-800 border-amber-200", role: "Principal Approval" };
    case "principal_approved":
      return { label: "Forwarded to Warden (Final Pass)", cls: "bg-orange-100 text-orange-800 border-orange-200", role: "Warden Gate Pass Release" };
    default:
      return { label: `Forwarded to ${currentStep || status}`, cls: "bg-slate-100 text-slate-800 border-slate-200", role: status };
  }
}

export function ForwardingStatusBadge({ status, currentStep, isEmergency }: { status: string; currentStep?: string; isEmergency?: boolean }) {
  const info = getForwardingInfo(status, currentStep, isEmergency);
  return (
    <Badge className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${info.cls}`}>
      {status !== "rejected" && status !== "fully_approved" && <ArrowRight className="w-3 h-3 text-current shrink-0" />}
      {info.label}
    </Badge>
  );
}
