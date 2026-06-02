import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, FileText, QrCode, Shield, Users, BarChart3, Bell, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loginAs } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  if (!user) return <>{children}</>;

  const getNavItems = () => {
    const items = [{ icon: Home, label: "Dashboard", href: "/dashboard" }];
    
    if (["student", "warden", "tutor", "hod", "principal"].includes(user.role)) {
      items.push({ icon: FileText, label: "Leaves", href: "/leaves" });
    }
    
    if (["student", "security", "warden"].includes(user.role)) {
      items.push({ icon: QrCode, label: "Outpasses", href: "/outpasses" });
    }
    
    if (user.role === "security") {
      items.push({ icon: Shield, label: "Security Console", href: "/security" });
    }
    
    if (user.role === "super_admin") {
      items.push({ icon: Users, label: "Users", href: "/users" });
    }
    
    if (["warden", "hod", "principal", "super_admin"].includes(user.role)) {
      items.push({ icon: BarChart3, label: "Reports", href: "/reports" });
    }

    return items;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-heading">
            O
          </div>
          <h1 className="font-heading font-semibold text-lg tracking-tight">Outpass System</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {getNavItems().map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href || location.startsWith(item.href + "/") ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
        
        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex-1"></div>
          
          <div className="flex items-center gap-4">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              </Button>
            </Link>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Demo Role Switcher</DropdownMenuLabel>
                {["student", "tutor", "hod", "principal", "warden", "security", "super_admin"].map((role) => (
                  <DropdownMenuItem 
                    key={role}
                    onClick={() => loginAs(role as any)}
                    className={user.role === role ? "bg-secondary" : ""}
                  >
                    {role.replace("_", " ")}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}