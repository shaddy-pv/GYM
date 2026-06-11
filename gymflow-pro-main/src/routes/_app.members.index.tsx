import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "@/lib/api/members.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/members/")({
  head: () => ({ meta: [{ title: "Members - GymOS" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["members", activeGymId, page, limit, query, filter],
    queryFn: () => membersApi.getMembers(activeGymId!, {
      page,
      limit,
      search: query || undefined,
      status: filter !== "all" ? filter : undefined,
    }),
    enabled: !!activeGymId,
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => membersApi.deleteMember(activeGymId!, memberId),
    onSuccess: () => {
      toast.success("Member deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["members", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete member");
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete member ${name}? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
    setPage(1);
  };

  const membersList = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <>
      <Topbar title="Members" subtitle={`${total} total members`} />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or phone…"
              className="h-9 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold"
            />
          </form>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
          <Link
            to="/members/add"
            className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]"
          >
            <Plus className="h-4 w-4" /> Add Member
          </Link>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Join</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Points</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
                    </td>
                  </tr>
                ) : membersList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No members found
                    </td>
                  </tr>
                ) : (
                  membersList.map((m: any) => (
                    <tr key={m._id} className="transition-colors hover:bg-elevated/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={m.profilePhoto} name={m.name} size="sm" />
                          <div>
                            <p className="text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.memberId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular text-muted-foreground">{m.phone}</td>
                      <td className="px-4 py-3 text-foreground">{m.membershipPlan?.name || "None"}</td>
                      <td className="px-4 py-3 font-mono tabular text-muted-foreground">{new Date(m.joinDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-mono tabular text-muted-foreground">{new Date(m.expiryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3 text-right font-mono tabular text-foreground">{m.totalPoints || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to="/members/$id" params={{ id: m._id }}
                            className="rounded-sm p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground">
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(m._id, m.name)}
                            disabled={deleteMutation.isPending}
                            className="rounded-sm p-1.5 text-muted-foreground hover:bg-elevated hover:text-danger disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>Showing {membersList.length} of {total} entries</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-sm border border-border px-2 py-1 hover:bg-elevated disabled:opacity-50"
                >Prev</button>
                <span className="flex items-center px-2">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-sm border border-border px-2 py-1 hover:bg-elevated disabled:opacity-50"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}