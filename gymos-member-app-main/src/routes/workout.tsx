import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Info, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { TopBar } from "@/components/TopBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutApi } from "@/lib/api/workout.api";
import { toast } from "sonner";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [{ title: "Workout Plan - GymOS" }] }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
  const [pop, setPop] = useState<{ id: string; pts: number } | null>(null);

  const { data: todayWorkoutData, isLoading: todayLoading } = useQuery({
    queryKey: ["memberTodayWorkout"],
    queryFn: workoutApi.getTodayWorkout,
  });

  const { data: weekWorkoutData, isLoading: weekLoading } = useQuery({
    queryKey: ["memberWeekWorkout"],
    queryFn: workoutApi.getWeekWorkout,
  });

  const completeExerciseMutation = useMutation({
    mutationFn: ({ index, data }: { index: number, data: any }) => workoutApi.completeExercise(index, data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memberTodayWorkout"] });
      setPop({ id: `ex-${variables.index}`, pts: res.data?.pointsEarned || 10 });
      if ("vibrate" in navigator) navigator.vibrate?.(15);
      setTimeout(() => setPop(null), 1300);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to complete exercise");
    }
  });

  const todayWorkout = todayWorkoutData?.data;
  const weekPlan = weekWorkoutData?.data?.week || [];

  const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const isRest = weekPlan.find((w: any) => w.day === day)?.isRestDay || (!isToday && !weekPlan.find((w: any) => w.day === day)?.focusArea);
  
  const currentWorkout = isToday ? todayWorkout?.workout : weekPlan.find((w: any) => w.day === day);
  const exercises = currentWorkout?.exercises || [];
  
  const done = exercises.filter((e: any) => e.isCompleted).length;
  const total = exercises.length;
  const allDone = total > 0 && done === total;

  const toggle = (index: number, currentDone: boolean) => {
    if (!isToday) return toast.info("You can only complete exercises for today's workout.");
    completeExerciseMutation.mutate({ index, data: { done: !currentDone } });
  };

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <>
      <TopBar title="My Workout Plan" subtitle={todayWorkout?.planName || "No active plan"} />

      <main className="flex flex-col gap-5 px-4 pt-4">
        {/* Week selector */}
        <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4">
          {DAYS.map((d) => {
            const active = d === day;
            const wInfo = weekPlan.find((w: any) => w.day === d) || { isRestDay: true };
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`flex h-11 min-w-[64px] flex-col items-center justify-center rounded-2xl border px-3 text-xs font-semibold transition-colors capitalize ${
                  active
                    ? "border-gold bg-gold text-bg-primary"
                    : wInfo.isRestDay
                      ? "border-border bg-bg-secondary text-text-disabled"
                      : "border-border bg-bg-secondary text-text-secondary"
                }`}
              >
                <span>{d.substring(0, 3)}</span>
                <span className="mt-0.5 text-[9px] font-medium opacity-80">
                  {wInfo.isRestDay ? "Rest" : "Train"}
                </span>
              </button>
            );
          })}
        </div>

        {todayLoading || weekLoading ? (
           <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : isRest ? (
          <Card className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="text-5xl">🛌</div>
            <div className="text-lg font-bold">Rest Day</div>
            <p className="max-w-xs text-sm text-text-secondary">
              Recovery is where the gains happen. Hydrate, stretch, and sleep well.
            </p>
            <ul className="mt-2 space-y-2 text-left text-xs text-text-secondary">
              <li>· Drink 3–4 liters of water</li>
              <li>· 10 minutes of light stretching</li>
              <li>· Aim for 8 hours of sleep</li>
            </ul>
          </Card>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-end justify-between px-1">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary">
                  {currentWorkout?.day} session
                </div>
                <div className="text-lg font-bold capitalize">{currentWorkout?.focusArea || "Full Body"}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-bold text-gold">
                  {done}
                  <span className="text-sm text-text-secondary">/{total}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-secondary">
                  done
                </div>
              </div>
            </div>

            <div className="h-1.5 -mt-3 overflow-hidden rounded-full bg-bg-surface">
              <motion.div
                className="h-full bg-gold"
                animate={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
              />
            </div>

            {allDone && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="rounded-xl border border-success/40 bg-success/10 p-4 text-center"
              >
                <div className="text-2xl">🔥</div>
                <div className="mt-1 font-bold">Workout Complete!</div>
                <div className="text-xs text-text-secondary">
                  Great job crushing today's routine.
                </div>
              </motion.div>
            )}

            <ul className="space-y-3">
              {exercises.map((e: any, index: number) => (
                <li key={index} className="relative">
                  <Card
                    className={`flex items-center gap-3 transition-colors ${
                      e.isCompleted ? "border-success/30 bg-success/5" : ""
                    }`}
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-bg-surface text-2xl">
                      🏋️
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`truncate text-sm font-semibold ${e.isCompleted ? "text-text-secondary line-through" : ""}`}>
                          {e.name}
                        </div>
                        <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">
                          +10 pts
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-text-secondary">
                        {e.sets} × {e.reps} · rest {e.rest}s
                      </div>
                      <Link
                        to="/exercise/$id"
                        params={{ id: String(index) }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gold"
                      >
                        See demo <ChevronRight size={12} />
                      </Link>
                    </div>
                    {isToday && (
                      <button
                        onClick={() => toggle(index, !!e.isCompleted)}
                        disabled={completeExerciseMutation.isPending}
                        aria-label="Mark done"
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          e.isCompleted
                            ? "border-success bg-success text-bg-primary"
                            : "border-border-strong text-text-secondary"
                        } ${completeExerciseMutation.isPending ? "opacity-50" : ""}`}
                      >
                        {completeExerciseMutation.isPending && completeExerciseMutation.variables?.index === index ? (
                           <Loader2 size={20} className="animate-spin text-text-secondary" />
                        ) : (
                           <Check size={20} strokeWidth={3} />
                        )}
                      </button>
                    )}
                  </Card>

                  <AnimatePresence>
                    {pop?.id === `ex-${index}` && (
                      <motion.div
                        initial={{ y: 0, opacity: 0 }}
                        animate={{ y: -40, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute right-6 top-2 font-mono text-sm font-bold text-gold"
                      >
                        +{pop.pts} pts ✨
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3 text-xs text-text-secondary">
              <Info size={14} className="text-gold" />
              Tap the circle to mark each exercise complete.
            </div>
          </>
        )}
      </main>
    </>
  );
}

