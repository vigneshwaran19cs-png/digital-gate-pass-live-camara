import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Notifications</h1>
          <p className="text-muted-foreground mt-2">Stay updated on leave statuses and system alerts.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <Check className="w-4 h-4 mr-2" /> Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p>You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <Card key={notification.id} className={`transition-colors ${!notification.isRead ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
              <CardContent className="p-4 flex gap-4">
                <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {!notification.isRead && (
                  <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notification.id)}>
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}