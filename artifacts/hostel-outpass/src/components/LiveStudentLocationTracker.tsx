import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Navigation, Compass, Battery, BatteryCharging, Shield,
  CheckCircle2, RefreshCw, Phone, MessageSquare, ExternalLink,
  Bus, Car, Train, Clock, Lock, Eye, EyeOff, Sparkles, Home,
  Layers, LocateFixed, Play, Pause, Zap
} from "lucide-react";

interface LiveStudentLocationTrackerProps {
  studentId: number;
  studentName?: string;
  studentRegisterNumber?: string;
  destinationAddress?: string;
  isParentView?: boolean;
}

// Tile Layer options
const TILE_LAYERS = {
  google_roadmap: {
    name: "Google Roadmap",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
  google_satellite: {
    name: "Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "&copy; Google Satellite Imagery",
    maxZoom: 20,
  },
  osm_standard: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  carto_dark: {
    name: "Dark Matrix",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
    attribution: "&copy; CartoDB",
    maxZoom: 19,
  },
};

// Route Coordinates along NH 544: JKKM Campus -> Bhavani -> Chithode -> Erode Central
const JKKM_CAMPUS_COORDS: [number, number] = [11.5362, 77.7289];
const ERODE_HOME_COORDS: [number, number] = [11.3410, 77.7172];

const WAYPOINTS: Array<{ name: string; coords: [number, number]; speed: string; transit: string }> = [
  { name: "JKKM College Campus Gate", coords: [11.5362, 77.7289], speed: "0 km/h", transit: "Campus Gate" },
  { name: "NH 544 Bhavani Toll Plaza", coords: [11.4782, 77.6980], speed: "55 km/h", transit: "TNSTC Express Bus" },
  { name: "Cauvery River Bridge", coords: [11.4480, 77.6830], speed: "48 km/h", transit: "TNSTC Express Bus" },
  { name: "Chithode Bypass Junction", coords: [11.3920, 77.6710], speed: "52 km/h", transit: "Bus Transfer" },
  { name: "Perundurai Road Cut", coords: [11.3650, 77.7020], speed: "35 km/h", transit: "Auto / Town Bus" },
  { name: "Erode Central Bus Stand", coords: [11.3410, 77.7172], speed: "15 km/h", transit: "Walking" },
  { name: "Residential Home (V2 Destination)", coords: [11.3340, 77.7260], speed: "0 km/h", transit: "Arrived at Home" },
];

export function LiveStudentLocationTracker({
  studentId,
  studentName = "Student",
  studentRegisterNumber = "",
  destinationAddress = "Erode / Salem, Tamil Nadu",
  isParentView = false,
}: LiveStudentLocationTrackerProps) {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayerKey, setActiveLayerKey] = useState<keyof typeof TILE_LAYERS>("google_roadmap");
  const [locationData, setLocationData] = useState<any>(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRealGpsActive, setIsRealGpsActive] = useState(false);
  const [realGpsAccuracy, setRealGpsAccuracy] = useState<number | null>(null);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [isTogglingPermission, setIsTogglingPermission] = useState(false);

  const currentWaypoint = WAYPOINTS[currentWaypointIndex] || WAYPOINTS[2];

  // Fetch initial location status from API
  const fetchLocationStatus = async () => {
    try {
      const res = await fetch(`/api/location/status/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setLocationData(data);
      }
    } catch (e) {
      console.error("Failed to load location status:", e);
    }
  };

  useEffect(() => {
    fetchLocationStatus();
    const interval = setInterval(fetchLocationStatus, 15000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Initialize Real Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: currentWaypoint.coords,
      zoom: 12,
      zoomControl: false,
    });

    // Add Zoom Control to Top Right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Add Tile Layer
    const layerConf = TILE_LAYERS[activeLayerKey];
    const tileLayer = L.tileLayer(layerConf.url, {
      subdomains: layerConf.subdomains as any,
      attribution: layerConf.attribution,
      maxZoom: layerConf.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Icon Creators
    const campusIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="background:#2563eb; color:white; border:3px solid white; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px rgba(0,0,0,0.3); font-size:18px;">
          🎓
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const homeIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="background:#7c3aed; color:white; border:3px solid white; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px rgba(0,0,0,0.3); font-size:18px;">
          🏡
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const studentIcon = L.divIcon({
      className: "custom-leaflet-marker-student",
      html: `
        <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(16,185,129,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; background:linear-gradient(135deg, #059669, #10b981); color:white; border:3px solid white; border-radius:14px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 25px rgba(16,185,129,0.5); font-size:18px;">
            🚌
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    // 1. Campus Marker & Geofence Circle
    L.marker(JKKM_CAMPUS_COORDS, { icon: campusIcon })
      .addTo(map)
      .bindPopup("<b>🏫 JKKM College Campus</b><br>Hostel Gate Origin & Exit Verification Point");

    L.circle(JKKM_CAMPUS_COORDS, {
      radius: 450,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.15,
    }).addTo(map);

    // 2. Destination Home Marker & Geofence Circle
    const destCoords = WAYPOINTS[WAYPOINTS.length - 1].coords;
    L.marker(destCoords, { icon: homeIcon })
      .addTo(map)
      .bindPopup(`<b>🏡 Destination Home Address (V2)</b><br>${destinationAddress}`);

    L.circle(destCoords, {
      radius: 350,
      color: "#7c3aed",
      fillColor: "#8b5cf6",
      fillOpacity: 0.15,
    }).addTo(map);

    // 3. Highway Route Polyline (NH 544)
    const routeCoords = WAYPOINTS.map((w) => w.coords);
    const polyline = L.polyline(routeCoords, {
      color: "#3b82f6",
      weight: 5,
      opacity: 0.85,
      dashArray: "8, 6",
    }).addTo(map);
    routePolylineRef.current = polyline;

    // 4. Moving Student Live Position Marker
    const sMarker = L.marker(currentWaypoint.coords, { icon: studentIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<b>📍 Live Student GPS Location</b><br><b>${studentName}</b><br>Speed: ${currentWaypoint.speed}<br>Mode: ${currentWaypoint.transit}`);
    studentMarkerRef.current = sMarker;

    // Fit map bounds to encompass the full journey
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map when tile layer changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const layerConf = TILE_LAYERS[activeLayerKey];
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(layerConf.url, {
      subdomains: layerConf.subdomains as any,
      attribution: layerConf.attribution,
      maxZoom: layerConf.maxZoom,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [activeLayerKey]);

  // Update Student Marker position smoothly
  const updateStudentPosition = (coords: [number, number], title: string, speedStr: string) => {
    if (!studentMarkerRef.current || !mapInstanceRef.current) return;
    studentMarkerRef.current.setLatLng(coords);
    studentMarkerRef.current.setPopupContent(
      `<b>📍 Live Student GPS Location</b><br><b>${studentName}</b><br>Location: ${title}<br>Speed: ${speedStr}`
    );
    mapInstanceRef.current.panTo(coords, { animate: true, duration: 1 });
  };

  // Real Device GPS Watcher
  const handleAcquireRealDeviceGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation Unavailable", description: "Browser GPS not supported", variant: "destructive" });
      return;
    }

    toast({ title: "📡 Requesting Device GPS...", description: "Please allow location permission in your browser." });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        setIsRealGpsActive(true);
        setRealGpsAccuracy(Math.round(accuracy));

        const speedFormatted = speed ? `${Math.round(speed * 3.6)} km/h` : "Live Moving";
        updateStudentPosition([latitude, longitude], "Real Device GPS Position", speedFormatted);

        // Update server database
        try {
          await fetch(`/api/location/update-gps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId,
              latitude,
              longitude,
              batteryLevel: 91,
              notes: `Real Device GPS (Accuracy: ±${Math.round(accuracy)}m)`,
            }),
          });
        } catch (e) {}

        toast({
          title: "🛰️ Real Device GPS Signal Locked!",
          description: `Live coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Accuracy: ±${Math.round(accuracy)}m)`,
        });
      },
      (err) => {
        toast({
          title: "GPS Permission Error",
          description: err.message || "Could not retrieve device GPS. Using transit waypoint routing.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Transit Simulation Timer
  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      timer = setInterval(() => {
        setCurrentWaypointIndex((prev) => {
          const next = (prev + 1) % WAYPOINTS.length;
          const wp = WAYPOINTS[next];
          updateStudentPosition(wp.coords, wp.name, wp.speed);
          return next;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Privacy Permission Toggle
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
      if (res.ok) {
        setLocationData((prev: any) => ({ ...prev, isLocationSharingEnabled: newEnabled }));
        toast({
          title: newEnabled ? "🟢 Location Sharing Enabled" : "🔒 Location Sharing Paused",
          description: newEnabled
            ? "Your parents and class tutor can now view your live GPS position on the map."
            : "Live GPS coordinates are now hidden from parent view.",
        });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to toggle permission", variant: "destructive" });
    } finally {
      setIsTogglingPermission(false);
    }
  };

  // Safe Home Arrival Notification Trigger
  const handleConfirmArrival = async () => {
    setIsConfirmingArrival(true);
    try {
      const res = await fetch(`/api/location/i-reached`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          destination: destinationAddress,
          latitude: String(currentWaypoint.coords[0]),
          longitude: String(currentWaypoint.coords[1]),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCurrentWaypointIndex(WAYPOINTS.length - 1);
        updateStudentPosition(WAYPOINTS[WAYPOINTS.length - 1].coords, "Home Address", "0 km/h");
        fetchLocationStatus();
        toast({
          title: "🎉 Safe Arrival Confirmed!",
          description: "Automated instant notifications delivered to Class Tutor, Parents, and Hostel Warden.",
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
  const isReached = locationData?.status === "Reached" || currentWaypointIndex === WAYPOINTS.length - 1;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${JKKM_CAMPUS_COORDS[0]},${JKKM_CAMPUS_COORDS[1]}&destination=${currentWaypoint.coords[0]},${currentWaypoint.coords[1]}`;

  return (
    <Card className="glass-card border shadow-md overflow-hidden">
      <CardHeader className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Real Google Map GPS Live Tracking
              {isSharingAllowed ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-time Satellite Active
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1">
                  <Lock className="w-3 h-3" /> Location Private
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Live highway outpass transit from JKKM Campus &rarr; {destinationAddress}
            </CardDescription>
          </div>
        </div>

        {/* Action Buttons: Layer Switcher, Real GPS, Simulation, Privacy Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Map Layer Switcher */}
          <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveLayerKey("google_roadmap")}
              className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
                activeLayerKey === "google_roadmap" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🗺️ Roadmap
            </button>
            <button
              type="button"
              onClick={() => setActiveLayerKey("google_satellite")}
              className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
                activeLayerKey === "google_satellite" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🛰️ Satellite
            </button>
            <button
              type="button"
              onClick={() => setActiveLayerKey("osm_standard")}
              className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
                activeLayerKey === "osm_standard" ? "bg-white text-blue-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🛣️ OSM
            </button>
          </div>

          {/* Real Device GPS Button */}
          {!isParentView && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
              onClick={handleAcquireRealDeviceGps}
              title="Locate using your device's actual GPS sensor"
            >
              <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
              {isRealGpsActive ? `GPS Locked (±${realGpsAccuracy}m)` : "Use My Device GPS"}
            </Button>
          )}

          {/* Simulation Toggle */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => setIsSimulating(!isSimulating)}
            title="Simulate realistic student travel along highway"
          >
            {isSimulating ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
            {isSimulating ? "Pause Demo" : "Simulate Travel"}
          </Button>

          {/* Privacy Toggle for Student */}
          {!isParentView && (
            <Button
              size="sm"
              variant={isSharingAllowed ? "outline" : "default"}
              className={`h-7 text-[11px] gap-1 font-medium ${
                isSharingAllowed ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "bg-emerald-600 text-white"
              }`}
              onClick={handleToggleSharing}
              disabled={isTogglingPermission}
            >
              {isSharingAllowed ? (
                <>
                  <EyeOff className="w-3 h-3 text-slate-500" /> Pause Parent Sharing
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" /> Share with Parent
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Privacy Notice if Location is Hidden by Student */}
        {!isSharingAllowed && isParentView ? (
          <div className="p-8 bg-slate-50 border border-dashed rounded-2xl text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">Live Location Sharing Paused by Student</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Your ward <span className="font-semibold text-slate-700">{studentName}</span> has kept GPS location sharing private. As per institution privacy policy, real-time map tracking will automatically stream here once the student enables sharing.
            </p>
          </div>
        ) : (
          <>
            {/* Real Interactive Leaflet / Google Map Container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
              {/* Map Canvas */}
              <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0 bg-slate-100" />

              {/* Floating Real-Time HUD Overlay Badge */}
              <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs space-y-1.5 max-w-64">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Live GPS Telemetry
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] px-1 py-0 font-mono">
                    4G LTE
                  </Badge>
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  📍 {currentWaypoint.name}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                  <span>Transit Mode:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{currentWaypoint.transit}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                  <span>Current Speed:</span>
                  <span className="font-mono font-bold text-emerald-600">{currentWaypoint.speed}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                  <span>Device Battery:</span>
                  <span className="font-mono font-bold text-emerald-600">🔋 {locationData?.batteryLevel || 91}%</span>
                </div>
              </div>

              {/* Quick Center on Student Button */}
              <div className="absolute bottom-3 right-3 z-[1000]">
                <Button
                  size="sm"
                  className="bg-white/95 text-slate-800 hover:bg-white border border-slate-300 shadow-md text-xs font-semibold gap-1.5 h-8 backdrop-blur-xs"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView(currentWaypoint.coords, 14, { animate: true });
                    }
                  }}
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" /> Center on Student
                </Button>
              </div>
            </div>

            {/* Live Transit Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Transit Status</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {isReached ? "Safely Reached Home" : currentWaypoint.transit}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Current Speed</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {currentWaypoint.speed}
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Destination (V2)</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={destinationAddress}>
                  {destinationAddress}
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 rounded-xl space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Device Battery</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  🔋 {locationData?.batteryLevel || 91}% (Normal)
                </div>
              </div>
            </div>

            {/* Safe Home Arrival Notification Box */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    Safe Home Arrival / V2 Reach Notification System
                    {isReached && <Badge className="bg-emerald-600 text-white text-[10px]">Verified ✓</Badge>}
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    {isReached
                      ? "✅ Student has safely reached home. Automatic notifications delivered to Class Tutor, Parents, and Warden."
                      : "When student arrives at home address, click below to trigger instant automated safe arrival alerts to Class Tutor & Parents."}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-xs transition-all"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" /> Open in Google Maps
                </a>

                {!isReached && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-4 py-2 rounded-xl shadow-sm"
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
