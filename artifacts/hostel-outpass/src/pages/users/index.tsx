import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useListDepartments, useListClasses } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  GraduationCap, BookOpen, Building2, Crown, Shield, ScanLine, Settings,
  Plus, Pencil, Trash2, Search, RefreshCw, Phone, Mail, Hash, Download,
  User, UserCog, Filter, AlertTriangle,
} from "lucide-react";

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

const YEARS = ["I", "II", "III", "IV"];

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
}

const emptyForm: UserFormData = {
  name: "", email: "", phone: "", role: "student", departmentId: "", classId: "",
  registerNumber: "", year: "I", hostelBlock: "", hostelRoom: "", parentPhone: "", parentName: "",
  parentWhatsapp: "", parentEmail: "", address: "", designation: "", password: "",
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
      address: u.address || "", designation: u.designation || "", password: "" 
    });
    setShowEditModal(true);
  };
  const openDelete = (u: any) => { setSelectedUser(u); setShowDeleteConfirm(true); };

  const handleAdd = () => {
    setIsSubmitting(true);
    createUserMutation.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        password: formData.password || "password",
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

  const handleEdit = () => {
    if (!selectedUser?.id) return;
    setIsSubmitting(true);
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: {
        name: formData.name,
        phone: formData.phone || undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        classId: formData.role === "student" && formData.classId ? parseInt(formData.classId, 10) : undefined,
        hostelBlock: formData.role === "student" ? (formData.hostelBlock || undefined) : undefined,
        hostelRoom: formData.role === "student" ? (formData.hostelRoom || undefined) : undefined,
        parentPhone: formData.role === "student" ? (formData.parentPhone || undefined) : undefined,
        parentName: formData.role === "student" ? (formData.parentName || undefined) : undefined,
        parentWhatsapp: formData.role === "student" ? (formData.parentWhatsapp || undefined) : undefined,
        parentEmail: formData.role === "student" ? (formData.parentEmail || undefined) : undefined,
        address: formData.role === "student" ? (formData.address || undefined) : undefined,
        designation: formData.role !== "student" ? (formData.designation || undefined) : undefined,
      }
    }, {
      onSuccess: () => {
        setIsSubmitting(false);
        setShowEditModal(false);
        toast({ title: `✅ User Updated`, description: `${formData.name}'s record has been saved.` });
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
        toast({ title: `User Removed`, description: `${selectedUser?.name} has been removed.`, variant: "destructive" });
        refetch();
      },
      onError: (err: any) => {
        setIsSubmitting(false);
        toast({ title: `❌ Error`, description: err?.message || "Failed to remove user.", variant: "destructive" });
      }
    });
  };

  const [isSeeding, setIsSeeding] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">User Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all students and staff accounts</p>
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
          { label: "Total Users", value: users.length, color: "text-slate-700" },
          { label: "Students", value: users.filter(u => u.role === "student").length, color: "text-blue-600" },
          { label: "Staff", value: users.filter(u => u.role !== "student").length, color: "text-emerald-600" },
          { label: "Filtered", value: filtered.length, color: "text-violet-600" },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <div className="glass-card rounded-xl p-4 bg-white shadow-sm border border-slate-100 text-center">
              <div className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, register number…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full md:w-44">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depList.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Role Tabs */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
        <Tabs value={roleTab} onValueChange={setRoleTab} className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <TabsList className="glass-card border-border/50 inline-flex w-auto">
              {ROLE_TABS.map(tab => {
                const Icon = tab.icon;
                const count = tab.value === "all" ? users.length : users.filter(u => u.role === tab.value).length;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs whitespace-nowrap">
                    <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                    {tab.label}
                    <span className="ml-0.5 text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">{count}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {ROLE_TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <div>
                    <h2 className="font-heading font-semibold text-slate-800">{tab.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} records</p>
                  </div>
                  <Badge variant="outline" className={`${tab.color} ${tab.border}`}>{filtered.length} users</Badge>
                </div>

                {isLoading ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" /> Loading…
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
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors group"
                        >
                          {u.photoUrl ? (
                            <img
                              src={u.photoUrl}
                              alt={u.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl ${rc.bg} border ${rc.border} flex items-center justify-center flex-shrink-0 font-bold text-sm ${rc.color}`}>
                              {u.name?.charAt(0) ?? "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-semibold text-sm text-slate-800">{u.name}</span>
                              <RoleBadge role={u.role} />
                              {u.hostelRoom && (
                                <span className="text-[10px] bg-cyan-50 border border-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">
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
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {u.registerNumber && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Hash className="w-2.5 h-2.5" />{u.registerNumber}
                                </span>
                              )}
                              {getDeptName(u.departmentId) && (
                                <span className="text-xs text-muted-foreground">{getDeptName(u.departmentId)}</span>
                              )}
                              {u.email && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-40">
                                  <Mail className="w-2.5 h-2.5 flex-shrink-0" />{u.email}
                                </span>
                              )}
                              {u.phone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="w-2.5 h-2.5" />{u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(u)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(u)}>
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

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={v => !v && setShowAddModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><Plus className="w-5 h-5 text-slate-600" /> Add New User</DialogTitle>
            <DialogDescription>Fill in the details to register a new user in the system.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))} />
          <div className="flex gap-2 pt-2">
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
            <DialogDescription>Update the user's information in the directory.</DialogDescription>
          </DialogHeader>
          <UserForm formData={formData} updateForm={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))} isEdit />
          <div className="flex gap-2 pt-2">
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
            Are you sure you want to remove <strong>{selectedUser?.name}</strong>? This action cannot be undone.
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
  const { data: departments = [] } = useListDepartments();
  const { data: classes = [] } = useListClasses();
  const depList = departments as any[];
  const clsList = classes as any[];

  const filteredClasses = formData.departmentId
    ? clsList.filter((c: any) => c.departmentId === parseInt(formData.departmentId, 10))
    : [];

  const isStudent = formData.role === "student";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2 md:col-span-1">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Role *</Label>
          <Select value={formData.role} onValueChange={v => updateForm("role", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
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
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name *</Label>
          <Input className="mt-1.5" placeholder="e.g. Rajan Kumar" value={formData.name} onChange={e => updateForm("name", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email Address *</Label>
          <Input className="mt-1.5" type="email" placeholder="e.g. rajan@jkkm.edu.in" value={formData.email} onChange={e => updateForm("email", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{isEdit ? "New Password" : "Password *"}</Label>
          <Input className="mt-1.5" type="password" placeholder={isEdit ? "Leave blank to keep unchanged" : "Set user password"} value={formData.password || ""} onChange={e => updateForm("password", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone Number</Label>
          <Input className="mt-1.5" placeholder="e.g. 9876543210" value={formData.phone} onChange={e => updateForm("phone", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</Label>
          <Select value={formData.departmentId} onValueChange={v => { updateForm("departmentId", v); updateForm("classId", ""); }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Department" /></SelectTrigger>
            <SelectContent>
              {depList.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isStudent ? (
          <>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Class</Label>
              <Select value={formData.classId} onValueChange={v => updateForm("classId", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.year} Year Section {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Register Number</Label>
              <Input className="mt-1.5" placeholder="e.g. 22CSE001" value={formData.registerNumber} onChange={e => updateForm("registerNumber", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hostel Block</Label>
              <Input className="mt-1.5" placeholder="e.g. A Block" value={formData.hostelBlock} onChange={e => updateForm("hostelBlock", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Hostel Room</Label>
              <Input className="mt-1.5" placeholder="e.g. 204" value={formData.hostelRoom} onChange={e => updateForm("hostelRoom", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Parent / Guardian Name</Label>
              <Input className="mt-1.5" placeholder="Parent/Guardian full name" value={formData.parentName} onChange={e => updateForm("parentName", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Parent / Guardian Phone (SMS)</Label>
              <Input className="mt-1.5" placeholder="For SMS notifications" value={formData.parentPhone} onChange={e => updateForm("parentPhone", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Parent WhatsApp</Label>
              <Input className="mt-1.5" placeholder="For WhatsApp notifications" value={formData.parentWhatsapp} onChange={e => updateForm("parentWhatsapp", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Parent Email (Optional)</Label>
              <Input className="mt-1.5" type="email" placeholder="For email notifications" value={formData.parentEmail} onChange={e => updateForm("parentEmail", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Home Address</Label>
              <Input className="mt-1.5" placeholder="Full residential address" value={formData.address} onChange={e => updateForm("address", e.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Designation</Label>
            <Input className="mt-1.5" placeholder="e.g. Assistant Professor" value={formData.designation} onChange={e => updateForm("designation", e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}