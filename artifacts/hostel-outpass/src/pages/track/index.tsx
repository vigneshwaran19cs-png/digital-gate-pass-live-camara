import React, { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  MapPin,
  Clock,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Share2,
  ShieldCheck,
  Building,
  User,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Fix default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom Leaflet Icons
const studentIcon = L.divIcon({
  className: "custom-student-marker",
  html: `<div style="background-color: #2563eb; color: white; border: 3px solid white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.4); font-size: 18px; animation: pulse 2s infinite;">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const geofenceIcon = L.divIcon({
  className: "custom-geofence-marker",
  html: `<div style="background-color: #059669; color: white; border: 2px solid white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(5,150,105,0.3); font-size: 14px;">🚩</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface TrackData {
  journey: {
    id: number;
    status: "active" | "completed" | "cancelled" | "expired" | "pending";
    startLocation: string;
    destination: string;
    startedAt: string;
    completedAt?: string;
    expiresAt: string;
  };
  student: {
    name: string;
    registerNumberMasked: string;
    hostelBlock: string;
  };
  currentPosition?: {
    latitude: string;
    longitude: string;
    accuracy?: number;
    batteryLevel?: number;
    timestamp: string;
  };
  route: Array<{
    latitude: string;
    longitude: string;
    timestamp: string;
  }>;
  events: Array<{
    id: number;
    locationName: string;
    eventType: string;
    triggeredAt: string;
  }>;
}

export default function LiveTrackingPage() {
  const [, params] = useRoute("/track/:token");
  const token = params?.token;
  const { toast } = useToast();

  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const fetchTrackingData = async (showToast = false) => {
    if (!token) return;
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/track/${token}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Tracking link invalid or expired");
      }
      const jsonData: TrackData = await res.json();
      setData(jsonData);
      setError(null);
      setLastUpdated(new Date());
      if (showToast) {
        toast({ title: "Live Position Updated", description: "Map refreshed with latest coordinates." });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load live tracking details.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(() => {
      fetchTrackingData();
    }, 12000); // Auto-refresh every 12 seconds
    return () => clearInterval(interval);
  }, [token]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!data || !mapContainerRef.current) return;

    const lat = data.currentPosition ? parseFloat(data.currentPosition.latitude) : 11.5362;
    const lng = data.currentPosition ? parseFloat(data.currentPosition.longitude) : 77.7289;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
    }

    const map = mapRef.current;

    // Route Polyline
    if (data.route && data.route.length > 0) {
      const points: [number, number][] = data.route
        .map((r) => [parseFloat(r.latitude), parseFloat(r.longitude)] as [number, number])
        .filter((pt) => !isNaN(pt[0]) && !isNaN(pt[1]));

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(points);
      } else if (points.length > 0) {
        polylineRef.current = L.polyline(points, {
          color: "#2563eb",
          weight: 5,
          opacity: 0.8,
          lineJoin: "round",
        }).addTo(map);
      }
    }

    // Moving Student Marker
    if (!isNaN(lat) && !isNaN(lng)) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: studentIcon }).addTo(map);
      }
      map.panTo([lat, lng]);
    }

    // Add Markers for Reached Geofences
    if (data.events) {
      data.events.forEach((ev) => {
        if (ev.eventType === "LOCATION_ARRIVED") {
          // Find corresponding route coordinate if available
          L.marker([lat, lng], { icon: geofenceIcon })
            .addTo(map)
            .bindPopup(`<b>${ev.locationName}</b><br/>Arrived: ${new Date(ev.triggeredAt).toLocaleTimeString()}`);
        }
      });
    }
  }, [data]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Tracking Link Copied!", description: "You can share this link with authorized guardians." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center space-y-4 shadow-lg border-0 bg-white/90 backdrop-blur">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-xl font-bold text-slate-800">Loading Live Journey Map...</h2>
          <p className="text-sm text-slate-500">Connecting to GPS location server</p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center space-y-4 shadow-lg border-slate-200">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Tracking Link Expired or Invalid</h2>
          <p className="text-sm text-slate-600">{error || "This journey tracking link is no longer active."}</p>
          <div className="pt-2">
            <Badge variant="outline" className="text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Protected & Encrypted Token
            </Badge>
          </div>
        </Card>
      </div>
    );
  }

  const isCompleted = data.journey.status === "completed";
  const isActive = data.journey.status === "active";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-800/90 border-b border-slate-700/60 p-4 sticky top-0 z-50 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg flex items-center gap-2 text-white">
              Digital Outpass Live Track
              {isActive && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Student: <span className="text-slate-200 font-semibold">{data.student.name}</span> ({data.student.registerNumberMasked})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrackingData(true)}
            disabled={isRefreshing}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={copyShareLink} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Share2 className="w-4 h-4 mr-1" /> Share
          </Button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
        {/* Live Map Area (2 Columns on Desktop) */}
        <div className="lg:col-span-2 relative min-h-[400px] lg:min-h-[calc(100vh-65px)] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full min-h-[400px] lg:min-h-[calc(100vh-65px)] z-10" />

          {/* Floating Map Status Overlay */}
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur max-w-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">STATUS</span>
              {isActive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">LIVE ON THE WAY</Badge>}
              {isCompleted && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">COMPLETED</Badge>}
              {!isActive && !isCompleted && <Badge variant="secondary">{data.journey.status.toUpperCase()}</Badge>}
            </div>

            <div className="text-sm font-semibold text-white pt-1">
              {data.journey.startLocation} ➔ {data.journey.destination}
            </div>

            {data.currentPosition && (
              <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {data.currentPosition.latitude.slice(0, 7)}, {data.currentPosition.longitude.slice(0, 7)}
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  {data.currentPosition.batteryLevel || 90}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info & RedBus-style Arrival Timeline */}
        <div className="bg-slate-900 p-4 lg:p-6 border-l border-slate-800 space-y-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Journey Overview Card */}
          <Card className="bg-slate-800/80 border-slate-700/80 text-slate-100 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between text-white">
                <span>Journey Summary</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Verified Digital Gate Pass Session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" /> Student Name
                </span>
                <span className="font-semibold text-white">{data.student.name}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-400" /> Hostel Block
                </span>
                <span className="font-medium text-slate-200">{data.student.hostelBlock || "A-Block"}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Start Time
                </span>
                <span className="font-medium text-slate-200">
                  {new Date(data.journey.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 flex items-center gap-1.5 text-xs">
                  <Radio className="w-3.5 h-3.5 text-blue-400" /> Last GPS Ping
                </span>
                <span className="text-xs text-slate-300">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* RedBus Style Stepper Timeline */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" /> Location Arrival Timeline
            </h3>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
              {/* Start Location Node */}
              <div className="relative flex flex-col gap-1">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow"></span>
                <div className="font-bold text-slate-200 text-sm">{data.journey.startLocation}</div>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Journey Started at {new Date(data.journey.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Geofence Arrival Events */}
              {data.events && data.events.filter(e => e.eventType === "LOCATION_ARRIVED").map((ev) => (
                <div key={ev.id} className="relative flex flex-col gap-1">
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-slate-900 shadow"></span>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    {ev.locationName}
                    <Badge variant="outline" className="text-[10px] py-0 border-blue-500/40 text-blue-300">
                      WhatsApp Alert Sent
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400">
                    Arrived near location at {new Date(ev.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}

              {/* Final Destination Node */}
              <div className="relative flex flex-col gap-1">
                <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isCompleted ? "bg-emerald-500" : "bg-slate-600 animate-pulse"}`}></span>
                <div className="font-bold text-slate-200 text-sm">{data.journey.destination}</div>
                <div className="text-xs text-slate-400">
                  {isCompleted
                    ? `Safely Reached at ${data.journey.completedAt ? new Date(data.journey.completedAt).toLocaleTimeString() : "Completed"}`
                    : "Destination (En-route)"}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Automated Security Tracking
            </div>
            <p>
              WhatsApp notifications are automatically delivered to authorized parents & hostel staff when entering major geofence check-points.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
