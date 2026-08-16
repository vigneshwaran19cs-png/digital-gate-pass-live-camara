import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, GraduationCap, BookOpen, Building2, Crown, Shield, ScanLine, Settings, Building } from "lucide-react";

const ROLES = [
  {
    id: "student",
    label: "Student",
    subtitle: "Apply leaves, check approval status, and print outpasses.",
    featuresCount: 8,
    features: ["Apply Leave Requests", "Edit Draft Leaves", "Upload Documents", "Track Status Timeline", "Download Outpass PDF", "Real-time Notifications", "Leave History Log", "Change Password"],
    icon: GraduationCap,
    color: "from-blue-600 to-indigo-600",
    glow: "shadow-blue-500/10",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-600",
  },
  {
    id: "tutor",
    label: "Class Tutor",
    subtitle: "Verify requests, call parents, and grant initial approval.",
    featuresCount: 7,
    features: ["Verify Student Requests", "Tutor-Parent Call Registry", "Record Parent Response", "Approve/Reject Requests", "Remarks & History", "Access Student History", "Generate Class Reports"],
    icon: BookOpen,
    color: "from-emerald-600 to-teal-600",
    glow: "shadow-emerald-500/10",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-600",
  },
  {
    id: "hod",
    label: "Head of Dept (HOD)",
    subtitle: "Monitor department leaves and process bulk approvals.",
    featuresCount: 5,
    features: ["Department Request Queues", "Approve/Reject Leaves", "Bulk Actions Hub", "Interactive Department Analytics", "Export Department Reports"],
    icon: Building2,
    color: "from-indigo-600 to-violet-600",
    glow: "shadow-indigo-500/10",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    text: "text-indigo-600",
  },
  {
    id: "principal",
    label: "Principal",
    subtitle: "Provide final academic sign-offs and college reports.",
    featuresCount: 6,
    features: ["Final Approval Authority", "Emergency Approvals", "Bulk Decisions Queue", "College-wide Analytics", "Audit Logs & Security Feed", "Export College Reports"],
    icon: Crown,
    color: "from-amber-600 to-orange-600",
    glow: "shadow-amber-500/10",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-600",
  },
  {
    id: "warden",
    label: "Hostel Warden",
    subtitle: "Initial & final hostel checks, and block occupancy tracking.",
    featuresCount: 6,
    features: ["Warden Initial Verification", "Warden Final Verification", "Outpass Generation Hub", "Hostel Occupancy Map", "Students Outside Log", "Generate Hostel Reports"],
    icon: Shield,
    color: "from-cyan-600 to-blue-600",
    glow: "shadow-cyan-500/10",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
    text: "text-cyan-600",
  },
  {
    id: "security",
    label: "Security Staff",
    subtitle: "Campus gate outpass code validation and exit/return logs.",
    featuresCount: 4,
    features: ["Secure QR Code Scanning", "Manual Outpass Code Search", "Student Register No. Search", "Log Exit & Return Time"],
    icon: ScanLine,
    color: "from-rose-600 to-pink-600",
    glow: "shadow-rose-500/10",
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-600",
  },
  {
    id: "super_admin",
    label: "Super Admin",
    subtitle: "Full configuration of student, staff, hostel and ERP settings.",
    featuresCount: 6,
    features: ["Manage Student Directory", "Manage Staff Directory", "Configure Hostels & Rooms", "Setup Academic Years", "System Audit Logs", "ERP Global Settings"],
    icon: Settings,
    color: "from-slate-600 to-slate-800",
    glow: "shadow-slate-500/10",
    bg: "bg-slate-50",
    border: "border-slate-100",
    text: "text-slate-600",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

export default function LoginPage() {
  const { loginAs, loginWithCredentials, user } = useAuth();
  const [, setLocation] = useLocation();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<"standard" | "demo">("standard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-100/50 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-100/40 blur-[120px]" />
        {/* Soft grid background */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "linear-gradient(rgba(37,99,235,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-7xl bg-white/70 border border-slate-200/50 shadow-xl rounded-3xl backdrop-blur-md overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: College Branding & Campus Illustration */}
        <div className="lg:col-span-5 bg-gradient-to-b from-blue-50/50 via-indigo-50/30 to-white p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/50 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Smart University ERP Platform
            </div>

            {/* Branding */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-lg text-slate-800 leading-none">JKKM</h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">College of Technology</p>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900 leading-tight mb-4">
              Hostel Leave & <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Digital Outpass
              </span>
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              A premium enterprise gateway designed to digitize permission workflows, parent verification, warden sign-offs, and security gate checkouts.
            </p>
          </div>

          {/* Premium Illustration */}
          <div className="relative my-8 lg:my-0 flex justify-center items-center select-none">
            <img
              src="/jkkm_campus.png"
              alt="Campus Illustration"
              className="max-h-60 md:max-h-72 object-contain filter drop-shadow-lg"
            />
          </div>

          <div className="text-xs text-slate-400 mt-auto border-t border-slate-200/50 pt-4 relative z-10">
            © {new Date().getFullYear()} JKKM College of Technology. All Rights Reserved.
          </div>
        </div>

        {/* Right Side: Form or Role Selector */}
        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-white/40">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-800">
                {loginMode === "standard" ? "Portal Sign In" : "Select Portal Workspace"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {loginMode === "standard"
                  ? "Enter your credentials to access the Hostel Pass Manager"
                  : "Choose your organizational role below to enter the pass manager console"}
              </p>
            </div>

            {/* Toggle Button */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/50">
              <button
                type="button"
                onClick={() => { setLoginMode("standard"); setError(null); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${loginMode === "standard" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode("demo"); setError(null); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${loginMode === "demo" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
              >
                Quick Demo
              </button>
            </div>
          </div>

          {loginMode === "standard" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md w-full py-2">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white text-sm text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white text-sm text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="bg-slate-50 border border-slate-200/55 rounded-2xl p-4 mt-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Default Test Accounts</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] text-slate-600">
                  <div><strong>Student:</strong> john@example.com</div>
                  <div><strong>Warden:</strong> warden@example.com</div>
                  <div><strong>Tutor:</strong> tutor@example.com</div>
                  <div><strong>HOD:</strong> hod@example.com</div>
                  <div><strong>Principal:</strong> principal@example.com</div>
                  <div><strong>Admin:</strong> admin@example.com</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200/40 italic text-center">
                  Password: <strong>password</strong>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 text-center">
                <p className="text-xs text-slate-500">
                  Don't have credentials? Switch to
                  <button
                    type="button"
                    onClick={() => setLoginMode("demo")}
                    className="text-blue-600 font-semibold ml-1 hover:underline cursor-pointer"
                  >
                    Quick Demo
                  </button> to bypass sign in.
                </p>
              </div>
            </form>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isHovered = hoveredRole === role.id;
                return (
                  <motion.button
                    key={role.id}
                    variants={role.id === "super_admin" ? { hidden: item.hidden, show: { ...item.show, transition: { type: "spring" as const, stiffness: 400, damping: 30, delay: 0.5 } } } : item}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onHoverStart={() => setHoveredRole(role.id)}
                    onHoverEnd={() => setHoveredRole(null)}
                    onClick={() => { loginAs(role.id as any); setLocation("/dashboard"); }}
                    className={`
                      relative text-left p-5 rounded-2xl border transition-all duration-300 group
                      bg-white cursor-pointer shadow-sm flex flex-col justify-between h-44
                      ${isHovered ? `border-blue-300 shadow-md` : "border-slate-100"}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl ${role.bg} border ${role.border} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${role.text}`} />
                      </div>
                      <Badge variant="secondary" className="bg-slate-50 text-slate-500 border border-slate-100 font-medium text-[10px]">
                        {role.featuresCount} Features
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-slate-800 font-semibold font-heading text-sm mb-1 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                        {role.label}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{role.subtitle}</p>
                    </div>

                    {/* Tiny feature previews on hover */}
                    <div className="absolute inset-x-5 top-5 bottom-5 bg-white flex flex-col justify-center opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Available Workspace Modules</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {role.features.slice(0, 4).map((f, index) => (
                          <div key={index} className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${role.text} bg-current`} />
                            {f}
                          </div>
                        ))}
                        {role.features.length > 4 && (
                          <div className="text-[10px] text-slate-400 font-medium italic truncate">
                            + {role.features.length - 4} more modules
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtle card highlight glow */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300 pointer-events-none`} />
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          <p className="text-center text-slate-400 text-xs mt-6 border-t border-slate-100 pt-4">
            University Integration Demonstration — Real database accounts authenticated via XAMPP MySQL.
          </p>
        </div>
      </div>
    </div>
  );
}
