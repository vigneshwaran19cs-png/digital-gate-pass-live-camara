import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Sparkles, GraduationCap, Building, Lock, Mail, UserCheck,
  KeyRound, UserPlus, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff,
  RefreshCw, ArrowLeft, ShieldAlert, Shield, BookOpen, Building2, Crown, ScanLine, Users
} from "lucide-react";

type AuthMode = "login" | "setup" | "forgot" | "demo";
type TargetRoleGroup = "student" | "staff";

export default function LoginPage() {
  const {
    loginWithCredentials,
    checkSetupEligibility,
    firstTimeSetup,
    requestForgotPassword,
    resetPassword,
    demoLogin,
    user
  } = useAuth();

  const [, setLocation] = useLocation();

  const isDemoEnabled = process.env.NODE_ENV === "development" || (import.meta as any).env?.DEV === true || (typeof window !== "undefined" && window.location.hostname === "localhost");

  // Mode state: 'login' | 'setup' | 'forgot' | 'demo'
  const [mode, setMode] = useState<AuthMode>("login");
  const [loadingDemoRole, setLoadingDemoRole] = useState<string | null>(null);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Setup state
  const [roleGroup, setRoleGroup] = useState<TargetRoleGroup>("student");
  const [setupRole, setSetupRole] = useState("tutor");
  const [setupIdentifier, setSetupIdentifier] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupStep, setSetupStep] = useState<"check" | "create">("check");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [maskedContact, setMaskedContact] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Status & loading feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setSetupStep("check");
    setOtpSent(false);
  };

  const handleDemoLogin = async (role: any) => {
    setLoadingDemoRole(role);
    setError(null);
    try {
      await demoLogin(role);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Demo login failed. Please try again.");
    } finally {
      setLoadingDemoRole(null);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Standard Login Submission
  // ---------------------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your Register Number / Email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please check email/register number & password.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. First-Time Setup Eligibility Check
  // ---------------------------------------------------------------------------
  const handleSetupCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupIdentifier) {
      setError(roleGroup === "student" ? "Please enter your Register Number." : "Please enter your Email or Username.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await checkSetupEligibility(setupIdentifier, roleGroup === "student" ? "student" : setupRole);
      if (res?.eligible) {
        setVerifiedName(res.name || null);
        if (res.email) setSetupEmail(res.email);
        setSetupStep("create");
        setSuccess(`Account verified for ${res.name || setupIdentifier}. Please create your new password.`);
      }
    } catch (err: any) {
      setError(err?.message || "Account verification failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. First-Time Setup Account Creation
  // ---------------------------------------------------------------------------
  const handleSetupCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPassword || setupPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (setupPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await firstTimeSetup({
        identifier: setupIdentifier,
        password: setupPassword,
        email: setupEmail,
        role: roleGroup === "student" ? "student" : setupRole,
        name: setupName || verifiedName || undefined,
      });
      setSuccess("Account setup successful! Signing you in...");
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Forgot Password - Request OTP
  // ---------------------------------------------------------------------------
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      setError("Please enter your Register Number or Email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await requestForgotPassword(forgotIdentifier);
      if (res?.success) {
        setOtpSent(true);
        setMaskedContact(res.maskedContact || null);
        if (res.otpPreview) {
          setOtpPreview(res.otpPreview);
          setForgotOtp(res.otpPreview); // Auto-fill for convenience
        }
        setSuccess(res.message || "OTP verification code sent successfully.");
      }
    } catch (err: any) {
      setError(err?.message || "Account not found. Please verify your Register Number / Email.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Forgot Password - Reset Password
  // ---------------------------------------------------------------------------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp) {
      setError("Please enter the 6-digit OTP verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await resetPassword({
        identifier: forgotIdentifier,
        otp: forgotOtp,
        newPassword
      });
      setSuccess(res?.message || "Password reset successful! You can now log in.");
      setTimeout(() => {
        switchMode("login");
        setEmail(forgotIdentifier);
        setPassword(newPassword);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please check the OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-100/50 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-100/40 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "linear-gradient(rgba(37,99,235,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl bg-white border border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: College Branding & Campus Photo */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-blue-200 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              JKKM ERP Authentication Portal
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-heading font-black text-xl tracking-tight leading-none text-white">JKKM</h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-300 mt-1">College of Technology</p>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-heading font-extrabold leading-tight mb-3 text-white">
              Digital Gate Pass & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                Hostel Management
              </span>
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Official ERP access for Students, Tutors, HODs, Warden, Principal, Security Staff & Management.
            </p>

            <div className="bg-white/10 border border-white/10 p-3.5 rounded-2xl text-xs space-y-2 backdrop-blur-sm">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Account Security Guidance
              </div>
              <ul className="text-slate-300 text-[11px] space-y-1 list-disc pl-4">
                <li><strong className="text-white">Students:</strong> Use your official Register Number.</li>
                <li><strong className="text-white">Staff / Management:</strong> Use your assigned Email / Username.</li>
                <li>First-time users can activate their account using the <strong>First-Time Setup</strong> tab.</li>
              </ul>
            </div>
          </div>

          <div className="relative my-5 z-10 w-full overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-slate-950/60 group">
            <img
              src="/jkkm_campus.png"
              alt="J.K.K. Munirajah College of Technology Building"
              className="w-full h-48 md:h-52 object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 right-3 text-left pointer-events-none">
              <p className="text-[11px] font-bold text-white tracking-wide drop-shadow-md flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                J.K.K. Munirajah College of Technology
              </p>
              <p className="text-[9.5px] text-blue-200/90 font-medium">Main Academic & Administrative Building</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-4 relative z-10 flex items-center justify-between">
            <span>© {new Date().getFullYear()} JKKM College</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <UserCheck className="w-3 h-3" /> System Active
            </span>
          </div>
        </div>

        {/* Right Side: Tabbed Auth Console */}
        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">

            {/* Top Navigation Mode Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
                  mode === "login"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("setup")}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
                  mode === "setup"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Setup
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
                  mode === "forgot"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" /> Forgot
              </button>
              {isDemoEnabled && (
                <button
                  type="button"
                  onClick={() => switchMode("demo")}
                  className={`flex-1 py-2 px-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1 ${
                    mode === "demo"
                      ? "bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400"
                      : "bg-amber-100/70 text-amber-900 hover:bg-amber-200/80"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Dev Demo
                </button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 1: STANDARD LOGIN                                          */}
            {/* =============================================================== */}
            {mode === "login" && (
              <div className="space-y-5">
                {isDemoEnabled && (
                  <div className="p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Developer Demo Mode Active</div>
                        <div className="text-[10.5px] text-slate-600">Test all 8 role portals without credentials</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchMode("demo")}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>Open Demo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Portal Sign In</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your Student Register Number or Staff Email ID & Password.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" /> Register Number or Email ID
                    </label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. 731225AU005, warden@example.com, admin@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" /> Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Authenticating..." : "Sign In to Console"}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">First time logging in? </span>
                    <button
                      type="button"
                      onClick={() => switchMode("setup")}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Setup your password here
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 2: FIRST-TIME ACCOUNT SETUP                                */}
            {/* =============================================================== */}
            {mode === "setup" && (
              <div className="space-y-5">
                <div>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                    First-Time Credential Activation
                  </Badge>
                  <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Create Login Credentials</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up your secure personal password for first-time login access.
                  </p>
                </div>

                {/* Role Group Toggle */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setRoleGroup("student"); setSetupStep("check"); setError(null); }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      roleGroup === "student" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" /> Student Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRoleGroup("staff"); setSetupStep("check"); setError(null); }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      roleGroup === "staff" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building className="w-4 h-4" /> Staff / Admin Setup
                  </button>
                </div>

                {/* Step 1: Verify Account */}
                {setupStep === "check" ? (
                  <form onSubmit={handleSetupCheck} className="space-y-4">
                    {roleGroup === "student" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Student Register Number
                        </label>
                        <input
                          type="text"
                          required
                          value={setupIdentifier}
                          onChange={(e) => setSetupIdentifier(e.target.value)}
                          placeholder="e.g. 731225AU005 or 25AU005"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium uppercase"
                        />
                        <p className="text-[11px] text-slate-500">
                          System will verify your Register Number in official student records.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Select Official Role
                          </label>
                          <select
                            value={setupRole}
                            onChange={(e) => setSetupRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                          >
                            <option value="tutor">Class Tutor</option>
                            <option value="hod">HOD (Head of Dept)</option>
                            <option value="warden">Hostel Warden</option>
                            <option value="principal">Principal</option>
                            <option value="security">Security Guard</option>
                            <option value="parent">Parent / Guardian</option>
                            <option value="super_admin">Super Admin / Management</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-600" /> Official Email / Login Username
                          </label>
                          <input
                            type="text"
                            required
                            value={setupIdentifier}
                            onChange={(e) => setSetupIdentifier(e.target.value)}
                            placeholder="e.g. warden@example.com, tutor@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      {loading ? "Verifying Record..." : "Verify Record & Proceed"}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Create Password */
                  <form onSubmit={handleSetupCreate} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-blue-900">
                        {roleGroup === "student" ? `Student Record: ${verifiedName || setupIdentifier}` : `Staff Role: ${setupRole.toUpperCase()}`}
                      </div>
                      <div className="text-blue-700 font-mono">Identifier: {setupIdentifier}</div>
                    </div>

                    {roleGroup === "staff" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={setupName}
                          onChange={(e) => setSetupName(e.target.value)}
                          placeholder="e.g. Dr. K. Murugan"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" /> Create New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" /> Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSetupStep("check")}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? "Activating..." : "Complete Setup & Sign In"}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 3: FORGOT PASSWORD                                         */}
            {/* =============================================================== */}
            {mode === "forgot" && (
              <div className="space-y-5">
                <div>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Password Reset Recovery
                  </Badge>
                  <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Forgot Password?</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your account identifier to receive an OTP verification code.
                  </p>
                </div>

                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600" /> Student Register Number or Email ID
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. 731225AU005 or warden@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      {loading ? "Generating OTP..." : "Send Verification OTP Code"}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {otpPreview && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-900">Verification OTP Code:</span>
                        <span className="font-mono font-extrabold text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-200 text-sm tracking-widest">
                          {otpPreview}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-mono tracking-widest text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" /> Enter New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" /> Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-slate-50/50 text-sm text-slate-900 font-medium"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                      >
                        Resend Code
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? "Resetting..." : "Reset Password & Return to Sign In"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 4: DEVELOPER DEMO MODE ROLE SELECTOR                       */}
            {/* =============================================================== */}
            {mode === "demo" && (
              <div className="space-y-5">
                <div>
                  <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" /> Dev Environment Active
                  </Badge>
                  <h2 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">Developer Demo Mode</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Single-click testing for all 8 role portals. Select a role below to open its dashboard immediately.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {[
                    { id: "super_admin", label: "Super Admin", icon: Shield, color: "bg-slate-800 text-white", desc: "Full ERP management & system settings" },
                    { id: "warden", label: "Warden", icon: Building, color: "bg-cyan-600 text-white", desc: "Hostel leaves & emergency approvals" },
                    { id: "tutor", label: "Class Tutor", icon: BookOpen, color: "bg-emerald-600 text-white", desc: "Class attendance & leave verification" },
                    { id: "hod", label: "HOD (Dept Head)", icon: Building2, color: "bg-violet-600 text-white", desc: "Departmental approval & overviews" },
                    { id: "principal", label: "Principal", icon: Crown, color: "bg-amber-600 text-white", desc: "Final sanction & high-level approvals" },
                    { id: "security", label: "Security Guard", icon: ScanLine, color: "bg-rose-600 text-white", desc: "Gate scanner & live pass logging" },
                    { id: "student", label: "Student", icon: GraduationCap, color: "bg-blue-600 text-white", desc: "Apply leaves, outings & digital gate pass" },
                    { id: "parent", label: "Parent / Guardian", icon: Users, color: "bg-purple-600 text-white", desc: "Ward outpass monitoring & alerts" },
                  ].map((roleItem) => {
                    const IconComp = roleItem.icon;
                    const isLoadingThis = loadingDemoRole === roleItem.id;
                    return (
                      <button
                        key={roleItem.id}
                        type="button"
                        disabled={loadingDemoRole !== null}
                        onClick={() => handleDemoLogin(roleItem.id as any)}
                        className="p-3 rounded-2xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 text-left transition shadow-xs hover:shadow-md flex items-start gap-3 group cursor-pointer"
                      >
                        <div className={`w-9 h-9 rounded-xl ${roleItem.color} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                          {isLoadingThis ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <IconComp className="w-4.5 h-4.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900 flex items-center justify-between">
                            <span>{roleItem.label}</span>
                            <span className="text-[10px] text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                            {roleItem.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return to Standard Sign In
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
