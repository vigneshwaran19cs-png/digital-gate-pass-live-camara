import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetDashboardStats, useGetStudentsOutside, useGetActivityFeed,
  useGetHostelOccupancy, useGetMonthlyReport, useListLeaves,
  getGetStudentsOutsideQueryKey, getGetActivityFeedQueryKey,
  getGetHostelOccupancyQueryKey, getGetMonthlyReportQueryKey,
  getListLeavesQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  BarChart3, TrendingUp, Users, Building2, Building, FileText, Download,
  RefreshCw, Activity, UserCheck, UserX, Clock, AlertTriangle, CheckCircle2,
  MapPin, ArrowUp, ArrowDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  semester_holiday: "#2563eb",
  medical: "#10b981",
  hospital_visit: "#f43f5e",
  family_function: "#8b5cf6",
  festival: "#f59e0b",
  internship: "#06b6d4",
  project_work: "#84cc16",
  other: "#94a3b8",
};

function StatCard({ label, value, icon: Icon, color, bg, border, trend }: {
  label: string; value: string | number; icon: any; color: string; bg: string; border: string; trend?: { value: number; up: boolean };
}) {
  return (
    <div className={`glass-card rounded-2xl p-5 border ${border} bg-white shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? "text-emerald-600" : "text-rose-600"}`}>
            {trend.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className={`text-2xl font-heading font-bold ${color} mb-0.5`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  const { data: stats } = useGetDashboardStats();
  const { data: outsideData, refetch: refetchOutside } = useGetStudentsOutside({ query: { queryKey: getGetStudentsOutsideQueryKey() } });
  const { data: activityFeed, refetch: refetchActivity } = useGetActivityFeed({ query: { queryKey: getGetActivityFeedQueryKey() } });
  const { data: occupancyData, refetch: refetchOccupancy } = useGetHostelOccupancy({ query: { queryKey: getGetHostelOccupancyQueryKey() } });
  const { data: monthlyReport } = useGetMonthlyReport(
    { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    { query: { queryKey: getGetMonthlyReportQueryKey({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }) } }
  );
  const { data: allLeavesData } = useListLeaves({}, { query: { queryKey: getListLeavesQueryKey({}) } });

  const refetch = () => { refetchOutside(); refetchActivity(); refetchOccupancy(); };

  const outsideStudents: any[] = (outsideData as any)?.students ?? (Array.isArray(outsideData) ? outsideData : []);
  const activities: any[] = (activityFeed as any)?.activities ?? (Array.isArray(activityFeed) ? activityFeed : []);
  const occupancy = occupancyData as any;
  const allLeaves: any[] = (allLeavesData as any)?.leaves ?? (Array.isArray(allLeavesData) ? allLeavesData : []);

  // Real monthly trend data from API
  const monthlyTrendData: any[] = Array.isArray(monthlyReport) ? monthlyReport.filter((d: any) => d.total > 0).map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    approved: d.approved,
    rejected: d.rejected,
    pending: d.pending,
    total: d.total,
  })) : [];

  // Real leave type breakdown from actual leaves
  const leaveTypeMap: Record<string, number> = {};
  allLeaves.forEach((l: any) => {
    const t = l.leaveType || "other";
    leaveTypeMap[t] = (leaveTypeMap[t] || 0) + 1;
  });
  const leaveTypeData = Object.entries(leaveTypeMap).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value,
    color: LEAVE_TYPE_COLORS[name] ?? "#94a3b8",
  }));

  // Real department breakdown from occupancy API
  const deptBreakdown: any[] = occupancy?.departmentBreakdown ?? [];

  // Real top destinations from leaves
  const destMap: Record<string, number> = {};
  allLeaves.forEach((l: any) => {
    if (l.destination) {
      const dest = l.destination.trim();
      destMap[dest] = (destMap[dest] || 0) + 1;
    }
  });
  const topDestinations = Object.entries(destMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Late returns
  const lateReturns = outsideStudents.filter((s: any) => s.isOverdue);

  const handleExportCSV = (title: string, rows: string[][]) => {
    if (rows.length === 0) {
      rows = [["No data available"]];
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([`Report: ${title}\nGenerated: ${format(new Date(), "PPpp")}\n\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JKKM_${title.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const noData = (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="w-10 h-10 text-slate-200 mb-3" />
      <p className="text-sm text-muted-foreground font-medium">No data yet</p>
      <p className="text-xs text-muted-foreground mt-0.5">Data will appear here once leaves are submitted.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Analytics Centre</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live hostel leave statistics · {format(new Date(), "EEEE, MMMM d yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["daily", "weekly", "monthly"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  period === p ? "bg-white shadow-sm text-slate-800 font-semibold" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2 hidden md:flex">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: (stats as any)?.totalStudents ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "Currently Outside", value: outsideStudents.length, icon: UserX, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { label: "Pending Approvals", value: (stats as any)?.pendingApprovals ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          { label: "Late Returns", value: lateReturns.length, icon: AlertTriangle, color: lateReturns.length > 0 ? "text-rose-700" : "text-emerald-600", bg: lateReturns.length > 0 ? "bg-rose-50" : "bg-emerald-50", border: lateReturns.length > 0 ? "border-rose-100" : "border-emerald-100" },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-card border-border/50">
            <TabsTrigger value="overview">Leave Analytics</TabsTrigger>
            <TabsTrigger value="movement">Student Movement</TabsTrigger>
            <TabsTrigger value="departments">Department Reports</TabsTrigger>
          </TabsList>

          {/* Leave Analytics Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Monthly Trends */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h3 className="font-heading font-semibold text-sm text-slate-800">
                      Leave Activity — {format(new Date(), "MMMM yyyy")}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                    onClick={() => handleExportCSV("Monthly Activity", [
                      ["Date", "Approved", "Rejected", "Pending"],
                      ...monthlyTrendData.map(d => [d.date, d.approved, d.rejected, d.pending]),
                    ])}>
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </div>
                {monthlyTrendData.length === 0 ? noData : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={monthlyTrendData}>
                      <defs>
                        <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="approved" name="Approved" stroke="#2563eb" fill="url(#approvedGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#f43f5e" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Leave Type Breakdown */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-600" />
                    <h3 className="font-heading font-semibold text-sm text-slate-800">Leave Type Breakdown</h3>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                    onClick={() => handleExportCSV("Leave Types", [
                      ["Type", "Count"],
                      ...leaveTypeData.map(d => [d.name, String(d.value)]),
                    ])}>
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                </div>
                {leaveTypeData.length === 0 ? noData : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={180}>
                      <PieChart>
                        <Pie data={leaveTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {leaveTypeData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {leaveTypeData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                          <span className="font-semibold text-slate-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Destinations */}
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <h3 className="font-heading font-semibold text-sm text-slate-800">Top Destinations</h3>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                    onClick={() => handleExportCSV("Top Destinations", [
                      ["Destination", "Count"],
                      ...topDestinations.map(d => [d.name, String(d.count)]),
                    ])}>
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                </div>
                {topDestinations.length === 0 ? noData : (
                  <div className="space-y-2">
                    {topDestinations.map((dest, i) => (
                      <div key={dest.name} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-slate-700 truncate">{dest.name}</span>
                            <span className="text-xs font-bold text-slate-500 ml-2">{dest.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                              style={{ width: `${(dest.count / topDestinations[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Student Movement Tab */}
          <TabsContent value="movement" className="space-y-4">
            {/* Currently Outside Students */}
            <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <h3 className="font-heading font-semibold text-sm text-slate-800">Students Currently Outside Campus</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-50 text-rose-700 border-rose-100">{outsideStudents.length} outside</Badge>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                    onClick={() => handleExportCSV("Students Outside", [
                      ["Name", "Register No.", "Department", "Destination", "Exit Time", "Return By", "Overdue"],
                      ...outsideStudents.map((s: any) => [
                        s.studentName, s.registerNumber, s.department ?? "", s.destination ?? "",
                        s.exitTime ? format(new Date(s.exitTime), "MMM d h:mm a") : "",
                        s.toDate ? format(new Date(s.toDate), "MMM d") : "",
                        s.isOverdue ? "YES" : "No",
                      ]),
                    ])}>
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </div>
              </div>
              {outsideStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">All students are currently inside the hostel.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {outsideStudents.map((s: any, i: number) => (
                    <div key={i} className={`flex items-center gap-4 px-6 py-3.5 ${s.isOverdue ? "bg-rose-50/30" : ""}`}>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                        {(s.studentName ?? "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{s.studentName ?? "—"}</span>
                          {s.isOverdue && <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">OVERDUE</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {s.department && <span>{s.department}</span>}
                          {s.registerNumber && <span>{s.registerNumber}</span>}
                          {s.destination && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.destination}</span>}
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-muted-foreground">Exited</div>
                        <div className="text-xs font-medium">{s.exitTime ? format(new Date(s.exitTime), "MMM d, h:mm a") : "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Return By</div>
                        <div className={`text-xs font-medium ${s.isOverdue ? "text-rose-600 font-semibold" : "text-slate-700"}`}>
                          {s.toDate ? format(new Date(s.toDate), "MMM d") : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Activity Feed */}
            <div className="glass-card rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-600" />
                  <h3 className="font-heading font-semibold text-sm text-slate-800">Gate Activity Log</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchActivity()} className="gap-1.5 text-xs">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
              {activities.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No gate activity recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {activities.slice(0, 20).map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${act.action === "exit" ? "bg-rose-50 border border-rose-100" : "bg-emerald-50 border border-emerald-100"}`}>
                        {act.action === "exit"
                          ? <UserX className="w-3.5 h-3.5 text-rose-600" />
                          : <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-slate-800">{act.studentName ?? `Student #${act.studentId}`}</span>
                        {" "}<span className="text-muted-foreground">{act.action === "exit" ? "exited" : "returned"} via</span>
                        {" "}<span className="text-slate-700 font-medium">{act.gateLocation ?? "Main Gate"}</span>
                      </div>
                      <span className="text-muted-foreground">{act.time ? formatDistanceToNow(new Date(act.time), { addSuffix: true }) : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Department Reports Tab */}
          <TabsContent value="departments" className="space-y-4">
            {/* Department bar chart */}
            <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-violet-600" />
                  <h3 className="font-heading font-semibold text-sm text-slate-800">Presence by Department</h3>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs"
                  onClick={() => handleExportCSV("Department Report", [
                    ["Department", "Total Students", "Present", "On Leave"],
                    ...deptBreakdown.map((d: any) => [d.department, d.total, d.present, d.onLeave]),
                  ])}>
                  <Download className="w-3 h-3" /> Export
                </Button>
              </div>
              {deptBreakdown.length === 0 ? noData : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={deptBreakdown} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="present" name="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onLeave" name="On Leave" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department stat cards */}
            {deptBreakdown.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 bg-white shadow-sm text-center">
                {noData}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptBreakdown.map((dept: any, i: number) => {
                  const approvalRate = dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 100;
                  return (
                    <motion.div key={dept.department} custom={i} variants={fadeUp} initial="hidden" animate="show">
                      <div className="glass-card rounded-2xl p-5 bg-white shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-heading font-semibold text-sm text-slate-800 truncate">{dept.department}</h3>
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xl font-bold text-slate-700">{dept.total}</div>
                            <div className="text-[10px] text-muted-foreground">Total</div>
                          </div>
                          <div className="border-x border-slate-100">
                            <div className="text-xl font-bold text-emerald-600">{dept.present}</div>
                            <div className="text-[10px] text-muted-foreground">Present</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-rose-600">{dept.onLeave}</div>
                            <div className="text-[10px] text-muted-foreground">Outside</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Presence Rate</span>
                            <span>{approvalRate}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                              style={{ width: `${approvalRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Hostel Occupancy Summary */}
            {occupancy && (
              <div className="glass-card rounded-2xl p-6 bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="w-4 h-4 text-cyan-600" />
                  <h3 className="font-heading font-semibold text-sm text-slate-800">Hostel Occupancy Summary</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Capacity", value: occupancy.totalCapacity ?? 0, color: "text-slate-700" },
                    { label: "Currently Present", value: occupancy.currentlyPresent ?? 0, color: "text-emerald-600" },
                    { label: "Currently Outside", value: occupancy.currentlyAbsent ?? 0, color: "text-rose-600" },
                    { label: "Occupancy Rate", value: `${occupancy.occupancyPercent ?? 0}%`, color: "text-blue-600" },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
                      <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
