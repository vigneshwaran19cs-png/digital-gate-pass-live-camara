import { useState } from "react";
import { useListLeaves, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  CalendarIcon, MapPin, ArrowRight, AlertCircle, Clock, Plus, Sparkles,
  Search, Filter, CheckCircle2, Pencil, Trash2, Shield, Eye, RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { formatDateTime } from "@/lib/dateUtils";

export default function LeavesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Manual Leave Creation Modal for Super Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState("");
  const [passType, setPassType] = useState("hostel_leave");
  const [leaveType, setLeaveType] = useState("personal_work");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("fully_approved");
  const [isEmergency, setIsEmergency] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Leave Modal for Super Admin
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [editFromDate, setEditFromDate] = useState("");
  const [editToDate, setEditToDate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editStep, setEditStep] = useState("");

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: leavesRaw = [], isLoading, refetch } = useListLeaves(
    user?.role === "student" ? { studentId: user.id } : {}
  );
  const { data: usersRaw = [] } = useListUsers();
  const allStudents = (usersRaw as any[]).filter(u => u.role === "student");

  const leaves = [...(leavesRaw as any[])];

  // Sort Emergency Leaves to the TOP of the leave list
  leaves.sort((a, b) => {
    const aEmerg = a.isEmergency === "true" || a.leaveType === "family_emergency" || a.leaveType === "emergency";
    const bEmerg = b.isEmergency === "true" || b.leaveType === "family_emergency" || b.leaveType === "emergency";
    if (aEmerg && !bEmerg) return -1;
    if (!aEmerg && bEmerg) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const filteredLeaves = leaves.filter(l => {
    const q = search.toLowerCase();
    const studentName = l.student?.name?.toLowerCase() || "";
    const regNo = l.student?.registerNumber?.toLowerCase() || "";
    const reasonText = l.reason?.toLowerCase() || "";
    const destText = l.destination?.toLowerCase() || "";
    const matchesSearch = !q || studentName.includes(q) || regNo.includes(q) || reasonText.includes(q) || destText.includes(q);

    let matchesStatus = true;
    if (statusFilter === "emergency") matchesStatus = l.isEmergency === "true" || l.leaveType === "family_emergency";
    else if (statusFilter === "pending") matchesStatus = l.status === "pending" || l.status === "warden_approved" || l.status === "tutor_approved" || l.status === "hod_approved" || l.status === "principal_approved";
    else if (statusFilter === "approved") matchesStatus = l.status === "fully_approved";
    else if (statusFilter === "rejected") matchesStatus = l.status === "rejected";

    return matchesSearch && matchesStatus;
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

  const handleSuperApprove = async (leaveId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/leaves/${leaveId}/super-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: "Instant Super Admin Force Approval" })
      });
      if (res.ok) {
        toast({ title: "⚡ Force Approved", description: "Direct outpass and QR gate pass generated instantly!" });
        refetch();
      } else {
        toast({ title: "❌ Error", description: "Could not approve leave.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLeave = async (leaveId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this leave and its gate pass?")) return;
    try {
      const res = await fetch(`/api/leaves/${leaveId}?hard=true`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "🗑️ Leave Deleted", description: "Record removed permanently from MySQL." });
        refetch();
      } else {
        toast({ title: "❌ Error", description: "Could not delete leave.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (leave: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingLeave(leave);
    setEditFromDate(leave.fromDate ? leave.fromDate.split("T")[0] : "");
    setEditToDate(leave.toDate ? leave.toDate.split("T")[0] : "");
    setEditReason(leave.reason || "");
    setEditDestination(leave.destination || "");
    setEditStatus(leave.status || "pending");
    setEditStep(leave.currentStep || "warden");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLeave?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/leaves/${editingLeave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: editFromDate,
          toDate: editToDate,
          reason: editReason,
          destination: editDestination,
          status: editStatus,
          currentStep: editStep,
        })
      });
      if (res.ok) {
        toast({ title: "✅ Leave Updated", description: "Changes saved successfully." });
        setShowEditModal(false);
        refetch();
      } else {
        toast({ title: "❌ Error", description: "Could not update leave.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateManualLeave = async () => {
    if (!targetStudentId) {
      toast({ title: "Select Student", description: "Please choose a student for this leave.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: parseInt(targetStudentId, 10),
          passType,
          leaveType,
          fromDate,
          toDate,
          reason: reason || "Super Admin manual leave entry",
          destination: destination || "Native town",
          status: approvalStatus,
          currentStep: approvalStatus === "fully_approved" ? "completed" : "warden",
          isEmergency,
          parentCallStatus: "confirmed",
          parentCallNotes: "Authorized by Super Admin ERP",
          wardenRemarks: "Super Admin authorized",
          tutorRemarks: "Super Admin authorized",
          hodRemarks: "Super Admin authorized",
          principalRemarks: "Super Admin authorized",
        })
      });
      if (res.ok) {
        toast({
          title: "✅ Leave Created",
          description: approvalStatus === "fully_approved" 
            ? "Direct approved leave + Gate Pass generated!" 
            : "Leave record created successfully."
        });
        setShowCreateModal(false);
        setReason("");
        setDestination("");
        refetch();
      } else {
        toast({ title: "❌ Error", description: "Could not create leave.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedDays = Math.max(1, Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-700">Leave Master Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-slate-800">Leaves Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time leave tracking, sequential approval forwarding & instant Super Admin bypass controls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" /> Create Student Leave
            </Button>
          )}

          {user?.role === "student" && (
            <>
              <Link href="/leaves/emergency">
                <Button variant="destructive" className="gap-1.5 bg-red-600 hover:bg-red-700 font-semibold shadow-sm">
                  🔴 Emergency Leave
                </Button>
              </Link>
              <Link href="/apply">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Apply Standard Leave</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-10 bg-white"
            placeholder="Search by student name, register number, reason, destination..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-10 bg-white">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({leaves.length})</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="approved">Fully Approved</SelectItem>
            <SelectItem value="emergency">🔴 Emergency Leaves</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredLeaves.length === 0 ? (
        <Card className="text-center p-12 bg-white">
          <p className="text-muted-foreground font-medium">No leave requests found matching your filter.</p>
          {isSuperAdmin && (
            <Button size="sm" className="mt-3 bg-indigo-600 text-white gap-1.5" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" /> Create Manual Leave
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeaves.map((leave) => {
            const isEmergency = leave.isEmergency === "true" || leave.leaveType === "family_emergency" || leave.leaveType === "emergency";
            const forwardedRole = getForwardingTarget(leave);

            return (
              <Link key={leave.id} href={`/leaves/${leave.id}`}>
                <Card
                  className={`hover:shadow-xl cursor-pointer transition-all duration-200 h-full flex flex-col overflow-hidden relative group bg-white ${
                    isEmergency
                      ? "border-2 border-red-500/80 bg-red-50/20 shadow-red-100"
                      : "hover:border-blue-300 border-slate-200"
                  }`}
                >
                  {/* Top Emergency Indicator Banner */}
                  {isEmergency && (
                    <div className="bg-red-600 text-white text-[11px] font-extrabold px-3 py-1 flex items-center justify-between tracking-wider uppercase">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        🔴 EMERGENCY LEAVE (HIGH PRIORITY)
                      </span>
                      <span className="text-[10px] opacity-90">Warden → Principal</span>
                    </div>
                  )}

                  <CardHeader className="pb-3 pt-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-base font-heading font-bold capitalize flex items-center gap-2 text-slate-800">
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
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <StudentProfilePhoto
                          photoUrl={leave.student.photoUrl}
                          name={leave.student.name}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-900 truncate">
                            {leave.student.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            Reg: {leave.student.registerNumber || "STU-REG"} · Room {leave.student.hostelRoom || "A-101"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Date & Destination Details */}
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-700">
                          {formatDateTime(leave.fromDate)} → {formatDateTime(leave.toDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate text-slate-700">{leave.destination}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-700 font-medium line-clamp-2 italic border border-slate-100">
                        "{leave.reason}"
                      </div>
                    </div>

                    {/* Leave Forwarding Status Box */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                        isEmergency
                          ? "bg-red-100/70 text-red-950 border-red-200"
                          : "bg-blue-50/70 text-blue-900 border-blue-100"
                      }`}
                    >
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                          Forwarded To
                        </div>
                        <div className="font-extrabold flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-blue-600" />
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

                    {/* Super Admin Quick Actions Bar */}
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between pt-2 border-t gap-1.5">
                        {leave.status !== "fully_approved" && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex-1 shadow-xs"
                            onClick={(e) => handleSuperApprove(leave.id, e)}
                            title="Instant Super Admin Bypass Approval"
                          >
                            <Sparkles className="w-3 h-3" /> Force Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1 px-2 hover:bg-blue-50 text-blue-700 border-blue-200"
                          onClick={(e) => openEdit(leave, e)}
                          title="Edit Leave Details"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 px-2"
                          onClick={(e) => handleDeleteLeave(leave.id, e)}
                          title="Delete Leave"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Manual Student Leave Creation Modal (Super Admin) */}
      <Dialog open={showCreateModal} onOpenChange={v => !v && setShowCreateModal(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-indigo-700">
              <Plus className="w-5 h-5" /> Super Admin Manual Leave Entry
            </DialogTitle>
            <DialogDescription>
              Create and directly approve or record leave days for any student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Select Student *</Label>
              <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {allStudents.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} ({s.registerNumber || "No Reg"} - Room {s.hostelRoom || "A-101"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Pass Type</Label>
                <Select value={passType} onValueChange={setPassType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hostel_leave">Hostel Leave (Multi-Day)</SelectItem>
                    <SelectItem value="outing_pass">Day Outing Pass (Same-Day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_work">Personal Work</SelectItem>
                    <SelectItem value="medical_leave">Medical Leave</SelectItem>
                    <SelectItem value="hospital_visit">Hospital Visit</SelectItem>
                    <SelectItem value="family_function">Family Function</SelectItem>
                    <SelectItem value="family_emergency">Family Emergency</SelectItem>
                    <SelectItem value="shopping">Shopping Outing</SelectItem>
                    <SelectItem value="hair_cut">Hair Cut / Salon</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="project_work">Project Work</SelectItem>
                    <SelectItem value="semester_holiday">Semester Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">From Date</Label>
                <Input type="date" className="mt-1" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">To Date</Label>
                <Input type="date" className="mt-1" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>

              <div className="col-span-2">
                <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex items-center justify-between text-slate-700 font-medium">
                  <span>Calculated Days:</span>
                  <span className="font-bold text-blue-700">{calculatedDays} Day(s)</span>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Reason / Purpose</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Attending family function"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Destination</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Perambalur / Sathyamangalam"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Approval Status</Label>
                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger className="mt-1 font-semibold text-indigo-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_approved">⚡ Instant Direct Approval (Active Gate Pass)</SelectItem>
                    <SelectItem value="pending">🟡 Normal Pending Approval Queue</SelectItem>
                    <SelectItem value="completed">🟢 Past Completed Leave (Historical Record)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreateManualLeave}
                disabled={isSubmitting || !targetStudentId || !reason || !destination}
              >
                {isSubmitting ? "Creating…" : "Save & Issue Leave"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Modal (Super Admin) */}
      <Dialog open={showEditModal} onOpenChange={v => !v && setShowEditModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-blue-700">
              <Pencil className="w-5 h-5 text-blue-600" /> Edit Leave Details
            </DialogTitle>
            <DialogDescription>
              Modify dates, destination, reason, status, or step for {editingLeave?.student?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">From Date</Label>
                <Input type="date" className="mt-1" value={editFromDate} onChange={e => setEditFromDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">To Date</Label>
                <Input type="date" className="mt-1" value={editToDate} onChange={e => setEditToDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Reason</Label>
              <Input className="mt-1" value={editReason} onChange={e => setEditReason(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Destination</Label>
              <Input className="mt-1" value={editDestination} onChange={e => setEditDestination(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="warden_approved">Warden Approved</SelectItem>
                    <SelectItem value="tutor_approved">Tutor Approved</SelectItem>
                    <SelectItem value="hod_approved">HOD Approved</SelectItem>
                    <SelectItem value="principal_approved">Principal Approved</SelectItem>
                    <SelectItem value="fully_approved">Fully Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Step</Label>
                <Select value={editStep} onValueChange={setEditStep}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warden">Warden</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="hod">HOD</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="warden_final">Warden Final</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
