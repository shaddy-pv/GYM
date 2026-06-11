import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, MapPin, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { gymApi } from "@/lib/api/gym.api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/shared/Skeleton";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/select-gym")({
  head: () => ({ meta: [{ title: "Select Gym - GymOS" }] }),
  component: SelectGymPage,
});

function SelectGymPage() {
  const nav = useNavigate();
  const { setGymId, owner } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["myGyms"],
    queryFn: () => gymApi.getMyGyms(),
  });

  const gyms = data?.data || [];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {owner?.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a gym to continue to the dashboard
          </p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : (
            gyms.map((gym: any) => (
              <button
                key={gym._id}
                onClick={() => {
                  setGymId(gym._id);
                  nav({ to: "/" });
                }}
                className="group flex w-full items-center justify-between rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-gold hover:bg-elevated"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground group-hover:text-gold">
                    {gym.logo ? (
                      <img src={gym.logo} alt={gym.name} className="h-full w-full rounded-md object-cover" />
                    ) : (
                      <Dumbbell className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-gold">{gym.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{gym.address}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-gold" />
              </button>
            ))
          )}

          {!isLoading && (
            <Link
              to="/create-gym"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-transparent p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Plus className="h-5 w-5" />
              Add new gym location
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
