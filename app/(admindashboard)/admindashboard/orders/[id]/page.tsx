"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft, Package, Truck, Loader2, X, ClipboardList, DollarSign,
  MapPin, Calendar, Hash, Download, AlertTriangle, CheckCircle2,
  CreditCard, Box, Store,
} from "lucide-react";
import { api } from "@/lib/api";
import { getCityLabel } from "@/lib/utils";
import {
  getAllowedTransitions,
  getRequiredFields,
  validateStatusUpdate,
  getStatusLabel,
  getStatusBadgeVariant,
  isTerminalStatus,
} from "@/lib/orderStatusRules";

// ── Types ──────────────────────────────────────────────────────────────────────

type OrderItem = {
  product?: { title?: string; images?: string[]; featuredImage?: string | null; price?: number };
  title?: string;
  quantity: number;
  price?: any;
  variantAttributes?: Record<string, string> | null;
};

type SubOrderInfo = {
  subOrderId: string;
  subDisplayId?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  seller?: {
    storeName?: string | null;
    businessName?: string | null;
    storeLogo?: string | null;
  } | null;
  status?: string | null;
  subtotal?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  items: {
    id: string;
    quantity: number;
    price: string;
    variantAttributes?: Record<string, string> | null;
    product: { title: string; featuredImage?: string | null };
  }[];
};

type Order = {
  id: any;
  createdAt: any;
  updatedAt?: any;
  customerName?: any;
  customerEmail?: any;
  status: any;
  items?: OrderItem[];
  totalAmount: any;
  trackingNumber?: any;
  estimatedDelivery?: any;
  paymentMethod?: any;
  statusReason?: any;
  shippingAddress?: any;
  shippingCity?: any;
  shippingState?: any;
  shippingPostcode?: any;
  shippingPhone?: any;
  // enriched from detailed API
  displayId?: string | null;
  subOrders?: SubOrderInfo[];
  // seller info for direct / by-seller orders
  sellerName?: string | null;
  seller?: { storeName?: string | null; storeLogo?: string | null } | null;
  displaySubId?: string | null;
  subDisplayId?: string | null;
  parentDisplayId?: string | null;
  // order summary fields (populated from either orderSummary or top-level detailed API fields)
  subtotal?: string | null;
  discountAmount?: string | null;
  couponCode?: string | null;
  originalTotal?: string | null;
  paymentStatus?: string | null;
  orderSummary?: any;
};

// ── Status Update Modal ────────────────────────────────────────────────────────

