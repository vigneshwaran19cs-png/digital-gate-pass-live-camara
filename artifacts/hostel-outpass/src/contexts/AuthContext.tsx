import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
}

const mockUsers: Record<UserRole, User> = {
  student: { id: 1, name: "John Doe", email: "john@example.com", role: "student", registerNumber: "STU001", department: "Computer Science", phone: "1234567890", parentPhone: "0987654321", hostelRoom: "A-101", photoUrl: "" },
  warden: { id: 2, name: "Mr. Warden", email: "warden@example.com", role: "warden" },
  tutor: { id: 3, name: "Dr. Smith", email: "tutor@example.com", role: "tutor", department: "Computer Science" },
  hod: { id: 4, name: "Prof. Hod", email: "hod@example.com", role: "hod", department: "Computer Science" },
  principal: { id: 5, name: "Dr. Principal", email: "principal@example.com", role: "principal" },
  security: { id: 6, name: "Officer Security", email: "security@example.com", role: "security" },
  super_admin: { id: 7, name: "Super Admin", email: "admin@example.com", role: "super_admin" },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("auth_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const loginAs = (role: UserRole) => {
    const u = mockUsers[role];
    setUser(u);
    localStorage.setItem("auth_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider value={{ user, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
