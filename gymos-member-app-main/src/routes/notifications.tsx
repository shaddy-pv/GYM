import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications.api";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications - GymOS" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["memberNotifications"],
    queryFn: notificationsApi.getNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberNotifications"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to mark as read");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberNotifications"] });
    },
  });

  const rawNotifications = notificationsData?.data?.notifications;
  const notifications: any[] = Array.isArray(rawNotifications) ? rawNotifications : [];

  return (
    <>
      <TopBar
        title="Notifications"
        back
        showBell={false}
        right={
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-xs font-semibold text-gold disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? "..." : "Mark all read"}
          </button>
        }
      />
      <main className="flex flex-col gap-3 px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-sm text-text-secondary">
            <div className="text-4xl">✅</div>
            <div className="mt-2">All caught up!</div>
          </div>
        ) : (
          notifications.map((n: any, i: number) => (
            <div
              key={n._id || i}
              onClick={() => n.isRead === false && n._id && markReadMutation.mutate(n._id)}
              className={`flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer active:opacity-80 transition-opacity ${
                !n.isRead ? "bg-bg-surface" : "bg-card"
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg ${
                  n.type === "achievement" || n.accent === "gold"
                    ? "bg-gold-soft"
                    : n.type === "alert" || n.accent === "red"
                      ? "bg-red/15"
                      : "bg-bg-surface"
                }`}
              >
                {n.icon || (n.type === "achievement" ? "🏅" : n.type === "alert" ? "⚠️" : "🔔")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{n.title}</div>
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">{n.body || n.message}</div>
                <div className="mt-1 text-[10px] text-text-disabled">{n.time || n.createdAt}</div>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}

