"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import {
  Search, RefreshCw, Eye, RotateCcw, AlertCircle, CheckCircle2,
  Clock, XCircle, DollarSign, User, Mail, Package, Calendar, Paperclip, ShoppingBag,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RefundProduct = {
  id: string;
  orderItemId?: string;
  productId?: string;
  title: string;
  price?: string;
  quantity?: number;
  image?: string | null;
  featuredImage?: string | null;
  reason?: string | null;
  attachments?: string[];
  category?: string | null;
  sellerName?: string | null;
  product?: {
    image?: string | null;
    featuredImage?: string | null;
    images?: string[] | null;
  } | null;
};

type RefundRequest = {
  id: string;
  userId: string | null;
  // new API fields
  reason?: string | null;
  requestedItems?: RefundProduct[];
  adminResponse?: string | null;
  // legacy / compat fields
  subject?: string;
  message?: string;
  response?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category?: string;
  status: "OPEN" | "IN_PROGRESS" | "APPROVED" | "RESOLVED" | "COMPLETED" | "REJECTED" | "CLOSED";
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
  guestEmail: string | null;
  requestType: string;
  user: { id: string; name: string; email: string } | null;
  customerName: string | null;
  customerEmail: string | null;
  orderStatus: string | null;
  orderDisplayId: string | null;
  orderTotalAmount: string | null;
  isGuest: boolean;
  products?: RefundProduct[];
  items?: RefundProduct[];
  sellerItems?: RefundProduct[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: RefundRequest["status"]) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    OPEN:        { label: "Open",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",     icon: <Clock className="h-3 w-3" /> },
    IN_PROGRESS: { label: "Open",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",     icon: <Clock className="h-3 w-3" /> },
    APPROVED:    { label: "Open",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",     icon: <Clock className="h-3 w-3" /> },
    COMPLETED:   { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    RESOLVED:    { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED:    { label: "Rejected",  className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",         icon: <XCircle className="h-3 w-3" /> },
    CLOSED:      { label: "Rejected",  className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",         icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>
      {s.icon}{s.label}
    </span>
  );
}

function priorityBadge(priority: RefundRequest["priority"]) {
  if (!priority) return null;
  const map: Record<string, string> = {
    LOW:    "bg-muted text-muted-foreground",
    MEDIUM: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    HIGH:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    URGENT: "bg-red-600 text-white",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[priority] ?? "bg-muted text-muted-foreground"}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Parse product items embedded in the message after ---ITEMS_JSON--- */
function parseItemsFromMessage(message: string): RefundProduct[] {
  try {
    const parts = message?.split("---ITEMS_JSON---");
    if (parts && parts.length > 1) {
      const parsed = JSON.parse(parts[1].trim());
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function RefundTableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function SellerRefundRequestsPage() {
  const [requests, setRequests]     = useState<RefundRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("ALL");
  const [selected, setSelected]     = useState<RefundRequest | null>(null);
  const [response, setResponse]     = useState("");
  const [responding, setResponding] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage]                   = useState(1);

  // Derived: items for the currently-open request
  const selectedItems: RefundProduct[] =
    (selected?.requestedItems?.length ? selected.requestedItems : null) ??
    (selected?.sellerItems?.length    ? selected.sellerItems    : null) ??
    (selected?.items?.length          ? selected.items          : null) ??
    (selected?.products?.length       ? selected.products       : null) ??
    (selected ? parseItemsFromMessage(selected.message ?? "") : []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:     requests.length,
    open:      requests.filter(r => r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "APPROVED").length,
    completed: requests.filter(r => r.status === "RESOLVED" || r.status === "COMPLETED").length,
    rejected:  requests.filter(r => r.status === "CLOSED"   || r.status === "REJECTED").length,
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/seller/orders/refund-requests");
      const list: RefundRequest[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.requests)
        ? data.requests
        : Array.isArray(data?.refundRequests)
        ? data.refundRequests
        : Array.isArray(data?.data?.refundRequests)
        ? data.data.refundRequests
        : [];
      setRequests(list);
    } catch {
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Open Detail ────────────────────────────────────────────────────────────
  const openDetail = async (r: RefundRequest) => {
    const listItems =
      (Array.isArray(r.requestedItems) && r.requestedItems.length > 0 ? r.requestedItems : null) ??
      (Array.isArray(r.sellerItems)    && r.sellerItems.length    > 0 ? r.sellerItems    : null) ??
      (Array.isArray(r.items)          && r.items.length          > 0 ? r.items          : null) ??
      (Array.isArray(r.products)       && r.products.length       > 0 ? r.products       : null) ??
      (parseItemsFromMessage(r.message ?? "").length > 0 ? parseItemsFromMessage(r.message ?? "") : null);

    setSelected({ ...r, requestedItems: listItems ?? undefined });
    setResponse(r.adminResponse ?? r.response ?? "");

    if (listItems) return;

    // Fallback: fetch detail endpoint
    setDetailLoading(true);
    try {
      const raw = await api.get(`/api/seller/orders/refund-requests/${r.id}`);
      const detailObj =
        raw?.refundRequest ??
        raw?.data?.refundRequest ??
        raw?.data ??
        raw ?? {};

      const fetchedItems: RefundProduct[] =
        (Array.isArray(detailObj?.requestedItems) ? detailObj.requestedItems : null) ??
        (Array.isArray(detailObj?.items)          ? detailObj.items          : null) ??
        (Array.isArray(detailObj?.products)       ? detailObj.products       : null) ??
        [];

      if (fetchedItems.length > 0) {
        setSelected(prev => prev ? { ...prev, requestedItems: fetchedItems } : null);
      }
    } catch {
      // silently ignore
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Respond ────────────────────────────────────────────────────────────────
  const handleRespond = async () => {
    if (!selected || !response.trim()) return;
    setResponding(true);
    try {
      await api.post(`/api/seller/orders/refund-requests/${selected.id}/respond`, { response });
      toast.success("Response sent to customer");
      setSelected(null);
      setResponse("");
      load();
    } catch {
      toast.error("Failed to send response");
    } finally {
      setResponding(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const name  = r.user?.name  ?? r.customerName  ?? r.guestEmail ?? "";
    const email = r.user?.email ?? r.customerEmail ?? r.guestEmail ?? "";
    const matchSearch =
      !q ||
      (r.subject ?? "").toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q) ||
      (r.orderDisplayId ?? "").toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "OPEN"     && (r.status === "OPEN"     || r.status === "IN_PROGRESS" || r.status === "APPROVED")) ||
      (statusFilter === "RESOLVED" && (r.status === "RESOLVED" || r.status === "COMPLETED")) ||
      (statusFilter === "CLOSED"   && (r.status === "CLOSED"   || r.status === "REJECTED"));
    return matchSearch && matchStatus;
  });

  // Reset to page 1 whenever filter/search changes
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Refund Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer refund requests for your orders
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: <DollarSign className="h-4 w-4" />,
            color: "text-foreground",
          },
          {
            label: "Open",
            value: stats.open,
            icon: <Clock className="h-4 w-4" />,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: "text-green-600 dark:text-green-400",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            icon: <XCircle className="h-4 w-4" />,
            color: "text-red-600 dark:text-red-400",
          },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="flex items-center justify-between pt-5 pb-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                <div className={`text-2xl font-bold mt-1 ${s.color}`}>
                  {loading ? <Skeleton className="h-7 w-8" /> : s.value}
                </div>
              </div>
              <div className={`${s.color} opacity-70`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, order ID or customer…"
            className={`pl-9 ${search ? 'pr-9' : ''}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="RESOLVED">Completed</SelectItem>
            <SelectItem value="CLOSED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {loading ? "Loading…" : `${filtered.length} request${filtered.length !== 1 ? "s" : ""}${filtered.length > PAGE_SIZE ? ` · page ${page} of ${totalPages}` : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <RefundTableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No refund requests found</p>
              <p className="text-sm mt-1">
                {search || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Refund requests from your customers will appear here"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      {r.orderDisplayId ? (
                        <span className="font-mono text-sm font-semibold">{r.orderDisplayId}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                      {r.orderTotalAmount && (
                        <p className="text-xs text-muted-foreground">${r.orderTotalAmount}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {r.user?.name ?? r.customerName ?? r.guestEmail ?? "Unknown"}
                        {r.isGuest && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                            Guest
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.user?.email ?? r.customerEmail ?? r.guestEmail ?? ""}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-sm truncate" title={r.reason ?? r.subject ?? ""}>
                        {r.reason ? (r.reason.length > 60 ? r.reason.slice(0, 60) + "\u2026" : r.reason) : (r.subject ?? "\u2014")}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.requestType}</p>
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetail(r)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 px-0"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail / Respond Dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={open => { if (!open) { setSelected(null); setResponse(""); } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <DollarSign className="h-5 w-5 text-primary" />
              Refund Request
              {selected && selected.priority && priorityBadge(selected.priority)}
              {selected && statusBadge(selected.status)}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 mt-2">

              {/* Order & Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Package className="h-3 w-3" /> Order
                  </p>
                  <p className="font-semibold">{selected.orderDisplayId ?? "—"}</p>
                  {selected.orderStatus && (
                    <p className="text-xs text-muted-foreground">Status: {selected.orderStatus}</p>
                  )}
                  {selected.orderTotalAmount && (
                    <p className="text-xs text-muted-foreground">Total: ${selected.orderTotalAmount}</p>
                  )}
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" /> Customer
                  </p>
                  <p className="font-semibold flex items-center gap-1.5">
                    {selected.user?.name ?? selected.customerName ?? selected.guestEmail ?? "Unknown"}
                    {selected.isGuest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                        Guest
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selected.user?.email ?? selected.customerEmail ?? selected.guestEmail ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmt(selected.createdAt)}
                  </p>
                </div>
              </div>

              {/* Items */}
              {detailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : selectedItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> Items ({selectedItems.length})
                  </p>
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {selectedItems.map((p, idx) => (
                      <div key={p.id ?? p.orderItemId ?? idx} className="flex flex-col gap-2 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const img = p.image ?? p.featuredImage ?? p.product?.image ?? p.product?.featuredImage ?? p.product?.images?.[0] ?? null;
                            return img ? (
                              <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden border bg-muted">
                                <Image src={img} alt={p.title} fill className="object-cover" sizes="56px" />
                              </div>
                            ) : (
                              <div className="h-14 w-14 shrink-0 rounded-md border bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.category && (
                                <span className="text-xs text-muted-foreground">{p.category}</span>
                              )}
                              {p.sellerName && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.sellerName}</span>
                              )}
                              {p.price && (
                                <span className="text-xs font-medium">${p.price}</span>
                              )}
                            </div>
                          </div>
                          {p.quantity != null && (
                            <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              x{p.quantity}
                            </span>
                          )}
                        </div>
                        {/* Per-item reason */}
                        {p.reason && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                            <span className="font-medium">Reason:</span> {p.reason}
                          </p>
                        )}
                        {/* Per-item attachments */}
                        {p.attachments && p.attachments.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {p.attachments.map((url, ai) => (
                              <a key={ai} href={url} target="_blank" rel="noopener noreferrer"
                                className="block rounded border overflow-hidden hover:opacity-80 transition-opacity">
                                <img src={url} alt={`item-attachment-${ai}`} className="h-12 w-12 object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Reason */}
              {(selected.reason || selected.subject || selected.message) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reason</p>
                  <pre className="text-sm whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-sans">
                    {selected.reason ??
                      selected.message?.match(/Reason:\s*(.+)/)?.[1]?.trim() ??
                      selected.message?.split("---ITEMS_JSON---")[0].trim() ??
                      selected.subject}
                  </pre>
                </div>
              )}

              {/* Current Status (read-only for sellers — managed by admin) */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <div className="flex items-center gap-2">
                  {statusBadge(selected.status)}
                  <span className="text-xs text-muted-foreground">· managed by admin</span>
                </div>
              </div>

              {/* Attachments */}
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Attachments ({selected.attachments.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-40 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Response */}
              {(selected.adminResponse || selected.response) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Previous Response</p>
                  <pre className="text-sm whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-3 font-sans text-green-800 dark:text-green-300">
                    {selected.adminResponse ?? selected.response}
                  </pre>
                </div>
              )}

              {/* Respond */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {(selected.adminResponse || selected.response) ? "Update Response" : "Send Response"}
                </Label>
                <Textarea
                  placeholder="Write your response to the customer…"
                  className="min-h-[100px]"
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => { setSelected(null); setResponse(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRespond}
                    disabled={responding || !response.trim()}
                  >
                    {responding ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      (selected.adminResponse || selected.response) ? "Update Response" : "Send Response"
                    )}
                  </Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

