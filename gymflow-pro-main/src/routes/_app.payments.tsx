import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Receipt, Loader2, Trash2, Search, Filter, SortAsc, CreditCard, ShieldAlert, FileText, ChevronDown, Calendar } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments.api";
import { membersApi } from "@/lib/api/members.api";
import { plansApi } from "@/lib/api/plans.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments & Dues - GymOS" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  
  // States
  const [open, setOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Filters & Sorting
  const [month, setMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Create Invoice Form State (for live preview)
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [initialPaymentStr, setInitialPaymentStr] = useState("");

  // Fetch Data
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", activeGymId, month, statusFilter, debouncedSearch, sortBy, sortOrder],
    queryFn: () => paymentsApi.getPayments(activeGymId!, {
      month: month || undefined,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
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
    queryFn: () => membersApi.getMembers(activeGymId!, { limit: 200 }),
    enabled: !!activeGymId && open,
  });

  const { data: plansData } = useQuery({
    queryKey: ["plans", activeGymId],
    queryFn: () => plansApi.getPlans(activeGymId!),
    enabled: !!activeGymId && open,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.createPayment(activeGymId!, data),
    onSuccess: () => {
      toast.success("Payment recorded");
      setOpen(false);
      setInvoiceTotal(0);
      setInitialPaymentStr("");
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || "Failed to record payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.deletePayment(activeGymId!, paymentId),
    onSuccess: () => {
      toast.success("Payment deleted");
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete payment"),
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
    onError: (err: any) => toast.error(err.message || "Failed to download receipt"),
  });

  const recordPartialPaymentMutation = useMutation({
    mutationFn: (data: { paymentId: string, payload: any }) => paymentsApi.recordPartialPayment(activeGymId!, data.paymentId, data.payload),
    onSuccess: () => {
      toast.success("Partial payment recorded successfully!");
      setPayModalOpen(false);
      setSelectedPayment(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || "Failed to record payment"),
  });

  const waiveMutation = useMutation({
    mutationFn: (paymentId: string) => paymentsApi.waiveDue(activeGymId!, paymentId),
    onSuccess: () => {
      toast.success("Due successfully waived");
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || "Failed to waive due"),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["payments", activeGymId] });
    queryClient.invalidateQueries({ queryKey: ["paymentStats", activeGymId] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
  };

  // Handlers
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handlePartialPaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPayment) return;
    
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    
    if (amount > selectedPayment.balanceAmount) {
      toast.error(`Amount cannot exceed the remaining balance of ₹${selectedPayment.balanceAmount}`);
      return;
    }

    recordPartialPaymentMutation.mutate({
      paymentId: selectedPayment._id,
      payload: {
        amount,
        method: formData.get("paymentMethod"),
        notes: formData.get("notes")
      }
    });
  };

  const handleWaive = (p: any) => {
    if (window.confirm(`Are you sure you want to waive the remaining balance of ₹${p.balanceAmount} for ${p.member?.name}? This cannot be undone.`)) {
      waiveMutation.mutate(p._id);
    }
  };

  const openPayModal = (p: any) => {
    setSelectedPayment(p);
    setPayModalOpen(true);
  };

  const openDetailsModal = (p: any) => {
    setSelectedPayment(p);
    setDetailsModalOpen(true);
  };

  // Data mapping
  const paymentList = paymentsData?.data || [];
  const pStats = statsData?.data || { collectedThisMonth: 0, totalOutstanding: 0, totalOverdue: 0, totalPartiallyPaid: 0, membersWithPendingCount: 0 };
  const membersList = membersData?.data || [];
  const plansList = plansData?.data || [];

  const stats = [
    { l: "Collected This Month", v: `₹${(pStats.collectedThisMonth || 0).toLocaleString("en-IN")}`, c: "text-success", t: "Total cash/online payments actually received this month." },
    { l: "Outstanding Amount", v: `₹${(pStats.totalOutstanding || 0).toLocaleString("en-IN")}`, c: "text-foreground", t: "Total balance yet to be paid across all pending and partially paid invoices." },
    { l: "Overdue Amount", v: `₹${(pStats.totalOverdue || 0).toLocaleString("en-IN")}`, c: "text-danger", t: "Only the unpaid balance of invoices whose Due Date has already passed." },
    { l: "Partially Paid", v: `₹${(pStats.totalPartiallyPaid || 0).toLocaleString("en-IN")}`, c: "text-gold", t: "Money already collected towards invoices that are not yet fully paid." },
    { l: "Members with Dues", v: pStats.membersWithPendingCount || 0, c: "text-foreground", t: "Count of unique members who have at least one unpaid invoice." },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="rounded-sm border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success">Paid</span>;
      case 'partially_paid': return <span className="rounded-sm border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs text-gold">Partially Paid</span>;
      case 'pending': return <span className="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs text-foreground">Pending</span>;
      case 'overdue': return <span className="rounded-sm border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs text-danger">Overdue</span>;
      case 'waived': return <span className="rounded-sm border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground line-through">Waived</span>;
      default: return <span className="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground">{status}</span>;
    }
  };

  return (
    <>
      <Topbar title="Payments & Dues" subtitle="Manage collections, pending dues, and invoices" />
      <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {stats.map((s, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-3 sm:p-4 group relative cursor-help" title={s.t}>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground truncate">{s.l}</p>
                <div className="h-3 w-3 rounded-full bg-surface border border-border flex items-center justify-center text-[8px] text-muted-foreground font-bold">?</div>
              </div>
              <p className={cn("font-mono tabular mt-1 sm:mt-1.5 text-lg sm:text-xl font-semibold", s.c)}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-md border border-border">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm text-foreground outline-none focus:border-gold" 
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold flex-1 sm:flex-none"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
              
              <div className="relative group min-w-[200px] hidden sm:block">
                <div className="flex h-9 items-center justify-between rounded-sm border border-border bg-surface px-3 cursor-pointer focus-within:border-gold hover:bg-elevated transition-colors">
                  <div className="flex flex-col justify-center">
                    {month ? (
                      <>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">Billing Period</span>
                        <span className="leading-none text-sm font-medium text-foreground">
                          {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-foreground">Billing Period</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {month && (
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMonth(""); }} 
                        className="text-muted-foreground hover:text-danger z-20 relative px-1" 
                        title="Clear Filter"
                      >
                        ✕
                      </button>
                    )}
                    <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
                  </div>
                </div>
                <input 
                  type="month" 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Select Billing Month"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm text-foreground hover:bg-elevated hidden sm:flex">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setOpen(true)} className="flex h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
              <Plus className="h-4 w-4" /> New Due / Payment
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('memberName')}>
                    <div className="flex items-center gap-1">Member <SortAsc className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1"><SortAsc className="h-3 w-3" /> Plan Total</div>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Balance Due</th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">Due Date <SortAsc className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Status <SortAsc className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentsLoading ? (
                  <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" /></td></tr>
                ) : paymentList.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No payments or dues found</td></tr>
                ) : (
                  paymentList.map((p: any) => (
                    <tr key={p._id} className="hover:bg-elevated/40">
                      <td className="px-4 py-3 font-medium text-foreground">{p.member?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.membershipPlan?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono tabular text-foreground">₹{p.amount?.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-mono tabular text-success">₹{(p.paidAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-mono tabular">
                        {p.balanceAmount > 0 ? (
                          <span className="font-semibold text-danger">₹{p.balanceAmount?.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-success">₹0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                      <td className="px-4 py-3 flex justify-end gap-2">
                        {['pending', 'partially_paid', 'overdue'].includes(p.status) && (
                          <>
                            <button onClick={() => openPayModal(p)} className="flex h-7 items-center gap-1 rounded bg-gold/10 px-2 text-xs font-medium text-gold hover:bg-gold/20" title="Record Partial Payment">
                              <CreditCard className="h-3 w-3" /> Pay
                            </button>
                            <button onClick={() => handleWaive(p)} disabled={waiveMutation.isPending} className="flex h-7 items-center gap-1 rounded bg-surface px-2 text-xs font-medium text-muted-foreground hover:bg-elevated hover:text-danger" title="Waive Remaining Due">
                              <ShieldAlert className="h-3 w-3" /> Waive
                            </button>
                          </>
                        )}
                        <button onClick={() => openDetailsModal(p)} className="flex h-7 items-center gap-1 rounded bg-surface px-2 text-xs font-medium text-muted-foreground hover:bg-elevated hover:text-foreground" title="View Details">
                          <FileText className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {paymentsLoading ? (
             <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
          ) : paymentList.length === 0 ? (
             <div className="py-12 text-center text-muted-foreground bg-card border border-border rounded-md">No records found</div>
          ) : (
            paymentList.map((p: any) => (
              <div key={p._id} className="bg-card border border-border rounded-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">{p.member?.name || 'Unknown'}</h4>
                    <p className="text-xs text-muted-foreground">{p.membershipPlan?.name || 'No Plan'}</p>
                  </div>
                  {getStatusBadge(p.status)}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm bg-surface rounded p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan Total</p>
                    <p className="font-mono tabular">₹{p.amount?.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-mono tabular text-success">₹{(p.paidAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={cn("font-mono tabular", p.balanceAmount > 0 ? "text-danger font-semibold" : "text-success")}>₹{(p.balanceAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="col-span-3 pt-1 border-t border-border">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'No due date'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {['pending', 'partially_paid', 'overdue'].includes(p.status) && (
                    <button onClick={() => openPayModal(p)} className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded bg-gold/10 text-xs font-medium text-gold hover:bg-gold/20">
                      <CreditCard className="h-4 w-4" /> Pay
                    </button>
                  )}
                  <button onClick={() => openDetailsModal(p)} className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded bg-surface border border-border text-xs font-medium text-foreground hover:bg-elevated">
                    <FileText className="h-4 w-4" /> Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE NEW DUE MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setInvoiceTotal(0); setInitialPaymentStr(""); }} />
          <div className="relative w-full max-w-md flex flex-col rounded-md border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="border-b border-border px-5 py-4 flex justify-between items-center bg-surface">
              <h3 className="font-medium text-foreground">Create Manual Invoice / Payment</h3>
              <button onClick={() => { setOpen(false); setInvoiceTotal(0); setInitialPaymentStr(""); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createMutation.mutate({
                memberId: fd.get("memberId"),
                membershipPlanId: fd.get("planId") || undefined,
                amount: Number(fd.get("customAmount")) || undefined,
                initialPayment: Number(fd.get("initialPayment")) || 0,
                method: fd.get("paymentMethod") || "cash",
                dueDate: fd.get("dueDate") || undefined,
                notes: fd.get("notes"),
              });
            }} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Member</label>
                <select name="memberId" required className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">Select a member...</option>
                  {membersList.map((m: any) => <option key={m._id} value={m._id}>{m.name} ({m.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Membership Plan</label>
                <select 
                  name="planId" 
                  className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
                  onChange={(e) => {
                    const plan = plansList.find((p: any) => p._id === e.target.value);
                    const price = plan ? plan.price : 0;
                    setInvoiceTotal(price);
                    setInitialPaymentStr("");
                  }}
                >
                  <option value="">None (Custom Amount)</option>
                  {plansList.map((p: any) => (
                    <option key={p._id} value={p._id}>{p.name} — ₹{p.price?.toLocaleString("en-IN")}</option>
                  ))}
                </select>
              </div>

              {/* Invoice Total — read-only when plan selected, editable for custom */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {invoiceTotal > 0 ? 'Plan Price (Invoice Total)' : 'Custom Invoice Amount (₹)'}
                </label>
                {invoiceTotal > 0 ? (
                  <div className="h-9 w-full rounded-sm border border-border bg-elevated px-3 flex items-center font-mono text-sm text-foreground">
                    ₹{invoiceTotal.toLocaleString("en-IN")}
                    <span className="ml-auto text-xs text-muted-foreground">Auto-filled from plan</span>
                  </div>
                ) : (
                  <input
                    name="customAmount"
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    onChange={(e) => { setInvoiceTotal(Number(e.target.value) || 0); setInitialPaymentStr(""); }}
                    className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
                  />
                )}
              </div>

              {/* Amount Paid Today */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Amount Paid Today / Deposit (₹)
                  <span className="ml-1 text-muted-foreground font-normal">(enter 0 if nothing paid yet)</span>
                </label>
                <input
                  name="initialPayment"
                  type="number"
                  required
                  min="0"
                  max={invoiceTotal || undefined}
                  value={initialPaymentStr}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value;
                    // Allow empty string so backspace clears the field
                    if (raw === '' || raw === '-') {
                      setInitialPaymentStr('');
                      return;
                    }
                    const num = Math.min(Number(raw) || 0, invoiceTotal);
                    setInitialPaymentStr(String(num));
                  }}
                  className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>

              {/* Live Balance Preview */}
              {invoiceTotal > 0 && (
                <div className="rounded border border-border bg-surface p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan / Invoice Total</span>
                    <span className="font-mono">₹{invoiceTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Today</span>
                    <span className="font-mono text-success">₹{(Number(initialPaymentStr) || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                    <span>Balance Due</span>
                    <span className={`font-mono ${invoiceTotal - (Number(initialPaymentStr) || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                      ₹{(invoiceTotal - (Number(initialPaymentStr) || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status will be</span>
                    <span className="text-xs">
                      {(Number(initialPaymentStr) || 0) >= invoiceTotal ? '🟢 Paid' : (Number(initialPaymentStr) || 0) > 0 ? '🟡 Partially Paid' : '⚪️ Pending'}
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</label>
                  <input name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Method (If Paid)</label>
                  <select name="paymentMethod" className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                <textarea name="notes" rows={2} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                <button type="button" onClick={() => { setOpen(false); setInvoiceTotal(0); setInitialPaymentStr(""); }} className="rounded-sm border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:opacity-90 flex items-center gap-2">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PARTIAL PAYMENT MODAL */}
      {payModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
          <div className="relative w-full max-w-sm flex flex-col rounded-md border border-border bg-card shadow-2xl overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex justify-between items-center bg-surface">
              <h3 className="font-medium text-foreground">Record Payment</h3>
              <button onClick={() => setPayModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handlePartialPaymentSubmit} className="p-5 space-y-4">
              <div className="bg-elevated rounded p-3 text-sm border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Member:</span>
                  <span className="font-medium">{selectedPayment.member?.name}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Invoice Total:</span>
                  <span className="font-mono">₹{selectedPayment.amount}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-danger">Balance Due:</span>
                  <span className="text-danger font-mono tabular">₹{selectedPayment.balanceAmount}</span>
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Paying Amount (₹)</label>
                <input 
                  name="amount" 
                  type="number" 
                  required 
                  min="1" 
                  max={selectedPayment.balanceAmount}
                  defaultValue={selectedPayment.balanceAmount}
                  className="h-10 w-full rounded border border-border bg-surface px-3 text-base font-mono text-foreground outline-none focus:border-gold" 
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Payment Method</label>
                <select name="paymentMethod" required className="h-9 w-full rounded border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes (Optional)</label>
                <textarea name="notes" rows={2} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPayModalOpen(false)} className="rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated">Cancel</button>
                <button type="submit" disabled={recordPartialPaymentMutation.isPending} className="rounded bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:opacity-90 flex items-center gap-2">
                  {recordPartialPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {detailsModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-end sm:justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailsModalOpen(false)} />
          <div className="relative w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] flex flex-col sm:rounded-lg border-l sm:border border-border bg-card shadow-2xl animate-in slide-in-from-right sm:slide-in-from-bottom-4">
            <div className="border-b border-border px-5 py-4 flex justify-between items-center bg-surface sm:rounded-t-lg">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  Invoice Details 
                  {getStatusBadge(selectedPayment.status)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedPayment.receiptNumber || 'No receipt number'}</p>
              </div>
              <button onClick={() => setDetailsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-surface border border-border rounded-md p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Member</p>
                  <p className="font-medium text-sm">{selectedPayment.member?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Membership Plan</p>
                  <p className="text-sm">{selectedPayment.membershipPlan?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                  <p className="text-sm">{selectedPayment.dueDate ? new Date(selectedPayment.dueDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created At</p>
                  <p className="text-sm">{new Date(selectedPayment.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-md overflow-hidden">
                <div className="bg-surface px-4 py-2.5 border-b border-border">
                  <h4 className="text-sm font-medium">Financial Breakdown</h4>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  {/* Plan Price */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan Price (Invoice Total)</span>
                    <span className="font-mono font-medium text-foreground">₹{(selectedPayment.amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  {/* Amount Paid */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-mono text-success">₹{(selectedPayment.paidAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  {/* Progress bar */}
                  {selectedPayment.amount > 0 && (
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${Math.min(100, ((selectedPayment.paidAmount || 0) / selectedPayment.amount) * 100)}%` }}
                      />
                    </div>
                  )}
                  {/* Balance Due */}
                  <div className="flex justify-between items-center pt-1 border-t border-border font-semibold">
                    <span className={selectedPayment.balanceAmount > 0 ? "text-danger" : "text-success"}>
                      {selectedPayment.balanceAmount > 0 ? "Balance Still Due" : "Fully Paid ✓"}
                    </span>
                    <span className={cn("font-mono text-lg", selectedPayment.balanceAmount > 0 ? "text-danger" : "text-success")}>
                      ₹{(selectedPayment.balanceAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {/* Status explanation */}
                  <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                    {selectedPayment.status === 'paid' && "✅ This invoice is fully settled."}
                    {selectedPayment.status === 'partially_paid' && `⚠️ Partially paid — ₹${(selectedPayment.paidAmount || 0).toLocaleString("en-IN")} of ₹${(selectedPayment.amount || 0).toLocaleString("en-IN")} collected. Use "Pay Balance" to record more.`}
                    {selectedPayment.status === 'pending' && "⏳ No payment received yet. Use \"Pay Balance\" to record the first payment."}
                    {selectedPayment.status === 'overdue' && "🔴 This invoice is overdue. The due date has passed and the balance is still outstanding."}
                    {selectedPayment.status === 'waived' && "🔘 This invoice was waived by an admin. No further payment is required."}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> Transaction History</h4>
                {selectedPayment.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPayment.transactions.map((tx: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-surface border border-border p-3 rounded text-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-success/50"></div>
                        <div>
                          <p className="font-medium text-foreground">Payment Received</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(tx.paidAt).toLocaleString()} • {tx.method?.toUpperCase()} • {tx.receiptNumber}</p>
                          {tx.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{tx.notes}"</p>}
                        </div>
                        <div className="text-right font-mono font-medium text-success">
                          + ₹{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic bg-surface p-4 rounded text-center border border-dashed border-border">No payments recorded yet.</p>
                )}
              </div>
              
              {selectedPayment.notes && (
                <div>
                   <h4 className="text-sm font-medium mb-2">Invoice Notes</h4>
                   <p className="text-sm text-muted-foreground bg-surface p-3 rounded border border-border">{selectedPayment.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4 bg-surface sm:rounded-b-lg flex justify-between">
               <button 
                  onClick={() => downloadReceiptMutation.mutate(selectedPayment._id)}
                  disabled={downloadReceiptMutation.isPending}
                  className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 disabled:opacity-50"
                >
                  {downloadReceiptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Receipt
                </button>
               <button onClick={() => setDetailsModalOpen(false)} className="rounded border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-elevated">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}