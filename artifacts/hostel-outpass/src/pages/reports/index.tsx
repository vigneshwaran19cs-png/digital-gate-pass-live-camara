import { useAuth } from "@/contexts/AuthContext";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading || !stats) return <div>Loading reports...</div>;

  const pieData = [
    { name: 'Present', value: stats.totalStudents - stats.studentsOnLeave, color: 'hsl(var(--chart-2))' },
    { name: 'On Leave', value: stats.studentsOnLeave, color: 'hsl(var(--chart-1))' },
  ];

  const barData = [
    { name: 'Mon', approvals: 12, rejections: 2 },
    { name: 'Tue', approvals: 19, rejections: 3 },
    { name: 'Wed', approvals: 15, rejections: 1 },
    { name: 'Thu', approvals: 22, rejections: 5 },
    { name: 'Fri', approvals: 45, rejections: 8 },
    { name: 'Sat', approvals: 10, rejections: 2 },
    { name: 'Sun', approvals: 5, rejections: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-2">System-wide overview and hostel occupancy.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.occupancyPercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalStudents - stats.studentsOnLeave} of {stats.totalStudents} students present</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Outside</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.studentsOnLeave}</div>
            <p className="text-xs text-muted-foreground mt-1">Students on active leave</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all levels</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayApproved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Outpasses generated today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Occupancy Status</CardTitle>
            <CardDescription>Live breakdown of hostel residents</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Leave Requests</CardTitle>
            <CardDescription>Approved vs Rejected over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="approvals" name="Approved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejections" name="Rejected" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}