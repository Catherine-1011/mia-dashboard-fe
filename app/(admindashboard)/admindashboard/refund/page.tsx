"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock, XCircle, DollarSign, User, Mail, Package, Calendar, ShoppingBag,
  Loader2, ChevronLeft, ChevronRight, X,
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
    category?: string | null;
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
  customerName?: string | null;
  customerEmail?: string | null;
  requestType: string;
  user: { id: string; name: string; email: string } | null;
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
  const map: Record<string, { label: string; className: string }> = {
    OPEN:        { label: "Open",        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    IN_PROGRESS: { label: "In Progress", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
    APPROVED:    { label: "Approved",    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    COMPLETED:   { label: "Completed",   className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    RESOLVED:    { label: "Completed",   className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    REJECTED:    { label: "Rejected",    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
    CLOSED:      { label: "Rejected",    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  };
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
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

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function AdminRefundRequestsPage() {
  const [requests, setRequests]     = useState<RefundRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("ALL");
  const [selected, setSelected]     = useState<RefundRequest | null>(null);
  const [response, setResponse]     = useState("");
  const [responding, setResponding] = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [chosenAction, setChosenAction]    = useState("");
  const [page, setPage]                    = useState(1);

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
      const data = await api.get("/api/admin/refund-requests");
      const list: RefundRequest[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.requests)
        ? data.requests
        : [];
      setRequests(list);
    } catch (err) {
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Open Detail ────────────────────────────────────────────
  const openDetail = (r: RefundRequest) => {
    const listItems =
      (Array.isArray(r.requestedItems) && r.requestedItems.length > 0 ? r.requestedItems : null) ??
      (Array.isArray(r.sellerItems)    && r.sellerItems.length    > 0 ? r.sellerItems    : null) ??
      (Array.isArray(r.items)          && r.items.length          > 0 ? r.items          : null) ??
      (Array.isArray(r.products)       && r.products.length       > 0 ? r.products       : null) ??
      parseItemsFromMessage(r.message ?? "");

    setSelected({ ...r, requestedItems: listItems.length > 0 ? listItems : undefined });
    setResponse(r.adminResponse ?? r.response ?? "");
  };
  const handleRespond = async () => {
    if (!selected || !response.trim()) return;
    setResponding(true);
    try {
      await api.post(`/api/admin/refund-requests/${selected.id}/respond`, { response });
      toast.success("Response sent");
      setSelected(null);
      setResponse("");
      load();
    } catch {
      toast.error("Failed to send response");
    } finally {
      setResponding(false);
    }
  };

  // ── Update Status ──────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, action: "APPROVED" | "REJECTED" | "COMPLETED", message?: string) => {
    setUpdating(true);
    try {
      const body: { status: string; message?: string } = { status: action };
      if (message?.trim()) body.message = message.trim();
      await api.put(`/api/admin/refund-requests/${id}/status`, body);
      const label = action === "APPROVED" ? "Approved" : action === "REJECTED" ? "Rejected" : "Completed";
      toast.success(`Refund request ${label}`);
      const displayStatus: RefundRequest["status"] =
        action === "APPROVED" ? "IN_PROGRESS" : action === "REJECTED" ? "CLOSED" : "RESOLVED";
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: displayStatus } : r));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: displayStatus } : null);
      setActionMessage("");
      // After Approve → pre-select "Complete" so the next step is immediately visible
      setChosenAction(action === "APPROVED" ? "COMPLETED" : "");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.subject ?? "").toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q) ||
      r.orderDisplayId?.toLowerCase().includes(q) ||
      (r.user?.name ?? r.customerName ?? r.guestEmail ?? "").toLowerCase().includes(q) ||
      (r.user?.email ?? r.customerEmail ?? r.guestEmail ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "OPEN"     && (r.status === "OPEN" || r.status === "IN_PROGRESS")) ||
      (statusFilter === "APPROVED" && r.status === "APPROVED") ||
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
          <p className="text-muted-foreground mt-1">Review and respond to customer refund requests</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",     value: stats.total,     icon: <DollarSign className="h-4 w-4" />,   color: "text-foreground" },
          { label: "Open",      value: stats.open,      icon: <Clock className="h-4 w-4" />,         color: "text-blue-600 dark:text-blue-400" },
          { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600 dark:text-green-400" },
          { label: "Rejected",  value: stats.rejected,  icon: <XCircle className="h-4 w-4" />,      color: "text-red-600 dark:text-red-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between pt-5 pb-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, order ID, or customer…"
            className="pl-9 pr-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="RESOLVED">Completed</SelectItem>
            <SelectItem value="CLOSED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {/* FILTER KEY: OPEN→OPEN|IN_PROGRESS|APPROVED, RESOLVED→RESOLVED|COMPLETED, CLOSED→CLOSED|REJECTED */}
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
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No refund requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
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
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">Guest</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.user?.email ?? r.customerEmail ?? r.guestEmail ?? ""}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-sm truncate" title={r.reason ?? r.subject ?? ""}>
                        {r.reason ? (r.reason.length > 60 ? r.reason.slice(0, 60) + "…" : r.reason) : (r.subject ?? "—")}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.requestType}</p>
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmt(r.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
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
      <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setResponse(""); setActionMessage(""); setChosenAction(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Refund Request
              {selected?.priority && priorityBadge(selected.priority)}
              {selected && statusBadge(selected.status)}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 mt-2">

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Package className="h-3 w-3" /> Order</p>
                  <p className="font-semibold">{selected.orderDisplayId ?? "—"}</p>
                  {selected.orderStatus && <p className="text-xs text-muted-foreground">Status: {selected.orderStatus}</p>}
                  {selected.orderTotalAmount && <p className="text-xs text-muted-foreground">Total: ${selected.orderTotalAmount}</p>}
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3" /> Customer</p>
                  <p className="font-semibold flex items-center gap-1.5">
                    {selected.user?.name ?? selected.customerName ?? (selected.isGuest ? "Guest User" : "Unknown")}
                    {selected.isGuest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">Guest</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selected.user?.email ?? selected.customerEmail ?? selected.guestEmail ?? "—"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(selected.createdAt)}</p>
                </div>
              </div>

              {/* Products */}
              {(() => {
                const items =
                  (selected.requestedItems?.length ? selected.requestedItems : null) ??
                  (selected.sellerItems?.length    ? selected.sellerItems    : null) ??
                  (selected.items?.length          ? selected.items          : null) ??
                  (selected.products?.length       ? selected.products       : null) ??
                  parseItemsFromMessage(selected.message ?? "");
                if (!items.length) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" /> Items ({items.length})
                    </p>
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {items.map((p, idx) => (
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
                                {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                                {p.sellerName && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.sellerName}</span>}
                                {p.price && <span className="text-xs font-medium">${p.price}</span>}
                              </div>
                            </div>
                            {p.quantity != null && (
                              <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">x{p.quantity}</span>
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
                );
              })()}

              {/* Subject / Reason */}
              {(selected.subject || selected.reason) && (
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

              {/* Admin Action */}
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Action</p>
                {(selected.status === "RESOLVED" || selected.status === "CLOSED" || selected.status === "COMPLETED" || selected.status === "REJECTED") ? (
                  <p className="text-sm text-muted-foreground italic">
                    {(selected.status === "RESOLVED" || selected.status === "COMPLETED")
                      ? "This request has been completed — no further actions available."
                      : "This request is closed — no further actions available."}
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Select value={chosenAction} onValueChange={setChosenAction} disabled={updating}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select action…" />
                        </SelectTrigger>
                        <SelectContent>
                          {selected.status === "OPEN" && (
                            <>
                              <SelectItem value="APPROVED" className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600">
                                Approve
                              </SelectItem>
                              <SelectItem value="REJECTED" className="text-red-600 dark:text-red-400 focus:text-red-600">
                                Reject
                              </SelectItem>
                            </>
                          )}
                          {(selected.status === "IN_PROGRESS" || selected.status === "APPROVED") && (
                            <SelectItem value="COMPLETED" className="text-blue-600 dark:text-blue-400 focus:text-blue-600">
                              Mark as Completed
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!chosenAction || updating}
                        onClick={() => handleStatusChange(selected.id, chosenAction as "APPROVED" | "REJECTED" | "COMPLETED", actionMessage)}
                        className={
                          chosenAction === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                          chosenAction === "REJECTED" ? "bg-red-600 hover:bg-red-700 text-white" :
                          chosenAction === "COMPLETED" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                        }
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Optional message to customer (e.g. reason for rejection, refund timeline…)"
                      className="min-h-[72px] resize-none text-sm"
                      value={actionMessage}
                      onChange={e => setActionMessage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Optional message sent to customer</p>
                  </>
                )}
              </div>

              {/* Attachments */}
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Attachments ({selected.attachments.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden hover:opacity-80 transition-opacity">
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
                  <pre className="text-sm whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-3 font-sans text-green-800 dark:text-green-300">{selected.adminResponse ?? selected.response}</pre>
                </div>
              )}

              {/* Respond */}
              <div className="space-y-2">
                <Label className="text-sm">{(selected.adminResponse || selected.response) ? "Update Response" : "Send Response"}</Label>
                <Textarea
                  placeholder="Write your response to the customer…"
                  className="min-h-[100px]"
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setSelected(null); setResponse(""); setActionMessage(""); setChosenAction(""); }}>Cancel</Button>
                  <Button onClick={handleRespond} disabled={responding || !response.trim()}>
                    {responding ? "Sending…" : "Send Response"}
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
