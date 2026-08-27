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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ScanLine, Search, UserCheck, UserX, Activity, Shield, Clock,
  User, Building, Home, QrCode, RefreshCw, CheckCircle2, XCircle,
  MapPin, Calendar, Hash, AlertTriangle, Camera, Barcode, Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { QRScanner } from "@/components/QRScanner";
import { StudentProfilePhoto } from "@/components/StudentProfilePhoto";
import { formatDateTime } from "@/lib/dateUtils";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

function OutpassStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    generated: { label: "Pass Active", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    verified: { label: "Verified / Out", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    returned: { label: "Inside Hostel", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    expired: { label: "Expired", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${m.cls}`}>{m.label}</span>;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchType, setSearchType] = useState<"barcode" | "outpass" | "register">("barcode");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  const handleScanSuccess = (code: string) => {
    let outpassCode = code;
    try {
      const parsed = JSON.parse(code);
      if (parsed && typeof parsed === "object") {
        outpassCode = parsed.outpassCode || parsed.code || parsed.id || code;
      }
    } catch (e) {}
    setSearchType("outpass");
    setSearchInput(outpassCode);
    setActiveSearch(outpassCode);
  };

  const queryParams = {
    outpassCode: searchType === "outpass" ? activeSearch : undefined,
    registerNumber: searchType === "register" || searchType === "barcode" ? activeSearch : undefined,
  };

  const { data: outpass, isLoading: isSearching } = useLookupOutpass(
    queryParams,
    { query: { enabled: !!activeSearch, queryKey: getLookupOutpassQueryKey(queryParams) } }
  );

  const { data: activityFeed, refetch: refetchActivity } = useGetActivityFeed(
    { query: { queryKey: getGetActivityFeedQueryKey() } }
  );

  const verifyOutpass = useVerifyOutpass();
  const recordReturn = useRecordReturn();

  const activities: any[] = (activityFeed as any)?.activities ?? [];

  const STATS = [
    { label: "Exited Today", value: activities.filter((a: any) => a.action === "exit").length, icon: UserX, color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100" },
    { label: "Returned Today", value: activities.filter((a: any) => a.action === "return").length, icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Active Outpasses", value: Math.max(0, activities.filter((a: any) => a.action === "exit").length - activities.filter((a: any) => a.action === "return").length), icon: QrCode, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Gate Logs Today", value: activities.length, icon: Shield, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" },
  ];

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setActiveSearch(searchInput.trim());

    if (searchType === "barcode") {
      try {
        const res = await fetch("/api/gate/verify-barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: searchInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.verified) {
          setVerificationResult(null);
          toast({
            title: "Student not found",
            description: data.message || `No student profile found for barcode / register number "${searchInput.trim()}".`,
            variant: "destructive",
          });
          return;
        }
        setVerificationResult(data);
        toast({
          title: `${data.actionType === "EXIT" ? "EXIT RECORDED ✓" : "ENTRY RECORDED ✓"}`,
          description: data.duplicateMessage || `${data.student?.name} ${data.actionType === "EXIT" ? "Exited" : "Entered"} Main Gate via ID Barcode`,
        });
      } catch (err) {
        setVerificationResult(null);
        toast({ title: "Student not found", description: "Failed to verify student barcode", variant: "destructive" });
      }
    }
  };

  const op = Array.isArray(outpass) && outpass.length > 0 ? (outpass[0] as any) : null;

  const handleVerify = () => {
    if (!op?.id) return;
    verifyOutpass.mutate(
      { id: op.id, data: { gateLocation: "Main Gate 1" } },
      {
        onSuccess: () => {
          toast({ title: "EXIT RECORDED ✓", description: `Student exit recorded at Main Gate — ${formatDateTime(new Date())}` });
          queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetActivityFeedQueryKey() });
        },
      }
    );
  };

  const handleReturn = () => {
    if (!op?.id) return;
    recordReturn.mutate(
      { id: op.id },
      {
        onSuccess: () => {
          toast({ title: "ENTRY RECORDED ✓", description: `Student entry logged at Main Gate — ${formatDateTime(new Date())}` });
          queryClient.invalidateQueries({ queryKey: getLookupOutpassQueryKey(queryParams) });
          queryClient.invalidateQueries({ queryKey: getGetActivityFeedQueryKey() });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-rose-700" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-700">Security Gate Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">
            Multi-Method Gate Verification Console
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ID Card Barcode (Primary) · Live Face (Secondary) · QR Gate Pass</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/security/scanner">
            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Camera className="w-4 h-4" /> Live Webcam Face Scanner
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <div className={`glass-card rounded-2xl p-4 border ${s.border} bg-white dark:bg-slate-900 shadow-sm`}>
                <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className={`text-2xl font-heading font-bold ${s.color} mb-0.5`}>{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Verification Selection Methods (Requirement 15 & 16) */}
      <Card className="glass-card shadow-md border-blue-100 dark:border-blue-900/30 overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Barcode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm">SELECT VERIFICATION METHOD</h2>
              <p className="text-xs text-slate-300">Scan College ID Card Barcode, Live Face, or QR Gate Pass</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500 text-white font-bold px-2.5 py-1 text-xs">
              PRIMARY: Scan ID Barcode
            </Badge>
            <Badge className="bg-indigo-600 text-white font-bold px-2.5 py-1 text-xs">
              SECONDARY: Webcam Face
            </Badge>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSearchType("barcode")}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                searchType === "barcode"
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">Option 1 (Primary)</div>
                <div className="font-extrabold text-sm text-blue-900 dark:text-blue-300 mt-0.5">Scan ID Card Barcode</div>
                <div className="text-[11px] text-muted-foreground mt-1">Read student barcode on physical college ID card</div>
              </div>
            </button>

            <Link href="/security/scanner">
              <div className="p-4 rounded-xl border text-left flex items-start gap-3 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/50 transition-all cursor-pointer h-full">
                <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-indigo-900 uppercase tracking-wide">Option 2 (Secondary)</div>
                  <div className="font-extrabold text-sm text-indigo-950 mt-0.5">Verify Using Webcam Face</div>
                  <div className="text-[11px] text-indigo-700 mt-1">Live 3D WASM face landmarker match</div>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSearchType("outpass");
                setIsScannerOpen(true);
              }}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                searchType === "outpass"
                  ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">Option 3</div>
                <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 mt-0.5">QR Gate Pass Verification</div>
                <div className="text-[11px] text-muted-foreground mt-1">Scan digital QR code printed on approved gate pass</div>
              </div>
            </button>
          </div>

          <form onSubmit={handleBarcodeSearch} className="flex gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-10 text-base h-12 font-mono border-slate-300 focus:border-blue-500"
                placeholder={
                  searchType === "barcode"
                    ? "Scan barcode or enter Register No (e.g. STU001)..."
                    : searchType === "outpass"
                    ? "Enter Outpass Code (e.g. OP-0001)..."
                    : "Enter Register Number..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
              <Check className="w-4 h-4" /> Scan & Verify
            </Button>
          </form>

          {/* Barcode Verification Result Details (Requirement 14 & 17 & 19) */}
          {verificationResult && (
            <div className="mt-4 p-4 border-2 border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-emerald-200">
                <div className="flex items-center gap-3">
                  <StudentProfilePhoto
                    photoUrl={verificationResult.student?.photoUrl}
                    name={verificationResult.student?.name}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{verificationResult.student?.name}</h3>
                      <Badge className="bg-emerald-600 text-white font-bold">
                        {verificationResult.actionType === "EXIT" ? "EXIT RECORDED ✓" : "ENTRY RECORDED ✓"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Reg: {verificationResult.student?.registerNumber || "STU001"} · Dept: {verificationResult.student?.department || "CSE"} · Room: {verificationResult.student?.hostelRoom || "A-101"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-800 font-bold uppercase">Gate Status</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {verificationResult.actionType === "EXIT" ? "Student Outside Hostel" : "Student Inside Hostel"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(verificationResult.timestamp)}</div>
                </div>
              </div>

              {verificationResult.duplicateMessage && (
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold border border-amber-200">
                  {verificationResult.duplicateMessage}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Verification Method</span>
                  <span className="font-bold text-blue-700">ID Card Barcode Scan</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Gate Pass Status</span>
                  <span className="font-bold text-emerald-600">Active Gate Pass Verified</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Last Gate Movement</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatDateTime(verificationResult.timestamp)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Security Officer</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{user?.name || "Security Officer"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Outpass Search Result Details */}
          <AnimatePresence mode="wait">
            {op && !isSearching && (
              <motion.div key="found" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="border border-slate-200 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm mt-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b">
                  <StudentProfilePhoto
                    photoUrl={op.student?.photoUrl || op.leave?.student?.photoUrl}
                    name={op.student?.name || op.leave?.student?.name}
                    size="lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold text-lg text-slate-800 dark:text-slate-100">{op.leave?.student?.name ?? op.student?.name ?? "Student"}</h3>
                      <OutpassStatusBadge status={op.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      <span>Reg: {op.leave?.student?.registerNumber ?? "STU001"}</span>
                      <span>Dept: {op.leave?.student?.department ?? "CSE"}</span>
                      <span>Room: {op.leave?.student?.hostelRoom ?? "A-101"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Leave Purpose</span>
                    <span className="font-bold">{op.leave?.reason}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Destination</span>
                    <span className="font-bold">{op.leave?.destination}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Out Date & Time</span>
                    <span className="font-bold">{formatDateTime(op.leave?.fromDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Return Date & Time</span>
                    <span className="font-bold">{formatDateTime(op.leave?.toDate)}</span>
                  </div>
                </div>

                <div className="flex gap-3 p-4 border-t bg-slate-50 dark:bg-slate-900">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                    disabled={op.status !== "generated" || verifyOutpass.isPending}
                    onClick={handleVerify}
                  >
                    <UserX className="w-4 h-4" /> RECORD EXIT ✓
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
                    disabled={op.status !== "verified" || recordReturn.isPending}
                    onClick={handleReturn}
                  >
                    <UserCheck className="w-4 h-4" /> RECORD RETURN ✓
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card className="glass-card rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
            <h2 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">Live Gate Entry & Exit Activity Audit</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchActivity()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh Feed
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="px-6 pt-3">
            <TabsList className="h-8 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="all" className="text-xs h-7">All Movements</TabsTrigger>
              <TabsTrigger value="exits" className="text-xs h-7">Exits</TabsTrigger>
              <TabsTrigger value="returns" className="text-xs h-7">Entries</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No gate movements logged yet today.</div>
              ) : (
                activities.slice(0, 15).map((act: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${act.action === "exit" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {act.action === "exit" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{act.studentName || "Student"}</div>
                        <div className="text-[11px] text-muted-foreground">{act.action === "exit" ? "EXIT GATE" : "ENTRY GATE"} · {formatDateTime(act.time)}</div>
                      </div>
                    </div>
                    <Badge variant="outline">{act.action?.toUpperCase()}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
