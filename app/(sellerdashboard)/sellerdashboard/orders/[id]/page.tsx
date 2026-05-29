"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  MapPin, Calendar, Hash, AlertTriangle, Box,
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

type OrderItem = {
  product?: { title?: string; images?: string[]; price?: number };
  title?: string;
  quantity: number;
  price?: any;
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
};

// ── Status Update Modal ────────────────────────────────────────────────────────

function StatusUpdateModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
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
    };
    const { valid, errors } = validateStatusUpdate(selectedStatus, payload);
    if (!valid) { setValidationErrors(errors); return; }
    setLoading(true);
    try {
      await api.put(`/api/seller/orders/update-status/${order.id}`, payload);
      if (selectedStatus === "SHIPPED" && trackingNumber && estimatedDelivery) {
        await api.put(`/api/seller/orders/tracking/${order.id}`, { trackingNumber, estimatedDelivery });
      }
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
              <CardDescription>
                Order #{typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}
              </CardDescription>
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
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const { valid, errors } = validateStatusUpdate("SHIPPED", { trackingNumber, estimatedDelivery });
    if (!valid) { toast.error(errors[0]); return; }
    setLoading(true);
    try {
      await api.put(`/api/seller/orders/tracking/${order.id}`, { trackingNumber, estimatedDelivery });
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
              <CardDescription>
                Order #{typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}
              </CardDescription>
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

// ── Order Detail Page ──────────────────────────────────────────────────────────

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeStatusModal, setActiveStatusModal] = useState(false);
  const [activeTrackingModal, setActiveTrackingModal] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      // Try direct detail endpoint first, fall back to list + filter
      let found: Order | null = null;
      try {
        const res = await api.get(`/api/seller/orders/${orderId}`);
        found = res?.order ?? res ?? null;
      } catch {
        const res = await api.get("/api/seller/orders");
        const orders: Order[] = Array.isArray(res) ? res : res.orders ?? [];
        found = orders.find((o) => String(o.id) === String(orderId)) ?? null;
      }
      if (found) {
        setOrder(found);
      } else {
        setNotFound(true);
      }
    } catch {
      toast.error("Failed to load order");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

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

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-3.5 w-24" /></div>
              ))}
            </CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" className="gap-2 mb-6" onClick={() => router.push("/sellerdashboard/orders")}>
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Button>
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold">Order not found</p>
          <p className="text-muted-foreground text-sm mt-1">The order could not be loaded or does not belong to your account.</p>
          <Button className="mt-6" onClick={() => router.push("/sellerdashboard/orders")}>Return to Orders</Button>
        </Card>
      </div>
    );
  }

  let addr: Record<string, any> = {};
  const raw = order.shippingAddress;
  if (raw && typeof raw === "object") addr = raw;
  else if (typeof raw === "string") { try { addr = JSON.parse(raw); } catch { addr = { address: raw }; } }

  const summary = (addr as any).orderSummary ?? {};
  const sm = summary.shippingMethod ?? {};

  const cityLabel = getCityLabel(addr.country || order.shippingAddress?.country);
  const addrFields: [string, string][] = [
    ["firstName", "First Name"], ["lastName", "Last Name"],
    ["addressLine", "Address Line"], ["address", "Address"],
    ["street", "Street"], ["suburb", "Suburb"], ["city", cityLabel],
    ["state", "State"], ["country", "Country"], ["zipCode", "ZIP Code"],
    ["zipcode", "ZIP Code"], ["postcode", "Postcode"], ["phone", "Phone"], ["email", "Email"],
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/sellerdashboard/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : "N/A"}
              {order.customerName && (
                <> · <span className="font-medium text-foreground">{order.customerName}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
            {getStatusLabel(order.status)}
          </Badge>
          {!terminal && (
            <Button onClick={() => setActiveStatusModal(true)}>
              <ClipboardList className="h-4 w-4 mr-2" /> Update Status
            </Button>
          )}
          {!order.trackingNumber && !terminal && (
            <Button variant="outline" onClick={() => setActiveTrackingModal(true)}>
              <Truck className="h-4 w-4 mr-2" /> Add Tracking
            </Button>
          )}
        </div>
      </div>

      {terminal && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
          <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Terminal Status</p>
            <p className="text-sm text-muted-foreground">This order is in a final state — no further status changes are possible.</p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Info */}
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Info</span>
          </div>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs font-medium">{String(order.id ?? "").slice(-10).toUpperCase()}</span>
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
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">${renderValue(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium capitalize">{renderValue(order.paymentMethod)}</span>
            </div>
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
      </div>

      {/* Tracking Banner */}
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

      {/* Order Items */}
      <Card>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
          <Box className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Items</span>
        </div>
        <CardContent className="p-0">
          {order.items && order.items.length > 0 ? (
            <div className="divide-y">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  {item.product?.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.title || "Product"}
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
                    <p className="font-medium text-sm truncate">{item.product?.title || item.title || "Unknown Product"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  {item.price != null && (
                    <span className="text-sm font-semibold shrink-0">${item.price}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">No items found.</div>
          )}
        </CardContent>
      </Card>

      {/* Order Totals */}
      {(summary.subtotal != null || summary.shippingCost != null || order.totalAmount != null) && (
        <Card>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b rounded-t-lg">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Totals</span>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            {summary.subtotal != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${summary.subtotal}</span>
              </div>
            )}
            {summary.shippingCost != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping{sm.name ? ` · ${sm.name}` : ""}
                </span>
                <span>${summary.shippingCost}</span>
              </div>
            )}
            {summary.discountAmount != null && Number(summary.discountAmount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{summary.couponCode ? ` (${summary.couponCode})` : ""}</span>
                <span>− ${summary.discountAmount}</span>
              </div>
            )}
            {summary.gstAmount != null && Number(summary.gstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST{summary.gstPercentage ? ` (${summary.gstPercentage}%)` : ""}</span>
                <span>${summary.gstAmount}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-1 flex justify-between font-bold text-base">
              <span>Grand Total</span>
              <span>${order.totalAmount}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
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
    </div>
  );
}
