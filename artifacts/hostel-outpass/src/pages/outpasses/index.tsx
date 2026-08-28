import { useState } from "react";
import { useListOutpasses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { QrCode, Clock, MapPin, Search, Filter, RefreshCw, Trash2, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OutpassesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: outpasses = [], isLoading, refetch } = useListOutpasses(
    user?.role === "student" ? { studentId: user.id } : {}
  );

  const filtered = (outpasses as any[]).filter(o => {
    const q = search.toLowerCase();
    const studentName = o.student?.name?.toLowerCase() || "";
    const regNo = o.student?.registerNumber?.toLowerCase() || "";
    const code = o.outpassCode?.toLowerCase() || "";
    const gatePassNo = o.gatePassNumber?.toLowerCase() || "";
    const matchSearch = !q || studentName.includes(q) || regNo.includes(q) || code.includes(q) || gatePassNo.includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleUpdateStatus = async (outpassId: number, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/outpasses/${outpassId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "verified" ? { exitTime: new Date().toISOString() } : {}),
          ...(status === "returned" ? { returnTime: new Date().toISOString() } : {}),
        })
      });
      if (res.ok) {
        toast({ title: `✅ Status: ${status.toUpperCase()}`, description: `Outpass marked as ${status}.` });
        refetch();
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteOutpass = async (outpassId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Permanently delete this Gate Pass?")) return;
    try {
      const res = await fetch(`/api/outpasses/${outpassId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "🗑️ Pass Deleted", description: "Outpass removed." });
        refetch();
      }
    } catch (err: any) {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Gate Security & Passes</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading text-slate-800">Digital Gate Passes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time QR barcode verification, active student exit tracking & master gate pass controls.</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-10 h-10 bg-white"
            placeholder="Search by student name, register number, gate pass code..."
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
            <SelectItem value="all">All Gate Passes ({outpasses.length})</SelectItem>
            <SelectItem value="verified">🟢 Verified / Outside</SelectItem>
            <SelectItem value="generated">🟡 Generated / Ready</SelectItem>
            <SelectItem value="returned">🔵 Returned / Inside</SelectItem>
            <SelectItem value="cancelled">🔴 Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center p-12 bg-white">
          <p className="text-muted-foreground font-medium">No digital outpasses found matching criteria.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((outpass: any) => (
            <Link key={outpass.id} href={`/outpasses/${outpass.id}`}>
              <Card className="hover:shadow-lg cursor-pointer transition-all duration-200 h-full flex flex-col justify-between overflow-hidden bg-white border-slate-200 group">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 bg-slate-50/70 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-base font-mono font-bold tracking-wider text-slate-900">
                      {outpass.gatePassNumber || outpass.outpassCode}
                    </CardTitle>
                    <div className="text-[11px] text-muted-foreground font-mono">Code: {outpass.outpassCode}</div>
                  </div>
                  <Badge className={
                    outpass.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    outpass.status === 'returned' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    outpass.status === 'generated' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-rose-100 text-rose-800 border-rose-200'
                  }>
                    {outpass.status === 'verified' ? 'Active / Outside' : outpass.status}
                  </Badge>
                </CardHeader>

                <CardContent className="text-xs space-y-3 pt-3 flex-1 flex flex-col justify-between">
                  {outpass.student && (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <img
                        src={outpass.student.photoUrl || "/students/vimal_m.jpg"}
                        alt={outpass.student.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-900 truncate">{outpass.student.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          {outpass.student.registerNumber || "STU-REG"} · Room {outpass.student.hostelRoom || "A-101"}
                        </div>
                      </div>
                    </div>
                  )}

                  {outpass.leave && (
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate text-slate-800 font-medium">{outpass.leave.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Valid till: {format(new Date(outpass.leave.toDate), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 group-hover:border-blue-300 transition-colors">
                    <QrCode className="w-6 h-6 text-blue-600 opacity-80" />
                    <span className="ml-2 text-xs font-mono font-medium text-slate-700">Click to View QR Gate Pass</span>
                  </div>

                  {/* Super Admin Control Actions */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between pt-2 border-t gap-1.5" onClick={e => e.stopPropagation()}>
                      {outpass.status !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex-1"
                          onClick={(e) => handleUpdateStatus(outpass.id, "verified", e)}
                        >
                          Mark Exit
                        </Button>
                      )}
                      {outpass.status === "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex-1"
                          onClick={(e) => handleUpdateStatus(outpass.id, "returned", e)}
                        >
                          Mark Returned
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 px-2"
                        onClick={(e) => handleDeleteOutpass(outpass.id, e)}
                        title="Delete Pass"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}