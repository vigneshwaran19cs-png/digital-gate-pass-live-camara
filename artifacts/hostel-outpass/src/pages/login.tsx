import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, BookOpen, Building2, Crown,
  Shield, ScanLine, Settings, ArrowRight, Sparkles
} from "lucide-react";

const ROLES = [
  {
    id: "student",
    label: "Student",
    subtitle: "Apply & track leave requests",
    icon: GraduationCap,
    color: "from-blue-500 to-blue-600",
    glow: "shadow-blue-500/25",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
  },
  {
    id: "tutor",
    label: "Tutor",
    subtitle: "Parent verification & first approval",
    icon: BookOpen,
    color: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-500/25",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
  },
  {
    id: "hod",
    label: "Head of Department",
    subtitle: "Department-level approval",
    icon: Building2,
    color: "from-violet-500 to-violet-600",
    glow: "shadow-violet-500/25",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-400",
  },
  {
    id: "principal",
    label: "Principal",
    subtitle: "Final academic approval authority",
    icon: Crown,
    color: "from-amber-500 to-amber-600",
    glow: "shadow-amber-500/25",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
  },
  {
    id: "warden",
    label: "Warden",
    subtitle: "Hostel management & first gate",
    icon: Shield,
    color: "from-cyan-500 to-cyan-600",
    glow: "shadow-cyan-500/25",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    text: "text-cyan-400",
  },
  {
    id: "security",
    label: "Security Staff",
    subtitle: "Gate verification & movement tracking",
    icon: ScanLine,
    color: "from-rose-500 to-rose-600",
    glow: "shadow-rose-500/25",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
  },
  {
    id: "super_admin",
    label: "Super Admin",
    subtitle: "Full system access & configuration",
    icon: Settings,
    color: "from-slate-400 to-slate-500",
    glow: "shadow-slate-500/25",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    text: "text-slate-400",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.3 } as object,
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
};

export default function LoginPage() {
  const { loginAs, user } = useAuth();
  const [, setLocation] = useLocation();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-violet-600/15 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Smart Hostel Management System
          </div>
          <h1 className="text-5xl font-heading font-bold text-white mb-3 tracking-tight">
            Select Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400">
              Role
            </span>
          </h1>
          <p className="text-white/50 text-lg">
            Choose your role below to access your personalized dashboard
          </p>
        </motion.div>

        {/* Role Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isHovered = hoveredRole === role.id;
            return (
              <motion.button
                key={role.id}
                variants={item}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredRole(role.id)}
                onHoverEnd={() => setHoveredRole(null)}
                onClick={() => { loginAs(role.id as any); setLocation("/dashboard"); }}
                className={`
                  relative text-left p-5 rounded-2xl border transition-all duration-300 group
                  bg-white/[0.03] backdrop-blur-sm cursor-pointer
                  ${isHovered ? `${role.border} shadow-xl ${role.glow}` : "border-white/8"}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${role.bg} border ${role.border} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${role.text}`} />
                  </div>
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className={`w-5 h-5 ${role.text}`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-heading text-base mb-1">{role.label}</h3>
                  <p className="text-white/45 text-sm leading-snug">{role.subtitle}</p>
                </div>
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
              </motion.button>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-white/25 text-sm mt-10"
        >
          Demo mode — no password required. Click any role to continue.
        </motion.p>
      </div>
    </div>
  );
}
