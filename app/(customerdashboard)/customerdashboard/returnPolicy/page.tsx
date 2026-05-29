"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, ChevronDown, ChevronUp, ArrowLeft, ClipboardList,
  CheckCircle2, Clock, XCircle, AlertTriangle, Package, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://alpa-be.onrender.com";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type RefundItem = {
  id?: string;
  orderItemId?: string;
  title?: string;
  price?: string;
  quantity?: number;
  image?: string | null;
  featuredImage?: string | null;
  reason?: string | null;
  attachments?: string[];
  product?: {
    image?: string | null;
    featuredImage?: string | null;
    images?: string[] | null;
  } | null;
};

type RefundRequest = {
  id: string;
  orderId: string;
  orderDisplayId?: string;
  requestType: string;
  reason?: string;
  status: string;
  adminResponse?: string;
  message?: string;
  createdAt: string;
  updatedAt?: string;
  requestedItems?: RefundItem[];
  items?: RefundItem[];
  products?: RefundItem[];
};

// â”€â”€ Status helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function normalizeStatus(s: string): string {
  const u = (s ?? "").toUpperCase();
  if (u === "IN_PROGRESS" || u === "APPROVED")  return "APPROVED";
  if (u === "RESOLVED"    || u === "COMPLETED") return "COMPLETED";
  if (u === "CLOSED"      || u === "REJECTED")  return "REJECTED";
  return "OPEN";
}

