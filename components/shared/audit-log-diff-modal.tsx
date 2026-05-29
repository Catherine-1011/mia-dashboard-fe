"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  actorIp: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[];
  reason: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

interface AuditLogDiffModalProps {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Action badge config ───────────────────────────────────────────────────────
const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  PRODUCT_CREATED:                      { label: "Created",               className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  PRODUCT_UPDATED:                      { label: "Updated",               className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  PRODUCT_DELETED:                      { label: "Deleted",               className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  PRODUCT_RESTORED:                     { label: "Restored",              className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  PRODUCT_PERMANENTLY_DELETED:          { label: "Permanently Deleted",   className: "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/60 dark:text-red-200 dark:border-red-600" },
  PRODUCT_APPROVED:                     { label: "Approved",              className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  PRODUCT_REJECTED:                     { label: "Rejected",              className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  PRODUCT_ACTIVATED:                    { label: "Activated",             className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  PRODUCT_DEACTIVATED:                  { label: "Deactivated",           className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
  PRODUCT_BULK_APPROVED:                { label: "Bulk Approved",         className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  PRODUCT_AUTO_DEACTIVATED_LOW_STOCK:   { label: "Auto-Deactivated",      className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
};

function getActionBadge(action: string) {
  return ACTION_BADGE[action] ?? { label: action.replace(/_/g, " "), className: "bg-muted text-muted-foreground border-border" };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ─── Diff row ──────────────────────────────────────────────────────────────────
function DiffRow({
  field,
  before,
  after,
  changed,
}: {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}) {
  return (
    <tr className={cn("border-b last:border-0", changed && "bg-amber-50/60 dark:bg-amber-900/10")}>
      <td className="py-2 px-3 text-xs font-mono font-semibold text-muted-foreground align-top whitespace-nowrap w-36">
        {field}
        {changed && (
          <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-200 font-sans font-bold uppercase tracking-wide">changed</span>
        )}
      </td>
      <td className={cn("py-2 px-3 text-xs font-mono align-top break-all", changed ? "text-red-700 dark:text-red-400 line-through opacity-60" : "text-muted-foreground")}>
        <pre className="whitespace-pre-wrap">{formatValue(before)}</pre>
      </td>
      <td className={cn("py-2 px-3 text-xs font-mono align-top break-all", changed ? "text-green-700 dark:text-green-400 font-semibold" : "text-muted-foreground")}>
        <pre className="whitespace-pre-wrap">{formatValue(after)}</pre>
      </td>
    </tr>
  );
}

// ─── Snapshot actor enrichment (delete / restore) ─────────────────────────────
function SnapshotActorRow({ entry }: { entry: AuditLogEntry }) {
  if (entry.action === "PRODUCT_DELETED") {
    const email = entry.newData?.deletedByEmail != null ? String(entry.newData.deletedByEmail) : null;
    const role  = entry.newData?.deletedByRole  != null ? String(entry.newData.deletedByRole)  : null;
    if (!email && !role) return null;
    return (
      <div className="col-span-2">
        <span className="text-xs text-muted-foreground">Deleted by (snapshot)</span>
        <p className="text-xs">
          {email ?? "—"}
          {role && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300">
              {role}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (entry.action === "PRODUCT_RESTORED") {
    const email      = entry.newData?.restoredByEmail != null ? String(entry.newData.restoredByEmail) : null;
    const role       = entry.newData?.restoredByRole  != null ? String(entry.newData.restoredByRole)  : null;
    const restoredAt = entry.newData?.restoredAt      != null ? String(entry.newData.restoredAt)      : null;
    if (!email && !role) return null;
    return (
      <div className="col-span-2">
        <span className="text-xs text-muted-foreground">Restored by (snapshot)</span>
        <p className="text-xs">
          {email ?? "—"}
          {role && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300">
              {role}
            </span>
          )}
          {restoredAt && (
            <span className="ml-2 text-muted-foreground">
              at {formatDate(restoredAt)}
            </span>
          )}
        </p>
      </div>
    );
  }

  return null;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function AuditLogDiffModal({ entry, open, onOpenChange }: AuditLogDiffModalProps) {
  if (!entry) return null;

  const badge = getActionBadge(entry.action);

  // Build unified list of all keys from both snapshots
  const allKeys = Array.from(
    new Set([
      ...Object.keys(entry.previousData ?? {}),
      ...Object.keys(entry.newData ?? {}),
    ])
  );

  // Sort: changed fields first, then alphabetically
  const sortedKeys = allKeys.sort((a, b) => {
    const aChanged = entry.changedFields.includes(a);
    const bChanged = entry.changedFields.includes(b);
    if (aChanged && !bChanged) return -1;
    if (!aChanged && bChanged) return 1;
    return a.localeCompare(b);
  });

  const hasDiff = entry.previousData !== null || entry.newData !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            <span>Audit Log Detail</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Meta Info ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mt-1 border rounded-lg p-4 bg-muted/30">
          <div>
            <span className="text-xs text-muted-foreground">Log ID</span>
            <p className="font-mono text-xs truncate">{entry.id}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Timestamp (UTC → Local)</span>
            <p className="text-xs">{formatDate(entry.createdAt)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Actor</span>
            <p className="text-xs break-all">{entry.actorEmail ?? entry.actorId ?? "—"}</p>
            {entry.actorRole && (
              <span className="inline-flex items-center mt-1 text-[10px] px-1.5 py-0.5 rounded bg-muted border text-muted-foreground whitespace-nowrap">{entry.actorRole}</span>
            )}
          </div>
          {/* Snapshot actor — enriched identity for delete / restore events */}
          <SnapshotActorRow entry={entry} />
          {entry.actorIp !== null && (
          <div>
            <span className="text-xs text-muted-foreground">Actor IP</span>
            <p className="font-mono text-xs">{entry.actorIp}</p>
          </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Entity</span>
            <p className="font-mono text-xs">{entry.entityType} · {entry.entityId}</p>
          </div>
          {entry.reason && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Reason</span>
              <p className="text-xs text-foreground bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-2 py-1 mt-0.5">{entry.reason}</p>
            </div>
          )}
          {entry.changedFields.length > 0 && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Changed Fields</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.changedFields.map((f) => (
                  <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Diff Table ──────────────────────────────────────────────── */}
        {hasDiff ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Data Changes</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground w-36">Field</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400">Before</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-green-600 dark:text-green-400">After</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeys.map((key) => (
                    <DiffRow
                      key={key}
                      field={key}
                      before={entry.previousData?.[key]}
                      after={entry.newData?.[key]}
                      changed={entry.changedFields.includes(key)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No data snapshot available for this event.</p>
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center mt-2 select-none">
          This log entry is permanent and tamper-proof · Read-only
        </p>
      </DialogContent>
    </Dialog>
  );
}
