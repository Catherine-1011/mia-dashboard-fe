"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Clock,
  Plus,
  Edit3,
  RefreshCw,
  ImageIcon,
  Trash2,
  RotateCcw,
  Lock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://134.199.161.119:5000";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ProductLogEvent =
  | "created"
  | "edited"
  | "status_changed"
  | "images_updated"
  | "deleted"
  | "restored";

export type ProductLogEntry = {
  id: string;
  eventType: ProductLogEvent;
  description: string;
  actor: {
    name: string;
    role: "SELLER" | "ADMIN" | "SYSTEM";
  };
  /** Fields that were changed (for 'edited' events) */
  changedFields?: string[];
  /** Previous value (for 'status_changed' events) */
  oldValue?: string;
  /** New value (for 'status_changed' events) */
  newValue?: string;
  timestamp: string; // ISO date string
};

// ─── API ───────────────────────────────────────────────────────────────────────
/**
 * Fetch product audit logs from the backend.
 * Endpoint: GET /api/admin/audit-logs/products/:productId
 *
 * Maps the backend AuditLogEntry shape to the local ProductLogEntry shape.
 * Falls back to demo data when the API is unavailable.
 */
const ACTION_TO_EVENT: Record<string, ProductLogEvent> = {
  PRODUCT_CREATED:                    "created",
  PRODUCT_UPDATED:                    "edited",
  PRODUCT_DELETED:                    "deleted",
  PRODUCT_RESTORED:                   "restored",
  PRODUCT_PERMANENTLY_DELETED:        "deleted",
  PRODUCT_APPROVED:                   "status_changed",
  PRODUCT_REJECTED:                   "status_changed",
  PRODUCT_ACTIVATED:                  "status_changed",
  PRODUCT_DEACTIVATED:                "status_changed",
  PRODUCT_BULK_APPROVED:              "status_changed",
  PRODUCT_AUTO_DEACTIVATED_LOW_STOCK: "status_changed",
};

function mapAuditEntryToLog(entry: any): ProductLogEntry {
  const eventType: ProductLogEvent = ACTION_TO_EVENT[entry.action] ?? "edited";
  const description = entry.action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c: string) => c.toUpperCase());

  const base: ProductLogEntry = {
    id: entry.id,
    eventType,
    description: entry.reason ? `${description} — ${entry.reason}` : description,
    actor: {
      name: entry.actorEmail ?? entry.actorId ?? "System",
      role: (entry.actorRole ?? "SYSTEM") as "SELLER" | "ADMIN" | "SYSTEM",
    },
    changedFields: entry.changedFields ?? [],
    oldValue: entry.previousData?.status ? String(entry.previousData.status) : undefined,
    newValue: entry.newData?.status ? String(entry.newData.status) : undefined,
    timestamp: entry.createdAt,
  };

  // Enrich delete / restore events with identity fields from the newData snapshot
  if (entry.action === "PRODUCT_DELETED") {
    const email = (entry.newData?.deletedByEmail ?? entry.actorEmail) as string | null;
    const role  = (entry.newData?.deletedByRole  ?? entry.actorRole)  as string | null;
    base.actor  = { name: email ?? entry.actorId ?? "System", role: (role ?? "SYSTEM") as "SELLER" | "ADMIN" | "SYSTEM" };
    if (entry.reason) base.description = entry.reason;
  } else if (entry.action === "PRODUCT_RESTORED") {
    const email      = (entry.newData?.restoredByEmail ?? entry.actorEmail) as string | null;
    const role       = (entry.newData?.restoredByRole  ?? entry.actorRole)  as string | null;
    const restoredAt = entry.newData?.restoredAt as string | undefined;
    base.actor     = { name: email ?? entry.actorId ?? "System", role: (role ?? "SYSTEM") as "SELLER" | "ADMIN" | "SYSTEM" };
    if (restoredAt) base.timestamp = restoredAt;
    if (entry.reason) base.description = entry.reason;
  } else if (entry.action === "PRODUCT_PERMANENTLY_DELETED") {
    if (entry.reason) base.description = entry.reason;
  }

  return base;
}

