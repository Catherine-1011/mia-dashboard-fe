"use client";

import { useState, useEffect, useCallback, useMemo, Fragment, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, Loader2, RefreshCcw, X, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CreditCard, MapPin, Calendar, ClipboardList, DollarSign, Hash, Download, AlertTriangle, TrendingUp, ShoppingCart, FileDown, Check, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, getCityLabel } from "@/lib/utils";
import Image from "next/image";

import { toast } from "sonner";
import {
  getAllowedTransitions,
  getRequiredFields,
  validateStatusUpdate,
  getStatusLabel,
  getStatusBadgeVariant,
  isTerminalStatus,
} from "@/lib/orderStatusRules";

const BASE_URL = "http://backend.madeinarnhemland.com.au";

const getFriendlyTrackingErrorMessage = (message: string) => {
  if (/tracking number/i.test(message) && /(already used|already assigned|sub-order)/i.test(message)) {
    return "Track number is already assigned to another order";
  }
  return message;
};

// --- API HELPERS ---
const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
  
  if (!token) {
    console.warn("No authentication token found");
    toast.error("Please log in again to access orders");
    return {
      "Content-Type": "application/json"
    };
  }
  
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

type OrderItem = {
  id: string;
  orderId: string;
  subOrderId?: string | null;
  productId: string;
  variantId?: string | null;
  variantAttributes?: Record<string, string> | null;
  quantity: number;
  price: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    images: string[];
    featuredImage: string;
    price: string;
    sellerId: string;
  };
};

type Order = {
  subOrderId: string;
  id: string;
  displayId?: string | null;
  subDisplayId?: string | null;
  displaySubId?: string | null;
  parentOrderId?: string | null;
  parentDisplayId?: string | null;
  type: "DIRECT" | "SUB_ORDER";
  status: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  statusReason?: string | null;
  subtotal: string | number;
  items: OrderItem[];
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    addressLine: string;
    orderSummary: {
      subtotal: string;
      gstAmount: string;
      grandTotal: string;
      gstDetails: any;
      gstInclusive: boolean;
      shippingCost: string;
      gstPercentage: string;
      subtotalExGST: string;
      shippingMethod: any;
    };
  };
  shippingAddressLine: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  shippingPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Status Update Modal ──────────────────────────────────────────────────────

interface StatusModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

