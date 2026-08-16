import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowLeft, Filter, Search, CheckSquare, Layers } from "lucide-react";
import { useListLeaves, useBulkApproveLeaves, getListLeavesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BulkApprovePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leavesData } = useListLeaves();
  const bulkApprove = useBulkApproveLeaves();

  const leaves = (leavesData as any[]) || [];
  const pendingLeaves = leaves.filter((l: any) => l.status === "pending" || l.status === "warden_approved" || l.status === "tutor_approved" || l.status === "hod_approved");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = pendingLeaves.filter((l: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.student?.name ?? "").toLowerCase().includes(q) || (l.destination ?? "").toLowerCase().includes(q);
    const matchCategory = categoryFilter === "all" || l.leaveType === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((l: any) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExecuteBulkAction = (action: "approve" | "reject") => {
    if (selectedIds.length === 0) return;

    bulkApprove.mutate(
      {
        data: {
          leaveIds: selectedIds,
          action,
          remarks: `Bulk ${action}d via Staff Batch Approval Portal`,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `✅ Bulk ${action === "approve" ? "Approved" : "Rejected"}`,
            description: `Successfully processed ${selectedIds.length} leave requests.`,
          });
          queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey() });
          setSelectedIds([]);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "Failed bulk action", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Batch Processing Tool</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Bulk Leave Approval Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Select multiple pending student leave applications and approve or reject in batch</p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button onClick={() => handleExecuteBulkAction("approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <CheckCircle2 className="w-4 h-4" /> Bulk Approve ({selectedIds.length})
            </Button>
            <Button onClick={() => handleExecuteBulkAction("reject")} variant="destructive" className="gap-2">
              <XCircle className="w-4 h-4" /> Bulk Reject ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by student name, register number or destination..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-56">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Leave Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Categories</SelectItem>
                <SelectItem value="family_emergency">Emergency Leave</SelectItem>
                <SelectItem value="medical_leave">Medical Leave</SelectItem>
                <SelectItem value="hair_cut">Outing / Haircut</SelectItem>
                <SelectItem value="semester_holiday">Semester Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onCheckedChange={(c) => handleSelectAll(Boolean(c))}
                    />
                  </th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length > 0 ? (
                  filtered.map((l: any) => {
                    const isSelected = selectedIds.includes(l.id);
                    return (
                      <tr key={l.id} className={isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/50"}>
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(l.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{l.student?.name || "Student"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{l.student?.registerNumber || `STU00${l.studentId}`}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs capitalize">{l.leaveType?.replace("_", " ")}</Badge>
                        </td>
                        <td className="p-3 font-medium">{l.destination}</td>
                        <td className="p-3 text-xs text-muted-foreground">{l.fromDate} → {l.toDate}</td>
                        <td className="p-3">
                          <Badge className={l.riskLevel === "high" ? "bg-rose-100 text-rose-800" : l.riskLevel === "medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                            {l.riskLevel?.toUpperCase() || "LOW"} ({l.riskScore || 15}/100)
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="secondary" className="capitalize">{l.status?.replace("_", " ")}</Badge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No pending leave applications match the current search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
