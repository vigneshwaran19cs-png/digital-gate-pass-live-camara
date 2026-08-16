import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, useGetHostelOccupancy, getGetHostelOccupancyQueryKey, useListLeaves, getListLeavesQueryKey, useCreateUser, useUpdateUser, useDeleteUser, useListDepartments, useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings, Users, GraduationCap, BookOpen, Building2, Crown, Shield,
  ScanLine, Plus, Pencil, Trash2, Search, RefreshCw, CheckCircle2,
  Database, BarChart3, ChevronRight, Building, Hash, Phone, Mail,
  UserCog, AlertTriangle, X,
} from "lucide-react";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

const ROLE_OPTIONS = [
  { value: "student", label: "Student", icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { value: "tutor", label: "Tutor", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  { value: "hod", label: "Head of Dept (HOD)", icon: Building2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  { value: "principal", label: "Principal", icon: Crown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  { value: "warden", label: "Warden", icon: Shield, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
  { value: "security", label: "Security Staff", icon: ScanLine, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
  { value: "super_admin", label: "Super Admin", icon: Settings, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function getRoleConf(role: string) {
  return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0];
}

function RoleBadge({ role }: { role: string }) {
  const conf = getRoleConf(role);
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border ${conf.bg} ${conf.color} ${conf.border}`}>
      <Icon className="w-3 h-3" />{conf.label}
    </span>
  );
}




interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  departmentId: string;
  classId: string;
  registerNumber: string;
  year: string;
  hostelRoom: string;
  parentPhone: string;
  parentName: string;
  password?: string;
}

const emptyForm: UserFormData = {
  name: "", email: "", phone: "", role: "student", departmentId: "", classId: "",
  registerNumber: "", year: "1st Year", hostelRoom: "", parentPhone: "", parentName: "",
  password: "",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [activeTab, setActiveTab] = useState("students");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [confirmClearText, setConfirmClearText] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const { data: usersRaw = [], isLoading, refetch: refetchUsers } = useListUsers();
  const users = usersRaw as any[];

  const { data: departmentsRaw = [] } = useListDepartments();
  const { data: classesRaw = [] } = useListClasses();
  const depList = departmentsRaw as any[];
  const clsList = classesRaw as any[];

  const { data: occupancyData, refetch: refetchOccupancy } = useGetHostelOccupancy({ query: { queryKey: getGetHostelOccupancyQueryKey() } });
  const { data: allLeavesData, refetch: refetchLeaves } = useListLeaves({}, { query: { queryKey: getListLeavesQueryKey({}) } });

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const refetch = () => {
    refetchUsers();
    refetchOccupancy();
    refetchLeaves();
  };

  const students = users.filter(u => u.role === "student");
  const staff = users.filter(u => u.role !== "student");
  const tutors = users.filter(u => u.role === "tutor");
  const wardens = users.filter(u => u.role === "warden");
  const hods = users.filter(u => u.role === "hod");

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.registerNumber?.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchDept = deptFilter === "all" || u.departmentId === parseInt(deptFilter, 10);
    return matchSearch && matchRole && matchDept;
  });

  const filteredStudents = filteredUsers.filter(u => u.role === "student");
  const filteredStaff = filteredUsers.filter(u => u.role !== "student");

  const occupancy = occupancyData as any;
  const allLeaves = (allLeavesData as any)?.leaves ?? [];

  const getDeptName = (deptId: number | null | undefined) => depList.find((d: any) => d.id === deptId)?.name || "";

  const DEPT_STATS = depList.map((dept, i) => {
    const deptUsers = users.filter(u => u.departmentId === dept.id);
    const deptStudents = deptUsers.filter(u => u.role === "student");
    const deptStaff = deptUsers.filter(u => u.role !== "student");
    const deptLeaves = allLeaves.filter((l: any) => (l.student?.departmentId ?? l.departmentId) === dept.id);
    
    const colors = [
      "from-blue-500 to-indigo-500",
      "from-violet-500 to-purple-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-teal-500",
      "from-cyan-500 to-blue-500",
      "from-rose-500 to-pink-500",
      "from-slate-500 to-slate-600"
    ];

    return {
      id: dept.id,
      name: dept.name,
      students: deptStudents.length,
      staff: deptStaff.length,
      leaves: deptLeaves.length,
      color: colors[i % colors.length]
    };
  });

  const totalBeds = occupancy?.totalCapacity ?? 250;
  const currentlyPresent = occupancy?.currentlyPresent ?? students.length;
  const capacityStr = `${currentlyPresent} / ${totalBeds}`;

  const summaryStats = [
    { label: "Total Students", value: students.length, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Total Staff", value: staff.length, icon: UserCog, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Departments", value: DEPT_STATS.length, icon: Building2, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    { label: "Hostel Capacity", value: capacityStr, icon: Building, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  ];

  const openAdd = () => { setFormData(emptyForm); setShowAddModal(true); };
  const openEdit = (u: any) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "student",
      departmentId: u.departmentId?.toString() || "",
      classId: u.classId?.toString() || "",
      registerNumber: u.registerNumber || "",
      year: u.year || "1st Year",
      hostelRoom: u.hostelRoom || "",
      parentPhone: u.parentPhone || "",
      parentName: u.parentName || "",
      password: ""
    });
    setShowEditModal(true);
  };
  const openDelete = (u: any) => { setSelectedUser(u); setShowDeleteConfirm(true); };

  const handleAddSubmit = () => {
    setIsSubmitting(true);
    createUserMutation.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        password: formData.password || "password",
        role: formData.role as any,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        classId: formData.classId ? parseInt(formData.classId, 10) : undefined,
        registerNumber: formData.registerNumber || undefined,
        hostelRoom: formData.hostelRoom || undefined,
        phone: formData.phone || undefined,
        parentPhone: formData.parentPhone || undefined,
        parentName: formData.parentName || undefined,
      }
    }, {
      onSuccess: () => {
        setIsSubmitting(false);
        setShowAddModal(false);
        toast({ title: `✅ User Created`, description: `${formData.name} (${formData.role}) has been added to the system.` });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to create user.", variant: "destructive" });
      }
    });
  };

  const handleEditSubmit = () => {
    if (!selectedUser?.id) return;
    setIsSubmitting(true);
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: {
        name: formData.name,
        phone: formData.phone || undefined,
        parentPhone: formData.parentPhone || undefined,
        parentName: formData.parentName || undefined,
        hostelRoom: formData.hostelRoom || undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        classId: formData.classId ? parseInt(formData.classId, 10) : undefined,
      }
    }, {
      onSuccess: () => {
        setIsSubmitting(false);
        setShowEditModal(false);
        toast({ title: `✅ User Updated`, description: `${formData.name}'s information has been updated.` });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to update user.", variant: "destructive" });
      }
    });
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
        toast({ title: `User Removed`, description: `${selectedUser?.name} has been removed from the system.`, variant: "destructive" });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to remove user.", variant: "destructive" });
      }
    });
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/system/clear-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Failed to clear history");
      }

      toast({ 
        title: "✅ History Cleared", 
        description: "All leaves, outpasses, and notifications have been permanently cleared." 
      });
      setShowClearHistoryConfirm(false);
      setConfirmClearText("");
      refetch();
    } catch (err: any) {
      toast({ 
        title: "❌ Error", 
        description: err?.message || "Failed to clear history.", 
        variant: "destructive" 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const updateForm = (field: keyof UserFormData, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Settings className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Super Admin Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">System Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage students, staff, departments, and system configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 hidden md:flex">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white gap-2" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <div className={`glass-card rounded-2xl p-5 border ${s.border} bg-white shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className={`text-2xl font-heading font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, register number…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depList.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Main Tabs */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass-card border-border/50">
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div>
                  <h2 className="font-heading font-semibold text-slate-800">Student Directory</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">All registered hostel students</p>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">{filteredStudents.length} students</Badge>
              </div>
              {isLoading ? (
                <div className="p-12 text-center text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading…</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                  <p className="text-muted-foreground">No students found.</p>
                  <Button size="sm" className="mt-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Student</Button>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredStudents.map((u: any, i: number) => (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-700 text-sm">
                        {u.name?.charAt(0) ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{u.name}</span>
                          {getDeptName(u.departmentId) && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{getDeptName(u.departmentId)}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {u.registerNumber && <span className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="w-2.5 h-2.5" />{u.registerNumber}</span>}
                          {u.email && <span className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-2.5 h-2.5" />{u.email}</span>}
                          {u.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{u.phone}</span>}
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-2">
                        {u.hostelRoom && <span className="text-xs bg-cyan-50 border border-cyan-100 text-cyan-700 px-2 py-0.5 rounded-lg font-medium">Room {u.hostelRoom}</span>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div>
                  <h2 className="font-heading font-semibold text-slate-800">Staff Directory</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Tutors, HODs, Wardens, Security & Principals</p>
                </div>
                <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">{filteredStaff.length} staff</Badge>
              </div>
              {filteredStaff.length === 0 ? (
                <div className="p-12 text-center">
                  <UserCog className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                  <p className="text-muted-foreground">No staff found.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredStaff.map((u: any, i: number) => (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                      <div className={`w-10 h-10 rounded-xl ${getRoleConf(u.role).bg} border ${getRoleConf(u.role).border} flex items-center justify-center flex-shrink-0 font-bold text-sm ${getRoleConf(u.role).color}`}>
                        {u.name?.charAt(0) ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-slate-800">{u.name}</span>
                          <RoleBadge role={u.role} />
                        </div>
                        <div className="flex items-center gap-3">
                          {getDeptName(u.departmentId) && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{getDeptName(u.departmentId)}</span>}
                          {u.email && <span className="text-xs text-muted-foreground truncate max-w-48">{u.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEPT_STATS.map((dept, i) => (
                <motion.div key={dept.name} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <div className="glass-card rounded-2xl p-5 bg-white shadow-sm border border-slate-100 group hover:border-slate-200 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-sm text-slate-800">{dept.name}</h3>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{dept.students}</div>
                            <div className="text-[10px] text-muted-foreground">Students</div>
                          </div>
                          <div className="text-center border-x border-slate-100">
                            <div className="text-lg font-bold text-emerald-600">{dept.staff}</div>
                            <div className="text-[10px] text-muted-foreground">Staff</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-amber-600">{dept.leaves}</div>
                            <div className="text-[10px] text-muted-foreground">Leaves</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* HOD/Tutor per department */}
            <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="font-heading font-semibold text-slate-800">Department Staff Assignment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">HODs and Tutors assigned per department</p>
              </div>
              <div className="divide-y divide-border/30">
                {DEPT_STATS.map(dept => {
                  const deptHod = hods.find((h: any) => h.departmentId === dept.id);
                  const deptTutors = tutors.filter((t: any) => t.departmentId === dept.id);
                  return (
                    <div key={dept.name} className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-slate-800">{dept.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {deptHod ? (
                          <span className="text-xs bg-violet-50 border border-violet-100 text-violet-700 px-2 py-1 rounded-lg">
                            HOD: {deptHod.name}
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-50 border border-slate-100 text-slate-400 px-2 py-1 rounded-lg">No HOD assigned</span>
                        )}
                        {deptTutors.length > 0 ? deptTutors.map((t: any) => (
                          <span key={t.id} className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                            Tutor: {t.name}
                          </span>
                        )) : (
                          <span className="text-xs bg-slate-50 border border-slate-100 text-slate-400 px-2 py-1 rounded-lg">No tutors assigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Academic Settings */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
                <h3 className="font-heading font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" /> Academic Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Academic Year</Label>
                    <Select defaultValue="2025-2026">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-2026">2025–2026</SelectItem>
                        <SelectItem value="2024-2025">2024–2025</SelectItem>
                        <SelectItem value="2023-2024">2023–2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hostel Capacity (total beds)</Label>
                    <Input defaultValue="250" className="mt-1.5" type="number" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Outing Pass Return Time</Label>
                    <Select defaultValue="1800">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1700">5:00 PM</SelectItem>
                        <SelectItem value="1800">6:00 PM</SelectItem>
                        <SelectItem value="1900">7:00 PM</SelectItem>
                        <SelectItem value="2000">8:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast({ title: "Settings Saved ✓", description: "Academic configuration updated." })}>
                    Save Configuration
                  </Button>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
                <h3 className="font-heading font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> Notification Configuration
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "SMS to Parent on Leave Applied", enabled: true },
                    { label: "SMS to Parent on Leave Approved", enabled: true },
                    { label: "SMS to Parent on Student Exit", enabled: true },
                    { label: "SMS to Parent on Student Return", enabled: true },
                    { label: "Late Return Alert to Warden", enabled: true },
                    { label: "Email to HOD on Bulk Leave", enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => toast({ title: "Notification Settings Saved ✓" })}>
                    Save Notification Settings
                  </Button>
                </div>
              </div>

              {/* Database Maintenance */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm border border-rose-100 md:col-span-2">
                <h3 className="font-heading font-semibold text-rose-800 mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-600" /> Database Maintenance
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Permanently clear all historical data including leave requests, formal application letters, digital outpasses, and system notifications. This action is irreversible.
                </p>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl mb-4 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>⚠️ WARNING:</strong> Clearing the history will truncate the `leaves`, `outpasses`, and `notifications` tables. Student and staff accounts will remain intact, but all pass history and generated letters will be permanently deleted.
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                  onClick={() => setShowClearHistoryConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" /> Clear All History & Letters
                </Button>
              </div>
            </div>

            {/* System Info */}
            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <h3 className="font-heading font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" /> System Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "System Version", value: "v2.0.0" },
                  { label: "Database", value: "MySQL 8.0" },
                  { label: "Last Backup", value: "Today 3:00 AM" },
                  { label: "Uptime", value: "99.9%" },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-sm font-semibold text-slate-800">{item.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={v => !v && setShowAddModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New User</DialogTitle>
            <DialogDescription>Fill in the details to register a new student or staff member.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={updateForm} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white" onClick={handleAddSubmit} disabled={isSubmitting || !formData.name || !formData.email}>
              {isSubmitting ? "Creating…" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={v => !v && setShowEditModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit User — {selectedUser?.name}</DialogTitle>
            <DialogDescription>Update the user's information in the system.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={updateForm} isEdit />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={v => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-800">
            Are you sure you want to remove <strong>{selectedUser?.name}</strong> from the system? This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Removing…" : "Yes, Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearHistoryConfirm} onOpenChange={v => { if (!v) { setShowClearHistoryConfirm(false); setConfirmClearText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Irreversible Action
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all leave history, outpasses, and notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-800 space-y-3">
            <p>
              Are you absolutely sure you want to clear the entire system history? This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>All Leave Requests & Categories</li>
              <li>All Generated Formal Leave Letters</li>
              <li>All Digital Outpass Codes & Exit/Return Times</li>
              <li>All Activity Feed & Notifications logs</li>
            </ul>
            <p className="font-semibold text-xs mt-2">
              Type <span className="font-mono text-rose-950 bg-rose-200/50 px-1 py-0.5 rounded font-bold">CLEAR HISTORY</span> below to confirm:
            </p>
            <Input 
              placeholder="CLEAR HISTORY" 
              value={confirmClearText} 
              onChange={e => setConfirmClearText(e.target.value)}
              className="bg-white border-rose-200 focus-visible:ring-rose-500 text-slate-800 mt-1.5"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowClearHistoryConfirm(false); setConfirmClearText(""); }}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" 
              onClick={handleClearHistory} 
              disabled={confirmClearText !== "CLEAR HISTORY" || isClearing}
            >
              {isClearing ? "Clearing..." : "Permanently Clear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ formData, updateForm, isEdit = false }: { formData: UserFormData; updateForm: (field: keyof UserFormData, value: string) => void; isEdit?: boolean }) {
  const { data: departmentsRaw = [] } = useListDepartments();
  const { data: classesRaw = [] } = useListClasses();
  const depList = departmentsRaw as any[];
  const clsList = classesRaw as any[];
  const filteredClasses = formData.departmentId ? clsList.filter(c => c.departmentId === parseInt(formData.departmentId, 10)) : [];

  const isStudent = formData.role === "student";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Role *</Label>
          <Select value={formData.role} onValueChange={v => updateForm("role", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(r => {
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
          <Label>Full Name *</Label>
          <Input className="mt-1.5" placeholder="e.g. Rajan Kumar" value={formData.name} onChange={e => updateForm("name", e.target.value)} />
        </div>
        <div>
          <Label>Email *</Label>
          <Input className="mt-1.5" type="email" placeholder="e.g. rajan@jkkm.edu.in" value={formData.email} onChange={e => updateForm("email", e.target.value)} />
        </div>
        <div>
          <Label>{isEdit ? "New Password" : "Password *"}</Label>
          <Input className="mt-1.5" type="password" placeholder={isEdit ? "Leave blank to keep unchanged" : "Set user password"} value={formData.password || ""} onChange={e => updateForm("password", e.target.value)} />
        </div>
        <div>
          <Label>Phone Number</Label>
          <Input className="mt-1.5" placeholder="e.g. 9876543210" value={formData.phone} onChange={e => updateForm("phone", e.target.value)} />
        </div>
        <div>
          <Label>Department</Label>
          <Select value={formData.departmentId} onValueChange={v => { updateForm("departmentId", v); updateForm("classId", ""); }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Dept." /></SelectTrigger>
            <SelectContent>
              {depList.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isStudent && (
          <>
            <div>
              <Label>Class</Label>
              <Select value={formData.classId} onValueChange={v => updateForm("classId", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.year} Year - Sec {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Register Number</Label>
              <Input className="mt-1.5" placeholder="e.g. 22CSE001" value={formData.registerNumber} onChange={e => updateForm("registerNumber", e.target.value)} />
            </div>
            <div>
              <Label>Hostel Room</Label>
              <Input className="mt-1.5" placeholder="e.g. A-204" value={formData.hostelRoom} onChange={e => updateForm("hostelRoom", e.target.value)} />
            </div>
            <div>
              <Label>Parent Name</Label>
              <Input className="mt-1.5" placeholder="Parent/Guardian name" value={formData.parentName} onChange={e => updateForm("parentName", e.target.value)} />
            </div>
            <div>
              <Label>Parent Phone</Label>
              <Input className="mt-1.5" placeholder="Parent/Guardian phone" value={formData.parentPhone} onChange={e => updateForm("parentPhone", e.target.value)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
