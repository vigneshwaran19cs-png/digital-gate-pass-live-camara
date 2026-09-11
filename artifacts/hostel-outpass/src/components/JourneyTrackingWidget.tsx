import React, { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Share2, ExternalLink, StopCircle, Radio, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface JourneyTrackingWidgetProps {
  outpassId?: number;
  leaveId?: number;
  destination?: string;
  studentName?: string;
  isStudent?: boolean;
}

export function JourneyTrackingWidget({
  outpassId,
  leaveId,
  destination = "Destination",
  studentName,
  isStudent = true,
}: JourneyTrackingWidgetProps) {
  const { toast } = useToast();
  const [activeJourney, setActiveJourney] = useState<{
    id: number;
    token: string;
    trackingUrl: string;
    startedAt: string;
  } | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Check localStorage for an active tracking session for this outpass/leave
  useEffect(() => {
    const key = `active_journey_${outpassId || leaveId || "current"}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setActiveJourney(parsed);
      } catch (e) {
        // invalid stored state
      }
    }
  }, [outpassId, leaveId]);

  // Start GPS watch when journey is active
  useEffect(() => {
    if (!activeJourney || !isStudent) return;

    const sendGpsUpdate = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      fetch("/api/journeys/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeJourney.token,
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          batteryLevel: 88,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setLastPingTime(new Date());
            setPingError(null);
          } else if (data.error) {
            setPingError(data.error);
          }
        })
        .catch(() => setPingError("Network disconnected"));
    };

    if ("geolocation" in navigator) {
      // Get initial position ping
      navigator.geolocation.getCurrentPosition(sendGpsUpdate, (err) => setPingError(err.message), {
        enableHighAccuracy: true,
      });

      // Periodic watch pings every 15 seconds
      watchIdRef.current = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition(sendGpsUpdate, (err) => setPingError(err.message), {
          enableHighAccuracy: true,
        });
      }, 15000);
    } else {
      setPingError("Geolocation not supported by browser");
    }

    return () => {
      if (watchIdRef.current) clearInterval(watchIdRef.current);
    };
  }, [activeJourney, isStudent]);

  const handleStartJourney = async () => {
    setIsStarting(true);
    setPingError(null);

    // Request GPS permission first
    if (!("geolocation" in navigator)) {
      toast({
        title: "GPS Unavailable",
        description: "Browser geolocation is not supported on this device.",
        variant: "destructive",
      });
      setIsStarting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/journeys/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outpassId,
              leaveId,
              startLocation: "JKKM Hostel Gate",
              destination,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to start journey");

          const sessionObj = {
            id: data.journeyId,
            token: data.trackingToken,
            trackingUrl: data.trackingUrl,
            startedAt: new Date().toISOString(),
          };

          setActiveJourney(sessionObj);
          const key = `active_journey_${outpassId || leaveId || "current"}`;
          localStorage.setItem(key, JSON.stringify(sessionObj));

          // Post initial position ping immediately
          await fetch("/api/journeys/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: data.trackingToken,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            }),
          });

          toast({
            title: "🚌 Journey Started!",
            description: "Live GPS tracking activated & WhatsApp notification dispatched to Parent & Staff.",
          });
        } catch (err: any) {
          toast({
            title: "Error Starting Journey",
            description: err.message || "Failed to initiate journey tracking.",
            variant: "destructive",
          });
        } finally {
          setIsStarting(false);
        }
      },
      (geoErr) => {
        setIsStarting(false);
        toast({
          title: "Location Permission Denied",
          description: "Please allow GPS location access to start live journey tracking.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleEndJourney = async () => {
    if (!activeJourney) return;
    setIsEnding(true);

    try {
      const res = await fetch("/api/journeys/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeJourney.token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end journey");

      const key = `active_journey_${outpassId || leaveId || "current"}`;
      localStorage.removeItem(key);
      setActiveJourney(null);

      toast({
        title: "✅ Journey Completed!",
        description: "Live tracking completed. Safe arrival WhatsApp message dispatched.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to End Journey",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
    }
  };

  const copyLink = () => {
    if (!activeJourney) return;
    navigator.clipboard.writeText(activeJourney.trackingUrl);
    toast({ title: "Tracking URL Copied!", description: "Share with parents or staff." });
  };

  if (!activeJourney) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                WhatsApp Live Journey Tracking
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                  RedBus Style
                </Badge>
              </h4>
              <p className="text-xs text-slate-600">
                Share live location updates with Parents & Tutors upon exit from hostel gate.
              </p>
            </div>
          </div>

          {isStudent && (
            <Button
              onClick={handleStartJourney}
              disabled={isStarting}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md"
            >
              {isStarting ? "Requesting GPS..." : "🚌 Start Journey"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                Active Journey Tracking Live
                <Badge className="bg-emerald-600 text-white text-[10px]">ACTIVE</Badge>
              </h4>
              <p className="text-xs text-slate-600">
                Destination: <span className="font-semibold text-slate-800">{destination}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyLink} className="text-xs border-emerald-300 hover:bg-emerald-100">
              <Share2 className="w-3.5 h-3.5 mr-1" /> Copy Link
            </Button>
            <a href={activeJourney.trackingUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Map
              </Button>
            </a>
          </div>
        </div>

        {/* Live GPS Ping Status info */}
        <div className="bg-white/80 border border-emerald-200/80 rounded-lg p-3 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-700">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>
              Last GPS Ping:{" "}
              <strong>{lastPingTime ? lastPingTime.toLocaleTimeString() : "Transmitting coordinates..."}</strong>
            </span>
          </div>

          {pingError ? (
            <span className="text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {pingError}
            </span>
          ) : (
            <span className="text-emerald-700 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> WhatsApp Alerts Active
            </span>
          )}
        </div>

        {isStudent && (
          <div className="pt-1 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndJourney}
              disabled={isEnding}
              className="text-xs font-semibold"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1.5" />
              {isEnding ? "Ending Journey..." : "Safe Arrival / End Journey"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
