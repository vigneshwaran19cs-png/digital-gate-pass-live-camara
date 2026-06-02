import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLookupOutpass, useVerifyOutpass, useRecordReturn, getLookupOutpassQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function SecurityPage() {
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: outpass, isLoading, isError } = useLookupOutpass(
    { outpassCode: searchQuery },
    { query: { enabled: !!searchQuery, queryKey: getLookupOutpassQueryKey({ outpassCode: searchQuery }) } }
  );

  const verifyOutpass = useVerifyOutpass();
  const recordReturn = useRecordReturn();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchQuery(search.trim());
    }
  };

  const handleVerify = () => {
    if (outpass?.id) {
      verifyOutpass.mutate(
        { id: outpass.id, data: { gateLocation: "Main Gate" } },
        {
          onSuccess: () => {
            toast({ title: "Outpass Verified", description: "Student exit recorded." });
            queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey({ outpassCode: searchQuery }) });
          }
        }
      );
    }
  };

  const handleReturn = () => {
    if (outpass?.id) {
      recordReturn.mutate(
        { id: outpass.id },
        {
          onSuccess: () => {
            toast({ title: "Return Recorded", description: "Student return recorded." });
            queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey({ outpassCode: searchQuery }) });
          }
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">Security Console</h1>
        <p className="text-muted-foreground mt-2">Scan or search outpass to verify student exit/return.</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle>Lookup Outpass</CardTitle>
          <CardDescription>Enter outpass code, student register number, or name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="e.g. OUT-12345 or STU001" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="font-mono text-lg py-6"
            />
            <Button type="submit" size="lg" disabled={isLoading}>
              <Search className="w-5 h-5 mr-2" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-8">Searching...</div>}
      
      {isError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6 text-center text-destructive font-medium">
            Outpass not found or invalid.
          </CardContent>
        </Card>
      )}

      {outpass && (
        <Card className="overflow-hidden border-2 border-primary/20">
          <div className={`h-2 ${outpass.status === 'generated' ? 'bg-primary' : outpass.status === 'verified' ? 'bg-amber-500' : outpass.status === 'returned' ? 'bg-green-500' : 'bg-destructive'}`} />
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-mono">{outpass.outpassCode}</CardTitle>
                <CardDescription className="mt-1">Generated: {new Date(outpass.createdAt).toLocaleString()}</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1 font-medium capitalize">
                {outpass.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xl">
                {outpass.student?.name?.charAt(0) || "S"}
              </div>
              <div>
                <h3 className="text-xl font-bold font-heading">{outpass.student?.name}</h3>
                <p className="text-muted-foreground">{outpass.student?.registerNumber} • {outpass.student?.department}</p>
                <p className="text-muted-foreground text-sm mt-1">Room: {outpass.student?.hostelRoom}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Destination</span>
                <p className="font-medium">{outpass.leave?.destination}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Valid Till</span>
                <p className="font-medium">{outpass.leave?.toDate ? new Date(outpass.leave.toDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {outpass.exitTime && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 p-3 rounded text-sm font-medium">
                <Clock className="w-4 h-4" />
                Exit Recorded: {new Date(outpass.exitTime).toLocaleString()} at {outpass.gateLocation}
              </div>
            )}
            
            {outpass.returnTime && (
              <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-3 rounded text-sm font-medium">
                <UserCheck className="w-4 h-4" />
                Return Recorded: {new Date(outpass.returnTime).toLocaleString()}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 flex gap-4">
            {outpass.status === 'generated' && (
              <Button className="w-full" size="lg" onClick={handleVerify} disabled={verifyOutpass.isPending}>
                <ShieldCheck className="w-5 h-5 mr-2" /> Verify Exit (Main Gate)
              </Button>
            )}
            {outpass.status === 'verified' && (
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" onClick={handleReturn} disabled={recordReturn.isPending}>
                <UserCheck className="w-5 h-5 mr-2" /> Record Return
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}