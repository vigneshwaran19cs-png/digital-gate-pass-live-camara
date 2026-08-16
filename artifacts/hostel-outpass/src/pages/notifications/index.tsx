import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, CheckCheck, Check, Clock, FileText, QrCode, Shield,
  AlertTriangle, RefreshCw, Inbox, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: "spring" as const, stiffness: 400, damping: 32 } }),
};

type NotifType = "all" | "leave" | "outpass" | "security" | "system";

const FILTER_TABS: { value: NotifType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "all", label: "All", icon: Bell, color: "text-slate-600", bg: "bg-slate-50" },
  { value: "leave", label: "Leave Updates", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "outpass", label: "Outpass", icon: QrCode, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "security", label: "Security", icon: Shield, color: "text-rose-600", bg: "bg-rose-50" },
  { value: "system", label: "System", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
];

function getNotifStyle(type: string) {
  const styles: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    leave_applied:    { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    leave_approved:   { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    leave_rejected:   { icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    outpass_ready:    { icon: QrCode, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
    student_exit:     { icon: Shield, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    student_return:   { icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    parent_call:      { icon: Bell, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
    system:           { icon: AlertTriangle, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
  };
  return styles[type] ?? styles.system;
}

function inferCategory(title: string, message: string): NotifType {
  const text = (title + " " + message).toLowerCase();
  if (text.includes("leave") || text.includes("approv") || text.includes("reject") || text.includes("tutor") || text.includes("warden")) return "leave";
  if (text.includes("outpass") || text.includes("gate pass") || text.includes("qr")) return "outpass";
  if (text.includes("exit") || text.includes("return") || text.includes("gate") || text.includes("security")) return "security";
  return "system";
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotifType>("all");

  const { data: notificationsRaw = [], isLoading, refetch } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsRaw as any[];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n => {
    if (activeFilter === "all") return true;
    return inferCategory(n.title, n.message) === activeFilter;
  });

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "All notifications marked as read ✓" });
      },
    });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center relative">
              <Bell className="w-4 h-4 text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Notifications</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">Activity Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stay updated on leave statuses, outpasses, and gate activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mark all read</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Bar */}
      {notifications.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-3 bg-white shadow-sm border border-slate-100 text-center">
            <div className="text-xl font-bold text-slate-800">{notifications.length}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
          <div className="glass-card rounded-xl p-3 bg-white shadow-sm border border-rose-100 text-center">
            <div className="text-xl font-bold text-rose-600">{unreadCount}</div>
            <div className="text-[10px] text-muted-foreground">Unread</div>
          </div>
          <div className="glass-card rounded-xl p-3 bg-white shadow-sm border border-emerald-100 text-center">
            <div className="text-xl font-bold text-emerald-600">{notifications.length - unreadCount}</div>
            <div className="text-[10px] text-muted-foreground">Read</div>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.value === "all" ? notifications.length : notifications.filter(n => inferCategory(n.title, n.message) === tab.value).length;
          const unread = tab.value === "all" ? unreadCount : notifications.filter(n => !n.isRead && inferCategory(n.title, n.message) === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeFilter === tab.value
                  ? `${tab.bg} ${tab.color} border-current/20 shadow-sm`
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${unread > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Notification List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="glass-card rounded-2xl p-12 text-center bg-white">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500 opacity-60" />
            <p className="text-sm text-muted-foreground">Loading notifications…</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-16 text-center bg-white flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-heading font-semibold text-slate-700">All Clear!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFilter === "all" ? "You have no notifications." : `No ${activeFilter} notifications found.`}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((notification: any, i: number) => {
              const style = getNotifStyle(notification.type ?? "system");
              const Icon = style.icon;
              const isUnread = !notification.isRead;
              return (
                <motion.div
                  key={notification.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, x: -20 }}
                  className={`relative rounded-2xl border transition-all group cursor-pointer ${
                    isUnread
                      ? "bg-white border-blue-100 shadow-sm"
                      : "bg-white/60 border-slate-100 hover:bg-white hover:border-slate-200"
                  }`}
                >
                  {/* Unread indicator */}
                  {isUnread && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 -ml-0" />
                  )}

                  <div className="flex items-start gap-4 p-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${isUnread ? "text-slate-800" : "text-slate-600"}`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-0.5 leading-relaxed ${isUnread ? "text-slate-600" : "text-muted-foreground"}`}>
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                          {!isUnread && (
                            <span className="w-2 h-2 rounded-full bg-transparent flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          <span className="text-slate-300">·</span>
                          <span>{format(new Date(notification.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleMarkRead(notification.id)}
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {notifications.length > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center text-xs text-muted-foreground pb-4">
          Showing {filtered.length} of {notifications.length} notifications
        </motion.p>
      )}
    </div>
  );
}