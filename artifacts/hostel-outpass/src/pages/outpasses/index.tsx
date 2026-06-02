import { useListOutpasses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { QrCode, Clock, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function OutpassesPage() {
  const { user } = useAuth();
  const { data: outpasses = [], isLoading } = useListOutpasses(
    user?.role === "student" ? { studentId: user.id } : {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">Digital Outpasses</h1>
        <p className="text-muted-foreground mt-2">View generated gate passes.</p>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : outpasses.length === 0 ? (
        <Card className="text-center p-8">
          <p className="text-muted-foreground">No outpasses found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outpasses.map((outpass) => (
            <Link key={outpass.id} href={`/outpasses/${outpass.id}`}>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg font-mono tracking-wider">{outpass.outpassCode}</CardTitle>
                  <Badge variant={
                    outpass.status === 'generated' ? 'default' : 
                    outpass.status === 'verified' ? 'secondary' : 
                    outpass.status === 'returned' ? 'outline' : 'destructive'
                  }>
                    {outpass.status}
                  </Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  {user?.role !== "student" && outpass.student && (
                    <div className="font-medium">{outpass.student.name} ({outpass.student.registerNumber})</div>
                  )}
                  {outpass.leave && (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {outpass.leave.destination}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Valid till: {format(new Date(outpass.leave.toDate), "MMM d, yyyy")}
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg mt-4 border border-dashed">
                    <QrCode className="w-8 h-8 text-primary opacity-50" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">Click to view QR</span>
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