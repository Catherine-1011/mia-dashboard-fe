"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Clock,
  Lock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuditLogDiffModal, type AuditLogEntry } from "@/components/shared/audit-log-diff-modal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au";

// ─── Action badge config ───────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; className: string; initial: string }> = {
  CATEGORY_CREATED:      { label: "Created",              initial: "C", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  CATEGORY_REQUESTED:    { label: "Requested",            initial: "R", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700" },
  CATEGORY_APPROVED:     { label: "Approved",             initial: "A", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  CATEGORY_REJECTED:     { label: "Rejected",             initial: "X", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  CATEGORY_EDITED:       { label: "Edited",               initial: "E", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  CATEGORY_RESUBMITTED:  { label: "Resubmitted",          initial: "↺", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700" },
  CATEGORY_SOFT_DELETED: { label: "Soft Deleted",         initial: "D", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
  CATEGORY_RESTORED:     { label: "Restored",             initial: "♻", className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  CATEGORY_HARD_DELETED: { label: "Permanently Deleted",  initial: "!", className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700" },
};

const ROLE_BADGE: Record<string, { className: string; label: string }> = {
  ADMIN:       { label: "Admin",       className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800" },
  SUPER_ADMIN: { label: "Super Admin", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800" },
  SELLER:      { label: "Seller",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" },
  CUSTOMER:    { label: "Customer",    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800" },
  SYSTEM:      { label: "System",      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label: action.replace(/_/g, " "),
    initial: action.charAt(0),
    className: "bg-muted text-muted-foreground border-border",
  };
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTimestamp(iso);
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface CategoryAuditHistoryProps {
  categoryId: string;
  categoryName?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function CategoryAuditHistory({ categoryId, categoryName }: CategoryAuditHistoryProps) {
  const [logs, setLogs]               = useState<AuditLogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const LIMIT = 20;

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [diffOpen, setDiffOpen]           = useState(false);

  const fetchLogs = useCallback(async (p: number, action: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (action !== "ALL") params.set("action", action);
      const res = await fetch(
        `${BASE_URL}/api/categories/${categoryId}/logs?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const logsArr: AuditLogEntry[] = data?.data?.logs ?? data?.data ?? [];
      setLogs(logsArr);
      setTotal(data?.data?.total ?? logsArr.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { fetchLogs(page, actionFilter); }, [fetchLogs, page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="mt-2">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <h4 className="font-semibold text-sm tracking-wide">
            Audit History{categoryName ? ` — ${categoryName}` : ""}
          </h4>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5 shrink-0" />
            Immutable · Read-only
          </span>
          {total > 0 && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {total} event{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by action:</span>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-52 h-8 text-xs">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit history…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(page, actionFilter)}>Retry</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">No audit events recorded for this category yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Changed By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Changed Fields</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {logs.map((entry, idx) => {
                  const config = getActionConfig(entry.action);
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      onClick={() => { setSelectedEntry(entry); setDiffOpen(true); }}
                    >
                      <td className="px-4 py-2 text-sm text-muted-foreground">{(page - 1) * LIMIT + idx + 1}</td>
                      <td className="px-4 py-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap", config.className)}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 min-w-[140px] max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-medium break-all leading-tight">{entry.actorEmail ?? entry.actorId ?? "—"}</p>
                          {entry.actorIp && (
                            <span className="font-mono text-[10px] text-muted-foreground break-all">{entry.actorIp}</span>
                          )}
                          {entry.actorRole && (() => {
                            const roleCfg = ROLE_BADGE[entry.actorRole];
                            return (
                              <span className={cn(
                                "inline-flex items-center self-start rounded-full px-1.5 py-0 text-[9px] font-semibold whitespace-nowrap",
                                roleCfg?.className ?? "bg-muted text-muted-foreground border border-border"
                              )}>
                                {roleCfg?.label ?? entry.actorRole}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {entry.changedFields?.length > 0
                            ? entry.changedFields.map((f) => (
                              <span key={f} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{f}</span>
                            ))
                            : <span className="text-[10px] text-muted-foreground">—</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(entry.createdAt)}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setDiffOpen(true); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Page {page} of {totalPages} · {total} total event{total !== 1 ? "s" : ""}</span>
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3 w-3" />Prev
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next<ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AuditLogDiffModal
        entry={selectedEntry}
        open={diffOpen}
        onOpenChange={(o) => { setDiffOpen(o); if (!o) setSelectedEntry(null); }}
      />
    </>
  );
}
