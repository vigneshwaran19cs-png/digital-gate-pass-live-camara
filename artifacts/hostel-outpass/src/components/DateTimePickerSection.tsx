import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DateTimePickerSectionProps {
  passType: "leave" | "outing";
  fromDate: string;
  onFromDateChange: (val: string) => void;
  fromTime: string;
  onFromTimeChange: (val: string) => void;
  toDate: string;
  onToDateChange: (val: string) => void;
  toTime: string;
  onToTimeChange: (val: string) => void;
}

export function DateTimePickerSection({
  passType,
  fromDate,
  onFromDateChange,
  fromTime,
  onFromTimeChange,
  toDate,
  onToDateChange,
  toTime,
  onToTimeChange,
}: DateTimePickerSectionProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Validation calculations
  const validationResult = useMemo(() => {
    if (!fromDate || !toDate) return { isValid: true, error: "" };

    const depDate = new Date(`${fromDate}T${fromTime || "00:00"}`);
    const retDate = new Date(`${toDate}T${toTime || "23:59"}`);
    const now = new Date();
    // Allow 15 min buffer for past time check so user doesn't get blocked if clock rolls
    const nowBuffer = new Date(now.getTime() - 15 * 60 * 1000);

    if (depDate < nowBuffer && fromDate < todayStr) {
      return { isValid: false, error: "Departure date/time cannot be in the past." };
    }

    if (retDate <= depDate) {
      return {
        isValid: false,
        error:
          passType === "outing"
            ? "Expected Outing Return Time must be after Departure Out Time."
            : "Expected Return Date & Time must be after Departure Date & Time.",
      };
    }

    return { isValid: true, error: "" };
  }, [fromDate, fromTime, toDate, toTime, todayStr, passType]);

  // Format schedule text preview in student's local timezone
  const schedulePreview = useMemo(() => {
    if (!fromDate || !toDate) return null;
    try {
      const depDateObj = new Date(`${fromDate}T${fromTime || "09:00"}`);
      const retDateObj = new Date(`${toDate}T${toTime || "18:00"}`);

      const depFormatted = depDateObj.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const retFormatted = retDateObj.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const isSameDay = fromDate === toDate;

      return {
        depFormatted,
        retFormatted,
        isSameDay,
      };
    } catch (e) {
      return null;
    }
  }, [fromDate, fromTime, toDate, toTime]);

  return (
    <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-primary" />
          Departure & Expected Return Schedule *
        </label>
        {passType === "outing" && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200">
            Outing Pass: Return Same Day Before 6:00 PM
          </Badge>
        )}
      </div>

      {/* Grid for Departure and Return Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Departure Group */}
        <div className="space-y-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> 1. Departure (Out)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Departure Date *</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  min={todayStr}
                  value={fromDate}
                  onChange={(e) => {
                    onFromDateChange(e.target.value);
                    if (passType === "outing" || !toDate) {
                      onToDateChange(e.target.value);
                    }
                  }}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Out Time *</label>
              <div className="relative mt-1">
                <Input
                  type="time"
                  value={fromTime}
                  onChange={(e) => onFromTimeChange(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expected Return Group */}
        <div className="space-y-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 2. Expected Return (In)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Return Date *</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  min={fromDate || todayStr}
                  value={toDate}
                  onChange={(e) => onToDateChange(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">In Time *</label>
              <div className="relative mt-1">
                <Input
                  type="time"
                  value={toTime}
                  onChange={(e) => onToTimeChange(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Message / Error Banner */}
      {!validationResult.isValid && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationResult.error}</span>
        </div>
      )}

      {/* Schedule Preview */}
      {validationResult.isValid && schedulePreview && (
        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-2">
              <span>Verified Schedule Preview ({schedulePreview.isSameDay ? "Same-Day Outing" : "Multi-Day Leave"})</span>
            </div>
            <div className="text-[11px] text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Departure:</span> {schedulePreview.depFormatted} &nbsp;➜&nbsp;{" "}
              <span className="font-semibold">Expected Return:</span> {schedulePreview.retFormatted}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
