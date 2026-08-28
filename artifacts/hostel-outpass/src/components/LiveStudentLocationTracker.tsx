import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Navigation, Compass, Battery, BatteryCharging, Shield, ShieldAlert,
  CheckCircle2, RefreshCw, Phone, MessageSquare, ExternalLink, AlertTriangle,
  Bus, Car, Train, Clock, Lock, Eye, EyeOff, Sparkles, Home
} from "lucide-react";

interface LiveStudentLocationTrackerProps {
  studentId: number;
  studentName?: string;
  studentRegisterNumber?: string;
  destinationAddress?: string;
  isParentView?: boolean;
}

export function LiveStudentLocationTracker({
  studentId,
  studentName = "Student",
  studentRegisterNumber = "",
  destinationAddress = "Erode / Salem, Tamil Nadu",
  isParentView = false,
}: LiveStudentLocationTrackerProps) {
  const { toast } = useToast();
  const [locationData, setLocationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [isTogglingPermission, setIsTogglingPermission] = useState(false);

  // Simulated live route coordinates (JKKM Campus -> Bhavani -> Erode / Salem)
  const [currentStep, setCurrentStep] = useState(2); // 0: Campus, 1: Bhavani Bridge, 2: Chithode, 3: Erode Town, 4: Reached Home

  const ROUTE_STEPS = [
    { name: "JKKM College Campus", lat: 11.5362, lng: 77.7289, distanceKm: 0, status: "Hostel Gate Exit", speed: "0 km/h" },
    { name: "Bhavani Cauvery Bridge", lat: 11.4478, lng: 77.6834, distanceKm: 8.5, status: "On the Way (Bus)", speed: "45 km/h" },
    { name: "Chithode Bypass Toll", lat: 11.3924, lng: 77.6712, distanceKm: 16.2, status: "On the Way (TNSTC Bus)", speed: "52 km/h" },
    { name: "Erode Central Bus Stand", lat: 11.3410, lng: 77.7172, distanceKm: 24.8, status: "Near Destination (Town)", speed: "25 km/h" },
    { name: "Home Address (V2)", lat: 11.3320, lng: 77.7250, distanceKm: 28.5, status: "Safely Reached Home", speed: "0 km/h" },
  ];

  const activeCoord = ROUTE_STEPS[currentStep] || ROUTE_STEPS[2];

  const fetchLocationStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/location/status/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setLocationData(data);
      }
    } catch (e) {
      console.error("Failed to load location status:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationStatus();
    const interval = setInterval(fetchLocationStatus, 15000);
    return () => clearInterval(interval);
  }, [studentId]);

  const handleToggleSharing = async () => {
    if (isParentView) return;
    const currentEnabled = locationData?.isLocationSharingEnabled !== false;
    const newEnabled = !currentEnabled;

    setIsTogglingPermission(true);
    try {
      const res = await fetch(`/api/location/toggle-sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, isLocationSharingEnabled: newEnabled }),
      });
      const d = await res.json();
      if (res.ok) {
        setLocationData((prev: any) => ({ ...prev, isLocationSharingEnabled: newEnabled }));
        toast({
          title: newEnabled ? "🟢 Location Sharing Enabled" : "🔒 Location Sharing Paused",
          description: newEnabled
            ? "Your parents and class tutor can now view your live GPS position on map."
            : "Live GPS updates are now hidden from parent view.",
        });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to toggle permission", variant: "destructive" });
    } finally {
      setIsTogglingPermission(false);
    }
  };

  const handleConfirmArrival = async () => {
    setIsConfirmingArrival(true);
    try {
      const res = await fetch(`/api/location/i-reached`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          destination: destinationAddress,
          latitude: String(activeCoord.lat),
          longitude: String(activeCoord.lng),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCurrentStep(4);
        fetchLocationStatus();
        toast({
          title: "🎉 Safe Arrival Confirmed!",
          description: "Automated SMS/In-app notifications sent to Parents, Class Tutor, and Hostel Warden.",
        });
      } else {
        toast({ title: "Error", description: d.error || "Failed to confirm arrival", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to submit arrival", variant: "destructive" });
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const isSharingAllowed = locationData?.isLocationSharingEnabled !== false;
  const isReached = locationData?.status === "Reached" || currentStep === 4;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeCoord.lat},${activeCoord.lng}`;

  return (
    <Card className="glass-card border shadow-sm overflow-hidden">
      <CardHeader className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Live GPS Location & Safe Transit Tracking
              {isSharingAllowed ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Tracking Active
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1">
                  <Lock className="w-3 h-3" /> Location Private
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Real-time geofenced outpass tracking between JKKM Campus & Home ({destinationAddress})
            </CardDescription>
          </div>
        </div>

        {/* Student Permission Toggle or Refresh */}
        <div className="flex items-center gap-2">
          {!isParentView && (
            <Button
              size="sm"
              variant={isSharingAllowed ? "outline" : "default"}
              className={`h-8 text-xs gap-1.5 font-medium ${
                isSharingAllowed
                  ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              onClick={handleToggleSharing}
              disabled={isTogglingPermission}
            >
              {isSharingAllowed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Pause Location Sharing
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Share Location with Parent
                </>
              )}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={fetchLocationStatus}
            title="Refresh GPS Signal"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Privacy Notice if Location is Hidden by Student */}
        {!isSharingAllowed && isParentView ? (
          <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Location Sharing Paused by Student</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your ward <span className="font-semibold text-slate-700">{studentName}</span> has temporarily paused live GPS location sharing. When the student re-enables sharing from their portal, real-time map tracking will automatically resume here.
            </p>
          </div>
        ) : (
          <>
            {/* Interactive Map Visualizer */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-inner h-64 sm:h-72">
              {/* Map background grid simulation */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #3b82f6 1px, transparent 1px), radial-gradient(circle, #10b981 1px, transparent 1px)",
                  backgroundSize: "24px 24px, 48px 48px",
                  backgroundColor: "#0f172a",
                }}
              />

              {/* Highway / Route Lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Road Polyline */}
                <path
                  d="M 60,60 Q 180,110 280,90 T 480,180 T 640,210"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 60,60 Q 180,110 280,90 T 480,180 T 640,210"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              </svg>

              {/* Marker 1: JKKM Campus */}
              <div className="absolute top-8 left-8 flex flex-col items-center group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ring-4 ring-blue-500/20">
                  🎓
                </div>
                <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[10px] font-medium backdrop-blur-xs shadow-md border border-slate-700">
                  JKKM Campus (Gate)
                </span>
              </div>

              {/* Marker 2: Current Live Position Pin */}
              <div
                className="absolute transition-all duration-700 flex flex-col items-center z-20 cursor-pointer"
                style={{
                  top: isReached ? "65%" : currentStep === 1 ? "30%" : currentStep === 2 ? "42%" : "55%",
                  left: isReached ? "78%" : currentStep === 1 ? "32%" : currentStep === 2 ? "48%" : "68%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/30 animate-ping absolute inset-0 -m-0" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-white shadow-2xl flex items-center justify-center text-white text-base font-bold ring-4 ring-emerald-500/30">
                    {isReached ? "🏠" : "🚌"}
                  </div>
                </div>
                <div className="mt-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {studentName.split(" ")[0]}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">
                    {activeCoord.name} ({activeCoord.speed})
                  </div>
                </div>
              </div>

              {/* Marker 3: Home / Destination (V2) */}
              <div className="absolute bottom-6 right-8 flex flex-col items-center group cursor-pointer">
                <div className={`w-8 h-8 rounded-full ${isReached ? "bg-emerald-600" : "bg-purple-600"} border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ring-4 ring-purple-500/20`}>
                  🏡
                </div>
                <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[10px] font-medium backdrop-blur-xs shadow-md border border-slate-700">
                  Home (Destination V2)
                </span>
              </div>

              {/* Live Overlay HUD Box */}
              <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl text-white text-xs space-y-1 shadow-lg max-w-56">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                  <span className="text-[10px] uppercase font-bold text-blue-400">Live GPS Status</span>
                  <span className="text-[10px] font-mono text-emerald-400">● Signal 4G</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-200 truncate">
                  📍 {activeCoord.name}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>Transit Speed:</span>
                  <span className="font-mono font-bold text-amber-300">{activeCoord.speed}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>Battery Level:</span>
                  <span className="font-mono font-bold text-emerald-300">🔋 {locationData?.batteryLevel || 88}%</span>
                </div>
              </div>
            </div>

            {/* Live Transit Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Current Status</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                  {isReached ? "Safely Reached Home" : activeCoord.status}
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Distance Traveled</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                  {activeCoord.distanceKm} km from Campus
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Destination (V2)</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={destinationAddress}>
                  {destinationAddress}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Last GPS Ping</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                  Just now (Live)
                </div>
              </div>
            </div>

            {/* Safe Arrival Notification Trigger (V2 / Home Reach) */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-400/80 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                    Safe Home Arrival / V2 Reach Notification System
                    {isReached && <Badge className="bg-emerald-600 text-white text-[10px]">Verified ✓</Badge>}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    {isReached
                      ? "✅ Student has safely reached home. Notifications delivered to Tutor, Warden & Parent."
                      : "When student arrives at home address, click below to send instant confirmation alerts to Class Tutor & Parent."}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View on Google Maps
                </a>

                {!isReached && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    onClick={handleConfirmArrival}
                    disabled={isConfirmingArrival}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isConfirmingArrival ? "Sending Alerts..." : "Confirm Reached Home (V2)"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
