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
  ShieldX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuditLogDiffModal, type AuditLogEntry } from "@/components/shared/audit-log-diff-modal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend.madeinarnhemland.com.au";

// ─── Action badge config ───────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  PRODUCT_CREATED:                    { label: "Created",              className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  PRODUCT_UPDATED:                    { label: "Updated",              className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  PRODUCT_DELETED:                    { label: "Deleted",              className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  PRODUCT_RESTORED:                   { label: "Restored",             className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  PRODUCT_PERMANENTLY_DELETED:        { label: "Permanently Deleted",  className: "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/60 dark:text-red-200 dark:border-red-600" },
  PRODUCT_APPROVED:                   { label: "Approved",             className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  PRODUCT_REJECTED:                   { label: "Rejected",             className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  PRODUCT_ACTIVATED:                  { label: "Activated",            className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  PRODUCT_DEACTIVATED:                { label: "Deactivated",          className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
  PRODUCT_BULK_APPROVED:              { label: "Bulk Approved",        className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  PRODUCT_AUTO_DEACTIVATED_LOW_STOCK: { label: "Auto-Deactivated",     className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  SELLER:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  CUSTOMER: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
  SYSTEM:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action.replace(/_/g, " "), className: "bg-muted text-muted-foreground border-border" };
}

// ─── Actor detail row (delete / restore enrichment) ────────────────────────────
function ActorDetailRow({
  label,
  email,
  role,
  timestamp,
}: {
  label: string;
  email?: string | null;
  role?: string | null;
  timestamp?: string | null;
}) {
  if (!email && !role) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-dashed">
      <span className="font-medium shrink-0">{label}:</span>
      {email && <span className="font-mono truncate max-w-[180px]">{email}</span>}
      {role && (
        <span className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          ROLE_BADGE[role] ?? ROLE_BADGE.SYSTEM
        )}>
          {role}
        </span>
      )}
      {timestamp && (
        <span
          className="ml-auto tabular-nums shrink-0"
          title={formatTimestamp(timestamp)}
        >
          {relativeTime(timestamp)}
        </span>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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
interface ProductAuditHistoryProps {
  productId: string;
  productTitle?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function ProductAuditHistory({ productId, productTitle }: ProductAuditHistoryProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [page, setPage]           = useState(1);
  const [meta, setMeta]           = useState({ total: 0, page: 1, limit: 20, pages: 1 });

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [diffOpen, setDiffOpen]           = useState(false);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      // Use raw fetch to avoid the global 403→logout interceptor in api.ts
      const res = await fetch(
        `${BASE_URL}/api/admin/audit-logs/products/${productId}?page=${p}&limit=20`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setLogs(data?.data ?? []);
      if (data?.meta) setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchLogs(page); }, [fetchLogs, page]);

  const openDiff = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDiffOpen(true);
  };

  return (
    <>
      <div className="mt-6 border-t pt-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <h4 className="font-semibold text-sm tracking-wide">Audit History</h4>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5 shrink-0" />
            Immutable · Read-only
          </span>
          {meta.total > 0 && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {meta.total} event{meta.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit history…
          </div>
        ) : forbidden ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
            <ShieldX className="h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">Audit history is visible to Admins only.</p>
            <p className="text-xs opacity-60">Every change to this product is being recorded and can be reviewed by your Admin.</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(page)}>Retry</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">No audit events recorded for this product yet.</p>
          </div>
        ) : (
          <ol className="relative border-l border-muted ml-3 space-y-0">
            {logs.map((entry, idx) => {
              const config  = getActionConfig(entry.action);
              const isLast  = idx === logs.length - 1;

              return (
                <li key={entry.id} className={cn("ml-5", !isLast && "pb-5")}>
                  {/* Timeline bubble */}
                  <span className={cn(
                    "absolute -left-[17px] flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 text-[10px] font-bold select-none",
                    config.className
                  )}>
                    {entry.action.replace("PRODUCT_", "").charAt(0)}
                  </span>

                  {/* Entry card */}
                  <div className="rounded-lg border bg-background shadow-sm p-3 select-none">
                    {/* Top row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border", config.className)}>
                        {config.label}
                      </span>
                      {entry.actorRole && (
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", ROLE_BADGE[entry.actorRole] ?? ROLE_BADGE.SYSTEM)}>
                          {entry.actorEmail ?? entry.actorId ?? "System"}
                        </span>
                      )}
                      <span
                        className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0"
                        title={formatTimestamp(entry.createdAt)}
                      >
                        {relativeTime(entry.createdAt)}
                      </span>
                    </div>

                    {/* Changed fields */}
                    {entry.changedFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] text-muted-foreground mr-1 self-center">Changed:</span>
                        {entry.changedFields.map((f) => (
                          <span key={f} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{f}</span>
                        ))}
                      </div>
                    )}

                    {/* Reason */}
                    {entry.reason && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        Reason: {entry.reason}
                      </p>
                    )}

                    {/* Enriched actor identity for delete / restore events */}
                    {entry.action === "PRODUCT_DELETED" && (
                      <ActorDetailRow
                        label="Deleted by"
                        email={(entry.newData?.deletedByEmail as string | null) ?? entry.actorEmail}
                        role={(entry.newData?.deletedByRole as string | null) ?? entry.actorRole}
                      />
                    )}
                    {entry.action === "PRODUCT_RESTORED" && (
                      <ActorDetailRow
                        label="Restored by"
                        email={(entry.newData?.restoredByEmail as string | null) ?? entry.actorEmail}
                        role={(entry.newData?.restoredByRole as string | null) ?? entry.actorRole}
                        timestamp={(entry.newData?.restoredAt as string | null) ?? null}
                      />
                    )}
                    {entry.action === "PRODUCT_PERMANENTLY_DELETED" && (
                      <ActorDetailRow
                        label="Permanently deleted by"
                        email={entry.actorEmail}
                        role={entry.actorRole}
                      />
                    )}

                    {/* View Diff */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => openDiff(entry)}
                    >
                      <Eye className="h-3 w-3" />
                      View Diff
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Page {meta.page} of {meta.pages}</span>
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= meta.pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && logs.length > 0 && (
          <p className="mt-4 text-[10px] text-muted-foreground/50 text-center select-none">
            This is a permanent, tamper-proof audit trail for{" "}
            {productTitle ? `"${productTitle}"` : "this product"}.
            <br />
            Visible to Sellers and Admins · Cannot be edited or deleted.
          </p>
        )}
      </div>

      <AuditLogDiffModal
        entry={selectedEntry}
        open={diffOpen}
        onOpenChange={setDiffOpen}
      />
    </>
  );
}
