import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { ChevronDown, Droplets, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealsApi } from "@/lib/api/meals.api";
import { toast } from "sonner";

export const Route = createFileRoute("/meals")({
  head: () => ({ meta: [{ title: "Meal Plan - GymOS" }] }),
  component: MealsPage,
});

function MealsPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [water, setWater] = useState(4);
  const queryClient = useQueryClient();

  const { data: mealPlanData, isLoading } = useQuery({
    queryKey: ["memberMealPlan"],
    queryFn: mealsApi.getTodayMeals,
  });

  const completeMutation = useMutation({
    mutationFn: (idx: number) => mealsApi.completeMeal(idx),
    onSuccess: (res) => {
      toast.success(res.message || "Meal marked as completed!");
      queryClient.invalidateQueries({ queryKey: ["memberMealPlan"] });
      // Invalidate points if there's a global member profile query
      queryClient.invalidateQueries({ queryKey: ["memberProfile"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark meal complete");
    },
  });

  const mealPlan = mealPlanData?.data;
  const meals: any[] = mealPlan?.meals || [];
  const total = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);

  return (
    <>
      <TopBar title="My Meal Plan" subtitle={
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">
            {mealPlan?.goal || "Nutrition"}
          </span>
        </span>
      } />

      <main className="flex flex-col gap-5 px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : (
          <>
            <Card>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-3xl font-extrabold">{total.toLocaleString()}</div>
                  <div className="text-xs text-text-secondary">cal / day target</div>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-text-secondary">Macros</div>
                  <div className="mt-1 flex gap-1">
                    <Pill color="bg-gold" v={`P ${mealPlan?.macros?.protein || 35}%`} />
                    <Pill color="bg-text-secondary/60" v={`C ${mealPlan?.macros?.carbs || 45}%`} />
                    <Pill color="bg-red" v={`F ${mealPlan?.macros?.fat || 20}%`} />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                <span className="bg-gold" style={{ width: `${mealPlan?.macros?.protein || 35}%` }} />
                <span className="bg-text-secondary/60" style={{ width: `${mealPlan?.macros?.carbs || 45}%` }} />
                <span className="bg-red" style={{ width: `${mealPlan?.macros?.fat || 20}%` }} />
              </div>
            </Card>

            {meals.length === 0 ? (
              <Card className="py-10 text-center">
                <div className="text-4xl mb-3">🥗</div>
                <p className="text-sm text-text-secondary">No meal plan assigned yet. Contact your trainer.</p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {meals.map((m: any, idx: number) => {
                  const mealName = m.mealTime || m.name || "Meal";
                  const isOpen = open === String(idx);
                  const items: any[] = Array.isArray(m.items) ? m.items : (m.items ? [m.items] : []);
                  return (
                    <li key={idx}>
                      <Card className={`p-0 overflow-hidden transition-colors ${m.isCompleted ? 'border-gold/30 bg-gold/5' : ''}`}>
                        <button
                          onClick={() => setOpen(isOpen ? null : String(idx))}
                          className="flex w-full items-center gap-3 p-4 text-left"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              {mealName}
                              {m.isCompleted && <span className="text-[10px] bg-gold text-bg-surface px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Done</span>}
                            </div>
                            <div className="text-[11px] text-text-secondary">{m.type || ""}</div>
                          </div>
                          <div className="font-mono text-sm font-bold text-gold">{m.calories || 0} cal</div>
                          
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!m.isCompleted) completeMutation.mutate(idx);
                            }}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              m.isCompleted
                                ? "border-gold bg-gold text-bg-surface"
                                : "border-border bg-bg-surface text-text-secondary hover:border-gold hover:text-gold"
                            }`}
                          >
                            {completeMutation.isPending && completeMutation.variables === idx ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={18} className={m.isCompleted ? "" : "opacity-40"} />
                            )}
                          </div>

                          <ChevronDown
                            size={18}
                            className={`ml-1 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-border px-4"
                            >
                              {items.length > 0 ? items.map((it: any, i: number) => {
                                const itemName = typeof it === 'string' ? it : it?.name || "Item";
                                const itemQuantity = typeof it === 'object' && it?.quantity ? `(${it.quantity})` : "";
                                return (
                                  <li
                                    key={i}
                                    className="flex items-center gap-3 border-b border-border/60 py-2.5 text-sm last:border-0"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />
                                    <span>{itemName} {itemQuantity}</span>
                                  </li>
                                );
                              }) : (
                                <li className="py-3 text-sm text-text-secondary italic">No items listed</li>
                              )}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Water */}
            <Card>
              <div className="flex items-center gap-2">
                <Droplets size={18} className="text-gold" />
                <div className="text-sm font-semibold">Water Intake</div>
                <div className="ml-auto font-mono text-sm text-text-secondary">{water}/10</div>
              </div>
              <div className="mt-3 grid grid-cols-10 gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = i < water;
                  return (
                    <button
                      key={i}
                      onClick={() => setWater(i + 1 === water ? i : i + 1)}
                      className={`h-9 rounded-md border transition-colors ${
                        filled ? "border-gold/40 bg-gold-soft" : "border-border bg-bg-surface"
                      }`}
                      aria-label={`Glass ${i + 1}`}
                    />
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-text-secondary">
                Aim for 8–10 glasses today.
              </p>
            </Card>

            {mealPlan?.notes && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Trainer Notes
                </div>
                <p className="mt-2 text-sm">{mealPlan.notes}</p>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Pill({ color, v }: { color: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface px-2 py-0.5 text-text-secondary">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {v}
    </span>
  );
}

