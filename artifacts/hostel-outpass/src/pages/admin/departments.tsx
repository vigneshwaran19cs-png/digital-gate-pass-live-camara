import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListDepartments, useCreateDepartment, useDeleteDepartment,
  useListUsers, getListDepartmentsQueryKey, getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Search, RefreshCw, Hash, Users, UserCog } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

export default function AdminDepartmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [formData, setFormData] = useState({ code: "", name: "", hodId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: departments = [] } = useListDepartments();
  const { data: users = [] } = useListUsers();
  const allUsers = users as any[];
  const hods = allUsers.filter((u: any) => u.role === "hod");
  const students = allUsers.filter((u: any) => u.role === "student");

  const filtered = (departments as any[]).filter((d: any) => {
    const q = search.toLowerCase();
    return !q || d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
  });

  const getDeptStudentCount = (deptId: number) =>
    students.filter((s: any) => s.departmentId === deptId).length;

  const openAdd = () => {
    setFormData({ code: "", name: "", hodId: "" });
    setShowAddModal(true);
  };

  const openEdit = (d: any) => {
    setSelectedDept(d);
    setFormData({ code: d.code || "", name: d.name || "", hodId: d.hodId?.toString() || "" });
    setShowEditModal(true);
  };

  const openDelete = (d: any) => {
    setSelectedDept(d);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (isEdit = false) => {
    if (!formData.code || !formData.name) {
      toast({ title: "Code and Name are required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: any = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        hodId: formData.hodId ? parseInt(formData.hodId, 10) : null,
      };
      if (isEdit && selectedDept) {
        await customFetch(`/api/departments/${selectedDept.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ title: "Department updated" });
      } else {
        await customFetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ title: "Department created" });
      }
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Operation failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/departments/${selectedDept.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast({ title: "Department deleted" });
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Delete failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const DeptForm = ({ edit = false }: { edit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <Label>Department Code *</Label>
        <Input className="mt-1.5" placeholder="e.g. CYBER" value={formData.code}
          onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
      </div>
      <div>
        <Label>Department Name *</Label>
        <Input className="mt-1.5" placeholder="e.g. CYBER SECURITY" value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div>
        <Label>Assigned HOD</Label>
        <Select value={formData.hodId} onValueChange={v => setFormData(p => ({ ...p, hodId: v }))}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select HOD" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">— None —</SelectItem>
            {hods.map((h: any) => (
              <SelectItem key={h.id} value={h.id.toString()}>{h.name} ({h.email})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">Super Admin</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage academic departments, assign HODs</p>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Department
        </Button>
      </motion.div>

      <div className="glass-card rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search departments…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dept: any, i: number) => (
          <motion.div key={dept.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <div className="glass-card rounded-2xl p-5 bg-white shadow-sm border border-slate-100 group hover:border-violet-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(dept)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(dept)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="font-heading font-semibold text-slate-800">{dept.name}</h3>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">{dept.code}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <div className="text-lg font-bold text-blue-600">{getDeptStudentCount(dept.id)}</div>
                  <div className="text-[10px] text-blue-600/70">Students</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
                  <div className="text-lg font-bold text-amber-600">
                    {dept.hodId ? allUsers.find((u: any) => u.id === dept.hodId)?.name?.split(" ")[0] || "HOD Set" : "—"}
                  </div>
                  <div className="text-[10px] text-amber-600/70">HOD</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={showAddModal} onOpenChange={v => !v && setShowAddModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New Department</DialogTitle>
            <DialogDescription>Create a new academic department.</DialogDescription>
          </DialogHeader>
          <DeptForm />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Department"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={v => !v && setShowEditModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Department</DialogTitle>
            <DialogDescription>Update department information and HOD assignment.</DialogDescription>
          </DialogHeader>
          <DeptForm edit />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={v => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-rose-700">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-800">
            Are you sure you want to delete <strong>{selectedDept?.name}</strong> ({selectedDept?.code})? This may affect users assigned to this department.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting…" : "Delete Department"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
