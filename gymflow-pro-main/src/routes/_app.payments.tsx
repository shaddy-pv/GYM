import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Receipt, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments.api";
import { membersApi } from "@/lib/api/members.api";
import { plansApi } from "@/lib/api/plans.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments - GymOS" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", activeGymId, month, statusFilter],
    queryFn: () => paymentsApi.getPayments(activeGymId!, {
      month: month || undefined,
      status: statusFilter !== "All status" ? statusFilter : undefined,
    }),
    enabled: !!activeGymId,
  });

  const { data: statsData } = useQuery({
    queryKey: ["paymentStats", activeGymId],
    queryFn: () => paymentsApi.getPaymentStats(activeGymId!),
    enabled: !!activeGymId,
  });

  const { data: membersData } = useQuery({
    queryKey: ["members", activeGymId],
    queryFn: () => membersApi.getMembers(activeGymId!, { limit: 100 }), // Simplified for now
    enabled: !!activeGymId && open,
  });

  const { data: plansData } = useQuery({
    queryKey: ["plans", activeGymId],
    queryFn: () => plansApi.getPlans(activeGymId!),
    enabled: !!activeGymId && open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.createPayment(activeGymId!, data),
    onSuccess: () => {
      toast.success("Payment recorded");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["paymentStats", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.deletePayment(activeGymId!, paymentId),
    onSuccess: () => {
      toast.success("Payment deleted");
      queryClient.invalidateQueries({ queryKey: ["payments", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["paymentStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete payment");
    },
  });

  const downloadReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.downloadReceipt(activeGymId!, paymentId),
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to download receipt");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawMethod = formData.get("paymentMethod")?.toString() || "Cash";
    // Map display values → backend lowercase enums
    const methodMap: Record<string, string> = {
      "Cash": "cash",
      "UPI": "upi",
      "Credit Card": "card",
      "Debit Card": "card",
      "Bank Transfer": "bank_transfer",
    };
    const data = {
      memberId: formData.get("memberId"),
      membershipPlanId: formData.get("planId") || undefined,
      amount: Number(formData.get("amount")),
      method: methodMap[rawMethod] || "cash",
      status: "paid",
      paidAt: formData.get("paymentDate")
        ? new Date(formData.get("paymentDate") as string).toISOString()
        : new Date().toISOString(),
      notes: formData.get("notes"),
    };
    createMutation.mutate(data);
  };

  const paymentList = paymentsData?.data || [];
  const pStats = statsData?.data || { thisMonth: { revenue: 0, count: 0 }, thisYear: { revenue: 0 }, allTime: { revenue: 0 }, pending: { amount: 0, count: 0 } };
  const membersList = membersData?.data || [];
  const plansList = plansData?.data || [];

  const stats = [
    { l: "Collected this month", v: `₹${(pStats.thisMonth?.revenue || 0).toLocaleString("en-IN")}` },
    { l: "This year", v: `₹${(pStats.thisYear?.revenue || 0).toLocaleString("en-IN")}` },
    { l: "Pending dues", v: `₹${(pStats.pending?.amount || 0).toLocaleString("en-IN")}` },
    { l: "Overdue payments", v: `${pStats.pending?.count || 0} payments` },
  ];

  return (
    <>
      <Topbar title="Payments" subtitle="Track collections and dues" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-md border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <p className="font-mono tabular mt-1.5 text-xl font-semibold text-foreground">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" 
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
            >
              <option>All status</option><option>Completed</option><option>Pending</option><option>Failed</option><option>Refunded</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm text-foreground hover:bg-elevated">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
                    </td>
                  </tr>
                ) : paymentList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  paymentList.map((p: any) => (
                    <tr key={p._id} className="hover:bg-elevated/40">
                      <td className="px-4 py-3 text-foreground">{p.member?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.plan?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono tabular text-foreground">₹{p.amount.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 font-mono tabular text-muted-foreground">{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{p.method}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-sm border px-2 py-0.5 text-xs",
                          p.status === "Completed" && "border-success/40 bg-success/10 text-success",
                          p.status === "Pending" && "border-gold/40 bg-gold/10 text-gold",
                          (p.status === "Failed" || p.status === "Overdue") && "border-danger/40 bg-danger/10 text-danger",
                          p.status === "Refunded" && "border-border bg-surface text-muted-foreground",
                        )}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => downloadReceiptMutation.mutate(p._id)}
                          disabled={downloadReceiptMutation.isPending || p.status !== "Completed"}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                          title="Download Receipt"
                        >
                          {downloadReceiptMutation.isPending && downloadReceiptMutation.variables === p._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm("Delete this payment?")) {
                              deleteMutation.mutate(p._id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-muted-foreground hover:text-danger disabled:opacity-50"
                          title="Delete Payment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-xl overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-card z-10 relative">
              <h3 className="font-medium text-foreground">Record Payment</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-card">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Member</label>
                  <select name="memberId" required className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                    <option value="">Select a member</option>
                    {membersList.map((m: any) => <option key={m._id} value={m._id}>{m.name} ({m.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan</label>
                  <select name="planId" className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                    <option value="">None (Custom Amount)</option>
                    {plansList.map((p: any) => <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (₹)</label>
                  <input name="amount" type="number" required min="0" className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="1500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Payment Method</label>
                  <select name="paymentMethod" required className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
                  <input name="paymentDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                  <textarea name="notes" rows={3} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-elevated">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}