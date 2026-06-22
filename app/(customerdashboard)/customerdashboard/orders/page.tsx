"use client"
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Truck, Calendar, ClipboardList, DollarSign, Eye, ChevronDown, ChevronUp, Package, CheckCircle2, XCircle, Download, AlertTriangle, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getCityLabel } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { isTerminalStatus, getStatusBadgeVariant } from "@/lib/orderStatusRules";
import { ImagePlus, Trash2 } from "lucide-react";

const BASE_URL = "https://backend.madeinarnhemland.com.au";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

type OrderItem = {
  title: string;
  id: string;
  orderId: string;
  subOrderId?: string | null;
  productId: string;
  quantity: number;
  price: string;
  createdAt: string;
  product: { 
    id: string;
    title: string;
    featuredImage: string;
    price: string;
    sellerId: string;
  };
  subOrderStatus?: string | null;
  sellerId: string;
  sellerName: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
};

type FinancialSummary = {
  productsSubtotal: number;
  shippingCost: number;
  gstAmount: number;
  gstPercentage: number;
  platformCommissionRate: number;
  platformCommission: number;
  customerTotal: number;
  sellerPayout: number;
  parentCouponDiscount?: number;
  parentCouponCode?: string;
};

// NEW: Sub-order type for multi-seller orders
type SubOrder = {
  id: string | null;
  sellerId: string;
  sellerName: string;
  status: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  subtotal: number;
  itemCount: number;
  items: {
    id: string;
    productId: string;
    productTitle: string;
    productFeaturedImage?: string;
    productImages?: string[];
    quantity: number;
    price: string;
    product?: {
      title?: string;
      featuredImage?: string;
    } | null;
  }[];
  statusReason?: string;
  createdAt?: string;
  updatedAt?: string;
  financialSummary?: FinancialSummary;
};

type Order = {
  id: string;
  displayId: string;
  userId: string;
  type: "DIRECT" | "MULTI_SELLER";
  totalAmount: string;
  status: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  statusReason?: string | null;
  paymentMethod: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string | null;
  paymentStatus: string;
  couponCode?: string | null;
  discountAmount?: string | null;
  originalTotal?: string | null;
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
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddressLine: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  shippingPhone: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  subOrders: SubOrder[];
  sellerCount: number;
  itemCount: number;
};

