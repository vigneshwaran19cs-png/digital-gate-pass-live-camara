import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, FileText, QrCode } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening with your outpasses today.</p>
      </div>

      {user.role === "student" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Outpasses</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card className="col-span-2">
             <CardHeader>
               <CardTitle>Quick Actions</CardTitle>
             </CardHeader>
             <CardContent className="flex gap-4">
               <Link href="/apply">
                 <Button>Apply for Leave</Button>
               </Link>
               <Link href="/leaves">
                 <Button variant="outline">View History</Button>
               </Link>
             </CardContent>
          </Card>
        </div>
      )}

      {user.role !== "student" && (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
               <FileText className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">12</div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Students Outside</CardTitle>
               <Activity className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">45</div>
             </CardContent>
           </Card>
         </div>
      )}
    </div>
  );
}