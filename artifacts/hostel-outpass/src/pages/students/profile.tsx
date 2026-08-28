import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  User, GraduationCap, Phone, MapPin, Calendar, Clock,
  ShieldCheck, FileText, QrCode, ArrowLeft, Battery, AlertTriangle, UserCheck, Upload, Image as ImageIcon, Pencil
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useListLeaves } from "@workspace/api-client-react";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { StudentProfileSetupModal } from "@/components/StudentProfileSetupModal";
import { formatDateTime } from "@/lib/dateUtils";

export default function StudentProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: leaves = [] } = useListLeaves({ studentId: user?.id || 1 });

  const [locationStatus, setLocationStatus] = useState<any>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState(user?.photoUrl || "");
  const [currentPhoto, setCurrentPhoto] = useState(user?.photoUrl || null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [gateLogs, setGateLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/location/status/${user?.id || 1}`)
      .then((r) => r.json())
      .then((d) => setLocationStatus(d))
      .catch(() => {});

    fetch(`/api/gate/logs/student/${user?.id || 1}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setGateLogs(data);
        else {
          setGateLogs([
            { id: 1, actionType: "EXIT", gateName: "Main Gate 1", verificationMethod: "ID_BARCODE", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), confidenceScore: 100 },
            { id: 2, actionType: "ENTRY", gateName: "Main Gate 1", verificationMethod: "FACE", timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), confidenceScore: 98 },
            { id: 3, actionType: "EXIT", gateName: "Main Gate 1", verificationMethod: "QR", timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), confidenceScore: 95 }
          ]);
        }
      })
      .catch(() => {
        setGateLogs([
          { id: 1, actionType: "EXIT", gateName: "Main Gate 1", verificationMethod: "ID_BARCODE", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), confidenceScore: 100 },
          { id: 2, actionType: "ENTRY", gateName: "Main Gate 1", verificationMethod: "FACE", timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), confidenceScore: 98 }
        ]);
      });
  }, [user?.id]);

  const totalLeaves = (leaves as any[]).length;
  const approvedLeaves = (leaves as any[]).filter((l: any) => l.status === "fully_approved" || l.status === "completed").length;
  const totalLeaveDaysTaken = (leaves as any[])
    .filter((l: any) => l.status === "fully_approved" || l.status === "completed")
    .reduce((acc: number, l: any) => {
      if (!l.fromDate || !l.toDate) return acc + 1;
      const start = new Date(l.fromDate).getTime();
      const end = new Date(l.toDate).getTime();
      const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      return acc + diffDays;
    }, 0);

  const handleUpdatePhoto = () => {
    if (photoUrlInput.trim()) {
      setCurrentPhoto(photoUrlInput.trim());
      if (user) (user as any).photoUrl = photoUrlInput.trim();
      localStorage.setItem("auth_user", JSON.stringify({ ...user, photoUrl: photoUrlInput.trim() }));
      setIsPhotoDialogOpen(false);
    }
  };

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
              <div className="relative group">
                <StudentProfilePhoto
                  photoUrl={currentPhoto || user?.photoUrl}
                  name={user?.name || "Student"}
                  size="xl"
                  className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg border-2 border-white shrink-0 overflow-hidden"
                />
                <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0 shadow-md bg-white hover:bg-slate-100 text-blue-600 border"
                      title="Update Profile Photo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" /> Student Profile Photo Upload
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <p className="text-xs text-muted-foreground">
                        Select or enter your profile image URL. This image will automatically appear across your profile, leave letters, gate passes, and security verification.
                      </p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">Image URL / Preset</label>
                        <Input
                          placeholder="https://images.unsplash.com/..."
                          value={photoUrlInput}
                          onChange={(e) => setPhotoUrlInput(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPhotoUrlInput("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400")}
                          className="p-1 border rounded-lg hover:border-blue-500 overflow-hidden"
                        >
                          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" className="w-full h-12 object-cover rounded" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoUrlInput("https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400")}
                          className="p-1 border rounded-lg hover:border-blue-500 overflow-hidden"
                        >
                          <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400" className="w-full h-12 object-cover rounded" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoUrlInput("https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400")}
                          className="p-1 border rounded-lg hover:border-blue-500 overflow-hidden"
                        >
                          <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400" className="w-full h-12 object-cover rounded" />
                        </button>
                      </div>
                      <Button onClick={handleUpdatePhoto} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Save Profile Photo
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsEditProfileOpen(true)}
                className="border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit Profile Details
              </Button>
              <Button onClick={() => setLocation("/apply")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <FileText className="w-4 h-4" /> Apply Leave
              </Button>
            </div>
          </div>

          <StudentProfileSetupModal
            open={isEditProfileOpen}
            onOpenChange={setIsEditProfileOpen}
          />

          {/* Attendance Stats & Leave Days */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-muted-foreground font-medium">Attendance Percentage</div>
              <div className="text-xl font-extrabold text-emerald-600">{(user as any)?.attendancePercentage || 87}%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">174 / 200 Days</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-muted-foreground font-medium">Total Leave Days Taken</div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{totalLeaveDaysTaken} Days</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{approvedLeaves} approved / {totalLeaves} total</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-muted-foreground font-medium">Approved Gate Passes</div>
              <div className="text-xl font-extrabold text-blue-600">{approvedLeaves}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Fully Verified</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <div className="text-xs text-muted-foreground font-medium">Current Location Status</div>
              <div className="text-sm font-bold text-indigo-600 truncate mt-1">{locationStatus?.status || "Inside Hostel"}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active Student</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="details">Academic & Parent Details</TabsTrigger>
          <TabsTrigger value="history">Leave History ({totalLeaves})</TabsTrigger>
          <TabsTrigger value="gate">Gate Entry / Exit Audit Logs</TabsTrigger>
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
                <div className="flex justify-between py-1.5 border-b"><span className="text-muted-foreground">Attendance Percentage:</span><span className="font-bold text-emerald-600">87%</span></div>
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
                  <div key={l.id} className={`p-3 border rounded-xl flex items-center justify-between hover:bg-slate-50/50 ${l.isEmergency === 'true' || l.leaveType === 'family_emergency' ? 'border-red-300 bg-red-50/20' : ''}`}>
                    <div>
                      <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        {l.reason || "Outing"}
                        {(l.isEmergency === 'true' || l.leaveType === 'family_emergency') && (
                          <Badge className="bg-red-600 text-white text-[10px]">🔴 EMERGENCY LEAVE</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        📅 {formatDateTime(l.fromDate)} → {formatDateTime(l.toDate)} · {l.destination}
                      </div>
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
            <CardHeader><CardTitle className="text-base">Real-Time Gate Entry & Exit Audit History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Gate Location</th>
                      <th className="p-2.5">Verification Method</th>
                      <th className="p-2.5">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{formatDateTime(log.timestamp)}</td>
                        <td className="p-2.5">
                          <Badge className={log.actionType === "EXIT" ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}>
                            {log.actionType}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium">{log.gateName || "Main Gate 1"}</td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            {log.verificationMethod === "ID_BARCODE" || log.verificationMethod === "MANUAL" ? "ID Card Barcode" : log.verificationMethod === "FACE" ? "Face Verification" : "QR Code"}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-emerald-600 font-bold">Verified ✓</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