const OrderProgressTracker = ({ order }: { order: Order }) => {
  const statuses = ['confirmed', 'processing', 'shipped', 'delivered'];
  
  // For multi-seller orders, determine aggregated status
  const getAggregatedStatus = (order: Order): string => {
    if (!order.subOrders || order.subOrders.length === 0) {
      return order.status.toLowerCase();
    }
    
    const subOrderStatuses = order.subOrders.map(sub => sub.status.toLowerCase());
    
    // If any cancelled/refunded, show that status
    if (subOrderStatuses.some(status => status === 'cancelled')) return 'cancelled';
    if (subOrderStatuses.some(status => status === 'refund' || status === 'partial_refund')) {
      return subOrderStatuses.includes('partial_refund') ? 'partial_refund' : 'refund';
    }
    
    // For progression: use the minimum status (least progressed)
    const statusIndexes = subOrderStatuses.map(status => statuses.indexOf(status)).filter(idx => idx !== -1);
    if (statusIndexes.length === 0) return order.status.toLowerCase();
    
    const minIndex = Math.min(...statusIndexes);
    return statuses[minIndex];
  };
  
  const statusStr = getAggregatedStatus(order);
  const isCancelled = statusStr === 'cancelled';
  const isRefund = statusStr === 'refund' || statusStr === 'partial_refund';

  const getStatusIndex = (orderStatus: string) => {
    return statuses.indexOf(orderStatus);
  };

  // For refund states, show as fully delivered + refund indicator
  const currentIndex = isRefund ? statuses.length - 1 : getStatusIndex(statusStr);

  if (isCancelled) {
    return (
      <div className="w-full py-6">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center mb-2">
              <XCircle className="h-6 w-6 text-destructive-foreground" />
            </div>
            <span className="text-sm font-medium">Cancelled</span>
          </div>
        </div>
      </div>
    );
  }

  if (isRefund) {
    return (
      <div className="w-full py-6 space-y-4">
        <div className="flex items-center relative px-6">
          {statuses.map((statusName, index) => {
            let icon = null;
            if (statusName === 'confirmed') icon = <ClipboardList className="h-6 w-6" />;
            else if (statusName === 'processing') icon = <Package className="h-6 w-6" />;
            else if (statusName === 'shipped') icon = <Truck className="h-6 w-6" />;
            else if (statusName === 'delivered') icon = <CheckCircle2 className="h-6 w-6" />;
            return (
              <React.Fragment key={statusName}>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-2 border-2 border-primary">
                    {icon}
                  </div>
                  <span className="text-sm font-medium">{statusName.charAt(0).toUpperCase() + statusName.slice(1)}</span>
                </div>
                
                {/* Connecting Line */}
                {index < statuses.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 mt-6 mb-auto">
                    <div className="h-full bg-primary"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {statusStr === 'partial_refund' ? 'Partial Refund Processed' : 'Refund Processed'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">This order has been refunded and is now closed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6">
      <div className="flex items-center relative px-6">
        {/* Status Steps */}
        {statuses.map((statusName, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          let icon = null;
          if (statusName === 'confirmed') icon = <ClipboardList className="h-6 w-6" />;
          else if (statusName === 'processing') icon = <Package className="h-6 w-6" />;
          else if (statusName === 'shipped') icon = <Truck className="h-6 w-6" />;
          else if (statusName === 'delivered') icon = <CheckCircle2 className="h-6 w-6" />;
          
          return (
            <React.Fragment key={statusName}>
              <div className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 border-2 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-gray-300 dark:border-gray-600'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  {icon}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {statusName.charAt(0).toUpperCase() + statusName.slice(1)}
                </span>
              </div>
              
              {/* Connecting Line - only show between steps, not after the last one */}
              {index < statuses.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 mt-6 mb-auto">
                  <div className={`h-full transition-all duration-500 ${
                    index < currentIndex ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Multi-seller sub-order status breakdown */}
      {order.subOrders && order.subOrders.length > 1 && (
        <div className="mt-6 pt-4 border-t space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />
            Order Details by Seller
          </h4>
          <div className="grid gap-3">
            {order.subOrders.map((subOrder, index) => (
              <div key={subOrder.id || index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{subOrder.sellerName}</span>
                    <Badge variant={getStatusBadgeVariant(subOrder.status)} className="text-xs">
                      {subOrder.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${typeof subOrder.subtotal === 'string' ? subOrder.subtotal : subOrder.subtotal.toFixed(2)} • {subOrder.itemCount || subOrder.items.length} item{(subOrder.itemCount || subOrder.items.length) !== 1 ? 's' : ''}
                  </div>
                  {subOrder.trackingNumber && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Tracking: {subOrder.trackingNumber}
                      {subOrder.estimatedDelivery && (
                        <span className="text-muted-foreground">
                          • Est: {new Date(subOrder.estimatedDelivery).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  )}
                  {subOrder.statusReason && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {subOrder.statusReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Cancel Order Modal (requires mandatory reason) ---
const CancelOrderModal = ({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/api/orders/cancel/${order.displayId}`, { reason });
      toast.success("Order cancelled successfully.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" /> Cancel Order
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Order <strong>#{order.displayId}</strong>
        </p>
        <div className="space-y-2">
          <Label htmlFor="cancelReason">
            Reason for cancellation <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancelReason"
            placeholder="Please explain why you want to cancel this order..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Back</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading || !reason.trim()}>
            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Confirm Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Refund Request Modal ---
type RefundItemState = {
  id: string;          // order item id (orderItemId)
  productId: string;
  title: string;
  image: string;
  price: string;
  maxQty: number;
  sellerName?: string;
  // per-item editable state
  selected: boolean;
  qty: number;
  reason: string;
  attachments: File[];
  uploadedUrls: string[];
  uploading: boolean;
};

const RefundRequestModal = ({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: (requestType: "REFUND" | "PARTIAL_REFUND") => void;
}) => {
  // Build flat item list once
  const buildInitialItems = (): RefundItemState[] => {
    // Always use order.items[] — these have the correct orderItemId the backend expects.
    // Enrich images from subOrders by matching productId where available.
    const subOrderImageMap: Record<string, string> = {};
    if (order.subOrders) {
      order.subOrders.forEach(sub => {
        sub.items.forEach(item => {
          const img = item.productImages?.[0] || item.productFeaturedImage || item.product?.featuredImage || "";
          if (img) subOrderImageMap[item.productId] = img;
        });
      });
    }

    return order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      title: item.product?.title ?? item.title,
      image: subOrderImageMap[item.productId] || item.product?.featuredImage || "",
      price: item.price,
      maxQty: item.quantity,
      sellerName: item.sellerName,
      selected: true,
      qty: item.quantity,
      reason: "",
      attachments: [],
      uploadedUrls: [],
      uploading: false,
    }));
  };

  const [items, setItems] = useState<RefundItemState[]>(buildInitialItems);
  const [loading, setLoading] = useState(false);
  const itemFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedItems = items.filter(i => i.selected);

  const updateItem = (id: string, patch: Partial<RefundItemState>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, selected: !i.selected, qty: i.selected ? 1 : i.maxQty } : i
    ));
  };

  // Upload a single image to Cloudinary via /api/upload/image, return URL
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
    const res = await fetch(`${BASE_URL}/api/upload/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    const url = data.url ?? data.secure_url ?? data.imageUrl ?? data.data?.url ?? null;
    if (!res.ok || !url) throw new Error(data.message || "Image upload failed");
    return url as string;
  };

  const handleItemFiles = (itemId: string, files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 5);
    updateItem(itemId, {
      attachments: [...(items.find(i => i.id === itemId)?.attachments || []), ...valid].slice(0, 5),
    });
  };

  const removeItemAttachment = (itemId: string, index: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      attachments: item.attachments.filter((_, i) => i !== index),
      uploadedUrls: item.uploadedUrls.filter((_, i) => i !== index),
    });
  };

  // Upload all pending files and return final URL arrays
  const uploadAllFiles = async (): Promise<{
    itemUrls: Record<string, string[]>;
  }> => {
    // Upload per-item attachments (only for selected items)
    const itemUrls: Record<string, string[]> = {};
    for (const item of items.filter(i => i.selected)) {
      if (item.attachments.length > 0) {
        updateItem(item.id, { uploading: true });
        const urls: string[] = [];
        for (const file of item.attachments) {
          urls.push(await uploadFile(file));
        }
        itemUrls[item.id] = urls;
        updateItem(item.id, { uploading: false, uploadedUrls: urls });
      } else {
        itemUrls[item.id] = [];
      }
    }

    return { itemUrls };
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item.");
      return;
    }
    for (const item of selectedItems) {
      if (!item.reason.trim()) {
        toast.error(`Please provide a reason for "${item.title}".`);
        return;
      }
      if (item.qty < 1 || item.qty > item.maxQty) {
        toast.error(`Invalid quantity for "${item.title}".`);
        return;
      }
    }

    setLoading(true);
    try {
      const { itemUrls } = await uploadAllFiles();

      // Strip any leading # from displayId before using in URL
      const cleanDisplayId = order.displayId.replace(/^#/, "");

      // Always send items array — backend auto-detects REFUND vs PARTIAL_REFUND
      // (all items at full qty → REFUND, subset/reduced qty → PARTIAL_REFUND)
      const itemsPayload = selectedItems.map(item => ({
        orderItemId: item.id,
        quantity: item.qty,
        reason: item.reason.trim() || undefined,
        attachments: itemUrls[item.id] || [],
      }));

      // Use first item's reason as top-level fallback
      const fallbackReason = selectedItems[0]?.reason.trim() || "Refund requested";

      await api.post(`/api/orders/refund-request/${cleanDisplayId}`, {
        items: itemsPayload,
        reason: fallbackReason,
        attachments: [],
      });

      const isFullRefund = selectedItems.length === items.length && items.every(i => i.qty === i.maxQty);
      toast.success(isFullRefund ? "Full refund requested successfully." : "Partial refund request submitted successfully.");
      onSuccess(isFullRefund ? "REFUND" : "PARTIAL_REFUND");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit refund request.");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    selectedItems.length === 0 ||
    selectedItems.some(i => !i.reason.trim()) ||
    items.some(i => i.uploading);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Request Refund
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Order <strong>#{order.displayId}</strong>
        </p>

        {/* Item list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <Label>
              Select items to refund <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map(item => {
                const checked = item.selected;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border transition-colors ${
                      checked ? "bg-primary/5 border-primary" : "opacity-60"
                    }`}
                  >
                    {/* Row 1: checkbox + image + title + qty */}
                    <label className="flex items-center gap-3 p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 accent-primary shrink-0"
                      />
                      {item.image ? (
                        <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden border bg-muted">
                          <Image src={item.image} alt={item.title} fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-md border bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.price}{item.sellerName && ` · ${item.sellerName}`}
                        </p>
                      </div>
                      {/* Qty spinner */}
                      {checked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); if (item.qty > 1) updateItem(item.id, { qty: item.qty - 1 }); }}
                            className="w-6 h-6 rounded border text-sm flex items-center justify-center hover:bg-muted"
                          >−</button>
                          <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); if (item.qty < item.maxQty) updateItem(item.id, { qty: item.qty + 1 }); }}
                            className="w-6 h-6 rounded border text-sm flex items-center justify-center hover:bg-muted"
                          >+</button>
                          <span className="text-xs text-muted-foreground ml-1">/ {item.maxQty}</span>
                        </div>
                      )}
                    </label>

                    {/* Row 2: per-item reason + attachments */}
                    {checked && (
                      <div className="px-3 pb-3 space-y-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium">Reason</span>
                          <span className="text-destructive text-xs">*</span>
                        </div>
                        <Textarea
                          placeholder="Reason for returning this item..."
                          value={item.reason}
                          onChange={e => updateItem(item.id, { reason: e.target.value })}
                          rows={2}
                          className="text-xs"
                        />
                        {/* Per-item attachment */}
                        <div>
                          <div
                            className="border border-dashed rounded-md p-2 text-center cursor-pointer hover:border-primary/50 text-xs text-muted-foreground"
                            onClick={() => itemFileInputRefs.current[item.id]?.click()}
                          >
                            <ImagePlus className="h-4 w-4 mx-auto mb-0.5" /> Add photos for this item
                          </div>
                          <input
                            ref={el => { itemFileInputRefs.current[item.id] = el; }}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => handleItemFiles(item.id, e.target.files)}
                          />
                          {item.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {item.attachments.map((file, fi) => (
                                <div key={fi} className="relative group rounded-md overflow-hidden border bg-muted h-14 w-14 shrink-0">
                                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeItemAttachment(item.id, fi)}
                                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {item.uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="animate-spin h-3 w-3" /> Uploading…</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="space-y-1 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <p className="font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Note
          </p>
          <p>This will create a support ticket. Our team will review your request within 2-3 business days.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Back</Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
            Submit Request
          </Button>
        </div>

      </div>
    </div>
  );
};

const OrdersLoadingSkeleton = () => {
  return (
    <div className="p-6 mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tracking</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Invoice</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Invoice</th>
              <th className="px-4 py-3 text-left text-sm font-medium">View</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24 rounded-md" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24 rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CustomerOrdersPage = () => {
  const searchParams = useSearchParams();
  const highlightOrderId = searchParams.get("highlight");
  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const [dismissedHighlight, setDismissedHighlight] = useState<string | null>(null);
  const activeHighlight = highlightOrderId && highlightOrderId !== dismissedHighlight ? highlightOrderId : null;

  const ORDERS_PER_PAGE = 10;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [submittedRefundOrderIds, setSubmittedRefundOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
    fetchExistingRefunds();
  }, []);

  // Auto-scroll to highlighted order from notification click
  useEffect(() => {
    if (!activeHighlight || loading) return;
    const idx = orders.findIndex(o => o.id === activeHighlight);
    if (idx !== -1) {
      setExpandedOrderId(activeHighlight);
      setTimeout(() => {
        if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [activeHighlight, orders, loading]);

  const fetchExistingRefunds = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const res = await fetch(`${BASE_URL}/api/orders/refund-requests`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      const list: { orderId?: string }[] = Array.isArray(data) ? data : (data?.requests ?? data?.data ?? []);
      const ids = new Set(list.map(r => r.orderId).filter(Boolean) as string[]);
      if (ids.size > 0) setSubmittedRefundOrderIds(ids);
    } catch {
      // silently ignore — fall back to session tracking
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const parseShippingAddress = (order: Order): Record<string, string> => {
    const result: Record<string, string> = {};

    // Extract fields from the new API structure
    if (order.shippingAddressLine) {
      result["Address Line"] = order.shippingAddressLine;
    }
    if (order.shippingCity) {
      result[getCityLabel(order.shippingCountry)] = order.shippingCity;
    }
    if (order.shippingState) {
      result["State"] = order.shippingState;
    }
    if (order.shippingZipCode) {
      result["Zip Code"] = order.shippingZipCode;
    }
    if (order.shippingCountry) {
      result["Country"] = order.shippingCountry;
    }
    if (order.shippingPhone) {
      result["Phone"] = order.shippingPhone;
    }
    if (order.customerName) {
      result["Customer Name"] = order.customerName;
    }
    if (order.customerEmail) {
      result["Email"] = order.customerEmail;
    }

    // Also include the addressLine from shippingAddress object if available
    if (order.shippingAddress?.addressLine) {
      result["Full Address"] = order.shippingAddress.addressLine;
    }

    return result;
  };

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

  // Cancel is now handled by CancelOrderModal (mandatory reason required)

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoiceId(orderId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      const cleanId = orderId.replace(/^#/, "");
      const response = await fetch(`${BASE_URL}/api/orders/invoice/${cleanId}`, {
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

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedOrderId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <OrdersLoadingSkeleton />;

  return (
    <div className="p-6 mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">View your order history and track your shipments.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/customerdashboard/returnPolicy'}>
          <ClipboardList className="h-4 w-4 mr-2" /> My Refund Requests
        </Button>
      </div>
      {orders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No orders found.</Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Tracking</th>
                <th className="px-4 py-3 text-left text-sm font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr
                    ref={order.id === activeHighlight ? highlightRef : undefined}
                    className={`border-b hover:bg-muted/50 transition-all ${order.id === activeHighlight ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3" colSpan={order.id === activeHighlight ? undefined : undefined}>
                      {order.id === activeHighlight && (
                        <div className="mb-1 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5 text-xs text-primary font-medium">
                          <span>Navigated from notification</span>
                          <button
                            className="ml-2 hover:opacity-70 transition-opacity"
                            onClick={() => setDismissedHighlight(order.id)}
                            aria-label="Dismiss highlight"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      #{order.displayId}
                    </td>
                    <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={order.status === "DELIVERED" ? "default" : order.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold">${order.totalAmount}</span>
                        {order.sellerCount > 1 && (
                          <span className="text-xs text-muted-foreground">
                            {order.sellerCount} sellers
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.subOrders && order.subOrders.length > 1 ? (
                        // Multi-seller order - show tracking summary
                        <div className="flex flex-col">
                          {(() => {
                            const trackedOrders = order.subOrders.filter(sub => sub.trackingNumber);
                            if (trackedOrders.length === 0) {
                              return <span className="text-muted-foreground">No tracking</span>;
                            } else if (trackedOrders.length === order.subOrders.length) {
                              return <span className="text-green-600 text-sm flex items-center gap-1">
                                <Truck className="h-3 w-3" /> All shipped
                              </span>;
                            } else {
                              return <span className="text-amber-600 text-sm flex items-center gap-1">
                                <Truck className="h-3 w-3" /> {trackedOrders.length}/{order.subOrders.length} shipped
                              </span>;
                            }
                          })()}
                        </div>
                      ) : order.trackingNumber ? (
                        // Single seller order with tracking
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> {order.trackingNumber}</span>
                          <span className="text-xs text-muted-foreground">Est: {order.estimatedDelivery ? fmtDate(order.estimatedDelivery) : 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No tracking</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingInvoiceId === order.displayId}
                        onClick={() => handleDownloadInvoice(order.displayId)}
                        className="gap-1"
                      >
                        {downloadingInvoiceId === order.displayId ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Invoice
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                        {expandedOrderId === order.id ? <><Eye className="h-4 w-4" /> Hide <ChevronUp className="h-4 w-4" /></> : <><Eye className="h-4 w-4" /> View <ChevronDown className="h-4 w-4" /></>}
                      </Button>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={7} className="bg-muted/40 p-0">
                        <div className="p-6 space-y-6">
                          {/* Progress Tracker */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Order Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <OrderProgressTracker order={order} />
                            </CardContent>
                          </Card>

                          {/* Order Details */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Order Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <span className="text-sm text-muted-foreground">Status</span>
                                  <p className="font-medium">{order.status.toUpperCase()}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Created At</span>
                                  <p className="font-medium">{new Date(order.createdAt).toLocaleString('en-GB')}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Total Amount</span>
                                  <p className="font-medium">${order.totalAmount}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Payment Method</span>
                                  <p className="font-medium">{order.paymentMethod}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Payment Status</span>
                                  <p className="font-medium">{order.paymentStatus}</p>
                                </div>
                                {order.trackingNumber && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Tracking Number</span>
                                    <p className="font-medium">{order.trackingNumber}</p>
                                  </div>
                                )}
                                {order.estimatedDelivery && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Estimated Delivery</span>
                                    <p className="font-medium">{fmtDate(order.estimatedDelivery)}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-sm text-muted-foreground">Seller Count</span>
                                  <p className="font-medium">{order.sellerCount}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Item Count</span>
                                  <p className="font-medium">{order.itemCount}</p>
                                </div>
                              </div>

                              {/* Shipping Address Table */}
                              {(() => {
                                const addressFields = parseShippingAddress(order);
                                const entries = Object.entries(addressFields);
                                if (entries.length === 0) return (
                                  <div className="pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Shipping Address</span>
                                    <p className="font-medium">N/A</p>
                                  </div>
                                );
                                return (
                                  <div className="pt-2 border-t">
                                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                      Shipping Address
                                    </p>
                                    <div className="rounded-lg border overflow-hidden">
                                      <table className="w-full text-sm">
                                        <tbody>
                                          {entries.map(([label, value], idx) => (
                                            <tr key={label} className={idx % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                                              <td className="px-4 py-2.5 text-muted-foreground font-medium w-1/3 border-r">{label}</td>
                                              <td className="px-4 py-2.5 font-medium">{value}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 mt-4">
                                {/* Cancel Order Button (opens modal with mandatory reason) */}
                                {order.status.toLowerCase() === "confirmed" && (
                                  <Button
                                    variant="destructive"
                                    onClick={() => setCancelModalOrder(order)}
                                  >
                                    Cancel Order
                                  </Button>
                                )}

                                {/* Request Refund Button (DELIVERED orders only, once per order) */}
                                {order.status.toLowerCase() === "delivered" &&
                                  !submittedRefundOrderIds.has(order.id) && (
                                  <Button
                                    variant="outline"
                                    onClick={() => setRefundModalOrder(order)}
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" /> Request Refund
                                  </Button>
                                )}

                                {/* Download Invoice Button */}
                                <Button
                                  variant="default"
                                  disabled={downloadingInvoiceId === order.displayId}
                                  onClick={() => handleDownloadInvoice(order.displayId)}
                                >
                                  {downloadingInvoiceId === order.displayId ? (
                                    <>
                                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Invoice
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Order Items */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {order.subOrders && order.subOrders.length > 0 ? (
                                // Multi-seller order - group by sellers
                                <div className="space-y-6">
                                  {order.subOrders.map((subOrder, subIndex) => (
                                    <div key={subOrder.id || subIndex} className="space-y-3">
                                      <div className="flex items-center justify-between pb-2 border-b">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Package className="h-4 w-4 text-primary" />
                                          </div>
                                          <div>
                                            <h3 className="font-semibold text-sm">{subOrder.sellerName}</h3>
                                            <p className="text-xs text-muted-foreground">
                                              ${subOrder.subtotal} • 
                                              {subOrder.itemCount} item{subOrder.itemCount !== 1 ? 's' : ''}
                                            </p>
                                          </div>
                                        </div>
                                        <Badge variant={subOrder.status === "DELIVERED" ? "default" : subOrder.status === "CANCELLED" ? "destructive" : "secondary"} className="text-xs">
                                          {subOrder.status.toUpperCase()}
                                        </Badge>
                                      </div>
                                      
                                      <div className="space-y-3 pl-6">
                                        {subOrder.items.map((item, i) => {
                                          const img = item.productImages?.[0] || item.productFeaturedImage || item.product?.featuredImage || null;
                                          const title = item.productTitle || item.product?.title || "Product";
                                          return (
                                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                                            {img ? (
                                              <Image 
                                                src={img} 
                                                alt={title} 
                                                width={64} 
                                                height={64} 
                                                className="rounded object-cover shrink-0" 
                                                unoptimized 
                                              />
                                            ) : (
                                              <div className="w-16 h-16 shrink-0 rounded border bg-muted flex items-center justify-center">
                                                <Package className="h-6 w-6 text-muted-foreground" />
                                              </div>
                                            )}
                                            <div className="flex-1">
                                              <p className="font-medium">{title}</p>
                                              <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-medium">${item.price}</p>
                                            </div>
                                          </div>
                                          );
                                        })}
                                      </div>

                                      {subOrder.trackingNumber && (
                                        <div className="ml-6 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                            <Truck className="h-4 w-4" />
                                            <span className="font-medium">Tracking: {subOrder.trackingNumber}</span>
                                          </div>
                                          {subOrder.estimatedDelivery && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                              Estimated delivery: {new Date(subOrder.estimatedDelivery).toLocaleDateString('en-GB')}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // Single seller order - display items directly
                                <div className="space-y-3">
                                  {order.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                                      {item.product.featuredImage ? (
                                        <Image 
                                          src={item.product.featuredImage} 
                                          alt={item.product.title || "Product image"} 
                                          width={64} 
                                          height={64} 
                                          className="rounded object-cover shrink-0" 
                                          unoptimized 
                                        />
                                      ) : (
                                        <div className="w-16 h-16 shrink-0 rounded border bg-muted flex items-center justify-center">
                                          <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <p className="font-medium">{item.product.title}</p>
                                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                                        <p className="text-xs text-blue-600 mt-1">
                                          Sold by: {item.sellerName}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium">${item.price}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Order Summary */}
                          {(() => {
                            const addr = order.shippingAddress ?? {};
                            const summary: any = addr.orderSummary ?? {};
                            const sm = summary.shippingMethod ?? {};
                            const isMulti = order.type === "MULTI_SELLER" || (order.subOrders && order.subOrders.length > 1);
                            const subs = order.subOrders ?? [];
                            const sellers = order.sellerCount ?? subs.length;
                            const subsWithFinancial = subs.filter(s => s.financialSummary);

                            let subtotal = parseFloat(summary.subtotal || '0');
                            let shipping = parseFloat(summary.shippingCost || '0');
                            let gst = parseFloat(summary.gstAmount || '0');
                            let platformCommission = 0;
                            let gstPct: string | number = summary.gstPercentage;

                            if (isMulti && subsWithFinancial.length > 0) {
                              subtotal = subsWithFinancial.reduce((acc, s) => acc + (s.financialSummary!.productsSubtotal ?? 0), 0);
                              shipping = subsWithFinancial.reduce((acc, s) => acc + (s.financialSummary!.shippingCost ?? 0), 0);
                              gst = subsWithFinancial.reduce((acc, s) => acc + (s.financialSummary!.gstAmount ?? 0), 0);
                              platformCommission = subsWithFinancial.reduce((acc, s) => acc + (s.financialSummary!.platformCommission ?? 0), 0);
                              gstPct = subsWithFinancial[0]?.financialSummary?.gstPercentage ?? summary.gstPercentage;
                            } else if (isMulti && sellers > 1) {
                              shipping = parseFloat(summary.shippingCost || '0') * sellers;
                            }

                            const hasData = summary.subtotal != null || summary.shippingCost != null || subsWithFinancial.length > 0;
                            if (!hasData) return null;

                            return (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Order Summary
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 text-sm">
                                    {subtotal > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {shipping > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Shipping{sm.name ? ` · ${sm.name}` : ""}
                                          {isMulti && sellers > 1 && (
                                            <span className="text-xs block text-muted-foreground/70">{sellers} sellers</span>
                                          )}
                                        </span>
                                        <span>${shipping.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {summary.discountAmount != null && Number(summary.discountAmount) > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Discount{summary.couponCode ? ` (${summary.couponCode})` : ""}</span>
                                        <span>− ${summary.discountAmount}</span>
                                      </div>
                                    )}
                                    {gst > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST{gstPct ? ` (${gstPct}%)` : ""}</span>
                                        <span>${gst.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {platformCommission > 0 && (
                                      <div className="flex justify-between text-orange-600">
                                        <span>Platform Commission</span>
                                        <span>−${platformCommission.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="border-t pt-2 mt-1 flex justify-between font-bold text-base">
                                      <span>Grand Total</span>
                                      <span>${order.totalAmount}</span>
                                    </div>
                                  </div>

                                  {/* Per-seller breakdown */}
                                  {isMulti && subsWithFinancial.length > 0 && (
                                    <div className="border-t mt-4 pt-3 space-y-3">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per-Seller Breakdown</p>
                                      {subsWithFinancial.map((sub, idx) => (
                                        <div key={sub.id || idx} className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                                          <p className="font-medium text-sm">{sub.sellerName || `Seller ${idx + 1}`}</p>
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span className="text-right">${sub.financialSummary!.productsSubtotal.toFixed(2)}</span>
                                            <span className="text-muted-foreground">Shipping</span>
                                            <span className="text-right">${sub.financialSummary!.shippingCost.toFixed(2)}</span>
                                            <span className="text-muted-foreground">GST ({sub.financialSummary!.gstPercentage}%)</span>
                                            <span className="text-right">${sub.financialSummary!.gstAmount.toFixed(2)}</span>
                                            <span className="text-muted-foreground">Platform Commission ({sub.financialSummary!.platformCommissionRate}%)</span>
                                            <span className="text-right text-orange-600">−${sub.financialSummary!.platformCommission.toFixed(2)}</span>
                                            <span className="text-muted-foreground font-medium">Customer Total</span>
                                            <span className="text-right font-medium">${sub.financialSummary!.customerTotal.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, orders.length)} of {orders.length} orders
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page =>
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              )
              .reduce<(number | "...")[]>((acc, page, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === "number" && (page as number) - (arr[idx - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={currentPage === item ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(item as number)}
                    className="w-9"
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {cancelModalOrder && (
        <CancelOrderModal
          order={cancelModalOrder}
          onClose={() => setCancelModalOrder(null)}
          onSuccess={fetchOrders}
        />
      )}
      {refundModalOrder && (
        <RefundRequestModal
          order={refundModalOrder}
          onClose={() => setRefundModalOrder(null)}
          onSuccess={(reqType) => {
            setSubmittedRefundOrderIds(prev => new Set(prev).add(refundModalOrder.id));
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default CustomerOrdersPage;
// 