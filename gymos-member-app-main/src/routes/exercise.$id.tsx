import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Check, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutApi } from "@/lib/api/workout.api";
import { toast } from "sonner";

export const Route = createFileRoute("/exercise/$id")({
  head: () => ({ meta: [{ title: "Exercise - GymOS" }] }),
  component: ExerciseDetail,
});

function ExerciseDetail() {
  const { id } = Route.useParams();
  const index = parseInt(id, 10);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: todayWorkoutData, isLoading } = useQuery({
    queryKey: ["memberTodayWorkout"],
    queryFn: workoutApi.getTodayWorkout,
  });

  const completeExerciseMutation = useMutation({
    mutationFn: ({ idx, data }: { idx: number, data: any }) => workoutApi.completeExercise(idx, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberTodayWorkout"] });
      navigate({ to: "/workout" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to complete exercise");
    }
  });

  if (isLoading) {
    return (
      <>
        <TopBar title="Loading..." back showBell={false} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </>
    );
  }

  const todayWorkout = todayWorkoutData?.data;
  const exercises = todayWorkout?.exercises || [];
  const ex = exercises[index] || exercises[0];

  if (!ex) {
    return (
      <>
        <TopBar title="Not Found" back showBell={false} />
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">🤷</div>
          <h2 className="text-xl font-bold mb-2">Exercise not found</h2>
          <p className="text-text-secondary text-sm">We couldn't find the details for this exercise.</p>
        </div>
      </>
    );
  }

  const handleComplete = () => {
    if (ex.done) {
      navigate({ to: "/workout" });
      return;
    }
    completeExerciseMutation.mutate({ idx: index, data: { done: true } });
  };

  return (
    <>
      <TopBar title={ex.name} back showBell={false} />
      <main className="flex flex-col gap-5 px-4 pt-4 pb-32">
        <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-bg-surface text-7xl">
          🏋️
        </div>

        <div>
          <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold text-gold uppercase tracking-wider">
            Target
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{ex.name}</h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Pill label="Sets" value={`${ex.sets}`} />
          <Pill label="Reps" value={`${ex.reps}`} />
          <Pill label="Rest" value={`${ex.rest}s`} />
        </div>

        <Card>
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Reward
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-gold">+10 pts</div>
          <div className="text-[11px] text-text-secondary">on completion</div>
        </Card>

        {ex.instructions && (
          <section>
            <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Instructions
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {ex.instructions}
            </div>
          </section>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-bg-secondary p-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto max-w-md">
          <button
            onClick={handleComplete}
            disabled={completeExerciseMutation.isPending}
            className={`flex h-13 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold active:opacity-90 disabled:opacity-50 transition-colors ${
              ex.done 
                ? "bg-bg-surface border border-border text-text-primary" 
                : "bg-gold text-bg-primary"
            }`}
            style={{ height: 52 }}
          >
            {completeExerciseMutation.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Completing...</>
            ) : ex.done ? (
              <><Check size={18} strokeWidth={3} className="text-success" /> Go Back to Workout</>
            ) : (
              <><Check size={18} strokeWidth={3} /> Mark as Done</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="font-mono text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
    </div>
  );
}