async function fetchProductLogs(productId: string): Promise<ProductLogEntry[]> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
    if (!token) return [];

    // Real audit-log endpoint (admin-only)
    const res = await fetch(
      `${BASE_URL}/api/admin/audit-logs/products/${productId}?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const entries: any[] = Array.isArray(data) ? data : (data.data ?? data.logs ?? []);
    return entries.map(mapAuditEntryToLog);
  } catch {
    return [];
  }
}

// ─── Demo / Sample Data ────────────────────────────────────────────────────────
/**
 * Shown when the real API is not yet available.
 * Covers every event type so the UI can be fully previewed.
 */
function getDemoLogs(productId: string): ProductLogEntry[] {
  const now = Date.now();
  return [
    {
      id: `${productId}-demo-1`,
      eventType: "created",
      description:
        "Product was created and submitted for admin review.",
      actor: { name: "Seller", role: "SELLER" },
      timestamp: new Date(now - 7 * 86_400_000).toISOString(),
    },
    {
      id: `${productId}-demo-2`,
      eventType: "status_changed",
      description: "Product status changed after admin review.",
      actor: { name: "Admin", role: "ADMIN" },
      oldValue: "PENDING",
      newValue: "APPROVED",
      timestamp: new Date(now - 6 * 86_400_000).toISOString(),
    },
    {
      id: `${productId}-demo-3`,
      eventType: "edited",
      description: "Product details were updated by the seller.",
      actor: { name: "Seller", role: "SELLER" },
      changedFields: ["price", "stock", "description"],
      timestamp: new Date(now - 3 * 86_400_000).toISOString(),
    },
    {
      id: `${productId}-demo-4`,
      eventType: "images_updated",
      description: "Featured image and gallery images were replaced.",
      actor: { name: "Seller", role: "SELLER" },
      timestamp: new Date(now - 1 * 86_400_000).toISOString(),
    },
    {
      id: `${productId}-demo-5`,
      eventType: "deleted",
      description: "Moved to Recycle Bin by ADMIN (admin@example.com)",
      actor: { name: "admin@example.com", role: "ADMIN" },
      timestamp: new Date(now - 12 * 3_600_000).toISOString(),
    },
    {
      id: `${productId}-demo-6`,
      eventType: "restored",
      description: "Restored by SELLER (seller@example.com). Status set to PENDING — awaiting admin approval.",
      actor: { name: "seller@example.com", role: "SELLER" },
      timestamp: new Date(now - 6 * 3_600_000).toISOString(),
    },
  ];
}

// ─── Event Metadata ────────────────────────────────────────────────────────────
const EVENT_META: Record<
  ProductLogEvent,
  {
    label: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
  }
> = {
  created: {
    label: "Created",
    icon: <Plus className="h-3.5 w-3.5" />,
    colorClass: "text-emerald-700 dark:text-emerald-400",
    bgClass:
      "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700",
  },
  edited: {
    label: "Edited",
    icon: <Edit3 className="h-3.5 w-3.5" />,
    colorClass: "text-blue-700 dark:text-blue-400",
    bgClass:
      "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
  },
  status_changed: {
    label: "Status Changed",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    colorClass: "text-amber-700 dark:text-amber-400",
    bgClass:
      "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700",
  },
  images_updated: {
    label: "Images Updated",
    icon: <ImageIcon className="h-3.5 w-3.5" />,
    colorClass: "text-indigo-700 dark:text-indigo-400",
    bgClass:
      "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700",
  },
  deleted: {
    label: "Deleted",
    icon: <Trash2 className="h-3.5 w-3.5" />,
    colorClass: "text-red-700 dark:text-red-400",
    bgClass:
      "bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700",
  },
  restored: {
    label: "Restored",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    colorClass: "text-teal-700 dark:text-teal-400",
    bgClass:
      "bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700",
  },
};

const ROLE_BADGE: Record<string, string> = {
  SELLER:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  ADMIN:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  SYSTEM:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
};

// ─── Timestamp helpers ─────────────────────────────────────────────────────────
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

// ─── Component ─────────────────────────────────────────────────────────────────
interface ProductActivityLogProps {
  /** The product ID to load logs for */
  productId: string;
  /** Optional product title used in the footer note */
  productTitle?: string;
}

/**
 * ProductActivityLog
 *
 * A permanent, non-editable activity thread that tracks every notable change
 * made to a product. Visible to both Sellers and Admins.
 *
 * Wire-up: point your backend at GET /api/products/:id/logs and return an
 * array of ProductLogEntry objects. Until the endpoint is live the component
 * shows representative sample data with a visible indicator.
 */
export function ProductActivityLog({
  productId,
  productTitle,
}: ProductActivityLogProps) {
  const [logs, setLogs] = useState<ProductLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchProductLogs(productId).then((data) => {
      if (cancelled) return;

      if (data.length > 0) {
        setLogs(data);
        setIsDemo(false);
      } else {
        // Backend endpoint not yet available — show sample data
        setLogs(getDemoLogs(productId));
        setIsDemo(true);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <div className="mt-6 border-t pt-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <h4 className="font-semibold text-sm tracking-wide">Activity Log</h4>

        {/* Permanent / read-only badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border text-[10px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5 shrink-0" />
          Permanent · Read-only
        </span>

        {/* Demo data indicator */}
        {isDemo && !loading && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
            Sample data · API endpoint pending
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity log…
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">No activity recorded yet for this product.</p>
        </div>
      ) : (
        <ol className="relative border-l border-muted ml-3 space-y-0">
          {logs.map((entry, idx) => {
            const meta = EVENT_META[entry.eventType];
            const isLast = idx === logs.length - 1;

            return (
              <li key={entry.id} className={cn("ml-5", !isLast && "pb-5")}>
                {/* ── Timeline bubble ──────────────────────────────────── */}
                <span
                  className={cn(
                    "absolute -left-[17px] flex h-[34px] w-[34px] items-center justify-center rounded-full border-2",
                    meta.bgClass,
                    meta.colorClass
                  )}
                >
                  {meta.icon}
                </span>

                {/* ── Entry card ───────────────────────────────────────── */}
                <div className="rounded-lg border bg-background shadow-sm p-3 select-none">
                  {/* Top row: event badge · actor · timestamp */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Event type */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        meta.bgClass,
                        meta.colorClass
                      )}
                    >
                      {meta.label}
                    </span>

                    {/* Actor role + name */}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        ROLE_BADGE[entry.actor.role] ?? ROLE_BADGE.SYSTEM
                      )}
                    >
                      {entry.actor.role === "ADMIN"
                        ? "👤 Admin"
                        : entry.actor.role === "SELLER"
                        ? "🛍️ Seller"
                        : "⚙️ System"}
                      {entry.actor.name ? ` · ${entry.actor.name}` : ""}
                    </span>

                    {/* Relative timestamp (absolute on hover) */}
                    <span
                      className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0"
                      title={formatTimestamp(entry.timestamp)}
                    >
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {entry.description}
                  </p>

                  {/* Changed fields (for 'edited' events) */}
                  {entry.changedFields && entry.changedFields.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] text-muted-foreground mr-1 self-center">
                        Changed:
                      </span>
                      {entry.changedFields.map((field) => (
                        <span
                          key={field}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Old → New value (for 'status_changed' events) */}
                  {entry.oldValue && entry.newValue && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {entry.oldValue}
                      </span>
                      <span className="text-muted-foreground text-base leading-none">→</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                        {entry.newValue}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* ── Footer note ────────────────────────────────────────────────── */}
      {!loading && (
        <p className="mt-4 text-[10px] text-muted-foreground/50 text-center select-none">
          This log is a permanent, tamper-proof record of all changes made to{" "}
          {productTitle ? `"${productTitle}"` : "this product"}.
          <br />
          Visible to Sellers and Admins · Cannot be edited or deleted.
        </p>
      )}
    </div>
  );
}
