import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole, login as apiLogin, setAuthTokenGetter, getMe } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  loginAs: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updatedUser: any) => void;
}

const seedEmails: Record<string, string> = {
  student: "john@example.com",
  warden: "warden@example.com",
  tutor: "tutor@example.com",
  hod: "hod@example.com",
  principal: "principal@example.com",
  security: "security@example.com",
  super_admin: "admin@example.com",
  parent: "parent@example.com",
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("auth_token");
      if (savedToken) {
        setAuthTokenGetter(() => savedToken);
        try {
          const freshUser = await getMe();
          setUser(freshUser);
          localStorage.setItem("auth_user", JSON.stringify(freshUser));
        } catch (e) {
          // Token is invalid/expired or connection issue
          setUser(null);
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          setAuthTokenGetter(() => null);
        }
      } else {
        const savedUser = localStorage.getItem("auth_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {}
        }
      }
    };
    initAuth();
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    if (res.token && res.user) {
      setUser(res.user);
      localStorage.setItem("auth_user", JSON.stringify(res.user));
      localStorage.setItem("auth_token", res.token);
      setAuthTokenGetter(() => res.token);
    } else {
      throw new Error("Invalid login response");
    }
  };

  const loginAs = async (role: UserRole) => {
    const email = seedEmails[role] || "parent@example.com";
    try {
      await loginWithCredentials(email, "password");
    } catch (e) {
      if (role === ("parent" as any)) {
        const parentUser = {
          id: 999,
          name: "M. Murugan (Parent)",
          email: "parent@example.com",
          role: "parent" as any,
          phone: "9876543210",
        };
        setUser(parentUser as any);
        localStorage.setItem("auth_user", JSON.stringify(parentUser));
      } else {
        throw e;
      }
    }
  };

  const updateUserProfile = (updatedUser: any) => {
    setUser(prev => ({ ...(prev || {}), ...updatedUser }));
    try {
      const currentSaved = JSON.parse(localStorage.getItem("auth_user") || "{}");
      localStorage.setItem("auth_user", JSON.stringify({ ...currentSaved, ...updatedUser }));
    } catch (e) {}
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    setAuthTokenGetter(() => null);
  };

  return (
    <AuthContext.Provider value={{ user, loginAs, loginWithCredentials, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
