import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail, MessageSquare, Smartphone, Search, RefreshCw, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
// Assumes this API exists on the client (which we just added to openapi.yaml)
import { listNotificationLogs } from "@workspace/api-client-react"; 

export default function NotificationLogsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["notificationLogs"],
    queryFn: listNotificationLogs,
  });

  const filteredLogs = (logs as any[]).filter(log => 
    !search || 
    log.recipient.toLowerCase().includes(search.toLowerCase()) || 
    log.channel.toLowerCase().includes(search.toLowerCase())
  );

  const getChannelIcon = (channel: string) => {
    switch(channel) {
      case "email": return <Mail className="w-4 h-4 text-blue-600" />;
      case "sms": return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case "whatsapp": return <MessageSquare className="w-4 h-4 text-green-600" />;
      default: return <Mail className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "sent": 
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "failed": 
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "pending":
      default: 
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only Super Admins can view notification logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-800">Notification Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Audit log for Email, SMS, and WhatsApp deliveries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </motion.div>

      <div className="glass-card rounded-2xl p-4 bg-white shadow-sm border border-slate-100">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by recipient or channel..." 
            className="pl-9 max-w-md" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Error (if any)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(log.channel)}
                        <span className="capitalize font-medium text-slate-700">{log.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.recipient}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.sentAt ? format(new Date(log.sentAt), "PPp") : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-rose-600 truncate max-w-[200px]" title={log.errorMessage || ""}>
                      {log.errorMessage || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
