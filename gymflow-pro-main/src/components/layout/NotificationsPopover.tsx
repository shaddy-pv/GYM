import { useState } from "react";
import { Bell, Check, Trash2, Loader2, CreditCard, UserPlus, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gymApi } from "@/lib/api/gym.api";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adminNotifications", activeGymId],
    queryFn: () => gymApi.getAdminNotifications(activeGymId!),
    enabled: !!activeGymId,
    refetchInterval: 30000, // check every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => gymApi.markAdminRead(activeGymId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => gymApi.markAllAdminRead(activeGymId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
    },
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "new_member":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "payment_received":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-sm border border-border bg-surface p-2 text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {markAllReadMutation.isPending ? "..." : (
                <>
                  <Check className="h-3 w-3" /> Mark all read
                </>
              )}
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n: any) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markReadMutation.mutate(n._id)}
                  className={cn(
                    "flex items-start gap-3 rounded-md p-3 text-sm transition-colors cursor-pointer",
                    !n.isRead ? "bg-surface" : "hover:bg-surface/50"
                  )}
                >
                  <div className="mt-0.5 rounded-full bg-background p-1.5 border border-border">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-xs font-medium leading-none", !n.isRead && "text-foreground font-semibold")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="flex h-2 w-2 rounded-full bg-gold mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