function StatusBadge({ status }: { status: string }) {
  const n = normalizeStatus(status);
  const map: Record<string, { label: string; className: string }> = {
    OPEN:      { label: "Open",      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    APPROVED:  { label: "Approved",  className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
    COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    REJECTED:  { label: "Rejected",  className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  };
  const s = map[n] ?? map.OPEN;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

const STEPS = [
  { key: "OPEN",      label: "Submitted", icon: <Clock className="h-5 w-5" /> },
  { key: "APPROVED",  label: "Approved",  icon: <CheckCircle2 className="h-5 w-5" /> },
  { key: "COMPLETED", label: "Completed", icon: <CheckCircle2 className="h-5 w-5" /> },
] as const;
const REJECTED_STEP = { key: "REJECTED", label: "Rejected", icon: <XCircle className="h-5 w-5" /> };

function ProgressTracker({ status }: { status: string }) {
  const normalized  = normalizeStatus(status);
  const isRejected  = normalized === "REJECTED";
  const steps       = isRejected ? [STEPS[0], REJECTED_STEP] : [...STEPS];
  const activeIdx   = steps.findIndex(s => s.key === normalized);
  const filledIdx   = activeIdx >= 0 ? activeIdx : 0;

  return (
    <div className="w-full py-3">
      <div className="flex items-start justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-6">
          <div
            className={`h-full transition-all duration-500 ${isRejected ? "bg-red-400" : "bg-primary"}`}
            style={{ width: steps.length > 1 ? `${(filledIdx / (steps.length - 1)) * 100}%` : "0%" }}
          />
        </div>
        {steps.map((step, idx) => {
          const isActive  = idx <= filledIdx;
          const isCurrent = idx === filledIdx;
          const color = isRejected && step.key === "REJECTED"
            ? (isActive ? "bg-red-500 text-white" : "bg-muted text-muted-foreground")
            : (isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground");
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${color} ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                {step.icon}
              </div>
              <span className={`text-xs font-medium text-center mt-2 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function resolveItems(r: RefundRequest): RefundItem[] {
  return (
    (Array.isArray(r.requestedItems) && r.requestedItems.length ? r.requestedItems : null) ??
    (Array.isArray(r.items)          && r.items.length          ? r.items          : null) ??
    (Array.isArray(r.products)       && r.products.length       ? r.products       : null) ??
    []
  );
}

function itemImage(p: RefundItem): string | null {
  return p.image ?? p.featuredImage ?? p.product?.image ?? p.product?.featuredImage ?? p.product?.images?.[0] ?? null;
}

// â”€â”€ Loading skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LoadingSkeleton = () => (
  <div className="p-6 max-w-4xl mx-auto space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RefundRequestsPage() {
  const [requests, setRequests]           = useState<RefundRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [details, setDetails]             = useState<Record<string, RefundRequest>>({});

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/orders/refund-requests`, { headers: getAuthHeaders() });
      const data = await res.json();
      setRequests(data.requests ?? data ?? []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load refund requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (requestId: string) => {
    if (details[requestId]) {
      setExpandedId(expandedId === requestId ? null : requestId);
      return;
    }
    setDetailLoading(requestId);
    try {
      const res    = await fetch(`${BASE_URL}/api/orders/refund-requests/${requestId}`, { headers: getAuthHeaders() });
      const data   = await res.json();
      const detail = data.request ?? data;
      setDetails(prev => ({ ...prev, [requestId]: detail }));
      setExpandedId(requestId);
    } catch {
      toast.error("Failed to load request details.");
    } finally {
      setDetailLoading(null);
    }
  };

  const handleToggle = (requestId: string) => {
    if (expandedId === requestId) { setExpandedId(null); return; }
    fetchDetail(requestId);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Refund Requests</h1>
          <p className="text-muted-foreground">Track the status of your refund and return requests.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = "/customerdashboard/orders"}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Button>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <ClipboardList className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-semibold">No refund requests yet</p>
              <p className="text-muted-foreground text-sm mt-1">When you submit a refund or return request, it will appear here.</p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/customerdashboard/orders"}>
              Go to My Orders
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const isExpanded = expandedId === req.id;
            const detail     = details[req.id];
            const merged     = detail ?? req;
            const items      = resolveItems(merged);

            return (
              <Card key={req.id} className="overflow-hidden">
                <CardContent className="p-0">

                  {/* Summary row */}
                  <div className="p-4 flex flex-col md:flex-row md:items-start gap-4">

                    {/* Product thumbnails */}
                    {items.length > 0 && (
                      <div className="flex gap-1.5 shrink-0">
                        {items.slice(0, 3).map((p, i) => {
                          const img = itemImage(p);
                          return img ? (
                            <div key={i} className="relative h-14 w-14 rounded-md overflow-hidden border bg-muted shrink-0">
                              <Image src={img} alt={p.title ?? "product"} fill className="object-cover" sizes="56px" />
                            </div>
                          ) : (
                            <div key={i} className="h-14 w-14 rounded-md border bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          );
                        })}
                        {items.length > 3 && (
                          <div className="h-14 w-14 rounded-md border bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                            +{items.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          Request #{typeof req.id === "string" ? req.id.slice(-8).toUpperCase() : req.id}
                        </span>
                        <StatusBadge status={req.status} />
                        <Badge variant="outline" className="text-xs">
                          {req.requestType === "FULL_REFUND" || req.requestType === "REFUND" ? "Full Refund" : "Partial Refund"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Order: {req.orderDisplayId ?? `#${typeof req.orderId === "string" ? req.orderId.slice(-6).toUpperCase() : req.orderId}`}
                        {" Â· "}{req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-GB') : "N/A"}
                      </p>
                      {items.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {items.map(p => p.title).filter(Boolean).join(" Â· ")}
                        </p>
                      )}
                    </div>

                    {/* Expand button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(req.id)}
                      disabled={detailLoading === req.id}
                      className="shrink-0 self-start"
                    >
                      {detailLoading === req.id ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : isExpanded ? (
                        <><ChevronUp className="h-4 w-4 mr-1" /> Hide</>
                      ) : (
                        <><ChevronDown className="h-4 w-4 mr-1" /> Details</>
                      )}
                    </Button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-5 space-y-6">

                      {/* Progress tracker */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Progress</p>
                        <ProgressTracker status={merged.status} />
                      </div>

                      {/* Items */}
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <ShoppingBag className="h-3.5 w-3.5" /> Items in this request ({items.length})
                          </p>
                          <div className="divide-y rounded-lg border overflow-hidden">
                            {items.map((p, idx) => {
                              const img = itemImage(p);
                              return (
                                <div key={p.id ?? p.orderItemId ?? idx} className="flex flex-col gap-2 p-3 bg-background">
                                  <div className="flex items-center gap-3">
                                    {img ? (
                                      <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden border bg-muted">
                                        <Image src={img} alt={p.title ?? "product"} fill className="object-cover" sizes="56px" />
                                      </div>
                                    ) : (
                                      <div className="h-14 w-14 shrink-0 rounded-md border bg-muted flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{p.title ?? "Product"}</p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {p.price    && <span className="text-xs font-medium">${p.price}</span>}
                                        {p.quantity != null && <span className="text-xs text-muted-foreground">Qty: {p.quantity}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  {p.reason && (
                                    <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                      <span className="font-medium">Reason:</span> {p.reason}
                                    </p>
                                  )}
                                  {p.attachments && p.attachments.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      {p.attachments.map((url, ai) => (
                                        <a key={ai} href={url} target="_blank" rel="noopener noreferrer"
                                          className="block rounded border overflow-hidden hover:opacity-80 transition-opacity">
                                          <img src={url} alt={`photo-${ai}`} className="h-12 w-12 object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Request ID</p>
                          <p className="font-medium mt-1 break-all">{merged.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Order</p>
                          <p className="font-medium mt-1">
                            {merged.orderDisplayId ?? `#${typeof merged.orderId === "string" ? merged.orderId.slice(-6).toUpperCase() : merged.orderId}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Refund Type</p>
                          <p className="font-medium mt-1">
                            {merged.requestType === "FULL_REFUND" || merged.requestType === "REFUND" ? "Full Refund" : "Partial Refund"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Submitted On</p>
                          <p className="font-medium mt-1">{merged.createdAt ? new Date(merged.createdAt).toLocaleString('en-GB') : "N/A"}</p>
                        </div>
                        {merged.updatedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</p>
                            <p className="font-medium mt-1">{new Date(merged.updatedAt).toLocaleString('en-GB')}</p>
                          </div>
                        )}
                      </div>

                      {/* Reason */}
                      {merged.reason && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Reason</p>
                          <div className="rounded-lg border bg-background p-3 text-sm">{merged.reason}</div>
                        </div>
                      )}

                      {/* Admin response */}
                      {merged.adminResponse ? (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Admin Response</p>
                          <div className="rounded-lg border-l-4 border-primary bg-background p-3 text-sm">{merged.adminResponse}</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>No admin response yet. Our team is reviewing your request.</span>
                        </div>
                      )}

                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
