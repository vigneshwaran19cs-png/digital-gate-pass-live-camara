import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import TutorDashboard from "./TutorDashboard";
import HodDashboard from "./HodDashboard";
import PrincipalDashboard from "./PrincipalDashboard";
import StudentDashboard from "./StudentDashboard";
import WardenDashboard from "./WardenDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.role === "security") {
      setLocation("/security");
    }
  }, [user?.role, setLocation]);

  if (!user) return null;

  switch (user.role) {
    case "tutor": return <TutorDashboard />;
    case "hod": return <HodDashboard />;
    case "principal": return <PrincipalDashboard />;
    case "warden": return <WardenDashboard />;
    case "security": return null;
    default: return <StudentDashboard />;
  }
}
