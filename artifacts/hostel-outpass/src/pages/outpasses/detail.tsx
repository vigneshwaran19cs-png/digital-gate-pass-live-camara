import { useGetOutpass, getGetOutpassQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MapPin, QrCode } from "lucide-react";
import { format } from "date-fns";

export default function OutpassDetailPage() {
  const [, params] = useRoute("/outpasses/:id");
  const id = Number(params?.id);

  const { data: outpass, isLoading } = useGetOutpass(id, {
    query: { enabled: !!id, queryKey: getGetOutpassQueryKey(id) }
  });

  if (isLoading) return <div>Loading outpass...</div>;
  if (!outpass) return <div>Outpass not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/outpasses"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
      </Button>

      <Card className="overflow-hidden border-2 border-primary/20 relative">
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <CardHeader className="text-center pb-2 pt-8">
          <Badge className="mx-auto mb-4" variant={outpass.status === 'generated' ? 'default' : 'secondary'}>
            {outpass.status}
          </Badge>
          <CardTitle className="text-4xl font-mono tracking-widest">{outpass.outpassCode}</CardTitle>
          <CardDescription>Digital Gate Pass</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 px-8 pb-8">
          {/* QR Code Placeholder */}
          <div className="flex justify-center my-6">
            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-4 border shadow-inner">
              <QrCode className="w-full h-full text-slate-800" />
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0 shadow-sm border border-primary/20">
              {outpass.student?.name?.charAt(0) || "S"}
            </div>
            <div>
              <h3 className="text-2xl font-heading font-bold">{outpass.student?.name}</h3>
              <p className="text-muted-foreground font-medium">{outpass.student?.registerNumber}</p>
              <p className="text-sm text-muted-foreground">{outpass.student?.department} • Room {outpass.student?.hostelRoom}</p>
            </div>
          </div>

          {outpass.leave && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-4 rounded-lg bg-card border">
                <span className="text-sm flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> Destination
                </span>
                <p className="font-medium">{outpass.leave.destination}</p>
              </div>
              <div className="space-y-1 p-4 rounded-lg bg-card border">
                <span className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" /> Valid Till
                </span>
                <p className="font-medium">{format(new Date(outpass.leave.toDate), "PPP p")}</p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t text-sm text-center text-muted-foreground space-y-1">
            <p>Approved Chain:</p>
            <div className="font-mono text-xs opacity-70">
              {outpass.approvedByWarden && <span>Warden ✓ </span>}
              {outpass.approvedByTutor && <span>Tutor ✓ </span>}
              {outpass.approvedByHod && <span>HOD ✓ </span>}
              {outpass.approvedByPrincipal && <span>Principal ✓ </span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}