import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useListClasses, useListDepartments } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategorizedDepartmentSelect } from "@/components/CategorizedDepartmentSelect";
import {
  User, GraduationCap, Building, Phone, MapPin, Image as ImageIcon,
  CheckCircle2, Sparkles, AlertCircle, Shield, ArrowRight, Lock
} from "lucide-react";

interface StudentProfileSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileSetupModal({ open, onOpenChange }: StudentProfileSetupModalProps) {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [departmentId, setDepartmentId] = useState(user?.departmentId?.toString() || "");
  const [classId, setClassId] = useState((user as any)?.classId?.toString() || "");
  const [registerNumber, setRegisterNumber] = useState(user?.registerNumber || "");
  const [hostelBlock, setHostelBlock] = useState((user as any)?.hostelBlock || "Boys Hostel - Main Block");
  const [hostelRoom, setHostelRoom] = useState((user as any)?.hostelRoom || "");
  const [parentName, setParentName] = useState((user as any)?.parentName || "");
  const [parentPhone, setParentPhone] = useState((user as any)?.parentPhone || "");
  const [parentWhatsapp, setParentWhatsapp] = useState((user as any)?.parentWhatsapp || "");
  const [parentEmail, setParentEmail] = useState((user as any)?.parentEmail || "");
  const [address, setAddress] = useState((user as any)?.address || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || "/students/vimal_m.jpg");
  const [idCardUrl, setIdCardUrl] = useState((user as any)?.idCardUrl || "/students/id_card_sheet.jpg");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: classesRaw = [] } = useListClasses();
  const clsList = classesRaw as any[];
  const filteredClasses = departmentId ? clsList.filter((c: any) => c.departmentId === parseInt(departmentId, 10)) : [];

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setDepartmentId(user.departmentId?.toString() || "");
      setClassId((user as any)?.classId?.toString() || "");
      setRegisterNumber(user.registerNumber || "");
      setHostelBlock((user as any)?.hostelBlock || "Boys Hostel - Main Block");
      setHostelRoom((user as any)?.hostelRoom || "");
      setParentName((user as any)?.parentName || "");
      setParentPhone((user as any)?.parentPhone || "");
      setParentWhatsapp((user as any)?.parentWhatsapp || "");
      setParentEmail((user as any)?.parentEmail || "");
      setAddress((user as any)?.address || "");
      setPhotoUrl(user.photoUrl || "/students/vimal_m.jpg");
      setIdCardUrl((user as any)?.idCardUrl || "/students/id_card_sheet.jpg");
    }
  }, [user]);

  const PRESET_PHOTOS = [
    { label: "Vimal M (Auto)", url: "/students/vimal_m.jpg" },
    { label: "Azhagesan S (Mech)", url: "/students/azhagesan_s.jpg" },
    { label: "Chinraj M (Mech)", url: "/students/chinraj_m.jpg" },
    { label: "Karthick Rajan (Auto)", url: "/students/karthick_rajan_s.jpg" },
    { label: "Kavin Kaarthik (Auto)", url: "/students/kavin_kaarthik_m.jpg" },
    { label: "Female Student", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" },
  ];

  const handleSave = async () => {
    if (!user?.id) return;
    if (!name.trim()) {
      toast({ title: "Name Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!registerNumber.trim()) {
      toast({ title: "Register Number Required", description: "Please enter your college register number.", variant: "destructive" });
      return;
    }
    if (!departmentId) {
      toast({ title: "Department Required", description: "Please select your academic department.", variant: "destructive" });
      return;
    }
    if (!parentPhone.trim() && !parentWhatsapp.trim()) {
      toast({ title: "Parent Phone Required", description: "Parent phone is required for leave SMS notifications.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name,
        email,
        phone: phone || undefined,
        departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
        classId: classId ? parseInt(classId, 10) : undefined,
        registerNumber,
        hostelBlock,
        hostelRoom,
        parentName,
        parentPhone: parentPhone || undefined,
        parentWhatsapp: parentWhatsapp || parentPhone || undefined,
        parentEmail: parentEmail || undefined,
        address,
        photoUrl,
        idCardUrl,
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const updated = await res.json();
      if (res.ok) {
        updateUserProfile(updated);
        toast({
          title: "🎉 Profile Completed Successfully!",
          description: "Your student details, hostel room, parent contact, and photo have been updated.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Update Failed",
          description: updated.error || "Could not save profile.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-700" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Student Self-Service Portal</span>
          </div>
          <DialogTitle className="text-xl font-heading font-bold text-slate-900">
            Complete / Update Your Student Profile
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Please fill in your college department, hostel room, parent phone (for automated leave SMS), and profile photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Profile Photo Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-600" /> 1. Profile Photo (Used for Gate Pass & Face ID)
            </Label>
            <div className="flex items-center gap-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 shadow-sm bg-white shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-white shrink-0">
                  No Photo
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Photo URL (e.g. /students/vimal_m.jpg or custom photo link)"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  className="text-xs h-8 bg-white"
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_PHOTOS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPhotoUrl(p.url)}
                      className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 hover:border-blue-400 rounded-md font-medium text-slate-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="p-3.5 bg-white border border-blue-100 rounded-xl space-y-3 shadow-xs">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" /> 2. Academic & Department Information
            </div>

            <CategorizedDepartmentSelect
              value={departmentId}
              onChange={(deptId) => {
                setDepartmentId(deptId);
                setClassId("");
              }}
              label="Select Your College & Department"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Register Number (Barcode ID) *</Label>
                <Input
                  placeholder="e.g. 731225ME029 or 25ME029"
                  value={registerNumber}
                  onChange={e => setRegisterNumber(e.target.value)}
                  className="mt-1 font-mono text-xs uppercase"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Printed on your college ID card barcode</p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Class & Year Section</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select Class Section" /></SelectTrigger>
                  <SelectContent>
                    {filteredClasses.length > 0 ? (
                      filteredClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.year} Year - Section {c.section}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {departmentId ? "No classes registered for dept" : "Choose department first"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Hostel Stay */}
          <div className="p-3.5 bg-slate-50/70 border rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-4 h-4 text-cyan-600" /> 3. Hostel Stay Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Hostel Block</Label>
                <Select value={hostelBlock} onValueChange={setHostelBlock}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys Hostel - Main Block">Boys Hostel - Main Block</SelectItem>
                    <SelectItem value="Boys Hostel - PG Block">Boys Hostel - PG Block</SelectItem>
                    <SelectItem value="Girls Hostel - Main Block">Girls Hostel - Main Block</SelectItem>
                    <SelectItem value="Polytechnic Hostel Block">Polytechnic Hostel Block</SelectItem>
                    <SelectItem value="Pharmacy Hostel Block">Pharmacy Hostel Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Room Number & Bed *</Label>
                <Input
                  placeholder="e.g. A-204 (Bed 1)"
                  value={hostelRoom}
                  onChange={e => setHostelRoom(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Parent & Emergency Contacts (Mandatory for Leave SMS/Calls) */}
          <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-3">
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-600" /> 4. Parent / Guardian Contact (For Automated Leave SMS & Approval)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Parent / Guardian Name *</Label>
                <Input
                  placeholder="Father/Mother/Guardian name"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Parent Phone Number (SMS) *</Label>
                <Input
                  placeholder="10-digit mobile for SMS notifications"
                  value={parentPhone}
                  onChange={e => setParentPhone(e.target.value)}
                  className="mt-1 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Parent WhatsApp Number</Label>
                <Input
                  placeholder="WhatsApp number for outpass alerts"
                  value={parentWhatsapp}
                  onChange={e => setParentWhatsapp(e.target.value)}
                  className="mt-1 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Parent Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={parentEmail}
                  onChange={e => setParentEmail(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Permanent Home Address *</Label>
                <Input
                  placeholder="Door No, Street, City / Village, Pincode"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Student Personal Contact & Password Update */}
          <div className="p-3.5 bg-slate-50/70 border rounded-xl space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-slate-600" /> 5. Personal Details & Password
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Your Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1 text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Your Mobile Phone</Label>
                <Input placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 text-xs bg-white font-mono" />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">New Password (Leave blank to keep unchanged)</Label>
                <Input
                  type="password"
                  placeholder="Enter new password if you wish to change it"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <CheckCircle2 className="w-4 h-4" /> {isSaving ? "Saving Details…" : "Save Student Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
