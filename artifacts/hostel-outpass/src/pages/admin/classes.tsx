import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListDepartments, useListClasses, useCreateClass, useDeleteClass,
  useListUsers, getListDepartmentsQueryKey, getListClassesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2, Search, RefreshCw, Users, GraduationCap } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

const YEARS = ["I", "II", "III", "IV"];
const SECTIONS = ["A", "B"];

export default function AdminClassesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [formData, setFormData] = useState({ departmentId: "", year: "I", section: "A", tutorId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: departments = [] } = useListDepartments();
  const { data: classes = [] } = useListClasses();
  const { data: users = [] } = useListUsers();
  const allUsers = users as any[];
  const tutors = allUsers.filter((u: any) => u.role === "tutor");
  const students = allUsers.filter((u: any) => u.role === "student");

  const filtered = (classes as any[]).filter((c: any) => {
    const q = search.toLowerCase();
    const matchDept = deptFilter === "all" || c.departmentId === parseInt(deptFilter, 10);
    const matchSearch = !q ||
      c.year?.toLowerCase().includes(q) ||
      c.section?.toLowerCase().includes(q);
    return matchDept && matchSearch;
  });

  const getDeptName = (deptId: number) =>
    (departments as any[]).find((d: any) => d.id === deptId)?.name || `Dept #${deptId}`;

  const getTutorName = (tutorId: number | null) => {
    if (!tutorId) return "—";
    return tutors.find((t: any) => t.id === tutorId)?.name || `User #${tutorId}`;
  };

  const getClassStudentCount = (classId: number) =>
    students.filter((s: any) => s.classId === classId).length;

  const openAdd = () => {
    setFormData({ departmentId: deptFilter !== "all" ? deptFilter : "", year: "I", section: "A", tutorId: "" });
    setShowAddModal(true);
  };

  const openEdit = (c: any) => {
    setSelectedClass(c);
    setFormData({
      departmentId: c.departmentId?.toString() || "",
      year: c.year || "I",
      section: c.section || "A",
      tutorId: c.tutorId?.toString() || "",
    });
    setShowEditModal(true);
  };

  const openDelete = (c: any) => {
    setSelectedClass(c);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (isEdit = false) => {
    if (!formData.departmentId) {
      toast({ title: "Department is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: any = {
        departmentId: parseInt(formData.departmentId, 10),
        year: formData.year,
        section: formData.section,
        tutorId: formData.tutorId ? parseInt(formData.tutorId, 10) : null,
      };
      if (isEdit && selectedClass) {
        const token = localStorage.getItem("auth_token");
        await fetch(`/api/classes/${selectedClass.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        toast({ title: "Class updated" });
      } else {
        const token = localStorage.getItem("auth_token");
        await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        toast({ title: "Class created" });
      }
      queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Operation failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`/api/classes/${selectedClass.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast({ title: "Class deleted" });
      queryClient.invalidateQueries({ queryKey: getListClassesQueryKey() });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Delete failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ClassForm = ({ edit = false }: { edit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <Label>Department *</Label>
        <Select value={formData.departmentId} onValueChange={v => setFormData(p => ({ ...p, departmentId: v }))}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Department" /></SelectTrigger>
          <SelectContent>
            {(departments as any[]).map((d: any) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Year *</Label>
          <Select value={formData.year} onValueChange={v => setFormData(p => ({ ...p, year: v }))}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={y}>{y} Year</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={formData.section} onValueChange={v => setFormData(p => ({ ...p, section: v }))}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Assigned Tutor</Label>
        <Select value={formData.tutorId} onValueChange={v => setFormData(p => ({ ...p, tutorId: v }))}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Tutor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">— None —</SelectItem>
            {tutors.map((t: any) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.email})</SelectItem>
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
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Super Admin</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Classes</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage class sections, assign tutors</p>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Class
        </Button>
      </motion.div>

      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search classes…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments as any[]).map((d: any) => (
              <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls: any, i: number) => (
          <motion.div key={cls.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <div className="glass-card rounded-2xl p-5 bg-white shadow-sm border border-slate-100 group hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEdit(cls)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-rose-50 hover:text-rose-700" onClick={() => openDelete(cls)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="font-heading font-semibold text-slate-800">
                {cls.year} Year — Section {cls.section}
              </h3>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                  {getDeptName(cls.departmentId)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <div className="text-lg font-bold text-blue-600">{getClassStudentCount(cls.id)}</div>
                  <div className="text-[10px] text-blue-600/70">Students</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
                  <div className="text-sm font-bold text-amber-700 truncate" title={getTutorName(cls.tutorId)}>
                    {getTutorName(cls.tutorId)}
                  </div>
                  <div className="text-[10px] text-amber-600/70">Tutor</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={showAddModal} onOpenChange={v => !v && setShowAddModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New Class</DialogTitle>
            <DialogDescription>Create a new class section under a department.</DialogDescription>
          </DialogHeader>
          <ClassForm />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Class"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={v => !v && setShowEditModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Class</DialogTitle>
            <DialogDescription>Update class section and tutor assignment.</DialogDescription>
          </DialogHeader>
          <ClassForm edit />
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
            Are you sure you want to delete <strong>{selectedClass?.year} Year Section {selectedClass?.section}</strong>? This may affect students assigned to this class.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting…" : "Delete Class"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
