import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code, Settings, ShieldAlert, Check, RefreshCw, X, ChevronRight,
  GraduationCap, BookOpen, Building2, Crown, Shield, ScanLine, Users, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const ROLES: { id: UserRole; label: string; icon: any; color: string; desc: string }[] = [
  { id: "super_admin", label: "Super Admin", icon: Settings, color: "bg-slate-700 text-white", desc: "Full System Control, Users, ID-Cards, Settings" },
  { id: "warden", label: "Warden", icon: Shield, color: "bg-cyan-600 text-white", desc: "Hosteller Leaves, Emergency Approvals, Gate Logs" },
  { id: "tutor", label: "Class Tutor", icon: BookOpen, color: "bg-emerald-600 text-white", desc: "Student Attendance, Leave Verification, Parent Calls" },
  { id: "hod", label: "Head of Dept (HOD)", icon: Building2, color: "bg-violet-600 text-white", desc: "Department Approval Chain, Academic Reports" },
  { id: "principal", label: "Principal", icon: Crown, color: "bg-amber-600 text-white", desc: "Final Leave Sanctions & High-Level Approvals" },
  { id: "security", label: "Security Guard", icon: ScanLine, color: "bg-rose-600 text-white", desc: "Gate Camera Scanner, Barcode/QR Pass Verification" },
  { id: "student", label: "Student", icon: GraduationCap, color: "bg-blue-600 text-white", desc: "Apply Outings, Hostel Leave, View Digital Gate Pass" },
  { id: "parent" as any, label: "Parent / Guardian", icon: Users, color: "bg-purple-600 text-white", desc: "Ward Outpass Monitoring, Leave Alerts, Intimations" },
];

