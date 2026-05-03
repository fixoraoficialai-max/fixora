"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users, Zap, Crown, Shield, Search,
  RefreshCw, Plus, Minus, CheckCircle2,
  AlertCircle, Loader2, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id:            string;
  name:          string | null;
  email:         string;
  image:         string | null;
  role:          string;
  emailVerified: boolean;
  createdAt:     string;
  providers:     string[];
  credits: { balance: number; lifetime: number };
  subscription:  { plan: string; status: string; renewsAt: string | null } | null;
}

interface ApiStats {
  total:     number;
  active:    number;
  noCredits: number;
  admins:    number;
}

type SortField = "createdAt" | "email";
type SortDir   = "asc" | "desc";

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [stats,    setStats]    = useState<ApiStats>({ total: 0, active: 0, noCredits: 0, admins: 0 });
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState<SortField>("createdAt");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");

  // Credit adjustment modal state
  const [adjusting,    setAdjusting]    = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading,setAdjustLoading]= useState(false);
  const [adjustMsg,    setAdjustMsg]    = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // ── Fetch users ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (opts?: { resetPage?: boolean }) => {
    const currentPage = opts?.resetPage ? 1 : page;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:    String(currentPage),
        limit:   String(PAGE_SIZE),
        sortBy,
        sortDir,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res  = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to load users");
      setUsers(json.data.users);
      setTotal(json.data.total);
      setPages(json.data.pages);
      setStats(json.data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Sorting ──────────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
    setPage(1);
  };

  // ── Adjust credits ───────────────────────────────────────────────────────────

  async function handleAdjust(sign: 1 | -1) {
    if (!adjusting || adjustAmount <= 0) return;
    setAdjustLoading(true);
    setAdjustMsg(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId: adjusting.id,
          amount: sign * adjustAmount,
          reason: adjustReason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");

      setAdjustMsg({ type: "success", text: `Balance updated → ${json.data.balance} credits` });

      setUsers((prev) => prev.map((u) =>
        u.id === adjusting.id
          ? { ...u, credits: { balance: json.data.balance, lifetime: json.data.lifetime } }
          : u
      ));
    } catch (e) {
      setAdjustMsg({ type: "error", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setAdjustLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
        </div>
        <p className="text-sm text-text-muted">Manage users and credits</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users className="h-4 w-4" />}  label="Total users"      value={stats.total}     />
        <StatCard icon={<Crown className="h-4 w-4 text-amber-400" />} label="Subscribed" value={stats.active} color="amber" />
        <StatCard icon={<AlertCircle className="h-4 w-4 text-danger" />} label="No credits" value={stats.noCredits} color="red" />
        <StatCard icon={<Shield className="h-4 w-4 text-primary" />}    label="Admins"    value={stats.admins}   color="violet" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchUsers()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Credits</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Plan</th>
                <SortHeader field="email"     label="Email"  current={sortBy} dir={sortDir} onSort={toggleSort} />
                <SortHeader field="createdAt" label="Joined" current={sortBy} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-text-muted" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onAdjust={() => { setAdjusting(user); setAdjustAmount(10); setAdjustReason(""); setAdjustMsg(null); }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {total > 0
            ? `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} users`
            : "0 users"}
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="secondary" size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-text-muted px-2">
              {page} / {pages}
            </span>
            <Button
              variant="secondary" size="sm"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Adjust credits modal */}
      {adjusting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h2 className="text-base font-bold text-text-primary mb-1">Adjust Credits</h2>
            <p className="text-sm text-text-muted mb-4">
              {adjusting.name ?? adjusting.email}
              <span className="ml-2 font-semibold text-text-primary">({adjusting.credits.balance} current)</span>
            </p>

            {adjustMsg && (
              <div className={`mb-3 rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                adjustMsg.type === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger"
              }`}>
                {adjustMsg.type === "success"
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  : <AlertCircle  className="h-3.5 w-3.5 shrink-0" />}
                {adjustMsg.text}
              </div>
            )}

            <div className="mb-3">
              <label className="text-xs text-text-muted mb-1 block">Amount</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-text-muted mb-1 block">Reason (optional)</label>
              <input
                type="text"
                placeholder="e.g. manual top-up, refund…"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 mb-3">
              <Button
                variant="primary"
                className="flex-1"
                disabled={adjustLoading}
                onClick={() => handleAdjust(1)}
              >
                {adjustLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add {adjustAmount} credits
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={adjustLoading}
                onClick={() => handleAdjust(-1)}
              >
                {adjustLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
                Remove {adjustAmount}
              </Button>
            </div>

            <Button variant="secondary" className="w-full" onClick={() => setAdjusting(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <div className={`mb-2 ${color === "amber" ? "text-amber-400" : color === "red" ? "text-danger" : color === "violet" ? "text-primary" : "text-text-muted"}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

function SortHeader({ field, label, current, dir, onSort }: {
  field: SortField; label: string; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary select-none"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function UserRow({ user, onAdjust }: { user: AdminUser; onAdjust: () => void }) {
  const plan    = user.subscription?.plan ?? "FREE";
  const isLow   = user.credits.balance <= 5;
  const isEmpty = user.credits.balance === 0;

  return (
    <tr className="hover:bg-surface-elevated/40 transition-colors">
      {/* User */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar name={user.name} image={user.image} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate max-w-[160px]">
              {user.name ?? "—"}
              {user.role === "ADMIN" && (
                <span className="ml-1.5 text-2xs bg-primary/20 text-primary-light rounded px-1 py-0.5 font-semibold">
                  ADMIN
                </span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Credits */}
      <td className="px-4 py-3">
        <span className={`text-sm font-bold tabular-nums ${isEmpty ? "text-danger" : isLow ? "text-warning" : "text-text-primary"}`}>
          {user.credits.balance}
        </span>
        <span className="text-xs text-text-muted"> / {user.credits.lifetime}</span>
      </td>

      {/* Plan */}
      <td className="px-4 py-3">
        <PlanBadge plan={plan} status={user.subscription?.status} />
      </td>

      {/* Email */}
      <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[200px]">
        {user.email}
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <Button variant="secondary" size="sm" onClick={onAdjust}>
          <Zap className="h-3.5 w-3.5" />
          Credits
        </Button>
      </td>
    </tr>
  );
}

function PlanBadge({ plan, status }: { plan: string; status?: string }) {
  const isPaid    = plan !== "FREE";
  const isPastDue = status === "past_due";
  return (
    <span className={`text-2xs font-semibold rounded px-1.5 py-0.5 border ${
      isPastDue ? "bg-danger/10 border-danger/30 text-danger" :
      isPaid    ? "bg-primary/10 border-primary/30 text-primary-light" :
                  "bg-surface-overlay border-border text-text-muted"
    }`}>
      {plan}{isPastDue ? " ⚠" : ""}
    </span>
  );
}

function UserAvatar({ name, image }: { name?: string | null; image?: string | null }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  if (image) {
    return <img src={image} alt={name ?? "User"} className="h-8 w-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary-light text-2xs font-semibold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}
