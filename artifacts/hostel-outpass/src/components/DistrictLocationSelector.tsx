import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, X, ChevronDown, Check, Sparkles, Building, Navigation } from "lucide-react";
import { TAMILNADU_DISTRICTS, detectDistrict } from "@/constants/districts";

interface DistrictLocationSelectorProps {
  passType: "leave" | "outing";
  destination: string;
  onDestinationChange: (val: string) => void;
  district: string;
  onDistrictChange: (val: string) => void;
  savedNativePlace?: string | null;
  savedOutingDestination?: string | null;
  savedDistrict?: string | null;
  isDayScholar?: boolean;
}

const COMMON_OUTING_SUGGESTIONS = [
  { label: "TN Palayam", desc: "Nearby Town" },
  { label: "Gobichettipalayam (Gobi)", desc: "Commercial Hub" },
  { label: "Komarapalayam Market", desc: "Local Market & Shops" },
  { label: "City Government Hospital, Salem", desc: "Hospital Visit" },
  { label: "State Bank of India, Branch", desc: "Bank & ATM Visit" },
  { label: "Bhavani Bus Stand Area", desc: "Transit & Shopping" },
];

export function DistrictLocationSelector({
  passType,
  destination,
  onDestinationChange,
  district,
  onDistrictChange,
  savedNativePlace,
  savedOutingDestination,
  savedDistrict,
  isDayScholar = false,
}: DistrictLocationSelectorProps) {
  const [districtQuery, setDistrictQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect district when address or location is updated
  useEffect(() => {
    if (!district) {
      if (savedDistrict && TAMILNADU_DISTRICTS.includes(savedDistrict)) {
        onDistrictChange(savedDistrict);
      } else {
        const detected = detectDistrict(destination || savedNativePlace);
        if (detected) {
          onDistrictChange(detected);
        }
      }
    }
  }, [destination, savedNativePlace, savedDistrict, district, onDistrictChange]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDistricts = TAMILNADU_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(districtQuery.trim().toLowerCase())
  );

  const handleSelectDistrict = (selectedDist: string) => {
    onDistrictChange(selectedDist);
    setIsDropdownOpen(false);
    setDistrictQuery("");

    // If destination is empty or just contains a previous district, populate with selected district as starting value
    if (!destination.trim() || TAMILNADU_DISTRICTS.includes(destination.trim())) {
      onDestinationChange(selectedDist);
    } else if (!destination.toLowerCase().includes(selectedDist.toLowerCase())) {
      onDestinationChange(`${destination}, ${selectedDist}`);
    }
  };

  const handleClearLocation = () => {
    onDestinationChange("");
    onDistrictChange("");
    setDistrictQuery("");
  };

  const handleUseSavedNativePlace = () => {
    if (savedNativePlace) {
      onDestinationChange(savedNativePlace);
      const det = detectDistrict(savedNativePlace);
      if (det) onDistrictChange(det);
    }
  };

  const handleUseSavedOuting = () => {
    if (savedOutingDestination) {
      onDestinationChange(savedOutingDestination);
      const det = detectDistrict(savedOutingDestination);
      if (det) onDistrictChange(det);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tamil Nadu District Dropdown Selector */}
      <div className="space-y-1.5" ref={dropdownRef}>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          District (Tamil Nadu) *
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs text-sm hover:border-primary transition-colors text-left"
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              {district ? (
                <span className="font-semibold text-slate-900 dark:text-white">{district} District</span>
              ) : (
                <span className="text-slate-400">Select or search your district</span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Searchable Dropdown Popup */}
          {isDropdownOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-2 max-h-64 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  type="text"
                  placeholder="Type district name (e.g. Salem, Chennai, Erode)..."
                  value={districtQuery}
                  onChange={(e) => setDistrictQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-800"
                  autoFocus
                />
                {districtQuery && (
                  <button
                    type="button"
                    onClick={() => setDistrictQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredDistricts.length > 0 ? (
                  filteredDistricts.map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => handleSelectDistrict(dist)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-lg ${
                        district === dist ? "bg-primary/10 text-primary font-bold" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        {dist}
                      </span>
                      {district === dist && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    No district found matching "{districtQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Destination / Address Text Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-primary shrink-0" />
            Destination / Detailed Address *
          </label>
          {(destination || district) && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Location
            </button>
          )}
        </div>

        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <Input
            type="text"
            placeholder={
              passType === "outing"
                ? "Enter destination, shop, bank, hospital, or town (e.g. TN Palayam, Gobi)"
                : "Enter destination, town, village, or full home address (e.g. 123 Street, Chennai)"
            }
            value={destination}
            onChange={(e) => {
              onDestinationChange(e.target.value);
              const det = detectDistrict(e.target.value);
              if (det) onDistrictChange(det);
            }}
            className="pl-10 pr-9 text-sm h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-xl"
            required
          />
          {destination && (
            <button
              type="button"
              onClick={() => onDestinationChange("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Smart Suggestions from Student Profile */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Smart Suggestions & Quick Fill
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Profile Native Place Suggestion */}
          {savedNativePlace && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseSavedNativePlace}
              className="h-8 text-xs gap-1.5 border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200"
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              Saved Home: <span className="font-semibold max-w-[180px] truncate">{savedNativePlace}</span>
            </Button>
          )}

          {/* Profile Saved Outing Suggestion */}
          {savedOutingDestination && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseSavedOuting}
              className="h-8 text-xs gap-1.5 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              Saved Outing: <span className="font-semibold max-w-[180px] truncate">{savedOutingDestination}</span>
            </Button>
          )}

          {/* Quick Outing Options */}
          {passType === "outing" &&
            COMMON_OUTING_SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  onDestinationChange(item.label);
                  const det = detectDistrict(item.label);
                  if (det) onDistrictChange(det);
                }}
                className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary/50 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
