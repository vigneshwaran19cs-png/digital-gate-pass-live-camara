import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, GraduationCap, Phone, MapPin, Calendar, Clock,
  ShieldCheck, FileText, QrCode, ArrowLeft, Battery, AlertTriangle, UserCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useListLeaves } from "@workspace/api-client-react";

export default function StudentProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: leaves = [] } = useListLeaves({ studentId: user?.id || 1 });

  const [locationStatus, setLocationStatus] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/location/status/${user?.id || 1}`)
      .then((r) => r.json())
      .then((d) => setLocationStatus(d))
      .catch(() => {});
  }, [user?.id]);

  const totalLeaves = (leaves as any[]).length;
  const approvedLeaves = (leaves as any[]).filter((l: any) => l.status === "fully_approved").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      {/* Header Profile Card */}
      <Card className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-28 relative" />
        <CardContent className="pt-0 relative px-6 pb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg border-2 border-white shrink-0 overflow-hidden">
                <img
                  src={user?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"}
                  alt={user?.name || "Student Face"}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-heading font-bold">{user?.name || "John Doe"}</h1>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Face Enrolled ✓</Badge>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  ID: {user?.registerNumber || "STU001"} · Class: III Year CSE A
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setLocation("/apply")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <FileText className="w-4 h-4" /> Apply Leave
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
            <div className="p-3 bg-muted/30 rounded-xl text-center">
              <div className="text-xs text-muted-foreground">Attendance</div>
              <div className="text-xl font-bold text-emerald-600">{(user as any)?.attendancePercentage || 87}%</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl text-center">
              <div className="text-xs text-muted-foreground">Total Leaves Taken</div>
              <div className="text-xl font-bold text-slate-800">{totalLeaves}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl text-center">
              <div className="text-xs text-muted-foreground">Approved Passes</div>
              <div className="text-xl font-bold text-blue-600">{approvedLeaves}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl text-center">
              <div className="text-xs text-muted-foreground">Location Status</div>
              <div className="text-sm font-bold text-indigo-600 truncate">{locationStatus?.status || "Hostel"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="details">Academic & Parent Details</TabsTrigger>
          <TabsTrigger value="history">Leave History ({totalLeaves})</TabsTrigger>
          <TabsTrigger value="gate">Gate Entry / Exit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">College Stream:</span><span className="font-semibold">{(user as any)?.collegeType || "Engineering & Technology"}</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Department:</span><span className="font-semibold">Computer Science & Engineering</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Hostel Block:</span><span className="font-semibold">Kaveri Boys Hostel (Block A)</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Room Number:</span><span className="font-semibold">A-101</span></div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Parent & Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Parent Name:</span><span className="font-semibold">Jane Doe</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Parent Contact:</span><span className="font-semibold">+91 0987654321</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">WhatsApp Alerts:</span><span className="font-semibold text-emerald-600">Enabled ✓</span></div>
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Assigned Tutor:</span><span className="font-semibold">Dr. Smith (CSE)</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Leave & Gate Pass Records</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(leaves as any[]).map((l: any) => (
                  <div key={l.id} className="p-3 border rounded-xl flex items-center justify-between hover:bg-slate-50/50">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{l.reason || "Outing"}</div>
                      <div className="text-xs text-muted-foreground">📅 {l.fromDate} → {l.toDate} · {l.destination}</div>
                    </div>
                    <Badge variant={l.status === "fully_approved" ? "default" : "secondary"}>{l.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gate">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Real-Time Gate Entry & Exit Audit</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded-xl flex items-center justify-between bg-emerald-50/40">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <div><span className="font-bold text-emerald-900">EXIT GATE</span> · Verified via Face Recognition</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
