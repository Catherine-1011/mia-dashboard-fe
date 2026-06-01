"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft, Package, Truck, Loader2, ClipboardList, DollarSign,
  MapPin, Calendar, Box, Download, Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getCityLabel } from "@/lib/utils";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/orderStatusRules";
import { RefundDialog } from "@/components/shared/refund-dialog";

type OrderItem = {
  product?: { title?: string; images?: string[]; price?: number };
  title?: string;
  quantity: number;
  price?: any;
};

type Order = {
  id: any;
  displayId?: string;
  createdAt: any;
  status: any;
  items?: OrderItem[];
  totalAmount: any;
  trackingNumber?: any;
  estimatedDelivery?: any;
  paymentMethod?: any;
  statusReason?: any;
  shippingAddress?: any;
};

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Try direct detail endpoint first, fall back to list + filter
        let found: Order | null = null;
        try {
          const res = await api.get(`/api/orders/${orderId}`);
          found = res?.order ?? res ?? null;
        } catch {
          const res = await api.get("/api/orders/my-orders");
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
    fetchOrder();
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const cleanId = (order.displayId ?? "").replace(/^#/, "");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au"}/api/orders/invoice/${cleanId}`,
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

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
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
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" className="gap-2 mb-6" onClick={() => router.push("/customerdashboard/orders")}>
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Button>
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold">Order not found</p>
          <p className="text-muted-foreground text-sm mt-1">The order could not be loaded or does not belong to your account.</p>
          <Button className="mt-6" onClick={() => router.push("/customerdashboard/orders")}>Return to Orders</Button>
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

  const cityLabel = getCityLabel(addr.country);
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

  const showInvoice = ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"].includes(order.status);
  const showRefund = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/customerdashboard/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{order.displayId ?? (typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id)}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
            {getStatusLabel(order.status)}
          </Badge>
          {showRefund && (
            <Button variant="outline" onClick={() => setRefundDialogOpen(true)}>
              <Undo2 className="h-4 w-4 mr-2" /> Request Refund
            </Button>
          )}
          {showInvoice && (
            <Button variant="outline" onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
              {downloadingInvoice
                ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Downloading...</>
                : <><Download className="h-4 w-4 mr-2" />Invoice</>}
            </Button>
          )}
        </div>
      </div>

      {refundDialogOpen && (
        <RefundDialog
          order={order}
          isOpen={refundDialogOpen}
          onClose={() => setRefundDialogOpen(false)}
          onSuccess={(ticketId) => {
            // Optionally redirect to a ticket support page
            router.push(`/customerdashboard/orders`);
          }}
        />
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
    </div>
  );
}
