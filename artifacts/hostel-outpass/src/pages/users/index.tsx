import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListDepartments, useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  GraduationCap, BookOpen, Building2, Crown, Shield, ScanLine, Settings,
  Plus, Pencil, Trash2, Search, RefreshCw, Phone, Mail, Hash, Download,
  User, UserCog, Filter, AlertTriangle, Calendar, Clock, FileText, CheckCircle2,
  QrCode, Sparkles, ExternalLink, Image as ImageIcon, Eye, ArrowRight, Building, Lock
} from "lucide-react";
import { CategorizedDepartmentSelect } from "@/components/CategorizedDepartmentSelect";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

const ROLE_TABS = [
  { value: "all", label: "All Users", icon: User, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
  { value: "student", label: "Students", icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { value: "tutor", label: "Tutors", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  { value: "hod", label: "HOD", icon: Building2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  { value: "warden", label: "Wardens", icon: Shield, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
  { value: "principal", label: "Principal", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  { value: "security", label: "Security", icon: ScanLine, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  { value: "super_admin", label: "Admin", icon: Settings, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
];

function getRoleConf(role: string) {
  return ROLE_TABS.find(r => r.value === role) || ROLE_TABS[0];
}

function RoleBadge({ role }: { role: string }) {
  const conf = getRoleConf(role);
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${conf.bg} ${conf.color} ${conf.border}`}>
      <Icon className="w-3 h-3" />{conf.label}
    </span>
  );
}

interface UserFormData {
  name: string; email: string; phone: string; role: string;
  departmentId: string; classId: string; registerNumber: string; year: string;
  hostelBlock: string; hostelRoom: string; parentPhone: string; parentName: string;
  parentWhatsapp: string; parentEmail: string; address: string;
  designation: string; password?: string;
  photoUrl: string; idCardUrl: string; attendancePercentage: string;
}

const emptyForm: UserFormData = {
  name: "", email: "", phone: "", role: "student", departmentId: "", classId: "",
  registerNumber: "", year: "I", hostelBlock: "", hostelRoom: "", parentPhone: "", parentName: "",
  parentWhatsapp: "", parentEmail: "", address: "", designation: "", password: "",
  photoUrl: "", idCardUrl: "", attendancePercentage: "87",
};

interface ManualLeaveFormData {
  passType: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  destination: string;
  status: string;
  remarks: string;
  isEmergency: boolean;
}

const emptyLeaveForm: ManualLeaveFormData = {
  passType: "hostel_leave",
  leaveType: "personal_work",
  fromDate: new Date().toISOString().split("T")[0],
  toDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
  reason: "Authorized leave recorded by Super Admin",
  destination: "Native Home Town",
  status: "fully_approved",
  remarks: "Direct approval & gate pass issued by Super Admin ERP",
  isEmergency: false,
};

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Super Admin Master Features
  const [showManualLeaveModal, setShowManualLeaveModal] = useState(false);
  const [leaveTargetStudent, setLeaveTargetStudent] = useState<any>(null);
  const [leaveFormData, setLeaveFormData] = useState<ManualLeaveFormData>(emptyLeaveForm);
  const [isCreatingLeave, setIsCreatingLeave] = useState(false);

  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [idCardStudent, setIdCardStudent] = useState<any>(null);

  const { data: usersRaw = [], isLoading, refetch } = useListUsers();
  const users = usersRaw as any[];

  const { data: departments = [] } = useListDepartments();
  const { data: classes = [] } = useListClasses();
  const depList = departments as any[];
  const clsList = classes as any[];

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const getDeptName = (deptId: number | null) => {
    if (!deptId) return "";
    return depList.find((d: any) => d.id === deptId)?.name || "";
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const deptName = getDeptName(u.departmentId);
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.registerNumber?.toLowerCase().includes(q) || deptName.toLowerCase().includes(q);
    const matchRole = roleTab === "all" || u.role === roleTab;
    const matchDept = deptFilter === "all" || u.departmentId === parseInt(deptFilter, 10);
    return matchSearch && matchRole && matchDept;
  });

  const openAdd = () => { setFormData({ ...emptyForm, role: roleTab !== "all" ? roleTab : "student" }); setShowAddModal(true); };
  const openEdit = (u: any) => {
    setSelectedUser(u);
    setFormData({ 
      name: u.name || "", email: u.email || "", phone: u.phone || "", role: u.role || "student", 
      departmentId: u.departmentId?.toString() || "", classId: u.classId?.toString() || "",
      registerNumber: u.registerNumber || "", year: u.year || "I", 
      hostelBlock: u.hostelBlock || "", hostelRoom: u.hostelRoom || "", parentPhone: u.parentPhone || "", 
      parentName: u.parentName || "", parentWhatsapp: u.parentWhatsapp || "", parentEmail: u.parentEmail || "", 
      address: u.address || "", designation: u.designation || "", password: "",
      photoUrl: u.photoUrl || "", idCardUrl: u.idCardUrl || "", attendancePercentage: u.attendancePercentage?.toString() || "87",
    });
    setShowEditModal(true);
  };
  const openDelete = (u: any) => { setSelectedUser(u); setShowDeleteConfirm(true); };

  const openManualLeave = (student: any) => {
    setLeaveTargetStudent(student);
    setLeaveFormData({
      ...emptyLeaveForm,
      reason: `Authorized leave for ${student.name}`,
    });
    setShowManualLeaveModal(true);
  };

  const openIdCard = (student: any) => {
    setIdCardStudent(student);
    setShowIdCardModal(true);
  };

  const handleAdd = () => {
    setIsSubmitting(true);
    createUserMutation.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        password: formData.password || "password123",
        role: formData.role as any,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        classId: formData.role === "student" && formData.classId ? parseInt(formData.classId, 10) : undefined,
        phone: formData.phone || undefined,
        registerNumber: formData.role === "student" ? (formData.registerNumber || undefined) : undefined,
        hostelBlock: formData.role === "student" ? (formData.hostelBlock || undefined) : undefined,
        hostelRoom: formData.role === "student" ? (formData.hostelRoom || undefined) : undefined,
        parentPhone: formData.role === "student" ? (formData.parentPhone || undefined) : undefined,
        parentName: formData.role === "student" ? (formData.parentName || undefined) : undefined,
        parentWhatsapp: formData.role === "student" ? (formData.parentWhatsapp || undefined) : undefined,
        parentEmail: formData.role === "student" ? (formData.parentEmail || undefined) : undefined,
        address: formData.role === "student" ? (formData.address || undefined) : undefined,
        designation: formData.role !== "student" ? (formData.designation || undefined) : undefined,
        photoUrl: formData.photoUrl || undefined,
        idCardUrl: formData.idCardUrl || undefined,
      }
    }, {
      onSuccess: () => {
        setIsSubmitting(false);
        setShowAddModal(false);
        toast({ title: `✅ User Created`, description: `${formData.name} (${formData.role}) has been added successfully.` });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to create user.", variant: "destructive" });
      }
    });
  };

  const handleEdit = async () => {
    if (!selectedUser?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
          classId: formData.role === "student" && formData.classId ? parseInt(formData.classId, 10) : undefined,
          registerNumber: formData.role === "student" ? (formData.registerNumber || undefined) : undefined,
          hostelBlock: formData.role === "student" ? (formData.hostelBlock || undefined) : undefined,
          hostelRoom: formData.role === "student" ? (formData.hostelRoom || undefined) : undefined,
          parentPhone: formData.role === "student" ? (formData.parentPhone || undefined) : undefined,
          parentName: formData.role === "student" ? (formData.parentName || undefined) : undefined,
          parentWhatsapp: formData.role === "student" ? (formData.parentWhatsapp || undefined) : undefined,
          parentEmail: formData.role === "student" ? (formData.parentEmail || undefined) : undefined,
          address: formData.role === "student" ? (formData.address || undefined) : undefined,
          designation: formData.role !== "student" ? (formData.designation || undefined) : undefined,
          photoUrl: formData.photoUrl || undefined,
          idCardUrl: formData.idCardUrl || undefined,
          attendancePercentage: formData.attendancePercentage ? parseInt(formData.attendancePercentage, 10) : undefined,
          password: formData.password ? formData.password : undefined,
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `✅ User Updated`, description: `${formData.name}'s record has been saved.` });
        setShowEditModal(false);
        refetch();
      } else {
        toast({ title: `❌ Error`, description: data.error || "Failed to update user.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: `❌ Error`, description: e.message || "Failed to update user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedUser?.id) return;
    setIsSubmitting(true);
    deleteUserMutation.mutate({
      id: selectedUser.id
    }, {
      onSuccess: () => {
        setIsSubmitting(false);
        setShowDeleteConfirm(false);
        toast({ title: `🗑️ User Removed`, description: `${selectedUser.name} has been removed from the directory.` });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to delete user.", variant: "destructive" });
      }
    });
  };

  const handleCreateManualLeave = async () => {
    if (!leaveTargetStudent?.id) return;
    setIsCreatingLeave(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: leaveTargetStudent.id,
          passType: leaveFormData.passType,
          leaveType: leaveFormData.leaveType,
          fromDate: leaveFormData.fromDate,
          toDate: leaveFormData.toDate,
          reason: leaveFormData.reason,
          destination: leaveFormData.destination,
          status: leaveFormData.status,
          currentStep: leaveFormData.status === "fully_approved" ? "completed" : "warden",
          wardenRemarks: leaveFormData.remarks,
          tutorRemarks: leaveFormData.remarks,
          hodRemarks: leaveFormData.remarks,
          principalRemarks: leaveFormData.remarks,
          isEmergency: leaveFormData.isEmergency,
          parentCallStatus: "confirmed",
          parentCallNotes: "Authorized and confirmed by Super Admin ERP",
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "✅ Leave & Gate Pass Created",
          description: leaveFormData.status === "fully_approved" 
            ? `Direct approved outpass generated for ${leaveTargetStudent.name}!` 
            : `Leave record created successfully for ${leaveTargetStudent.name}.`,
        });
        setShowManualLeaveModal(false);
        refetch();
      } else {
        toast({
          title: "❌ Failed to Create Leave",
          description: data.error || "Could not record leave.",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message || "Failed to record leave.", variant: "destructive" });
    } finally {
      setIsCreatingLeave(false);
    }
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-test-data", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "✅ Test Data Populated",
          description: "20 Realistic Student profiles + JKKM ID cards + workflows loaded successfully!",
        });
        refetch();
      } else {
        toast({
          title: "❌ Seeding Failed",
          description: data.error || "Could not populate test data.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "❌ Network Error",
        description: e.message || "Failed to reach server.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const exportCSV = () => {
    const header = "Name,Email,Role,Department,Register Number,Phone,Attendance,HostelRoom\n";
    const rows = filtered.map(u => `"${u.name}","${u.email}","${u.role}","${u.department || ""}","${u.registerNumber || ""}","${u.phone || ""}","${u.attendancePercentage || 85}%","${u.hostelRoom || ""}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `JKKM_Users_${roleTab}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded ✓" });
  };

  // Calculate days for modal
  const leaveDaysCalc = Math.max(1, Math.round((new Date(leaveFormData.toDate).getTime() - new Date(leaveFormData.fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-indigo-700" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-700">Super Admin Master Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">User & Student Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Full control to manage student profiles, images, ID cards, attendance & manual leave entries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
            onClick={handleSeedTestData}
            disabled={isSeeding}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
            {isSeeding ? "Populating…" : "Load 20 Test Students"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 hidden md:flex" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 hidden md:flex">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white gap-2" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Registered", value: users.length, color: "text-slate-700" },
          { label: "Students", value: users.filter(u => u.role === "student").length, color: "text-blue-600" },
          { label: "Faculty & Staff", value: users.filter(u => u.role !== "student").length, color: "text-emerald-600" },
          { label: "Filtered Records", value: filtered.length, color: "text-violet-600" },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <div className="glass-card rounded-xl p-4 bg-white shadow-sm border border-slate-100 text-center">
              <div className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-10 bg-white"
            placeholder="Search by name, register number, department, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-56 h-10 bg-white">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depList.map((d: any) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Tabs and Directory Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Tabs value={roleTab} onValueChange={setRoleTab}>
          <TabsList className="bg-slate-100/80 p-1 flex flex-wrap h-auto gap-1 rounded-xl mb-4">
            {ROLE_TABS.map(tab => {
              const count = tab.value === "all" ? users.length : users.filter(u => u.role === tab.value).length;
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-xs rounded-lg text-xs gap-1.5 px-3 py-1.5"
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                  <span>{tab.label}</span>
                  <span className="ml-1 text-[10px] bg-slate-200/80 data-[state=active]:bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ROLE_TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div>
                    <h2 className="font-heading font-semibold text-slate-800">{tab.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} records in this view</p>
                  </div>
                  <Badge variant="outline" className={`${tab.color} ${tab.border}`}>{filtered.length} users</Badge>
                </div>

                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading directory…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <tab.icon className={`w-12 h-12 mx-auto mb-3 opacity-20 ${tab.color}`} />
                    <p className="text-muted-foreground font-medium">No users found.</p>
                    <Button size="sm" className="mt-3 gap-2 bg-slate-800 hover:bg-slate-700 text-white" onClick={openAdd}>
                      <Plus className="w-3.5 h-3.5" /> Add {tab.label}
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {filtered.map((u: any, i: number) => {
                      const rc = getRoleConf(u.role);
                      return (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Photo Avatar */}
                          {u.photoUrl ? (
                            <img
                              src={u.photoUrl}
                              alt={u.name}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className={`w-11 h-11 rounded-xl ${rc.bg} border ${rc.border} flex items-center justify-center flex-shrink-0 font-bold text-sm ${rc.color}`}>
                              {u.name?.charAt(0) ?? "?"}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-semibold text-sm text-slate-800">{u.name}</span>
                              <RoleBadge role={u.role} />
                              {u.hostelRoom && (
                                <span className="text-[10px] bg-cyan-50 border border-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-mono">
                                  Room {u.hostelRoom}
                                </span>
                              )}
                              {u.role === "student" && u.attendancePercentage != null && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                  u.attendancePercentage >= 85
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : u.attendancePercentage >= 75
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {u.attendancePercentage}% Att
                                </span>
                              )}
                              {u.role === "student" && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                  Barcode: {u.registerNumber?.replace(/^7312/, "") || u.registerNumber || "N/A"}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                              {u.registerNumber && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Hash className="w-3 h-3 text-slate-400" />{u.registerNumber}
                                </span>
                              )}
                              {getDeptName(u.departmentId) && (
                                <span className="font-medium text-slate-600">{getDeptName(u.departmentId)}</span>
                              )}
                              {u.email && (
                                <span className="flex items-center gap-1 truncate max-w-48">
                                  <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />{u.email}
                                </span>
                              )}
                              {u.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />{u.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Super Admin Quick Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {u.role === "student" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs gap-1 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100"
                                  onClick={() => openManualLeave(u)}
                                  title="Add Manual Leave / Direct Pass for Student"
                                >
                                  <Plus className="w-3 h-3" /> Manual Leave
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs gap-1 hover:bg-slate-100 text-slate-700"
                                  onClick={() => openIdCard(u)}
                                  title="View ID Card"
                                >
                                  <Eye className="w-3.5 h-3.5" /> ID Card
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(u)} title="Edit User">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="w-8 h-8 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(u)} title="Delete User">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* Manual Leave Entry Modal (Super Admin Master Power) */}
      <Dialog open={showManualLeaveModal} onOpenChange={v => !v && setShowManualLeaveModal(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-blue-700">
              <FileText className="w-5 h-5 text-blue-600" /> Manual Student Leave Entry
            </DialogTitle>
            <DialogDescription>
              Record or direct-approve leave days for <strong>{leaveTargetStudent?.name}</strong> ({leaveTargetStudent?.registerNumber}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-3">
              <img
                src={leaveTargetStudent?.photoUrl || "/students/vimal_m.jpg"}
                alt={leaveTargetStudent?.name}
                className="w-12 h-12 rounded-lg object-cover border border-blue-200"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-800 text-sm">{leaveTargetStudent?.name}</div>
                <div className="text-slate-600 font-mono">Reg: {leaveTargetStudent?.registerNumber} · Room {leaveTargetStudent?.hostelRoom || "A-101"}</div>
                <div className="text-emerald-700 font-medium">{leaveTargetStudent?.attendancePercentage || 87}% Attendance</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Pass Type</Label>
                <Select value={leaveFormData.passType} onValueChange={v => setLeaveFormData(prev => ({ ...prev, passType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hostel_leave">Hostel Leave (Multi-Day)</SelectItem>
                    <SelectItem value="outing_pass">Day Outing Pass (Same-Day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Leave Category</Label>
                <Select value={leaveFormData.leaveType} onValueChange={v => setLeaveFormData(prev => ({ ...prev, leaveType: v }))}>
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
                <Input
                  type="date"
                  className="mt-1"
                  value={leaveFormData.fromDate}
                  onChange={e => setLeaveFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">To Date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={leaveFormData.toDate}
                  onChange={e => setLeaveFormData(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex items-center justify-between text-slate-700 font-medium">
                  <span>Calculated Duration:</span>
                  <span className="font-bold text-blue-700">{leaveDaysCalc} Day(s) Leave</span>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Reason / Purpose</Label>
                <Input
                  className="mt-1"
                  placeholder="Enter reason for leave"
                  value={leaveFormData.reason}
                  onChange={e => setLeaveFormData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Destination Address / City</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Perambalur / Gobichettipalayam"
                  value={leaveFormData.destination}
                  onChange={e => setLeaveFormData(prev => ({ ...prev, destination: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Approval Mode</Label>
                <Select value={leaveFormData.status} onValueChange={v => setLeaveFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="mt-1 font-semibold text-blue-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_approved">⚡ Direct Approved (Instant Active Gate Pass)</SelectItem>
                    <SelectItem value="pending">🟡 Pending Tutor & Warden Approval Queue</SelectItem>
                    <SelectItem value="completed">🟢 Past Completed Leave (Historical Record)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Admin Authorization Remarks</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Authorized by Super Admin ERP"
                  value={leaveFormData.remarks}
                  onChange={e => setLeaveFormData(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowManualLeaveModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCreateManualLeave}
                disabled={isCreatingLeave || !leaveFormData.reason || !leaveFormData.destination}
              >
                {isCreatingLeave ? "Recording Leave…" : "Confirm & Save Leave"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ID Card Viewer Modal */}
      <Dialog open={showIdCardModal} onOpenChange={v => !v && setShowIdCardModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-slate-900 border-slate-700 text-white">
          <div className="bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-900 p-6 space-y-4 text-center">
            <div className="space-y-1">
              <div className="text-[10px] tracking-widest uppercase font-bold text-amber-300">
                J.K.K. MUNIRAJAH COLLEGE OF TECHNOLOGY
              </div>
              <div className="text-[9px] text-slate-300">Autonomous · Approved by AICTE, New Delhi</div>
              <div className="text-xs font-bold text-white bg-blue-800/60 py-0.5 rounded px-2 inline-block mt-1">
                STUDENT IDENTITY CARD
              </div>
            </div>

            <div className="flex justify-center my-2">
              <img
                src={idCardStudent?.photoUrl || "/students/vimal_m.jpg"}
                alt={idCardStudent?.name}
                className="w-28 h-32 rounded-xl object-cover border-2 border-white shadow-xl bg-white"
              />
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold font-heading text-white">{idCardStudent?.name}</div>
              <div className="text-sm font-mono text-cyan-300 font-semibold">{idCardStudent?.registerNumber}</div>
              <div className="text-xs text-slate-300">{getDeptName(idCardStudent?.departmentId) || idCardStudent?.department || "Automobile Engineering"}</div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl text-left text-xs space-y-1 border border-slate-700">
              <div className="flex justify-between"><span className="text-slate-400">Hostel Room:</span> <span className="font-bold text-white">{idCardStudent?.hostelRoom || "A-101"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Student Phone:</span> <span className="font-mono text-white">{idCardStudent?.phone || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Parent Phone:</span> <span className="font-mono text-white">{idCardStudent?.parentPhone || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Attendance:</span> <span className="font-bold text-emerald-400">{idCardStudent?.attendancePercentage || 87}%</span></div>
            </div>

            <div className="bg-white p-3 rounded-xl text-slate-900 flex flex-col items-center">
              <div className="font-mono text-xs tracking-widest font-bold">
                ||||| | |||| ||| ||||| || |
              </div>
              <div className="text-[11px] font-mono font-bold mt-1">
                BARCODE: {idCardStudent?.registerNumber?.replace(/^7312/, "") || idCardStudent?.registerNumber}
              </div>
            </div>

            <Button variant="outline" className="w-full text-xs text-slate-800 bg-white hover:bg-slate-100" onClick={() => setShowIdCardModal(false)}>
              Close ID Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={v => !v && setShowAddModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><Plus className="w-5 h-5 text-slate-600" /> Add New User</DialogTitle>
            <DialogDescription>Fill in the details to register a new user in the system.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))} />
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white" onClick={handleAdd} disabled={isSubmitting || !formData.name || !formData.email}>
              {isSubmitting ? "Creating…" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={v => !v && setShowEditModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-600" /> Edit — {selectedUser?.name}</DialogTitle>
            <DialogDescription>Update all student attributes, images, ID card URL, and attendance data.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))} isEdit />
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={v => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirm Removal
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-800">
            Are you sure you want to remove <strong>{selectedUser?.name}</strong>? This will remove all their records from the directory.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Removing…" : "Remove User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ formData, updateForm, isEdit = false }: {
  formData: UserFormData;
  updateForm: (field: keyof UserFormData, value: string) => void;
  isEdit?: boolean;
}) {
  const { data: classes = [] } = useListClasses();
  const clsList = classes as any[];

  const filteredClasses = formData.departmentId
    ? clsList.filter((c: any) => c.departmentId === parseInt(formData.departmentId, 10))
    : [];

  const isStudent = formData.role === "student";

  const PRESET_PHOTOS = [
    { label: "Vimal M (Auto)", url: "/students/vimal_m.jpg" },
    { label: "Azhagesan S (Mech)", url: "/students/azhagesan_s.jpg" },
    { label: "Chinraj M (Mech)", url: "/students/chinraj_m.jpg" },
    { label: "Karthick Rajan (Auto)", url: "/students/karthick_rajan_s.jpg" },
    { label: "Kavin Kaarthik (Auto)", url: "/students/kavin_kaarthik_m.jpg" },
    { label: "Female Student", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
  ];

  const applyQuickTemplate = (type: "student_eng" | "student_poly" | "student_pharm" | "faculty") => {
    if (type === "student_eng") {
      updateForm("role", "student");
      updateForm("hostelBlock", "Boys Hostel - Main Block");
      updateForm("hostelRoom", "A-204");
      updateForm("attendancePercentage", "92");
      updateForm("year", "III");
    } else if (type === "student_poly") {
      updateForm("role", "student");
      updateForm("hostelBlock", "Polytechnic Hostel Block");
      updateForm("hostelRoom", "P-105");
      updateForm("attendancePercentage", "89");
      updateForm("year", "II");
    } else if (type === "student_pharm") {
      updateForm("role", "student");
      updateForm("hostelBlock", "Pharmacy Hostel Block");
      updateForm("hostelRoom", "PH-302");
      updateForm("attendancePercentage", "94");
      updateForm("year", "IV");
    } else if (type === "faculty") {
      updateForm("role", "tutor");
      updateForm("designation", "Assistant Professor");
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Fill Templates */}
      {!isEdit && (
        <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Quick Templates:
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] bg-white border-blue-200 text-blue-800 hover:bg-blue-100"
              onClick={() => applyQuickTemplate("student_eng")}
            >
              🎓 Engineering Student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] bg-white border-blue-200 text-blue-800 hover:bg-blue-100"
              onClick={() => applyQuickTemplate("student_pharm")}
            >
              💊 Pharmacy Student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] bg-white border-blue-200 text-blue-800 hover:bg-blue-100"
              onClick={() => applyQuickTemplate("student_poly")}
            >
              🔧 Polytechnic Student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] bg-white border-blue-200 text-blue-800 hover:bg-blue-100"
              onClick={() => applyQuickTemplate("faculty")}
            >
              👨‍🏫 Faculty / Staff
            </Button>
          </div>
        </div>
      )}

      {/* Profile Photo Section */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-blue-600" /> Profile Photo & Live Preview
        </Label>
        <div className="flex items-center gap-3">
          {formData.photoUrl ? (
            <img
              src={formData.photoUrl}
              alt="Avatar Preview"
              className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 shadow-sm bg-white shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-white shrink-0">
              No Photo
            </div>
          )}
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Photo URL (e.g. /students/vimal_m.jpg or web URL)"
              value={formData.photoUrl}
              onChange={e => updateForm("photoUrl", e.target.value)}
              className="text-xs h-8"
            />
            <div className="flex gap-1 flex-wrap">
              {PRESET_PHOTOS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => updateForm("photoUrl", p.url)}
                  className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 hover:border-blue-400 rounded-md font-medium text-slate-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Identity & Credentials */}
      <div className="p-3 bg-slate-50/50 border rounded-xl space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <UserCog className="w-3.5 h-3.5 text-slate-600" /> 1. User Identity & Account
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Role *</Label>
            <Select value={formData.role} onValueChange={v => updateForm("role", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_TABS.filter(r => r.value !== "all").map(r => {
                  const Icon = r.icon;
                  return (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${r.color}`} />{r.label}</div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">Full Name *</Label>
            <Input className="mt-1" placeholder="e.g. Vimal M" value={formData.name} onChange={e => updateForm("name", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">Email Address *</Label>
            <Input className="mt-1" type="email" placeholder="e.g. vimal@jkkm.edu.in" value={formData.email} onChange={e => updateForm("email", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">{isEdit ? "Change Password" : "Password *"}</Label>
            <Input className="mt-1" type="password" placeholder={isEdit ? "Leave blank to keep unchanged" : "Set password"} value={formData.password || ""} onChange={e => updateForm("password", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-600">Phone Number</Label>
            <Input className="mt-1" placeholder="e.g. 9876543210" value={formData.phone} onChange={e => updateForm("phone", e.target.value)} />
          </div>

          {!isStudent && (
            <div>
              <Label className="text-xs font-semibold text-slate-600">Designation / Post</Label>
              <Input className="mt-1" placeholder="e.g. Assistant Professor / Head of Dept" value={formData.designation} onChange={e => updateForm("designation", e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Section 2: College & Categorized Department Selection */}
      <div className="p-3 bg-white border border-blue-100 rounded-xl space-y-3 shadow-xs">
        <div className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> 2. College & Department Selection
        </div>

        <CategorizedDepartmentSelect
          value={formData.departmentId}
          onChange={(deptId) => {
            updateForm("departmentId", deptId);
            updateForm("classId", "");
          }}
          label="College Institution & Academic Branch"
        />

        {isStudent && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Class & Year Section</Label>
              <Select value={formData.classId} onValueChange={v => updateForm("classId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Class Section" /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.year} Year - Section {c.section}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {formData.departmentId ? "No classes registered for dept" : "Choose department first"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Register Number (Barcode)</Label>
              <Input className="mt-1" placeholder="e.g. 731225ME029" value={formData.registerNumber} onChange={e => updateForm("registerNumber", e.target.value)} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Attendance Percentage (%)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 92"
                value={formData.attendancePercentage}
                onChange={e => updateForm("attendancePercentage", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Hostel Stay & Parents (If Student) */}
      {isStudent && (
        <>
          <div className="p-3 bg-slate-50/50 border rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-cyan-600" /> 3. Hostel Stay & Room
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Hostel Block</Label>
                <Input className="mt-1" placeholder="e.g. Boys Hostel - Main Block" value={formData.hostelBlock} onChange={e => updateForm("hostelBlock", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Hostel Room No.</Label>
                <Input className="mt-1" placeholder="e.g. A-204 (Bed 1)" value={formData.hostelRoom} onChange={e => updateForm("hostelRoom", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50/50 border rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> 4. Parent / Emergency Contact
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Parent / Guardian Name</Label>
                <Input className="mt-1" placeholder="Parent full name" value={formData.parentName} onChange={e => updateForm("parentName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Parent Phone (SMS Alerts)</Label>
                <Input className="mt-1" placeholder="For SMS notifications" value={formData.parentPhone} onChange={e => updateForm("parentPhone", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Parent WhatsApp</Label>
                <Input className="mt-1" placeholder="For WhatsApp notifications" value={formData.parentWhatsapp} onChange={e => updateForm("parentWhatsapp", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Home Address</Label>
                <Input className="mt-1" placeholder="Residential town / city address" value={formData.address} onChange={e => updateForm("address", e.target.value)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}