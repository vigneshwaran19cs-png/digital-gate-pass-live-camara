import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useEffect } from "react";

export default function LoginPage() {
  const { loginAs, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/50 backdrop-blur-xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading tracking-tight">Access Portal</CardTitle>
          <CardDescription>Select a role below to enter the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              "student",
              "tutor",
              "hod",
              "principal",
              "warden",
              "security",
              "super_admin"
            ].map((role) => (
              <Button
                key={role}
                variant="outline"
                className="capitalize justify-start h-auto py-3 px-4 border-border/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => {
                  loginAs(role as any);
                  setLocation("/dashboard");
                }}
              >
                {role.replace("_", " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}