export function DevToolsPanel() {
  const isEnvDev = process.env.NODE_ENV === "development" || (import.meta as any).env?.DEV === true || (typeof window !== "undefined" && window.location.hostname === "localhost");

  const { user, demoLogin, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!isEnvDev) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isDevModeActive, setIsDevModeActive] = useState<boolean>(() => {
    return localStorage.getItem("dev_mode_active") === "true";
  });
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // Keyboard shortcut Ctrl + Shift + D to toggle panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleDevMode = (active: boolean) => {
    setIsDevModeActive(active);
    localStorage.setItem("dev_mode_active", active ? "true" : "false");
    if (active) {
      if (user && !sessionStorage.getItem("original_auth_user")) {
        sessionStorage.setItem("original_auth_user", JSON.stringify(user));
      }
      toast({
        title: "⚡ Developer Mode Enabled",
        description: "You can now test all role portals instantly. Press Ctrl+Shift+D anytime.",
      });
    } else {
      handleExitDevMode();
    }
  };

  const handleSwitchRole = async (roleId: UserRole) => {
    setLoadingRole(roleId);
    try {
      if (!sessionStorage.getItem("original_auth_user") && user) {
        sessionStorage.setItem("original_auth_user", JSON.stringify(user));
      }
      await demoLogin(roleId);
      localStorage.setItem("dev_mode_active", "true");
      setIsDevModeActive(true);
      toast({
        title: `✅ Switched to ${roleId.toUpperCase().replace("_", " ")} Portal`,
        description: "Navigating to role dashboard...",
      });
      setLocation("/dashboard");
      setIsOpen(false);
    } catch (e: any) {
      toast({
        title: "Role Switch Failed",
        description: e?.message || "Could not switch to selected role.",
        variant: "destructive",
      });
    } finally {
      setLoadingRole(null);
    }
  };

  const handleExitDevMode = () => {
    setIsDevModeActive(false);
    localStorage.setItem("dev_mode_active", "false");

    const savedOriginal = sessionStorage.getItem("original_auth_user");
    if (savedOriginal) {
      try {
        const originalUser = JSON.parse(savedOriginal);
        localStorage.setItem("auth_user", JSON.stringify(originalUser));
        sessionStorage.removeItem("original_auth_user");
        toast({
          title: "↩️ Exited Developer Mode",
          description: `Restored original session: ${originalUser.name} (${originalUser.role}).`,
        });
        window.location.href = "/dashboard";
        return;
      } catch (e) {}
    }

    logout();
    setLocation("/");
    toast({
      title: "↩️ Exited Developer Mode",
      description: "Returned to Login Portal.",
    });
  };

  return (
    <>
      {/* Dev Mode Banner (Visible at top when Dev Mode is active) */}
      {isDevModeActive && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-1.5 flex items-center justify-between text-xs shadow-md z-50 select-none">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] tracking-widest flex items-center gap-1">
              <Code className="w-3 h-3" /> DEMO / DEV MODE
            </span>
            <span>
              Impersonating Role: <strong className="uppercase tracking-wide underline">{user?.role?.replace("_", " ")}</strong> ({user?.name})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsOpen(true)}
              className="h-6 text-[10px] font-bold px-2.5 bg-white text-slate-900 hover:bg-slate-100"
            >
              Switch Role (Ctrl+Shift+D)
            </Button>
            {user?.role !== "super_admin" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSwitchRole("super_admin")}
                className="h-6 text-[10px] font-bold px-2 border-white/40 text-white hover:bg-white/20"
              >
                Return to Admin
              </Button>
            )}
            <button
              onClick={handleExitDevMode}
              className="text-white hover:text-amber-200 font-bold ml-2 text-xs flex items-center gap-1"
              title="Exit Dev Mode"
            >
              <X className="w-4 h-4" /> Exit Dev
            </button>
          </div>
        </div>
      )}

      {/* Floating Developer Tools Trigger Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className={`shadow-2xl font-bold gap-2 text-xs h-10 px-3.5 rounded-full border-2 transition-transform hover:scale-105 ${
            isDevModeActive
              ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-300 ring-2 ring-amber-400/50"
              : "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
          }`}
        >
          <Code className="w-4 h-4 text-amber-400" />
          <span>Dev Tools</span>
          {user?.role && (
            <Badge className="bg-white/20 text-white text-[10px] font-bold capitalize ml-1 border-none">
              {user.role.replace("_", " ")}
            </Badge>
          )}
        </Button>
      </div>

      {/* Developer Tools Drawer / Popup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Code className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    OutPass Pro Developer Tools
                  </h2>
                  <p className="text-xs text-slate-500">
                    Switch between all 8 role portals with one click during development & testing.
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Mode Toggle Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Developer Role Impersonation
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Status: {isDevModeActive ? <strong className="text-emerald-600">Active (Dev Environment)</strong> : "Disabled"}
                </div>
              </div>

              <Button
                variant={isDevModeActive ? "destructive" : "default"}
                size="sm"
                className="text-xs h-8"
                onClick={() => handleToggleDevMode(!isDevModeActive)}
              >
                {isDevModeActive ? "Disable Dev Mode" : "Enable Dev Mode"}
              </Button>
            </div>

            {/* Quick Role Selection Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Select Target Role Portal ({ROLES.length} Roles)</span>
                <span className="text-[10px] text-slate-400 font-normal">Shortcut: Ctrl + Shift + D</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLES.map((r) => {
                  const IconComp = r.icon;
                  const isCurrent = user?.role === r.id;
                  const isLoadingThis = loadingRole === r.id;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isLoadingThis}
                      onClick={() => handleSwitchRole(r.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isCurrent
                          ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-2 ring-amber-300"
                          : "border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                        {isLoadingThis ? <RefreshCw className="w-4 h-4 animate-spin" /> : <IconComp className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span className="truncate">{r.label}</span>
                          {isCurrent && <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0">Active</Badge>}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2">
                          {r.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button variant="outline" size="sm" onClick={handleExitDevMode} className="text-xs gap-1.5 text-rose-600 border-rose-200">
                <ArrowLeft className="w-3.5 h-3.5" /> Restore Original Session
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)} className="text-xs">
                Close Panel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
