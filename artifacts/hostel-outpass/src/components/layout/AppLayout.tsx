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
  ScanLine, Settings, Menu, X, ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  text: string; icon: React.ElementType; badge: string;
}> = {
  student: { label: "Student", color: "from-blue-500 to-blue-600", bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", icon: GraduationCap, badge: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  tutor: { label: "Tutor", color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", icon: BookOpen, badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  hod: { label: "Head of Dept", color: "from-violet-500 to-violet-600", bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", icon: Building2, badge: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  principal: { label: "Principal", color: "from-amber-500 to-amber-600", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", icon: Crown, badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  warden: { label: "Warden", color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400", icon: Shield, badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  security: { label: "Security", color: "from-rose-500 to-rose-600", bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-400", icon: ScanLine, badge: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  super_admin: { label: "Super Admin", color: "from-slate-400 to-slate-500", bg: "bg-slate-500/15", border: "border-slate-500/30", text: "text-slate-400", icon: Settings, badge: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

function getNavItems(role: string) {
  const items = [{ icon: Home, label: "Dashboard", href: "/dashboard" }];
  if (["student", "warden", "tutor", "hod", "principal"].includes(role))
    items.push({ icon: FileText, label: "Leaves", href: "/leaves" });
  if (["student", "security", "warden"].includes(role))
    items.push({ icon: QrCode, label: "Outpasses", href: "/outpasses" });
  if (role === "security")
    items.push({ icon: Shield, label: "Security Gate", href: "/security" });
  if (role === "super_admin")
    items.push({ icon: Users, label: "Users", href: "/users" });
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
    <div className="flex flex-col h-full bg-[#0a0f1e] text-white overflow-hidden">
      {/* Top accent bar */}
      {roleConf && (
        <div className={`h-0.5 w-full bg-gradient-to-r ${roleConf.color} flex-shrink-0`} />
      )}

      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleConf?.color ?? "from-blue-500 to-blue-600"} flex items-center justify-center shadow-lg`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm text-white leading-none">OutPass Pro</h1>
            <p className="text-[10px] text-white/40 mt-0.5">Hostel Management</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white md:hidden" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* User card */}
      {user && roleConf && (
        <div className="px-4 py-4 border-b border-white/8">
          <div className={`flex items-center gap-3 p-3 rounded-xl ${roleConf.bg} border ${roleConf.border}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleConf.color} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <span className={`text-[10px] font-medium ${roleConf.text} uppercase tracking-wider`}>{roleConf.label}</span>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200",
                  isActive
                    ? `bg-gradient-to-r ${roleConf?.color ?? "from-blue-500 to-blue-600"} text-white shadow-lg`
                    : "text-white/60 hover:text-white hover:bg-white/6"
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
      <div className="px-3 py-3 border-t border-white/8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-white/50 hover:text-white hover:bg-white/6 text-xs gap-2">
              <Settings className="w-3.5 h-3.5" />
              Switch Role (Demo)
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 bg-[#0f1629] border-white/10 text-white" side="right" align="end">
            <DropdownMenuLabel className="text-white/40 text-xs">Demo Roles</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {Object.entries(ROLE_CONFIG).map(([role, conf]) => (
              <DropdownMenuItem
                key={role}
                onClick={() => loginAs(role as any)}
                className={cn("cursor-pointer text-white/70 hover:text-white focus:text-white focus:bg-white/8", user?.role === role && "text-white bg-white/8")}
              >
                <conf.icon className={`w-3.5 h-3.5 mr-2 ${conf.text}`} />
                {conf.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          className="w-full justify-start text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 text-xs gap-2 mt-1"
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
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
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

