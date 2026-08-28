import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, FileText, QrCode, Shield, Users, BarChart3, Bell,
  LogOut, Sun, Moon, GraduationCap, BookOpen, Building2, Crown,
  ScanLine, Settings, Menu, X, ChevronRight, Camera, CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useListNotifications } from "@workspace/api-client-react";

const ROLE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  text: string; icon: React.ElementType; badge: string;
}> = {
  student: { label: "Student", color: "from-blue-600 to-indigo-600", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", icon: GraduationCap, badge: "bg-blue-50 text-blue-700 border-blue-100" },
  parent: { label: "Parent / Guardian", color: "from-purple-600 to-pink-600", bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-600", icon: Users, badge: "bg-purple-50 text-purple-700 border-purple-100" },
  tutor: { label: "Tutor", color: "from-emerald-600 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", icon: BookOpen, badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  hod: { label: "Head of Dept", color: "from-violet-600 to-indigo-600", bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", icon: Building2, badge: "bg-violet-50 text-violet-700 border-violet-100" },
  principal: { label: "Principal", color: "from-amber-600 to-orange-600", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", icon: Crown, badge: "bg-amber-50 text-amber-700 border-amber-100" },
  warden: { label: "Warden", color: "from-cyan-600 to-blue-600", bg: "bg-cyan-50", border: "border-cyan-100", text: "text-cyan-600", icon: Shield, badge: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  security: { label: "Security", color: "from-rose-600 to-pink-600", bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600", icon: ScanLine, badge: "bg-rose-50 text-rose-700 border-rose-100" },
  super_admin: { label: "Super Admin", color: "from-slate-500 to-slate-700", bg: "bg-slate-50", border: "border-slate-100", text: "text-slate-600", icon: Settings, badge: "bg-slate-50 text-slate-700 border-slate-100" },
};

function getNavItems(role: string) {
  if (role === "parent") {
    return [
      { icon: Home, label: "Parent Monitoring Hub", href: "/dashboard" },
      { icon: QrCode, label: "Ward's Digital Outpass", href: "/outpasses" },
      { icon: Bell, label: "Alerts & Notifications", href: "/notifications" },
    ];
  }

  const items = [{ icon: Home, label: "Dashboard", href: "/dashboard" }];
  if (role === "student") {
    items.push({ icon: Camera, label: "Face Enrollment", href: "/enrollment" });
    items.push({ icon: GraduationCap, label: "My Profile", href: "/profile" });
  }
  if (["student", "warden", "tutor", "hod", "principal"].includes(role))
    items.push({ icon: FileText, label: "Leaves", href: "/leaves" });
  if (role === "student")
    items.push({ icon: FileText, label: "Emergency Leave", href: "/leaves/emergency" });
  if (["tutor", "warden", "hod", "principal", "super_admin"].includes(role))
    items.push({ icon: CheckCircle2, label: "Bulk Approval", href: "/leaves/bulk-approve" });
  if (["student", "security", "warden"].includes(role))
    items.push({ icon: QrCode, label: "Outpasses", href: "/outpasses" });
  if (["security", "warden"].includes(role))
    items.push({ icon: ScanLine, label: "Live Camera Scanner", href: "/security/scanner" });
  if (role === "security")
    items.push({ icon: Shield, label: "Security Gate", href: "/security" });
  if (["warden", "super_admin"].includes(role))
    items.push({ icon: Building2, label: "Hostel Blocks", href: "/admin/hostels" });
  if (role === "super_admin") {
    items.push({ icon: Users, label: "Users", href: "/users" });
    items.push({ icon: Building2, label: "Departments", href: "/admin/departments" });
    items.push({ icon: BookOpen, label: "Classes", href: "/admin/classes" });
    items.push({ icon: Bell, label: "Notification Logs", href: "/admin/notification-logs" });
  }
  if (["warden", "hod", "principal", "super_admin"].includes(role))
    items.push({ icon: BarChart3, label: "Reports", href: "/reports" });
  items.push({ icon: Bell, label: "Notifications", href: "/notifications" });
  return items;
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout, loginAs } = useAuth();
  const [location] = useLocation();
  const roleConf = user ? (ROLE_CONFIG[user.role] ?? ROLE_CONFIG.student) : null;
  const RoleIcon = roleConf?.icon ?? GraduationCap;
  const navItems = user ? getNavItems(user.role) : [];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 overflow-hidden">
      {/* Top accent bar */}
      {roleConf && (
        <div className={`h-0.5 w-full bg-gradient-to-r ${roleConf.color} flex-shrink-0`} />
      )}

      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleConf?.color ?? "from-blue-600 to-indigo-600"} flex items-center justify-center shadow-sm`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm text-slate-800 leading-none">OutPass Pro</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Hostel Management</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 md:hidden" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* User card */}
      {user && roleConf && (
        <div className="px-4 py-4 border-b border-slate-200/50">
          <div className={`flex items-center gap-3 p-3 rounded-xl ${roleConf.bg} border ${roleConf.border}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleConf.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <span className={`text-[10px] font-semibold ${roleConf.text} uppercase tracking-wider`}>{roleConf.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((navItem) => {
          const isActive = location === navItem.href || location.startsWith(navItem.href + "/");
          return (
            <Link key={navItem.href} href={navItem.href} onClick={onClose}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 border",
                  isActive
                    ? `bg-gradient-to-r ${roleConf?.color ?? "from-blue-600 to-indigo-600"} border-blue-100/20 text-white shadow-sm font-semibold`
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <navItem.icon className="w-4 h-4 flex-shrink-0" />
                <span>{navItem.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Role switcher */}
      <div className="px-3 py-3 border-t border-slate-200/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs gap-2">
              <Settings className="w-3.5 h-3.5" />
              Switch Role (Demo)
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 bg-white border-slate-200 text-slate-800" side="right" align="end">
            <DropdownMenuLabel className="text-slate-400 text-xs">Demo Roles</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            {Object.entries(ROLE_CONFIG).map(([role, conf]) => (
              <DropdownMenuItem
                key={role}
                onClick={() => loginAs(role as any)}
                className={cn("cursor-pointer text-slate-700 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-50", user?.role === role && "font-semibold bg-slate-50")}
              >
                <conf.icon className={`w-3.5 h-3.5 mr-2 ${conf.text}`} />
                {conf.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          className="w-full justify-start text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs gap-2 mt-1"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notificationsRaw = [] } = useListNotifications();
  const notifications = notificationsRaw as any[];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  if (!user) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden md:block border-r border-border/50">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 h-full w-64 z-50 md:hidden border-r border-white/10"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-8 h-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="hidden md:block">
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative w-8 h-8">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" asChild>
                  <button className="w-full text-left" onClick={logout}>Sign Out</button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

