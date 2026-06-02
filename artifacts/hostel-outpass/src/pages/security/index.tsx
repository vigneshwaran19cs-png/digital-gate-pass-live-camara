import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLookupOutpass, useVerifyOutpass, useRecordReturn, useGetActivityFeed,
  getLookupOutpassQueryKey, getGetActivityFeedQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ScanLine, Search, UserCheck, UserX, Activity, Shield, Clock,
  User, Building, Home, QrCode, RefreshCw, CheckCircle2, XCircle,
  MapPin, Calendar, Hash, AlertTriangle, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

function OutpassStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    generated: { label: "Ready", cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
    verified: { label: "Verified / Out", cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    returned: { label: "Returned", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    expired: { label: "Expired", cls: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${m.cls}`}>{m.label}</span>;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchType, setSearchType] = useState<"outpass" | "register" | "name">("outpass");

  const { data: outpass, isLoading: isSearching, isError } = useLookupOutpass(
    { outpassCode: activeSearch },
    { query: { enabled: !!activeSearch, queryKey: getLookupOutpassQueryKey({ outpassCode: activeSearch }) } }
  );
  const { data: activityFeed, refetch: refetchActivity } = useGetActivityFeed(
    { query: { queryKey: getGetActivityFeedQueryKey() } }
  );

  const verifyOutpass = useVerifyOutpass();
  const recordReturn = useRecordReturn();

  const activities: any[] = (activityFeed as any)?.activities ?? [];

  const STATS = [
    { label: "Exited Today", value: activities.filter((a: any) => a.action === "exit").length, icon: UserX, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    { label: "Returned Today", value: activities.filter((a: any) => a.action === "return").length, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Active Outpasses", value: activities.filter((a: any) => a.action === "exit").length - activities.filter((a: any) => a.action === "return").length, icon: QrCode, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Invalid Attempts", value: 0, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) setActiveSearch(searchInput.trim());
  };

  const handleVerify = () => {
    if (!(outpass as any)?.id) return;
    verifyOutpass.mutate(
      { id: (outpass as any).id, data: { gateLocation: "Main Gate" } },
      {
        onSuccess: () => {
          toast({ title: "Exit Verified ✓", description: `Student exit recorded at Main Gate — ${format(new Date(), "h:mm a")}` });
          queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey({ outpassCode: activeSearch }) });
          queryClient.invalidateQueries({ queryKey: getGetActivityFeedQueryKey() });
        },
      }
    );
  };

  const handleReturn = () => {
    if (!(outpass as any)?.id) return;
    recordReturn.mutate(
      { id: (outpass as any).id },
      {
        onSuccess: () => {
          toast({ title: "Return Recorded ✓", description: `Student return logged — ${format(new Date(), "h:mm a")}` });
          queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey({ outpassCode: activeSearch }) });
          queryClient.invalidateQueries({ queryKey: getGetActivityFeedQueryKey() });
        },
      }
    );
  };

  const op = outpass as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">Security Gate</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Gate Control Console</h1>
          <p className="text-muted-foreground text-sm mt-1">Outpass verification & student movement tracking · {user?.name}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Gate Active</span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <div className={`glass-card rounded-2xl p-5 border ${s.border}`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className={`text-3xl font-heading font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Search Console */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden border border-rose-500/15">
        <div className="px-6 py-4 border-b border-border/50 bg-rose-500/5">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-rose-400" />
            <h2 className="font-heading font-semibold text-sm">Outpass Verification</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Search type tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "outpass", label: "Outpass ID", icon: QrCode },
              { key: "register", label: "Register No.", icon: Hash },
              { key: "name", label: "Student Name", icon: User },
            ].map(t => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setSearchType(t.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    searchType === t.key
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TIcon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 text-base h-12 font-mono"
                placeholder={
                  searchType === "outpass" ? "e.g. OP-0007-0001-LKM3X" :
                  searchType === "register" ? "e.g. CSE2021001" : "Student full name"
                }
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="h-12 px-6 bg-rose-600 hover:bg-rose-700 text-white gap-2">
              <ScanLine className="w-4 h-4" /> Verify
            </Button>
          </form>

          {/* Result */}
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" /> Searching outpass records…
              </motion.div>
            )}

            {activeSearch && !isSearching && !op && (
              <motion.div key="notfound" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 gap-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-rose-400 text-lg">Outpass Not Found</p>
                  <p className="text-sm text-muted-foreground mt-1">No valid outpass matched "{activeSearch}"</p>
                </div>
              </motion.div>
            )}

            {op && !isSearching && (
              <motion.div key="found" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="border border-emerald-500/20 rounded-2xl overflow-hidden">
                {/* Student Hero */}
                <div className="flex items-center gap-4 p-5 bg-emerald-500/5 border-b border-emerald-500/15">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-2xl font-heading flex-shrink-0">
                    {(op.leave?.student?.name ?? op.student?.name ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold text-lg">{op.leave?.student?.name ?? op.student?.name ?? "Student"}</h3>
                      <OutpassStatusBadge status={op.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{op.leave?.student?.registerNumber ?? "—"}</span>
                      <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" />{op.leave?.student?.department ?? "—"}</span>
                      <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" />Room {op.leave?.student?.hostelRoom ?? "—"}</span>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-muted-foreground">Outpass ID</p>
                    <p className="font-mono font-bold text-sm">{op.outpassCode}</p>
                  </div>
                </div>

                {/* Leave Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y divide-border/30">
                  {[
                    { label: "Leave Type", value: op.leave?.leaveType ?? "—", icon: Calendar },
                    { label: "Destination", value: op.leave?.destination ?? "—", icon: MapPin },
                    { label: "From", value: op.leave?.fromDate ? format(new Date(op.leave.fromDate), "MMM d, yyyy") : "—", icon: Clock },
                    { label: "Return By", value: op.leave?.toDate ? format(new Date(op.leave.toDate), "MMM d, yyyy") : "—", icon: Clock },
                  ].map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={i} className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ItemIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="text-sm font-semibold capitalize">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                {op.exitTime && (
                  <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/15">
                    <p className="text-xs text-amber-400">
                      <span className="font-medium">Exit recorded:</span> {format(new Date(op.exitTime), "MMM d, yyyy 'at' h:mm a")} · Gate: {op.gateLocation ?? "Main Gate"} · Staff: {user?.name}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 p-5 border-t border-border/30">
                  <Button
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    disabled={op.status !== "generated" || verifyOutpass.isPending}
                    onClick={handleVerify}
                  >
                    <UserX className="w-4 h-4" /> Verify Exit
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    disabled={op.status !== "verified" || recordReturn.isPending}
                    onClick={handleReturn}
                  >
                    <UserCheck className="w-4 h-4" /> Verify Return
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
            <h2 className="font-heading font-semibold text-sm">Live Activity Feed</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchActivity()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="px-6 pt-3">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">All Activity</TabsTrigger>
              <TabsTrigger value="exits" className="text-xs h-7">Exits</TabsTrigger>
              <TabsTrigger value="returns" className="text-xs h-7">Returns</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs h-7">Pending Returns</TabsTrigger>
            </TabsList>
          </div>

          {(["all", "exits", "returns", "pending"] as const).map(tab => (
            <TabsContent key={tab} value={tab} className="p-0">
              {activities.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No activity recorded yet today.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {activities
                    .filter((a: any) => tab === "all" || (tab === "exits" && a.action === "exit") || (tab === "returns" && a.action === "return") || (tab === "pending" && a.action === "exit" && !a.returned))
                    .slice(0, 15)
                    .map((activity: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/20 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          activity.action === "exit" ? "bg-rose-500/10 border border-rose-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
                        }`}>
                          {activity.action === "exit"
                            ? <UserX className="w-4 h-4 text-rose-400" />
                            : <UserCheck className="w-4 h-4 text-emerald-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.studentName ?? `Student #${activity.studentId}`}</p>
                          <p className="text-xs text-muted-foreground">{activity.action === "exit" ? "Exited" : "Returned"} · {activity.gateLocation ?? "Main Gate"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs font-medium ${activity.action === "exit" ? "text-rose-400" : "text-emerald-400"}`}>
                            {activity.action === "exit" ? "EXIT" : "RETURN"}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : "—"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
}
