import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole, login as apiLogin, setAuthTokenGetter, getMe, customFetch } from "@workspace/api-client-react";
import { lookupRealStudentName, STUDENT_CANDIDATE_MAP } from "@/lib/student_candidates";

interface AuthContextType {
  user: User | null;
  isDemoMode: boolean;
  loginAs: (role: UserRole) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  checkSetupEligibility: (identifier: string, role?: string) => Promise<any>;
  firstTimeSetup: (data: { identifier: string; password: string; email?: string; role?: string; name?: string }) => Promise<any>;
  requestForgotPassword: (identifier: string) => Promise<any>;
  resetPassword: (data: { identifier: string; otp: string; newPassword: string }) => Promise<any>;
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

function normalizeUserPhoto(u: any): any {
  if (!u) return u;
  if (u.role === "student" || u.registerNumber || u.barcode) {
    u.name = lookupRealStudentName(u.registerNumber || u.barcode || u.email, u.name);
  }

  const reg = (u.registerNumber || "").trim();
  const bar = (u.barcode || "").trim();
  const shortReg = reg.replace(/^7312/, "");
  const fullReg = reg.length <= 8 && reg && !reg.startsWith("7312") ? `7312${reg}` : reg;

  const candObj = (STUDENT_CANDIDATE_MAP as any)[shortReg] ||
    (STUDENT_CANDIDATE_MAP as any)[fullReg] ||
    (STUDENT_CANDIDATE_MAP as any)[reg] ||
    (STUDENT_CANDIDATE_MAP as any)[bar];

  if (!u.photoUrl || u.photoUrl.includes("unsplash") || u.photoUrl === "") {
    if (candObj?.barcode) {
      u.photoUrl = `/students/${candObj.barcode}.jpg`;
    } else if (candObj?.reg) {
      u.photoUrl = `/students/${candObj.reg}.jpg`;
    } else if (reg) {
      u.photoUrl = `/students/${reg}.jpg`;
    } else if (bar) {
      u.photoUrl = `/students/${bar}.jpg`;
    }
  }

  u.profilePhoto = u.photoUrl || (reg ? `/students/${reg}.jpg` : "/students/vimal_m.jpg");
  return u;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem("is_demo_mode") === "true";
  });

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("auth_token");
      if (savedToken) {
        setAuthTokenGetter(() => savedToken);
        try {
          const freshUser = await getMe();
          const normalized = normalizeUserPhoto(freshUser);
          setUser(normalized);
          localStorage.setItem("auth_user", JSON.stringify(normalized));
        } catch (e) {
          const savedUser = localStorage.getItem("auth_user");
          if (savedUser) {
            try {
              const parsed = normalizeUserPhoto(JSON.parse(savedUser));
              setUser(parsed);
            } catch (err) {}
          }
        }
      } else {
        const savedUser = localStorage.getItem("auth_user");
        if (savedUser) {
          try {
            const parsed = normalizeUserPhoto(JSON.parse(savedUser));
            setUser(parsed);
          } catch (e) {}
        }
      }
    };
    initAuth();
  }, []);

  const demoLogin = async (role: UserRole) => {
    try {
      const res: any = await customFetch("/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ role })
      });
      if (res?.token && res?.user) {
        const normalized = normalizeUserPhoto(res.user);
        setUser(normalized);
        setIsDemoMode(true);
        localStorage.setItem("auth_user", JSON.stringify(normalized));
        localStorage.setItem("auth_token", res.token);
        localStorage.setItem("is_demo_mode", "true");
        setAuthTokenGetter(() => res.token);
        return;
      }
    } catch (e) {
      console.warn("Backend demo-login failed, falling back to offline demo role login:", e);
    }

    await loginAs(role);
    setIsDemoMode(true);
    localStorage.setItem("is_demo_mode", "true");
  };

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const res = await apiLogin({ email, password });
      if (res.token && res.user) {
        const normalized = normalizeUserPhoto(res.user);
        setUser(normalized);
        localStorage.setItem("auth_user", JSON.stringify(normalized));
        localStorage.setItem("auth_token", res.token);
        setAuthTokenGetter(() => res.token);
        return;
      }
    } catch (e: any) {
      console.warn("Backend API login error, checking error details:", e);
      if (e?.status === 401 || e?.status === 400 || e?.status === 404) {
        throw new Error(e?.data?.error || e?.message || "Invalid credentials.");
      }
    }

    // Fallback mode for offline / test server environments
    const cleanEmail = email.trim();
    let role: UserRole = "student";
    const lower = cleanEmail.toLowerCase();
    if (lower.includes("admin")) role = "super_admin";
    else if (lower.includes("tutor")) role = "tutor";
    else if (lower.includes("hod")) role = "hod";
    else if (lower.includes("principal")) role = "principal";
    else if (lower.includes("warden")) role = "warden";
    else if (lower.includes("security")) role = "security";
    else if (lower.includes("parent")) role = "parent";

    let regNum = cleanEmail;
    if (cleanEmail.includes("@")) {
      const prefix = cleanEmail.split("@")[0].trim().toUpperCase();
      if (prefix && prefix !== "JOHN" && prefix !== "STUDENT" && prefix !== "USER") {
        regNum = prefix;
      } else {
        regNum = "25IT030";
      }
    }
    regNum = regNum.toUpperCase();

    const digitsMatch = regNum.match(/\d+/);
    const num = digitsMatch ? parseInt(digitsMatch[0], 10) : 101;
    const roomNum = `A-${101 + (num % 300)}`;

    const fallbackUser: User = {
      id: Math.floor(Math.random() * 10000) + 100,
      name: role === "student"
        ? (regNum ? lookupRealStudentName(regNum, `Student (${regNum})`) : "Student User")
        : `${role.toUpperCase().replace("_", " ")} User`,
      email: cleanEmail.includes("@") ? cleanEmail : `${regNum.toLowerCase()}@student.jkkm.ac.in`,
      registerNumber: regNum,
      barcode: regNum,
      role: role,
      phone: `98765${10000 + (num % 80000)}`,
      departmentName: "Computer Science and Engineering",
      departmentCode: "CSE",
      year: "III",
      section: "A",
      classInfo: "III Year CSE A",
      hostelBlock: "Kaveri Boys Hostel (Block A)",
      hostelRoom: roomNum,
      photoUrl: `/students/${regNum}.jpg`,
      profilePhoto: `/students/${regNum}.jpg`,
      parentName: `Parent of ${regNum}`,
      parentPhone: `98427${10000 + (num % 80000)}`,
    } as any;

    const normalized = normalizeUserPhoto(fallbackUser);
    setUser(normalized);
    localStorage.setItem("auth_user", JSON.stringify(normalized));
    localStorage.setItem("auth_token", "demo_offline_token");
    setAuthTokenGetter(() => "demo_offline_token");
  };

  const checkSetupEligibility = async (identifier: string, role?: string) => {
    try {
      return await customFetch("/api/auth/setup-check", {
        method: "POST",
        body: JSON.stringify({ identifier, role })
      });
    } catch (e: any) {
      if (e?.data?.error) throw new Error(e.data.error);
      throw e;
    }
  };

  const firstTimeSetup = async (data: { identifier: string; password: string; email?: string; role?: string; name?: string }) => {
    try {
      const res: any = await customFetch("/api/auth/first-time-setup", {
        method: "POST",
        body: JSON.stringify(data)
      });
      if (res?.token && res?.user) {
        const normalized = normalizeUserPhoto(res.user);
        setUser(normalized);
        localStorage.setItem("auth_user", JSON.stringify(normalized));
        localStorage.setItem("auth_token", res.token);
        setAuthTokenGetter(() => res.token);
      }
      return res;
    } catch (e: any) {
      if (e?.data?.error) throw new Error(e.data.error);
      throw e;
    }
  };

  const requestForgotPassword = async (identifier: string) => {
    try {
      return await customFetch("/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ identifier })
      });
    } catch (e: any) {
      if (e?.data?.error) throw new Error(e.data.error);
      throw e;
    }
  };

  const resetPassword = async (data: { identifier: string; otp: string; newPassword: string }) => {
    try {
      return await customFetch("/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify(data)
      });
    } catch (e: any) {
      if (e?.data?.error) throw new Error(e.data.error);
      throw e;
    }
  };

  const loginAs = async (role: UserRole) => {
    if (role === ("parent" as any)) {
      const parentUser = {
        id: 999,
        name: "M. Murugan (Parent / Guardian)",
        email: "parent@jkkm.edu.in",
        role: "parent" as any,
        phone: "9876543210",
      };
      setUser(parentUser as any);
      localStorage.setItem("auth_user", JSON.stringify(parentUser));
      return;
    }
    const email = seedEmails[role] || "john@example.com";
    await loginWithCredentials(email, "password");
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
    setIsDemoMode(false);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("is_demo_mode");
    sessionStorage.removeItem("original_auth_user");
    setAuthTokenGetter(() => null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isDemoMode,
      loginAs,
      demoLogin,
      loginWithCredentials,
      checkSetupEligibility,
      firstTimeSetup,
      requestForgotPassword,
      resetPassword,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
