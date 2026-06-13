import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Flame,
  Star,
  Calendar,
  Dumbbell,
  Utensils,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/Card";
import { TopBar } from "@/components/TopBar";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workoutApi } from "@/lib/api/workout.api";
import { mealsApi } from "@/lib/api/meals.api";
import { profileApi } from "@/lib/api/profile.api";
import { attendanceApi } from "@/lib/api/attendance.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "GymOS - Home" },
      { name: "description", content: "Today's workout, meals, and gym check-in at a glance." },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function Home() {
  const { member: authMember } = useAuth();
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["memberProfile"],
    queryFn: profileApi.getProfile,
  });

  const { data: todayWorkoutData } = useQuery({
    queryKey: ["memberTodayWorkout"],
    queryFn: workoutApi.getTodayWorkout,
  });

  const { data: todayMealsData } = useQuery({
    queryKey: ["memberTodayMeals"],
    queryFn: mealsApi.getTodayMeals,
  });

  const { data: streakData } = useQuery({
    queryKey: ["memberStreak"],
    queryFn: attendanceApi.getStreak,
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: (data) => {
      toast.success("Checked in successfully!");
      if ("vibrate" in navigator) navigator.vibrate?.(20);
      queryClient.invalidateQueries({ queryKey: ["memberProfile"] });
      queryClient.invalidateQueries({ queryKey: ["memberStreak"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to check in");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: (data) => {
      toast.success(`Checked out! Earned ${data.data.pointsEarned} duration points.`);
      if ("vibrate" in navigator) navigator.vibrate?.(20);
      queryClient.invalidateQueries({ queryKey: ["memberProfile"] });
      queryClient.invalidateQueries({ queryKey: ["memberStreak"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to check out");
    },
  });

  const member = profileData?.data || authMember || {};
  const todayWorkout = todayWorkoutData?.data?.workout;
  const meals = todayMealsData?.data?.meals || [];
  const streakInfo = streakData?.data || {};
  const streak = streakInfo.currentStreak || 0;
  
  const done = todayWorkout?.exercises?.filter((e: any) => e.isCompleted)?.length || 0;
  const total = todayWorkout?.exercises?.length || 0;
  const totalCal = useMemo(() => meals.reduce((s: number, m: any) => s + (m.calories || 0), 0), [meals]);

  // Calculate days remaining roughly for UI
  const daysRemaining = member?.membershipPlan && member?.expiryDate ? Math.max(0, Math.ceil((new Date(member.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 0;

  const isWorkoutDone = total > 0 && done === total;

  return (
    <>
      <TopBar
        title={`${greeting()}, ${member?.name?.split(" ")[0] || "Member"} 👋`}
        subtitle="Let's make today count"
      />

      <main className="flex flex-col gap-6 px-4 pb-8 pt-5">
        {/* Hero stats */}
        <section className="-mx-4">
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
            <StatCard
              icon={<Flame className="text-gold" size={18} />}
              label="Streak"
              value={`${streak}`}
              unit="days"
              hint="Keep it up!"
            />
            <StatCard
              icon={<Star className="text-gold" size={18} />}
              label="Points"
              value={(member?.totalPoints || 0).toLocaleString()}
              unit="pts"
              hint="Keep earning"
            />
            <StatCard
              icon={<Calendar className="text-gold" size={18} />}
              label="Membership"
              value={`${daysRemaining}`}
              unit="days left"
              hint={member?.membershipPlan?.name || "No active plan"}
            />
          </div>
        </section>

        {/* Today's workout */}
        <Section
          title="Today's Workout"
          actionTo="/workout"
          icon={<Dumbbell size={16} className="text-gold" />}
        >
          {todayWorkout ? (
            <Card className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-text-secondary">
                    {todayWorkout.day || "Today"}
                  </div>
                  <div className="mt-0.5 text-lg font-bold">{todayWorkout.title || "Daily Routine"}</div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    {total} exercises
                  </div>
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

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-surface">
                <div
                  className="h-full rounded-full bg-gold transition-all"
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
                />
              </div>

              <ul className="space-y-1.5 text-sm text-text-secondary">
                {todayWorkout.exercises?.slice(0, 3).map((e: any, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        e.isCompleted ? "bg-success" : "bg-border-strong"
                      }`}
                    />
                    <span className={e.isCompleted ? "line-through text-text-disabled" : ""}>
                      {e.name}
                    </span>
                  </li>
                ))}
                {total > 3 && (
                  <li className="text-xs italic pl-3.5">+ {total - 3} more</li>
                )}
              </ul>

              <Link
                to="/workout"
                className={`flex h-12 items-center justify-center rounded-lg text-sm font-semibold text-bg-primary active:opacity-90 ${
                  isWorkoutDone ? "bg-success/80 text-white" : "bg-gold"
                }`}
              >
                {isWorkoutDone ? "Workout Completed 🎉" : "Continue Workout"}
              </Link>
            </Card>
          ) : (
            <Card className="text-center py-6">
              <p className="text-sm text-text-secondary">No workout planned for today. Enjoy your rest day!</p>
            </Card>
          )}
        </Section>

        {/* Today's meals */}
        <Section
          title="Today's Meals"
          actionTo="/meals"
          icon={<Utensils size={16} className="text-gold" />}
        >
          {todayMealsData?.data ? (
            <Card className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-2xl font-bold">{totalCal.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-text-secondary">
                    total calories
                  </div>
                </div>
                <div className="flex gap-1.5 text-[10px]">
                  <Macro label="P" value="35%" />
                  <Macro label="C" value="45%" />
                  <Macro label="F" value="20%" />
                </div>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full">
                <span className="bg-gold" style={{ width: "35%" }} />
                <span className="bg-text-secondary/60" style={{ width: "45%" }} />
                <span className="bg-red" style={{ width: "20%" }} />
              </div>
              <div className="text-sm pt-2">
                <span className="text-text-secondary">First meal:</span>{" "}
                <span className="font-medium">
                  {meals[0]?.time || meals[0]?.type || "Breakfast"} · {meals[0]?.items?.map((i: any) => i.name).join(", ") || "View Plan"}
                </span>
              </div>
              <Link
                to="/meals"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gold pt-2"
              >
                View full plan <ChevronRight size={14} />
              </Link>
            </Card>
          ) : (
            <Card className="text-center py-6">
              <p className="text-sm text-text-secondary">No meal plan for today.</p>
            </Card>
          )}
        </Section>

        {/* Quick check-in */}
        <Section
          title="Today's Check-in"
          actionTo="/attendance"
          icon={<CheckCircle2 size={16} className="text-gold" />}
        >
          <Card>
            {!streakInfo.checkedInToday ? (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold-soft text-sm font-semibold text-gold active:opacity-80 disabled:opacity-50"
              >
                {checkInMutation.isPending ? "Checking in..." : "Mark Today's Attendance"}
              </button>
            ) : streakInfo.checkedInToday && !streakInfo.checkOutTime ? (
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold text-sm font-semibold text-bg-primary active:opacity-80 disabled:opacity-50"
              >
                {checkOutMutation.isPending ? "Checking out..." : "Check Out Now"}
              </button>
            ) : (
              <div className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-success/40 bg-success/10 text-sm font-semibold text-success">
                Checked out today
              </div>
            )}
          </Card>
        </Section>
      </main>
    </>
  );
}

function StatCard({
  icon, label, value, unit, hint,
}: { icon: React.ReactNode; label: string; value: string; unit: string; hint: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-[150px] flex-shrink-0 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold text-text-primary">{value}</span>
        <span className="text-xs text-text-secondary">{unit}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>
    </motion.div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-border bg-bg-surface px-2 py-1 text-text-secondary">
      <span className="text-gold">{label}</span> {value}
    </span>
  );
}

function Section({
  title, icon, children, actionTo,
}: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; actionTo?: "/workout" | "/meals" | "/attendance";
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {icon} {title}
        </h2>
        {actionTo && (
          <Link to={actionTo} className="text-xs font-semibold text-gold">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