function StatusUpdateModal({
  order,
  onClose,
  onSuccess,
  orderIdOverride,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
  orderIdOverride?: string;
}) {
  const getFriendlyTrackingErrorMessage = (message: string) => {
    if (/tracking number/i.test(message) && /(already used|already assigned|sub-order)/i.test(message)) {
      return "Track number is already assigned to another order";
    }
    return message;
  };

  const [selectedStatus, setSelectedStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState("");

  const allowedTransitions = getAllowedTransitions(order.status);
  const requiredFields = getRequiredFields(selectedStatus);
  const terminal = isTerminalStatus(order.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setApiError("");
    const payload: Record<string, string> = {
      status: selectedStatus,
      ...(trackingNumber && { trackingNumber }),
      ...(estimatedDelivery && { estimatedDelivery }),
      ...(reason && { reason }),
      ...(notes && { notes }),
    };
    const { valid, errors } = validateStatusUpdate(selectedStatus, payload);
    if (!valid) { setValidationErrors(errors); return; }
    setLoading(true);
    const effectiveId = orderIdOverride ?? order.id;
    try {
      await api.put(`/api/seller/orders/update-status/${effectiveId}`, payload);
      // NOTE: tracking data (trackingNumber, estimatedDelivery) is already saved
      // by update-status when status is SHIPPED — no separate tracking call needed.
      toast.success(`Order updated to ${getStatusLabel(selectedStatus)}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = getFriendlyTrackingErrorMessage(err?.message || "Failed to update status");
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Update Order Status</CardTitle>
              <CardDescription>Order #{typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <span className="text-muted-foreground">Current Status</span>
            <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusLabel(order.status)}</Badge>
          </div>
          {terminal ? (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">This order is in a terminal status and cannot be updated further.</p>
            </div>
          ) : allowedTransitions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transitions available.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>New Status <span className="text-destructive">*</span></Label>
                <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setValidationErrors([]); }}>
                  <SelectTrigger><SelectValue placeholder="— Select new status —" /></SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((s) => (
                      <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {requiredFields.includes("trackingNumber") && (
                <>
                  <div className="space-y-1.5">
                    <Label>Tracking Number <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. TRK12345" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimated Delivery Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                  </div>
                </>
              )}
              {requiredFields.includes("reason") && (
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="Provide a reason..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
                </div>
              )}
              {selectedStatus && (
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
                </div>
              )}
              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                  {validationErrors.map((e, i) => (
                    <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span>•</span><span>{e}</span></p>
                  ))}
                </div>
              )}
              {apiError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={!selectedStatus || loading}>
                  {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating...</> : "Update Status"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tracking Modal ─────────────────────────────────────────────────────────────

function TrackingModal({
  order,
  onClose,
  onSuccess,
  orderIdOverride,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
  orderIdOverride?: string;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const { valid, errors } = validateStatusUpdate("SHIPPED", { trackingNumber, estimatedDelivery });
    if (!valid) { toast.error(errors[0]); return; }
    setLoading(true);
    const effectiveId = orderIdOverride ?? order.id;
    try {
      await api.put(`/api/seller/orders/tracking/${effectiveId}`, { trackingNumber, estimatedDelivery });
      toast.success("Tracking information updated");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to update tracking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Add Tracking Info</CardTitle>
              <CardDescription>Order #{typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tracking Number</Label>
            <Input placeholder="e.g. TRK12345" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Estimated Delivery Date</Label>
            <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={loading}>
              {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving...</> : "Save Tracking"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Map DetailedOrder → Order (used when navigating from All Orders tab) ────────

function mapDetailedToOrder(d: any): Order {
  // Keep sub-orders intact for seller-grouped rendering
  const mappedSubOrders: SubOrderInfo[] =
    d.subOrders && d.subOrders.length > 0
      ? d.subOrders.map((sub: any) => ({
          subOrderId: sub.subOrderId,
          subDisplayId: sub.subDisplayId ?? null,
          sellerName: sub.sellerName ?? sub.seller?.name ?? null,
          sellerEmail: sub.sellerEmail ?? null,
          seller: sub.seller
            ? {
                storeName: sub.seller.storeName ?? null,
                businessName: sub.seller.businessName ?? null,
                storeLogo: sub.seller.storeLogo ?? null,
              }
            : null,
          status: sub.status ?? null,
          subtotal: sub.subtotal ?? null,
          trackingNumber: sub.trackingNumber ?? null,
          estimatedDelivery: sub.estimatedDelivery ?? null,
          items: (sub.items ?? []).map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            variantAttributes: item.variantAttributes ?? null,
            product: {
              title: item.product?.title ?? "Unknown",
              featuredImage: item.product?.featuredImage ?? null,
            },
          })),
        }))
      : [];

  // Flat items fallback for direct single-seller orders
  const flatItems =
    mappedSubOrders.length === 0
      ? (d.items ?? []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          variantAttributes: item.variantAttributes ?? null,
          product: {
            title: item.product?.title,
            featuredImage: item.product?.featuredImage ?? null,
            images: item.product?.featuredImage ? [item.product.featuredImage] : [],
          },
        }))
      : [];

  return {
    id: d.id,
    displayId: d.displayId ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    customerName: d.customer?.name,
    customerEmail: d.customer?.email,
    status: d.overallStatus ?? d.status ?? "PENDING",
    items: flatItems,
    subOrders: mappedSubOrders.length > 0 ? mappedSubOrders : undefined,
    totalAmount: d.totalAmount,
    trackingNumber:
      d.trackingNumber ?? d.subOrders?.[0]?.trackingNumber ?? null,
    estimatedDelivery:
      d.estimatedDelivery ?? d.subOrders?.[0]?.estimatedDelivery ?? null,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus ?? null,
    statusReason: d.statusReason ?? d.subOrders?.[0]?.statusReason ?? null,
    subtotal: d.subtotal ?? (d.subOrders?.length === 1 ? d.subOrders[0].subtotal : null) ?? null,
    discountAmount: d.discountAmount ?? null,
    couponCode: d.couponCode ?? null,
    originalTotal: d.originalTotal ?? null,
    orderSummary: d.orderSummary ?? null,
    // seller for direct orders
    sellerName: d.sellerName ?? d.seller?.name ?? null,
    seller: d.seller ?? null,
    shippingAddress: d.shippingAddress
      ? {
          addressLine: d.shippingAddress.line,
          city: d.shippingAddress.city,
          state: d.shippingAddress.state,
          zipCode: d.shippingAddress.zipCode,
          country: d.shippingAddress.country,
          phone: d.shippingAddress.phone,
          // Preserve orderSummary so the detail page can render subtotal/shipping/GST
          ...((d.shippingAddress.orderSummary || d.orderSummary) ? { orderSummary: d.shippingAddress.orderSummary || d.orderSummary } : {}),
        }
      : (d.orderSummary ? { orderSummary: d.orderSummary } : null),
  };
}

// ── Detail Page (inner) ────────────────────────────────────────────────────────

function OrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params.id as string;
  const sellerId = searchParams.get("sellerId") ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeStatusModal, setActiveStatusModal] = useState(false);
  const [activeTrackingModal, setActiveTrackingModal] = useState(false);
  const [activeSubStatusSub, setActiveSubStatusSub] = useState<SubOrderInfo | null>(null);
  const [activeSubTrackingSub, setActiveSubTrackingSub] = useState<SubOrderInfo | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      if (sellerId) {
        // Navigate from "By Seller" tab — use seller-scoped endpoint
        const res = await api.get(`/api/admin/orders/by-seller/${sellerId}`);
        const orders: Order[] = Array.isArray(res) ? res : res.orders ?? [];
        const found = orders.find((o) => String(o.id) === String(orderId));
        if (found) { setOrder(found); } else { setNotFound(true); }
      } else {
        // Navigate from "All Orders" tab — use detailed endpoint
        const res = await api.get("/api/admin/orders/detailed");
        const allOrders: any[] = Array.isArray(res) ? res : res.orders ?? [];
        const found = allOrders.find((o: any) => String(o.id) === String(orderId));
        if (found) { setOrder(mapDetailedToOrder(found)); } else { setNotFound(true); }
      }
    } catch {
      toast.error("Failed to load order");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId, sellerId]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const cleanId = (order.displayId ?? "").replace(/^#/, "");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au"}/api/orders/invoice/${cleanId}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to download invoice");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `invoice-${cleanId}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to download invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const renderValue = (val: any) => {
    if (val == null) return "N/A";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const fmtDate = (val: any) => {
    if (!val) return "N/A";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB');
  };

  const backUrl = sellerId
    ? `/admindashboard/orders?sellerId=${sellerId}`
    : "/admindashboard/orders";

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="flex justify-between"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-24" /></div>
              ))}
            </CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  // ── Not Found ──
  if (notFound || !order) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="ghost" className="gap-2 mb-6" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Button>
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold">Order not found</p>
          <p className="text-muted-foreground text-sm mt-1">The order could not be loaded. It may have been removed or the seller is incorrect.</p>
          <Button className="mt-6" onClick={() => router.push(backUrl)}>Return to Orders</Button>
        </Card>
      </div>
    );
  }

  // ── Parse address ──
  let addr: Record<string, any> = {};
  const raw = order.shippingAddress;
  if (raw && typeof raw === "object") addr = raw;
  else if (typeof raw === "string") { try { addr = JSON.parse(raw); } catch { addr = { address: raw }; } }

  const summary = order.orderSummary ?? addr.orderSummary ?? {};
  const sm = summary.shippingMethod ?? {};

  // Compute subtotal from items when the API doesn't provide it
  const computedSubtotal: string | null = (() => {
    if (summary.subtotal != null || order.subtotal != null) return null; // already have it
    let total = 0;
    if (order.items?.length) {
      total = order.items.reduce(
        (acc: number, item: any) => acc + parseFloat(String(item.price ?? 0)) * (item.quantity ?? 0),
        0
      );
    } else if (order.subOrders?.length) {
      for (const sub of order.subOrders) {
        if (sub.subtotal != null) {
          total += parseFloat(String(sub.subtotal));
        } else {
          for (const item of sub.items ?? []) {
            total += parseFloat(String(item.price ?? 0)) * (item.quantity ?? 0);
          }
        }
      }
    }
    return total > 0 ? total.toFixed(2) : null;
  })();

  // Resolved values — prefer orderSummary fields, then top-level API fields, then computed
  const resolvedSubtotal = summary.subtotal ?? order.subtotal ?? computedSubtotal;
  const resolvedDiscount = summary.discountAmount ?? order.discountAmount;
  const resolvedCoupon = summary.couponCode ?? order.couponCode;
  const resolvedShipping = summary.shippingCost ?? null;
  const resolvedGst = summary.gstAmount ?? null;
  const resolvedGstPct = summary.gstPercentage ?? null;
  const resolvedOriginal = order.originalTotal ?? null;

  const cityLabel = getCityLabel(addr.country);
  const addrFields: [string, string][] = [
    ["firstName", "First Name"], ["lastName", "Last Name"], ["addressLine", "Address Line"],
    ["address", "Address"], ["street", "Street"], ["suburb", "Suburb"],
    ["city", cityLabel], ["state", "State"], ["country", "Country"],
    ["zipCode", "ZIP Code"], ["zipcode", "ZIP Code"], ["postcode", "Postcode"],
    ["phone", "Phone"], ["email", "Email"],
  ];
  const nameVal = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
  const addressRows: { label: string; value: string }[] = [];
  const seenLabels = new Set<string>();
  if (nameVal) { addressRows.push({ label: "Name", value: nameVal }); seenLabels.add("First Name"); seenLabels.add("Last Name"); }
  for (const [key, label] of addrFields) {
    if (key === "firstName" || key === "lastName") continue;
    if (seenLabels.has(label)) continue;
    const val = addr[key];
    if (val != null && typeof val === "string" && val.trim() !== "") {
      addressRows.push({ label, value: val }); seenLabels.add(label);
    }
  }

  const terminal = isTerminalStatus(order.status);
  const isMultiSeller = order.subOrders && order.subOrders.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{order.displayId ?? (typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id)}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : "N/A"}
              {order.customerName && (
                <> · Customer: <span className="font-medium text-foreground">{order.customerName}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
            {getStatusLabel(order.status)}
          </Badge>
          {/* For multi-seller orders, status/tracking is managed per sub-order below */}
          {!terminal && !isMultiSeller && (
            <Button onClick={() => setActiveStatusModal(true)}>
              <ClipboardList className="h-4 w-4 mr-2" /> Update Status
            </Button>
          )}
          {!order.trackingNumber && !terminal && !isMultiSeller && (
            <Button variant="outline" onClick={() => setActiveTrackingModal(true)}>
              <Truck className="h-4 w-4 mr-2" /> Add Tracking
            </Button>
          )}
          {["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"].includes(order.status) && (
            <Button variant="outline" onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
              {downloadingInvoice
                ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Downloading...</>
                : <><Download className="h-4 w-4 mr-2" />Invoice</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── Terminal Banner ── */}
      {terminal && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
          <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Terminal Status</p>
            <p className="text-sm text-muted-foreground">This order is in a final state — no further status changes are possible.</p>
          </div>
        </div>
      )}

      {/* ── Info Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Order Info */}
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Info</span>
          </div>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs font-medium">{order.displayId ?? String(order.id ?? "").slice(-10).toUpperCase()}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs h-5">{getStatusLabel(order.status)}</Badge>
            </div>
            {order.statusReason && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Reason</span>
                <span className="font-medium text-right max-w-[60%] text-xs">{renderValue(order.statusReason)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : "N/A"}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium capitalize">{renderValue(order.paymentMethod)}</span>
            </div>
            {order.paymentStatus && (
              <div className="flex justify-between px-4 py-2.5 items-center">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge variant={order.paymentStatus === "PAID" ? "default" : "secondary"} className="text-xs h-5">{order.paymentStatus}</Badge>
              </div>
            )}
            {order.trackingNumber && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Tracking</span>
                <span className="font-mono text-xs font-medium">{renderValue(order.trackingNumber)}</span>
              </div>
            )}
            {order.estimatedDelivery && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Est. Delivery</span>
                <span className="font-medium">{fmtDate(order.estimatedDelivery)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Shipping Address */}
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping Address</span>
          </div>
          {addressRows.length > 0 ? (
            <div className="divide-y text-sm">
              {addressRows.map(({ label, value }, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5 gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">No address on file.</div>
          )}
        </Card>

        {/* Order Totals */}
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Summary</span>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            {/* Subtotal — from orderSummary, top-level API, or computed from items */}
            {resolvedSubtotal != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal{computedSubtotal != null ? " (items)" : ""}</span>
                <span>${parseFloat(resolvedSubtotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Shipping — from orderSummary only */}
            {resolvedShipping != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping{sm.name ? ` · ${sm.name}` : ""}
                  {sm.estimatedDays && <span className="text-xs block text-muted-foreground/70">{sm.estimatedDays}</span>}
                </span>
                <span>${parseFloat(resolvedShipping).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Discount */}
            {resolvedDiscount != null && Number(resolvedDiscount) !== 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{resolvedCoupon ? ` (${resolvedCoupon})` : ""}</span>
                <span>− ${parseFloat(resolvedDiscount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* GST — from orderSummary only */}
            {resolvedGst != null && Number(resolvedGst) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST{resolvedGstPct ? ` (${resolvedGstPct}%)` : ""}</span>
                <span>${parseFloat(resolvedGst).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {/* Original total (before discount) */}
            {resolvedOriginal != null && Number(resolvedOriginal) > 0 && Number(resolvedOriginal) !== Number(order.totalAmount) && (
              <div className="flex justify-between text-muted-foreground line-through text-xs">
                <span>Original Total</span>
                <span>${parseFloat(resolvedOriginal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-1 flex justify-between font-bold text-base">
              <span>Grand Total</span>
              <span>${parseFloat(order.totalAmount ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {/* Coupon applied with no numeric discount */}
            {resolvedCoupon && (resolvedDiscount == null || Number(resolvedDiscount) === 0) && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Coupon applied</span>
                <span className="font-mono">{resolvedCoupon}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Tracking Info Card (if tracking exists) ── */}
      {order.trackingNumber && (
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracking</span>
          </div>
          <CardContent className="p-4 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Tracking Number</p>
              <p className="font-mono font-semibold">{renderValue(order.trackingNumber)}</p>
            </div>
            {order.estimatedDelivery && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Estimated Delivery</p>
                <p className="font-medium">{fmtDate(order.estimatedDelivery)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Order Items / Seller Breakdown ── */}
      {order.subOrders && order.subOrders.length > 0 ? (
        // ── Multi-seller: grouped by sub-order / seller ──
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Seller Breakdown ({order.subOrders.length} seller{order.subOrders.length !== 1 ? "s" : ""})
            </span>
          </div>
          {order.subOrders.map((sub) => (
            <Card key={sub.subOrderId} className="overflow-hidden">
              {/* Sub-order header */}
              <div className="border-b bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {sub.seller?.storeLogo ? (
                    <Image
                      src={sub.seller.storeLogo}
                      alt={sub.seller.storeName || sub.sellerName || "Seller"}
                      width={36}
                      height={36}
                      className="rounded-full object-cover w-9 h-9 border shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {sub.seller?.storeName || sub.seller?.businessName || sub.sellerName || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{sub.sellerEmail || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {sub.subDisplayId && (
                    <span className="font-mono text-xs bg-primary/5 text-primary border border-primary/20 rounded px-2 py-0.5">
                      {sub.subDisplayId}
                    </span>
                  )}
                  {sub.status && (
                    <Badge variant={getStatusBadgeVariant(sub.status)} className="text-xs">
                      {getStatusLabel(sub.status)}
                    </Badge>
                  )}
                  {sub.subtotal && (
                    <span className="text-sm font-semibold">${parseFloat(sub.subtotal).toLocaleString()}</span>
                  )}
                  {/* Per-sub-order management actions */}
                  {sub.status && !isTerminalStatus(sub.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setActiveSubStatusSub(sub)}
                    >
                      <ClipboardList className="h-3 w-3" /> Status
                    </Button>
                  )}
                  {!sub.trackingNumber && sub.status && !isTerminalStatus(sub.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setActiveSubTrackingSub(sub)}
                    >
                      <Truck className="h-3 w-3" /> Tracking
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-order items */}
              <CardContent className="p-0">
                <div className="divide-y">
                  {sub.items.map((item, i) => (
                    <div key={item.id || i} className="flex items-start gap-4 px-4 py-3">
                      {item.product.featuredImage ? (
                        <Image
                          src={item.product.featuredImage}
                          alt={item.product.title}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover border shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.title}</p>
                        {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {Object.entries(item.variantAttributes).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">{k}: {v}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm shrink-0">${parseFloat(item.price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Tracking for this sub-order */}
              {(sub.trackingNumber || sub.estimatedDelivery) && (
                <div className="border-t bg-muted/20 px-4 py-2.5 flex gap-6 text-xs text-muted-foreground">
                  {sub.trackingNumber && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span className="font-mono font-medium text-foreground">{sub.trackingNumber}</span>
                    </span>
                  )}
                  {sub.estimatedDelivery && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Est. {fmtDate(sub.estimatedDelivery)}
                    </span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        // ── Single-seller / flat items ──
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <Box className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Items</span>
          </div>
          {/* Seller info for direct orders */}
          {(order.sellerName || order.seller?.storeName) && (
            <div className="border-b px-4 py-3 flex items-center gap-3 bg-muted/20">
              {order.seller?.storeLogo ? (
                <Image
                  src={order.seller.storeLogo}
                  alt={order.seller.storeName || order.sellerName || "Seller"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover w-8 h-8 border shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{order.seller?.storeName || order.sellerName}</p>
                {(order.subDisplayId ?? order.displaySubId) && (
                  <span className="font-mono text-xs bg-primary/5 text-primary border border-primary/20 rounded px-2 py-0.5">
                    {order.subDisplayId ?? order.displaySubId}
                  </span>
                )}
              </div>
            </div>
          )}
          <CardContent className="p-0">
            {order.items && order.items.length > 0 ? (
              <div className="divide-y">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 px-4 py-3">
                    {(item.product?.featuredImage || item.product?.images?.[0]) ? (
                      <Image
                        src={(item.product.featuredImage ?? item.product.images![0])!}
                        alt={item.product?.title || "Product"}
                        width={56}
                        height={56}
                        className="rounded-lg object-cover border shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product?.title || item.title || "Unknown Product"}</p>
                      {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Object.entries(item.variantAttributes).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">{k}: {v}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">Qty: {renderValue(item.quantity)}</p>
                    </div>
                    {item.price != null && (
                      <p className="font-semibold text-sm shrink-0">${renderValue(item.price)}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No items found for this order.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Modals ── */}
      {activeStatusModal && (
        <StatusUpdateModal
          order={order}
          onClose={() => setActiveStatusModal(false)}
          onSuccess={fetchOrder}
        />
      )}
      {activeTrackingModal && (
        <TrackingModal
          order={order}
          onClose={() => setActiveTrackingModal(false)}
          onSuccess={fetchOrder}
        />
      )}
      {/* Per-sub-order modals */}
      {activeSubStatusSub && (
        <StatusUpdateModal
          order={{ ...order, id: activeSubStatusSub.subOrderId, status: activeSubStatusSub.status ?? order.status }}
          orderIdOverride={activeSubStatusSub.subOrderId}
          onClose={() => setActiveSubStatusSub(null)}
          onSuccess={fetchOrder}
        />
      )}
      {activeSubTrackingSub && (
        <TrackingModal
          order={{ ...order, id: activeSubTrackingSub.subOrderId }}
          orderIdOverride={activeSubTrackingSub.subOrderId}
          onClose={() => setActiveSubTrackingSub(null)}
          onSuccess={fetchOrder}
        />
      )}
    </div>
  );
}

// ── Exported Page (wrapped in Suspense for useSearchParams) ───────────────────

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  );
}
