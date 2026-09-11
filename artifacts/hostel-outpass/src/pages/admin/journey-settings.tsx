import React, { useEffect, useState } from "react";
import {
  MapPin,
  MessageSquare,
  Settings,
  List,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Geofence {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  isEnabled: "true" | "false";
}

interface WhatsAppLog {
  id: number;
  recipientPhone: string;
  recipientRole: string;
  messageType: string;
  messageBody: string;
  status: "sent" | "failed" | "simulated";
  errorMessage?: string;
  sentAt: string;
}

export default function AdminJourneySettingsPage() {
  const { toast } = useToast();

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [settings, setSettings] = useState({
    notifyParent: true,
    notifyTutor: true,
    notifyHod: true,
    notifyWarden: true,
    geofenceCooldownMinutes: 15,
    trackingExpiryHours: 24,
    whatsappEnabled: true,
    googleMapsApiKey: "",
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
    gpsSignalTimeoutMinutes: 5,
    redZoneAlertEnabled: true,
  });

  const [integrationInfo, setIntegrationInfo] = useState<{
    isConfigured: boolean;
    mode: string;
    phoneNumberId: string;
    googleMapsApiKey?: string;
  }>({
    isConfigured: false,
    mode: "Loading...",
    phoneNumberId: "Not set",
  });

  // New Geofence Form State
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    latitude: "11.0168",
    longitude: "76.9558",
    radiusMeters: 500,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Test Send State
  const [testPhone, setTestPhone] = useState("919876543210");
  const [testRole, setTestRole] = useState("parent");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [gfRes, setRes, logRes] = await Promise.all([
        fetch("/api/geofences"),
        fetch("/api/whatsapp/settings"),
        fetch("/api/whatsapp/logs"),
      ]);

      if (gfRes.ok) setGeofences(await gfRes.json());
      if (setRes.ok) {
        const data = await setRes.json();
        setIntegrationInfo(data.integrationConfig);
        if (data.settings) {
          setSettings({
            notifyParent: data.settings.notifyParent !== "false",
            notifyTutor: data.settings.notifyTutor !== "false",
            notifyHod: data.settings.notifyHod !== "false",
            notifyWarden: data.settings.notifyWarden !== "false",
            geofenceCooldownMinutes: Number(data.settings.geofenceCooldownMinutes || 15),
            trackingExpiryHours: Number(data.settings.trackingExpiryHours || 24),
            whatsappEnabled: data.settings.whatsappEnabled !== "false",
            googleMapsApiKey: data.settings.googleMapsApiKey || "",
            whatsappAccessToken: data.settings.whatsappAccessToken || "",
            whatsappPhoneNumberId: data.settings.whatsappPhoneNumberId || "",
            whatsappBusinessAccountId: data.settings.whatsappBusinessAccountId || "",
            gpsSignalTimeoutMinutes: Number(data.settings.gpsSignalTimeoutMinutes || 5),
            redZoneAlertEnabled: data.settings.redZoneAlertEnabled !== "false",
          });
        }
      }
      if (logRes.ok) setLogs(await logRes.json());
    } catch (err) {
      toast({ title: "Failed to load admin settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "API Settings Saved ✓", description: "Google Maps, WhatsApp credentials, & GPS lost rules updated live!" });
        fetchAllData();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGeofence.name) return;

    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGeofence),
      });

      if (res.ok) {
        toast({ title: "Geofence Created", description: `Added ${newGeofence.name}` });
        setIsDialogOpen(false);
        setNewGeofence({ name: "", latitude: "11.0168", longitude: "76.9558", radiusMeters: 500 });
        fetchAllData();
      }
    } catch (err) {
      toast({ title: "Failed to add geofence", variant: "destructive" });
    }
  };

  const handleDeleteGeofence = async (id: number) => {
    if (!confirm("Are you sure you want to delete this geofence?")) return;
    try {
      const res = await fetch(`/api/geofences/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Geofence Removed" });
        fetchAllData();
      }
    } catch (err) {
      toast({ title: "Failed to delete geofence", variant: "destructive" });
    }
  };

  const handleToggleGeofence = async (gf: Geofence) => {
    const nextVal = gf.isEnabled === "true" ? "false" : "true";
    try {
      const res = await fetch(`/api/geofences/${gf.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: nextVal }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      toast({ title: "Failed to update geofence", variant: "destructive" });
    }
  };

  const handleTestSend = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/whatsapp/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, role: testRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Test Notification Dispatched", description: JSON.stringify(data.result?.message || "Success") });
        fetchAllData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ title: "Test Send Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Radio className="w-8 h-8 text-blue-600 animate-pulse" />
            WhatsApp Journey Tracking Admin
          </h1>
          <p className="text-sm text-slate-500">
            Configure RedBus-style WhatsApp location arrival alerts, geofences, and recipient notification rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            className={`px-3 py-1.5 text-xs font-semibold ${
              integrationInfo.isConfigured
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-800 border-amber-300"
            }`}
          >
            {integrationInfo.isConfigured ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Meta Cloud API (Live)
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Test Mode (Simulated Logs)
              </span>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geofences" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="geofences" className="gap-2">
            <MapPin className="w-4 h-4" /> Geofences ({geofences.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Sliders className="w-4 h-4" /> Rules & Credentials
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <MessageSquare className="w-4 h-4" /> Delivery Logs ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Geofences */}
        <TabsContent value="geofences" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Important Check-Point Geofences</h3>
              <p className="text-xs text-slate-500">
                When students enter a geofence radius, WhatsApp location arrival updates are sent automatically.
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                  <Plus className="w-4 h-4" /> Add Geofence
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Important Location Geofence</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateGeofence} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Location Name</Label>
                    <Input
                      placeholder="e.g. Gandhipuram Bus Stand"
                      value={newGeofence.name}
                      onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Latitude</Label>
                      <Input
                        value={newGeofence.latitude}
                        onChange={(e) => setNewGeofence({ ...newGeofence, latitude: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Longitude</Label>
                      <Input
                        value={newGeofence.longitude}
                        onChange={(e) => setNewGeofence({ ...newGeofence, longitude: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Radius (Meters)</Label>
                    <Input
                      type="number"
                      value={newGeofence.radiusMeters}
                      onChange={(e) => setNewGeofence({ ...newGeofence, radiusMeters: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 text-white">
                    Save Location Geofence
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {geofences.map((gf) => (
              <Card key={gf.id} className="border-slate-200 shadow-sm relative">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> {gf.name}
                  </CardTitle>
                  <Switch
                    checked={gf.isEnabled === "true"}
                    onCheckedChange={() => handleToggleGeofence(gf)}
                  />
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between border-b pb-1">
                    <span>Coordinates:</span>
                    <span className="font-mono text-slate-800">{gf.latitude.slice(0, 7)}, {gf.longitude.slice(0, 7)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Trigger Radius:</span>
                    <span className="font-semibold text-slate-800">{gf.radiusMeters} Meters</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <Badge variant={gf.isEnabled === "true" ? "default" : "secondary"}>
                      {gf.isEnabled === "true" ? "ACTIVE" : "DISABLED"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGeofence(gf.id)}
                      className="text-red-500 hover:bg-red-50 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Settings & Rules */}
        <TabsContent value="settings" className="space-y-6">
          {/* Google Maps & WhatsApp Credentials API Settings */}
          <Card className="border-blue-200 bg-blue-50/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                Google Maps & WhatsApp Cloud API Credentials
              </CardTitle>
              <CardDescription>Configure Super Admin API keys for live real-time Google Maps tracking & automatic WhatsApp parent/HOD messaging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Maps Key */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Google Maps JavaScript / Geocoding API Key</Label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={settings.googleMapsApiKey}
                  onChange={(e) => setSettings({ ...settings, googleMapsApiKey: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">Enables high-resolution Google Maps tile rendering & reverse geocoding for student journey tracking.</p>
              </div>

              {/* WhatsApp API Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">WhatsApp Access Token</Label>
                  <Input
                    type="password"
                    placeholder="EAA..."
                    value={settings.whatsappAccessToken}
                    onChange={(e) => setSettings({ ...settings, whatsappAccessToken: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Phone Number ID</Label>
                  <Input
                    placeholder="1009283746..."
                    value={settings.whatsappPhoneNumberId}
                    onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Business Account ID</Label>
                  <Input
                    placeholder="10928374..."
                    value={settings.whatsappBusinessAccountId}
                    onChange={(e) => setSettings({ ...settings, whatsappBusinessAccountId: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* GPS Signal Timeout & Red Zone Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">GPS Signal Lost Timeout (Minutes)</Label>
                  <Input
                    type="number"
                    value={settings.gpsSignalTimeoutMinutes}
                    onChange={(e) => setSettings({ ...settings, gpsSignalTimeoutMinutes: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">If student phone GPS stops updating for more than this timeout, WhatsApp last-location alert is dispatched immediately to Parent & HOD.</p>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl bg-rose-50/30 border-rose-200">
                  <div>
                    <h4 className="font-bold text-xs text-rose-900">Red Zone & Off-Route Alerts</h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">Auto-send WhatsApp alert to Parent & HOD if student enters restricted areas.</p>
                  </div>
                  <Switch
                    checked={settings.redZoneAlertEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, redZoneAlertEnabled: v })}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                  <ShieldCheck className="w-4 h-4" /> Save & Apply API Configurations
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">WhatsApp Notification Recipients</CardTitle>
              <CardDescription>Select which authorized stakeholders receive automated WhatsApp updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">Parent Notifications</h4>
                  <p className="text-xs text-slate-500">Send Journey Started, Geofence Arrival, Red Zone, and GPS Lost alerts to Parent WhatsApp.</p>
                </div>
                <Switch
                  checked={settings.notifyParent}
                  onCheckedChange={(v) => setSettings({ ...settings, notifyParent: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">Class Tutor Notifications</h4>
                  <p className="text-xs text-slate-500">Notify designated department class tutor on journey start.</p>
                </div>
                <Switch
                  checked={settings.notifyTutor}
                  onCheckedChange={(v) => setSettings({ ...settings, notifyTutor: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">HOD Notifications</h4>
                  <p className="text-xs text-slate-500">Notify Head of Department on journey start, Red Zone breaches, & GPS disconnects.</p>
                </div>
                <Switch
                  checked={settings.notifyHod}
                  onCheckedChange={(v) => setSettings({ ...settings, notifyHod: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">Hostel Warden Notifications</h4>
                  <p className="text-xs text-slate-500">Notify hostel wardens on departure & return arrival.</p>
                </div>
                <Switch
                  checked={settings.notifyWarden}
                  onCheckedChange={(v) => setSettings({ ...settings, notifyWarden: v })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Geofence Cooldown (Minutes)</Label>
                  <Input
                    type="number"
                    value={settings.geofenceCooldownMinutes}
                    onChange={(e) => setSettings({ ...settings, geofenceCooldownMinutes: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-slate-500">Prevents duplicate notifications for the same location within this timeframe.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tracking Link Expiry (Hours)</Label>
                  <Input
                    type="number"
                    value={settings.trackingExpiryHours}
                    onChange={(e) => setSettings({ ...settings, trackingExpiryHours: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-slate-500">Tracking links automatically expire after this duration.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveSettings} className="bg-blue-600 text-white font-semibold">
                  Save Rules & Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Sender Card */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Developer Test Notification</CardTitle>
              <CardDescription>Dispatch a test WhatsApp journey notification to verify configuration or check test log.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-col sm:flex-row">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Recipient Phone</Label>
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="919876543210" />
                </div>
                <Button
                  onClick={handleTestSend}
                  disabled={isSendingTest}
                  className="mt-auto bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {isSendingTest ? "Sending..." : "Dispatch Test Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Delivery Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold">WhatsApp Delivery Audit Log</CardTitle>
              <CardDescription>Recent automated WhatsApp notifications generated by student journeys.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600">
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Recipient</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Message Type</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">
                          {new Date(log.sentAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">+{log.recipientPhone}</td>
                        <td className="p-2.5 uppercase font-medium text-slate-600">{log.recipientRole}</td>
                        <td className="p-2.5 font-mono font-semibold text-blue-600">{log.messageType}</td>
                        <td className="p-2.5">
                          {log.status === "sent" && <Badge className="bg-emerald-600 text-white">SENT</Badge>}
                          {log.status === "simulated" && <Badge className="bg-blue-100 text-blue-800 border-blue-200">TEST SIMULATED</Badge>}
                          {log.status === "failed" && <Badge variant="destructive">FAILED</Badge>}
                        </td>
                        <td className="p-2.5 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                          {log.messageBody.slice(0, 60)}...
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          No WhatsApp notification logs found.
                        </td>
                      </tr>
                    )}
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
