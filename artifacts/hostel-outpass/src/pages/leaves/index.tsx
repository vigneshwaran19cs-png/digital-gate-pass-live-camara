import { useListLeaves } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { CalendarIcon, MapPin, UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LeavesPage() {
  const { user } = useAuth();
  const { data: leaves = [], isLoading } = useListLeaves(
    user?.role === "student" ? { studentId: user.id } : {}
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Leaves Management</h1>
          <p className="text-muted-foreground mt-2">Track and manage leave requests.</p>
        </div>
        {user?.role === "student" && (
          <Link href="/apply">
            <Button>Apply for Leave</Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : leaves.length === 0 ? (
        <Card className="text-center p-8">
          <p className="text-muted-foreground">No leave requests found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leaves.map((leave) => (
            <Link key={leave.id} href={`/leaves/${leave.id}`}>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-heading">{leave.leaveType}</CardTitle>
                    <Badge variant={leave.status === "fully_approved" ? "default" : leave.status === "rejected" ? "destructive" : "secondary"}>
                      {leave.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between text-sm text-muted-foreground">
                  <div className="space-y-2 mb-4">
                    {user?.role !== "student" && leave.student && (
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <UserIcon className="w-4 h-4" />
                        {leave.student.name} ({leave.student.registerNumber})
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(new Date(leave.fromDate), "MMM d")} - {format(new Date(leave.toDate), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {leave.destination}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-foreground bg-secondary/50 p-2 rounded">
                    Current Step: <span className="capitalize">{leave.currentStep}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