function StatusUpdateModal({ order, onClose, onSuccess }: StatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState("");

  if (!order) return null;
  const allowedTransitions = getAllowedTransitions(order.status);
  const requiredFields = getRequiredFields(selectedStatus);
  const needsTracking = requiredFields.includes("trackingNumber");
  const needsReason = requiredFields.includes("reason");
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
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const authHeaders = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${BASE_URL}/api/seller/orders/update-status/${order.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update status");
      }
      
      // Handle new response structure with subOrder field
      const responseData = await res.json();
      const updatedSubOrder = responseData.subOrder || responseData.order; // Backward compatibility
      
      // If shipping, persist tracking info via the dedicated tracking endpoint
      if (selectedStatus === "SHIPPED" && trackingNumber && estimatedDelivery) {
        await fetch(`${BASE_URL}/api/seller/orders/tracking/${order.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ trackingNumber, estimatedDelivery }),
        });
      }
      
      // Show success message with updated status
      const statusLabel = getStatusLabel(selectedStatus);
      if (updatedSubOrder?.trackingNumber && selectedStatus === "SHIPPED") {
        toast.success(`Order updated to ${statusLabel}. Tracking: ${updatedSubOrder.trackingNumber}`);
      } else {
        toast.success(`Order updated to ${statusLabel}`);
      }
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
              <CardDescription className="mt-0.5">
                {order.subDisplayId ?? order.displaySubId ?? order.displayId ?? `#${typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id}`}
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
              {needsTracking && (
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
              {needsReason && (
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="Provide a reason for this status change..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
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
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span>•</span><span>{err}</span></p>
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

// ─── Bulk Status Update Modal ─────────────────────────────────────────────────

interface BulkStatusUpdateModalProps {
  orders: Order[];
  selectedOrderIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkStatusUpdateModal({ orders, selectedOrderIds, onClose, onSuccess }: BulkStatusUpdateModalProps) {
  const selectedOrders = useMemo(() => orders.filter(o => selectedOrderIds.has(o.id)), [orders, selectedOrderIds]);
  const allowedStatuses = useMemo(() => {
    if (selectedOrders.length === 0) return [];
    return selectedOrders.reduce<string[]>((acc, order, idx) => {
      const transitions = getAllowedTransitions(order.status);
      if (idx === 0) return transitions;
      return acc.filter(s => (transitions as string[]).includes(s));
    }, []);
  }, [selectedOrders]);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [defaultDelivery, setDefaultDelivery] = useState("");
  const [perOrderTracking, setPerOrderTracking] = useState<Record<string, { trackingNumber: string; estimatedDelivery: string }>>(() => {
    const init: Record<string, { trackingNumber: string; estimatedDelivery: string }> = {};
    selectedOrders.forEach(o => { init[o.id] = { trackingNumber: "", estimatedDelivery: "" }; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const isShipped = selectedStatus === "SHIPPED";
  const needsReason = ["CANCELLED", "RETURNED", "REFUNDED", "PARTIAL_REFUND"].includes(selectedStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (isShipped) {
      const missingTracking = selectedOrders.some(o => !perOrderTracking[o.id]?.trackingNumber.trim());
      if (missingTracking) {
        setApiError("Please provide tracking numbers for all selected orders.");
        return;
      }
    }
    const orderIdsPayload = isShipped
      ? selectedOrders.map(o => ({
          id: o.id,
          trackingNumber: perOrderTracking[o.id]?.trackingNumber || "",
          ...(perOrderTracking[o.id]?.estimatedDelivery ? { estimatedDelivery: perOrderTracking[o.id].estimatedDelivery } : {}),
        }))
      : Array.from(selectedOrderIds);
    const payload: Record<string, any> = {
      status: selectedStatus,
      orderIds: orderIdsPayload,
      ...(defaultDelivery && { estimatedDelivery: defaultDelivery }),
      ...(reason && { reason }),
      ...(!isShipped && notes ? { notes } : {}),
    };
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const authHeaders: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${BASE_URL}/api/seller/orders/bulk-update-status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Bulk update failed");
      }
      toast.success(`${selectedOrders.length} orders updated to ${getStatusLabel(selectedStatus)}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = getFriendlyTrackingErrorMessage(err?.message || "Failed to update orders");
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="border-b bg-muted/40">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Bulk Status Update</CardTitle>
              <CardDescription className="mt-0.5">{selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""} selected</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5">
            {selectedOrders.map(o => (
              <Badge key={o.id} variant="outline" className="text-[10px] py-0 border-muted-foreground/30 font-medium">
                {o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {allowedStatuses.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">No common status transitions available for the selected orders.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>New Status <span className="text-destructive">*</span></Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue placeholder="— Select status —" /></SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map(s => (
                      <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isShipped && (
                <>
                  <div className="space-y-1.5">
                    <Label>Default Estimated Delivery</Label>
                    <Input 
                      type="date" 
                      value={defaultDelivery} 
                      onChange={e => {
                        const val = e.target.value;
                        setDefaultDelivery(val);
                        // Auto-fill all individual row estimated deliveries
                        setPerOrderTracking(prev => {
                          const next = { ...prev };
                          Object.keys(next).forEach(k => {
                            next[k] = { ...next[k], estimatedDelivery: val };
                          });
                          return next;
                        });
                      }} 
                      min={new Date().toISOString().split("T")[0]} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">This will automatically apply to all selected orders below.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Per-Order Tracking Numbers <span className="text-destructive">*</span></Label>
                    <div className="border rounded-md overflow-hidden">
                      <div style={{ maxHeight: "280px", overflowY: "auto" }} className="[&::-webkit-scrollbar]:w-1.5">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Order</TableHead>
                              <TableHead className="text-xs">Tracking #</TableHead>
                              <TableHead className="text-xs">Est. Delivery</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrders.map(o => (
                              <TableRow key={o.id}>
                                <TableCell className="text-xs font-medium py-2 pr-1">{o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`}</TableCell>
                                <TableCell className="py-2 pr-1">
                                  <Input
                                    placeholder="TRK-001"
                                    value={perOrderTracking[o.id]?.trackingNumber || ""}
                                    onChange={e => setPerOrderTracking(prev => ({ ...prev, [o.id]: { ...prev[o.id], trackingNumber: e.target.value } }))}
                                    className="h-7 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Input
                                    type="date"
                                    value={perOrderTracking[o.id]?.estimatedDelivery || ""}
                                    onChange={e => setPerOrderTracking(prev => ({ ...prev, [o.id]: { ...prev[o.id], estimatedDelivery: e.target.value } }))}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="h-7 text-xs"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {needsReason && (
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="Provide a reason..." value={reason} onChange={e => setReason(e.target.value)} rows={3} className="resize-none" />
                </div>
              )}
              {selectedStatus && !isShipped && (
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none" />
                </div>
              )}
              {apiError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={!selectedStatus || loading || (needsReason && !reason.trim())}>
                  {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating...</> : `Update ${selectedOrders.length} Orders`}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
    // Only declare expandedOrderId once at the top of the component
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightOrderId = searchParams.get("highlight");
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [dismissedHighlight, setDismissedHighlight] = useState<string | null>(null);
  const activeHighlight = highlightOrderId && highlightOrderId !== dismissedHighlight ? highlightOrderId : null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeStatusOrder, setActiveStatusOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState({ trackingNumber: "", estimatedDelivery: "" });

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);


  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const fmtDate = (val: any) => {
    if (!val) return "N/A";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB');
  };

  const normalizeOrderStatus = (status: string) => {
    const normalized = String(status || "").trim().toUpperCase().replace(/\s+/g, "_");
    // Treat backend refund variants as one refundable bucket for filtering/reporting.
    if (normalized === "REFUND" || normalized === "PARTIAL_REFUND") return "REFUNDED";
    return normalized;
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== "ALL" && normalizeOrderStatus(o.status) !== filterStatus) return false;
    // Use local date string (YYYY-MM-DD) to avoid UTC/timezone drift
    const orderLocalDate = new Date(o.createdAt).toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    if (filterDateFrom && orderLocalDate < filterDateFrom) return false;
    if (filterDateTo && orderLocalDate > filterDateTo) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!(
        o.id.toLowerCase().includes(q) ||
        (o.displayId ?? "").toLowerCase().includes(q) ||
        (o.subDisplayId ?? "").toLowerCase().includes(q) ||
        (o.displaySubId ?? "").toLowerCase().includes(q) ||
        (o.subOrderId ?? "").toLowerCase().includes(q) ||
        (o.parentOrderId ?? "").toLowerCase().includes(q) ||
        (o.parentDisplayId ?? "").toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q)
      )) {
        return false;
      }
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setExpandedOrderId(null);
  };

  const getPaginationPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const handleToggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        // Enforce same status for bulk selection
        const orderToAdd = orders.find(o => o.id === orderId);
        if (orderToAdd && next.size > 0) {
          const firstSelectedId = Array.from(next)[0];
          const firstSelectedOrder = orders.find(o => o.id === firstSelectedId);
          if (firstSelectedOrder && firstSelectedOrder.status !== orderToAdd.status) {
            toast.error("You can only bulk update orders that have the exact same current status.");
            return prev;
          }
        }
        next.add(orderId);
      }
      return next;
    });
  }, [orders]);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-expand and scroll to highlighted order from notification click
  useEffect(() => {
    if (!activeHighlight || orders.length === 0) return;
    // Find the order in any page
    const idx = filteredOrders.findIndex(o => o.id === activeHighlight);
    if (idx === -1) return;
    // Jump to the page containing this order
    const targetPage = Math.floor(idx / itemsPerPage) + 1;
    setCurrentPage(targetPage);
    setExpandedOrderId(activeHighlight);
    // Scroll after render
    setTimeout(() => {
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }, [activeHighlight, orders]);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedOrderId(null);
  }, [filterDateFrom, filterDateTo, filterStatus]);

  // 1. GET Orders
  const fetchOrders = async (isRetry: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${BASE_URL}/api/seller/orders`, { 
        headers: getAuthHeaders(),
        cache: 'no-cache' // Prevent caching issues
      });
      
      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = await res.text().catch(() => errorMessage);
        }

        // Handle specific error cases
        if (res.status === 401) {
          setError("Authentication failed. Please log in again.");
          toast.error("Authentication failed. Please log in again.");
          return;
        } else if (res.status === 403) {
          setError("Access denied. You don't have permission to view orders.");
          toast.error("Access denied. You don't have permission to view orders.");
          return;
        } else if (res.status >= 500) {
          if (errorMessage.includes('findMany')) {
            setError("Database connection issue. The server is experiencing problems.");
            toast.error("Database connection issue. Please try again later.");
          } else {
            setError(`Server error: ${errorMessage}`);
            toast.error("Server error. Please try again later.");
          }
          console.error(`Server error ${res.status}:`, errorMessage);
          return;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log("Orders data received:", data); // Debug log
      
      if (!data.success && data.message) {
        throw new Error(data.message);
      }
      
      setOrders(data.orders || []);
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Unable to connect to server. Please check your connection.";
        toast.error("Unable to connect to server. Please check your connection.");
      } else if (error instanceof Error) {
        errorMessage = error.message;
        
        if (errorMessage.includes('findMany')) {
          errorMessage = "Database connection issue. The server is experiencing problems.";
          toast.error("Database connection issue detected. Please contact support if this persists.");
        } else {
          toast.error(`Failed to load orders: ${errorMessage}`);
        }
      }
      
      setError(errorMessage);
      setOrders([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  // Retry function with exponential backoff
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      toast.info(`Retrying... (${retryCount + 1}/3)`);
      setTimeout(() => fetchOrders(true), 1000 * Math.pow(2, retryCount)); // Exponential backoff
    } else {
      toast.error("Max retries reached. Please contact support.");
    }
  };

  // 2. UPDATE Status — replaced by StatusUpdateModal

  // 3. ADD Tracking
  const submitTracking = async () => {
    if (!activeTrackingOrder) return;
    
    // Basic validation
    if (!trackingData.trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }
    if (!trackingData.estimatedDelivery) {
      toast.error("Please select an estimated delivery date");
      return;
    }
    
    // Date validation
    const deliveryDate = new Date(trackingData.estimatedDelivery);
    const today = new Date();
    if (deliveryDate < today) {
      toast.error("Delivery date cannot be in the past");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/seller/orders/tracking/${activeTrackingOrder.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(trackingData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update tracking information");
      }
      
      const responseData = await res.json();
      toast.success(`Tracking updated successfully! Tracking: ${trackingData.trackingNumber}`);
      setActiveTrackingOrder(null);
      setTrackingData({ trackingNumber: "", estimatedDelivery: "" });
      fetchOrders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update tracking";
      toast.error(errorMessage);
    }
  };

  // 4. Download Invoice
  const handleDownloadInvoice = async (orderId: string, displayId?: string | null, subDisplayId?: string | null) => {
    setDownloadingInvoiceId(orderId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      // Sub-orders have their own invoice endpoint; direct orders use the parent endpoint
      const isSubOrder = !!subDisplayId;
      const cleanId = (isSubOrder ? subDisplayId! : (displayId ?? orderId)).replace(/^#/, "");
      const endpoint = isSubOrder
        ? `${BASE_URL}/api/orders/invoice/sub/${cleanId}`
        : `${BASE_URL}/api/orders/invoice/${cleanId}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download invoice");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${cleanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully.");
    } catch (err: any) {
      console.error('Download invoice error:', err);
      toast.error(err.message || "Failed to download invoice.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 text-center space-y-2">
              <Skeleton className="h-8 w-10 mx-auto" />
              <Skeleton className="h-5 w-20 mx-auto rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm whitespace-nowrap">Order ID</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Type</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Customer</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Items</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Total</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Status</TableHead>
                <TableHead className="text-sm whitespace-nowrap">Tracking</TableHead>
                <TableHead className="text-sm whitespace-nowrap text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );

  // Error state
  if (error && !loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Manage customer purchases and shipping status.</p>
          </div>
        </div>

        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Unable to Load Orders</h3>
              <p className="text-muted-foreground max-w-md">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => fetchOrders()} disabled={loading}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
              {retryCount > 0 && retryCount < 3 && (
                <Button variant="outline" onClick={handleRetry} disabled={loading}>
                  Auto Retry ({retryCount}/3)
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support with error code: DB_CONNECTION_ERROR
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Helper to render shipping address safely
  function renderOrderDetails(order: Order) {
    let addr: any = {};
    if (order.shippingAddress) {
      if (typeof order.shippingAddress === "string") {
        try { addr = JSON.parse(order.shippingAddress); } catch { addr = {}; }
      } else {
        addr = order.shippingAddress;
      }
    }
    const summary = addr.orderSummary || {};
    const addressFields = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "street", label: "Street" },
      { key: "suburb", label: "Suburb" },
      { key: "city", label: getCityLabel(addr.country || order.shippingCountry) },
      { key: "state", label: "State" },
      { key: "zipCode", label: "ZIP Code" },
      { key: "zipcode", label: "Postcode" },
      { key: "postcode", label: "Postcode" },
      { key: "country", label: "Country" },
    ];
    const seenLabels = new Set<string>();
    const addressRows = addressFields.filter(({ key, label }) => {
      const val = addr[key];
      if (!val || seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    });
    const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
    const subtotal = summary.subtotal ?? summary.subTotal ?? "";
    const shipping = summary.shippingCost ?? summary.shipping ?? summary.shippingMethod?.price ?? "";
    const discount = summary.discount ?? "";
    const gst = summary.gst ?? summary.tax ?? "";
    const total = order.subtotal;

    return (
      <div className="p-4 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Order Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Order ID</span><span className="font-medium text-right break-all min-w-0">{order.subDisplayId ?? order.displaySubId ?? order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`}</span></div>
            <div className="flex justify-between gap-4 items-center"><span className="text-muted-foreground shrink-0">Status</span><Badge variant="secondary" className="text-right whitespace-nowrap">{order.status.toUpperCase()}</Badge></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Type</span><span className="font-medium text-right min-w-0">{order.type === "DIRECT" ? "Direct Order" : "Sub-order"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Date</span><span className="font-medium text-right min-w-0">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Payment</span><span className="font-medium text-right min-w-0">{order.paymentMethod}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Payment Status</span><span className="font-medium text-right min-w-0">{order.paymentStatus}</span></div>
            {order.trackingNumber && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Tracking</span><span className="font-medium text-right break-words min-w-0">{order.trackingNumber}</span></div>}
            {order.estimatedDelivery && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Est. Delivery</span><span className="font-medium text-right min-w-0">{fmtDate(order.estimatedDelivery)}</span></div>}
            {order.parentOrderId && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Parent Order</span><span className="font-medium text-right break-words min-w-0">{order.parentDisplayId ?? `#${order.parentOrderId.slice(-6).toUpperCase()}`}</span></div>}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Customer</span><span className="font-medium text-right break-words min-w-0">{order.customerName}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Email</span><span className="font-medium text-right break-all min-w-0">{order.customerEmail}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Phone</span><span className="font-medium text-right break-words min-w-0">{order.customerPhone}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Address</span><span className="font-medium text-right break-words min-w-0">{order.shippingAddressLine}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">{getCityLabel(order.shippingCountry)}</span><span className="font-medium text-right break-words min-w-0">{order.shippingCity}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">State</span><span className="font-medium text-right break-words min-w-0">{order.shippingState}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Zip Code</span><span className="font-medium text-right break-words min-w-0">{order.shippingZipCode}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Country</span><span className="font-medium text-right break-words min-w-0">{order.shippingCountry}</span></div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Order Totals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {subtotal !== "" && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Subtotal</span><span className="font-medium text-right">${subtotal}</span></div>}
            {shipping !== "" && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Shipping</span><span className="font-medium text-right break-words">${typeof shipping === "object" ? JSON.stringify(shipping) : shipping}</span></div>}
            {discount !== "" && Number(discount) > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Discount</span><span className="font-medium text-right text-green-600">-${discount}</span></div>}
            {gst !== "" && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">GST</span><span className="font-medium text-right">${gst}</span></div>}
            <div className="border-t pt-2 flex justify-between gap-4 font-bold text-base"><span className="shrink-0">My Order Total</span><span className="text-right">${total}</span></div>
            {order.items && order.items.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-muted-foreground font-medium mb-1">Items</p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-4 text-xs">
                    <span className="text-left break-words">
                      {item.product.title} x{item.quantity}
                      {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(", ")})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium">${item.price}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <Button
                variant="default"
                size="sm"
                disabled={downloadingInvoiceId === order.id}
                onClick={() => handleDownloadInvoice(
                  order.id,
                  order.type === 'SUB_ORDER' ? order.parentDisplayId : order.displayId,
                  order.type === 'SUB_ORDER' ? (order.subDisplayId ?? order.displaySubId ?? order.displayId) : undefined
                )}
                className="gap-2"
              >
                {downloadingInvoiceId === order.id ? (
                  <><Loader2 className="animate-spin h-4 w-4" />Downloading...</>
                ) : (
                  <><Download className="h-4 w-4" />Download Invoice</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- CSV Export Helpers ---
  const downloadCSV = (csvContent: string, filename: string) => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeCsvValue = (val: unknown): string => {
    const str = val === null || val === undefined ? "" : String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const handleExportOrders = () => {
    if (filteredOrders.length === 0) { toast.error("No orders to export."); return; }
    const headers = [
      "Order ID", "Date", "Customer Name", "Customer Email", "Customer Phone",
      "Status", "Payment Method", "Payment Status", "Items Count",
      "Shipping Address", "City", "State", "ZIP", "Country",
      "Order Total ($)",
    ];
    const rows = filteredOrders.map((o) => [
      o.subDisplayId ?? o.displaySubId ?? o.id.slice(-6).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString("en-IN"),
      o.customerName || "",
      o.customerEmail || "",
      o.customerPhone || "",
      o.status.toUpperCase(),
      o.paymentMethod || "",
      o.paymentStatus || "",
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.shippingAddressLine || "",
      o.shippingCity || "",
      o.shippingState || "",
      o.shippingZipCode || "",
      o.shippingCountry || "",
      parseFloat(String(o.subtotal) || "0").toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsvValue).join(",")).join("\n");
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `orders-report-${date}.csv`);
    toast.success(`Exported ${filteredOrders.length} orders to CSV.`);
  };

  const handleExportTopProducts = () => {
    if (filteredOrders.length === 0) { toast.error("No orders to analyse."); return; }
    // Aggregate product sales across all orders
    const productMap = new Map<string, { title: string; productId: string; unitsSold: number; revenue: number }>();
    for (const order of filteredOrders) {
      for (const item of order.items) {
        const key = item.productId;
        const existing = productMap.get(key);
        const itemRevenue = parseFloat(String(item.price) || "0") * item.quantity;
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          productMap.set(key, {
            title: item.product.title || "Unknown",
            productId: item.productId,
            unitsSold: item.quantity,
            revenue: itemRevenue,
          });
        }
      }
    }
    const sorted = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const headers = ["Rank", "Product ID", "Product Name", "Units Sold", "Total Revenue ($)"];
    const rows = sorted.map((p, i) => [
      i + 1,
      p.productId.slice(-8).toUpperCase(),
      p.title,
      p.unitsSold,
      p.revenue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsvValue).join(",")).join("\n");
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `top-products-by-sales-${date}.csv`);
    toast.success(`Exported ${sorted.length} products ranked by sales.`);
  };

  const hasActiveFilters = filterDateFrom !== "" || filterDateTo !== "" || filterStatus !== "ALL" || searchQuery !== "";

  // --- Overview statistics computed from filtered orders ---
  const totalGrossValue = filteredOrders.reduce((sum, o) => sum + parseFloat(String(o.subtotal) || "0"), 0);
  const avgOrderValue = filteredOrders.length > 0 ? totalGrossValue / filteredOrders.length : 0;
  const totalItemsSold = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0), 0);
  const statusCounts = filteredOrders.reduce<Record<string, number>>((acc, o) => {
    const s = normalizeOrderStatus(o.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusDisplayOrder = ["PENDING", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED", "RETURNED", "REFUNDED"];
  const sortedStatusEntries = Object.entries(statusCounts)
    .filter(([s]) => statusDisplayOrder.includes(s))
    .sort(([a], [b]) => {
      const ai = statusDisplayOrder.indexOf(a);
      const bi = statusDisplayOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <ClipboardList className="h-4 w-4 text-amber-600" />;
      case "PROCESSING":
        return <RefreshCcw className="h-4 w-4 text-blue-600" />;
      case "DELIVERED":
      case "COMPLETED":
        return <Check className="h-4 w-4 text-green-600" />;
      case "CANCELLED":
        return <X className="h-4 w-4 text-red-600" />;
      case "RETURNED":
        return <RefreshCcw className="h-4 w-4 text-orange-600" />;
      case "REFUNDED":
        return <DollarSign className="h-4 w-4 text-violet-600" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusIconBg = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100";
      case "PROCESSING":
        return "bg-blue-100";
      case "DELIVERED":
      case "COMPLETED":
        return "bg-green-100";
      case "CANCELLED":
        return "bg-red-100";
      case "RETURNED":
        return "bg-orange-100";
      case "REFUNDED":
        return "bg-violet-100";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage customer purchases and shipping status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchOrders()} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportOrders} disabled={filteredOrders.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Orders
          </Button>
        </div>
      </div>


      {/* ── Order Overview ─────────────────────────────────────────── */}
      {filteredOrders.length > 0 && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold mt-1">{orders.length}</p>
                    {hasActiveFilters && <p className="text-xs text-muted-foreground mt-0.5">{filteredOrders.length} filtered</p>}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                    <p className="text-2xl font-bold mt-1">${avgOrderValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                    <p className="text-2xl font-bold mt-1">{totalItemsSold}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          {sortedStatusEntries.length > 0 && (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
              {sortedStatusEntries.map(([status, count]) => (
                <Card key={status}>
                  <CardContent className="py-3 px-3">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold leading-none">{count}</p>
                      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", getStatusIconBg(status))}>
                        {getStatusIcon(status)}
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(status.toLowerCase())} className="mt-2 text-xs">
                      {getStatusLabel(status)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Filters ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filter Orders</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px] max-w-sm relative">
              <Label className="text-xs font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by order ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-9 pr-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="h-9 w-px bg-border self-end mb-0.5 hidden sm:block" />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">From Date</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9 text-sm w-[160px]" max={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">To Date</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9 text-sm w-[160px]" min={filterDateFrom || undefined} max={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="h-9 w-px bg-border self-end mb-0.5 hidden sm:block" />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Order Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {["CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","RETURNED","REFUNDED"].map((s) => (
                    <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 ml-auto">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus("ALL"); setSearchQuery(""); }}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
              {orders.length > 0 && (
                <span className="text-xs text-muted-foreground self-center">
                  <span className="font-semibold text-foreground">{filteredOrders.length}</span> {filteredOrders.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── View Toggle & Bulk Select Toolbar ─────────────────── */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between gap-3 py-1">
          {!isBulkSelectMode ? (
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsBulkSelectMode(true)}>
                <Check className="h-4 w-4" /> Bulk Order update
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap w-full">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer"
                checked={
                  selectedOrderIds.size > 0 &&
                  selectedOrderIds.size === paginatedOrders.filter(o => {
                    if (isTerminalStatus(o.status)) return false;
                    // If we have items selected, restrict select-all to check only those matching current selected status.
                    if (selectedOrderIds.size > 0) {
                      const firstSelectedId = Array.from(selectedOrderIds)[0];
                      const firstSelectedOrder = orders.find(ord => ord.id === firstSelectedId);
                      return firstSelectedOrder && firstSelectedOrder.status === o.status;
                    }
                    return true;
                  }).length
                }
                onChange={(e) => {
                  if (!e.target.checked) {
                    setSelectedOrderIds(new Set());
                    return;
                  }
                  
                  // Filter out terminal status orders
                  let selectableOrders = paginatedOrders.filter(o => !isTerminalStatus(o.status));
                  
                  if (selectableOrders.length === 0) return;

                  // Find the target status we are enforcing
                  let targetStatus: string;
                  if (selectedOrderIds.size > 0) {
                     const firstSelectedId = Array.from(selectedOrderIds)[0];
                     const firstSelectedOrder = orders.find(ord => ord.id === firstSelectedId);
                     targetStatus = firstSelectedOrder ? firstSelectedOrder.status : selectableOrders[0].status;
                  } else {
                     // Get the most common status on this page to maximize user convenience when "Selecting All"
                     const statusCounts = selectableOrders.reduce((acc, obj) => {
                       acc[obj.status] = (acc[obj.status] || 0) + 1;
                       return acc;
                     }, {} as Record<string, number>);
                     
                     targetStatus = Object.keys(statusCounts).reduce((a, b) => statusCounts[a] > statusCounts[b] ? a : b);
                  }

                  const selectableIds = selectableOrders.filter(o => o.status === targetStatus).map(o => o.id);
                  
                  // Only show toast if making a generic "Select All" without a previously established target criteria.
                  if (selectedOrderIds.size === 0 && selectableIds.length < selectableOrders.length) {
                    toast.info(`Selected ${selectableIds.length} orders with matching status: ${getStatusLabel(targetStatus)}`);
                  }
                  
                  // Keep currently selected (might be from other pages, as long as they match the target status)
                  const newSet = new Set(selectedOrderIds);
                  selectableIds.forEach(id => newSet.add(id));
                  setSelectedOrderIds(newSet);
                }}
              />
              <span className="text-sm text-muted-foreground">{selectedOrderIds.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                {selectedOrderIds.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds(new Set())}>Clear</Button>
                    <Button size="sm" onClick={() => setIsBulkModalOpen(true)}>
                      Bulk Update ({selectedOrderIds.size})
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setIsBulkSelectMode(false); setSelectedOrderIds(new Set()); }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {orders.length === 0 && !error ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Orders Found</h3>
              <p className="text-muted-foreground">You haven't received any orders yet, or they might not be loading properly.</p>
            </div>
            <Button variant="outline" onClick={() => fetchOrders()} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Orders
            </Button>
          </div>
        </Card>
      ) : filteredOrders.length === 0 && hasActiveFilters ? (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center space-y-3">
            <Package className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">No Orders Match Your Filters</h3>
              <p className="text-muted-foreground text-sm">Try adjusting the search query, date range, or status filter.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus("ALL"); setSearchQuery(""); }}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
            </Button>
          </div>
        </Card>
      ) : filteredOrders.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isBulkSelectMode && <TableHead className="w-10" />}
                  <TableHead className="text-sm whitespace-nowrap">Order ID</TableHead>
                  <TableHead className="text-sm whitespace-nowrap">Type</TableHead>
                  <TableHead className="text-sm whitespace-nowrap min-w-[120px]">Customer</TableHead>
                  <TableHead className="text-sm whitespace-nowrap">Items</TableHead>
                  <TableHead className="text-sm whitespace-nowrap">Total</TableHead>
                  <TableHead className="text-sm whitespace-nowrap">Payment</TableHead>
                  <TableHead className="text-sm whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-sm whitespace-nowrap min-w-[120px]">Tracking</TableHead>
                  <TableHead className="text-sm whitespace-nowrap text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map(order => (
                  <Fragment key={order.id}>
                    <TableRow className={selectedOrderIds.has(order.id) ? "bg-muted/40" : ""}>
                      {isBulkSelectMode && (
                        <TableCell>
                          {!isTerminalStatus(order.status) && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer"
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => handleToggleOrderSelection(order.id)}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-sm whitespace-nowrap">{order.subDisplayId ?? order.displaySubId ?? order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{order.type === "DIRECT" ? "Direct" : "Sub-order"}</TableCell>
                      <TableCell className="text-sm break-words min-w-[120px] max-w-[200px]" title={order.customerName}>{order.customerName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{order.items.length}</TableCell>
                      <TableCell className="text-sm font-semibold whitespace-nowrap">${order.subtotal}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{order.paymentMethod}</TableCell>
                      <TableCell className="whitespace-nowrap"><Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">{getStatusLabel(order.status)}</Badge></TableCell>
                      <TableCell className="text-sm break-words min-w-[120px] max-w-[200px]">{order.trackingNumber ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isTerminalStatus(order.status) && (
                            <Button variant="outline" size="sm" className="h-8 flex items-center gap-1.5 whitespace-nowrap" title="Update Status" onClick={() => setActiveStatusOrder(order)}>
                              <ClipboardList className="h-4 w-4" />
                              Update Status
                            </Button>
                          )}
                          {!order.trackingNumber && !isTerminalStatus(order.status) && (
                            <Button variant="outline" size="icon" className="h-8 w-8" title="Add Tracking" onClick={() => setActiveTrackingOrder(order)}>
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-8 w-8" title="View Details" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline" size="icon" className="h-8 w-8" title="Download Invoice"
                            disabled={downloadingInvoiceId === order.id}
                            onClick={() => handleDownloadInvoice(
                              order.id,
                              order.type === 'SUB_ORDER' ? order.parentDisplayId : order.displayId,
                              order.type === 'SUB_ORDER' ? (order.subDisplayId ?? order.displaySubId ?? order.displayId) : undefined
                            )}
                          >
                            {downloadingInvoiceId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedOrderId === order.id && (
                      <TableRow className="bg-muted/10 border-b">
                        <TableCell colSpan={isBulkSelectMode ? 10 : 9} className="p-0 border-t-0 whitespace-normal">
                          <div className="overflow-x-auto p-4 border-l-4 border-l-primary/40 bg-background m-2 rounded-r-lg shadow-sm">
                            {renderOrderDetails(order)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
      ) : null}

      {/* Pagination */}
      {!loading && filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredOrders.length)}</span>
              {"–"}
              <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span>
              {" of "}
              <span className="font-medium text-foreground">{filteredOrders.length}</span>
              {" orders"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Per page:</span>
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPaginationPages().map((page, idx) =>
              page === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm select-none">&hellip;</span>
              ) : (
                <Button key={page} variant={page === currentPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => handlePageChange(page as number)}>{page}</Button>
              )
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {activeStatusOrder && (
        <StatusUpdateModal
          order={activeStatusOrder}
          onClose={() => setActiveStatusOrder(null)}
          onSuccess={fetchOrders}
        />
      )}

      {/* Tracking Modal */}
      {activeTrackingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl border bg-card">
            <CardHeader className="border-b bg-muted/40">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Add Tracking Info
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    Order #{activeTrackingOrder.subDisplayId ?? activeTrackingOrder.displaySubId ?? activeTrackingOrder.displayId ?? `${typeof activeTrackingOrder.id === "string" ? activeTrackingOrder.id.slice(-6).toUpperCase() : activeTrackingOrder.id}`}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setActiveTrackingOrder(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* Current Status Display */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Current Status</span>
                <Badge variant={getStatusBadgeVariant(activeTrackingOrder.status)}>
                  {getStatusLabel(activeTrackingOrder.status)}
                </Badge>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                submitTracking();
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tracking-number">
                    Tracking Number <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="tracking-number"
                    placeholder="e.g. 1Z12345E6605272234" 
                    value={trackingData.trackingNumber}
                    onChange={(e) => setTrackingData({...trackingData, trackingNumber: e.target.value})}
                    className="font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the courier tracking number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-date">
                    Estimated Delivery Date <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="delivery-date"
                    type="date"
                    value={trackingData.estimatedDelivery}
                    onChange={(e) => setTrackingData({...trackingData, estimatedDelivery: e.target.value})}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Expected delivery date for the customer
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setActiveTrackingOrder(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    disabled={!trackingData.trackingNumber.trim() || !trackingData.estimatedDelivery}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Save Tracking
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {isBulkModalOpen && (
        <BulkStatusUpdateModal
          orders={orders}
          selectedOrderIds={selectedOrderIds}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { fetchOrders(); setIsBulkSelectMode(false); setSelectedOrderIds(new Set()); setIsBulkModalOpen(false); }}
        />
      )}
    </div>
  );
}
