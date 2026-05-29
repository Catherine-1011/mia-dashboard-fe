// "use client";

// import { useState, useEffect, useCallback, useRef, useMemo } from "react";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";

// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Package, Truck, Loader2, X, Eye, ChevronDown, ChevronLeft, ChevronRight, CreditCard, MapPin, Calendar, ClipboardList, DollarSign, Hash, Download, Check, AlertTriangle, LayoutList, Store, Search } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { Skeleton } from "@/components/ui/skeleton";
// import Image from "next/image";
// import { toast } from "sonner";
// import { api } from "@/lib/api";
// import { useRouter } from "next/navigation";
// import {
//   getAllowedTransitions,
//   getRequiredFields,
//   validateStatusUpdate,
//   getStatusLabel,
//   getStatusBadgeVariant,
//   isTerminalStatus,
// } from "@/lib/orderStatusRules";

// type Seller = {
//   id: string;
//   name: string;
//   email: string;
// };

// type Product = {
//   id: string;
//   title: string;
//   images?: string[];
//   featuredImage?: string | null;
//   price: string;
//   sellerId: string;
// };

// type OrderItem = {
//   id: string;
//   orderId: string;
//   subOrderId?: string | null;
//   productId: string;
//   quantity: number;
//   price: string;
//   createdAt: string;
//   product: Product;
// };

// type User = {
//   id: string;
//   name: string;
//   email: string;
//   phone?: string;
//   role: string;
//   createdAt: string;
// };

// type Order = {
//   id: string;
//   displayId?: string | null;
//   subDisplayId?: string | null;
//   displaySubId?: string | null;
//   parentDisplayId?: string | null;
//   subOrderId?: string | null;
//   parentOrderId?: string | null;
//   sellerId: string;
//   status: string;
//   trackingNumber?: string | null;
//   estimatedDelivery?: string | null;
//   statusReason?: string | null;
//   subtotal: string;
//   createdAt: string;
//   updatedAt: string;
//   type: 'DIRECT' | 'SUB_ORDER';
//   totalAmount: string;
//   paymentMethod: string;
//   paymentStatus: string;
//   shippingAddress?: any;
//   shippingAddressLine: string;
//   shippingCity: string;
//   shippingState: string;
//   shippingZipCode: string;
//   shippingCountry: string;
//   shippingPhone: string;
//   customerName: string;
//   customerEmail: string;
//   customerPhone: string;
//   user: User;
//   items: OrderItem[];
//   isSubOrder: boolean;
//   sellerSpecific: boolean;
// };

// type OrdersResponse = {
//   success: boolean;
//   orders: Order[];
//   count: number;
//   sellerId?: string;
//   breakdown: {
//     directOrders: number;
//     subOrders: number;
//     total: number;
//   };
//   note?: string;
// };

// // ─── Detailed (All Orders) Types ─────────────────────────────────────────────

// type DetailedSubOrder = {
//   subOrderId: string;
//   subDisplayId: string;
//   parentOrderId: string;
//   parentDisplayId: string;
//   sellerId: string;
//   sellerName: string;
//   sellerEmail: string;
//   status: string;
//   subtotal: string;
//   trackingNumber: string | null;
//   estimatedDelivery: string | null;
//   statusReason: string | null;
//   seller: {
//     id: string;
//     name: string;
//     email: string;
//     storeName: string;
//     businessName: string;
//     storeLogo: string | null;
//   };
//   items: {
//     id: string;
//     quantity: number;
//     price: string;
//     product: {
//       id: string;
//       title: string;
//       featuredImage: string | null;
//     };
//   }[];
//   itemCount: number;
//   createdAt: string;
//   updatedAt: string;
// };

// type DetailedOrder = {
//   id: string;
//   displayId: string;
//   orderType: string;
//   overallStatus: string;
//   legacyStatus: string;
//   paymentStatus: string;
//   paymentMethod: string;
//   totalAmount: string;
//   originalTotal: string | null;
//   discountAmount: string | null;
//   couponCode: string | null;
//   stripePaymentIntentId: string | null;
//   paypalOrderId: string | null;
//   customer: {
//     id: string;
//     name: string;
//     email: string;
//     phone: string;
//   };
//   shippingAddress: {
//     line: string;
//     city: string;
//     state: string;
//     zipCode: string;
//     country: string;
//     phone: string;
//   };
//   createdAt: string;
//   updatedAt: string;
//   sellerCount: number;
//   subOrders: DetailedSubOrder[];
//   // Direct order top-level fields
//   sellerId?: string | null;
//   sellerName?: string | null;
//   seller?: {
//     id: string;
//     name: string;
//     email?: string;
//     storeName?: string;
//     businessName?: string;
//     storeLogo?: string | null;
//   } | null;
//   items?: {
//     id: string;
//     quantity: number;
//     price: string;
//     product: {
//       id: string;
//       title: string;
//       featuredImage: string | null;
//     };
//   }[] | null;
//   subtotal?: string | null;
//   trackingNumber?: string | null;
//   status?: string | null;
// };

// type DetailedOrdersResponse = {
//   success: boolean;
//   orders: DetailedOrder[];
//   pagination?: {
//     total: number;
//     page: number;
//     limit: number;
//     pages: number;
//   };
// };

// // ─── Status Update Modal ──────────────────────────────────────────────────────

// interface StatusModalProps {
//   order: Order | null;
//   onClose: () => void;
//   onSuccess: () => void;
// }

// function StatusUpdateModal({ order, onClose, onSuccess }: StatusModalProps) {
//   const [selectedStatus, setSelectedStatus] = useState("");
//   const [trackingNumber, setTrackingNumber] = useState("");
//   const [estimatedDelivery, setEstimatedDelivery] = useState("");
//   const [reason, setReason] = useState("");
//   const [notes, setNotes] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [validationErrors, setValidationErrors] = useState<string[]>([]);
//   const [apiError, setApiError] = useState("");

//   if (!order) return null;

//   const allowedTransitions = getAllowedTransitions(order.status);
//   const requiredFields = getRequiredFields(selectedStatus);
//   const needsTracking = requiredFields.includes("trackingNumber");
//   const needsReason = requiredFields.includes("reason");
//   const terminal = isTerminalStatus(order.status);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setValidationErrors([]);
//     setApiError("");
//     const payload: Record<string, string> = {
//       status: selectedStatus,
//       ...(trackingNumber && { trackingNumber }),
//       ...(estimatedDelivery && { estimatedDelivery }),
//       ...(reason && { reason }),
//       ...(notes && { notes }),
//     };
//     const { valid, errors } = validateStatusUpdate(selectedStatus, payload);
//     if (!valid) { setValidationErrors(errors); return; }
//     setLoading(true);
//     try {
//       await api.put(`/api/seller/orders/update-status/${order.id}`, payload);
//       // NOTE: tracking data is already saved by update-status when status is SHIPPED.
//       toast.success(`Order updated to ${getStatusLabel(selectedStatus)}`);
//       onSuccess();
//       onClose();
//     } catch (err: any) {
//       const msg = err?.message || "Failed to update status";
//       setApiError(msg);
//       toast.error(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <Card className="w-full max-w-md shadow-2xl">
//         <CardHeader>
//           <div className="flex justify-between items-center">
//             <div>
//               <CardTitle className="text-lg">Update Order Status</CardTitle>
//               <CardDescription className="mt-0.5">
//                 Order #{order.subDisplayId ?? order.displaySubId ?? (typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id)}
//               </CardDescription>
//             </div>
//             <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
//             <span className="text-muted-foreground">Current Status</span>
//             <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusLabel(order.status)}</Badge>
//           </div>
//           {terminal ? (
//             <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
//               <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
//               <p className="text-sm text-destructive">This order is in a terminal status and cannot be updated further.</p>
//             </div>
//           ) : allowedTransitions.length === 0 ? (
//             <p className="text-sm text-muted-foreground text-center py-4">No status transitions available.</p>
//           ) : (
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="space-y-1.5">
//                 <Label>New Status <span className="text-destructive">*</span></Label>
//                 <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setValidationErrors([]); }}>
//                   <SelectTrigger><SelectValue placeholder="— Select new status —" /></SelectTrigger>
//                   <SelectContent>
//                     {allowedTransitions.map((s) => (
//                       <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//               {needsTracking && (
//                 <>
//                   <div className="space-y-1.5">
//                     <Label>Tracking Number <span className="text-destructive">*</span></Label>
//                     <Input placeholder="e.g. TRK12345" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
//                   </div>
//                   <div className="space-y-1.5">
//                     <Label>Estimated Delivery Date <span className="text-destructive">*</span></Label>
//                     <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} min={new Date().toISOString().split("T")[0]} />
//                   </div>
//                 </>
//               )}
//               {needsReason && (
//                 <div className="space-y-1.5">
//                   <Label>Reason <span className="text-destructive">*</span></Label>
//                   <Textarea placeholder="Provide a reason for this status change..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
//                 </div>
//               )}
//               {selectedStatus && (
//                 <div className="space-y-1.5">
//                   <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
//                   <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
//                 </div>
//               )}
//               {validationErrors.length > 0 && (
//                 <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
//                   {validationErrors.map((err, i) => (
//                     <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span className="mt-0.5">•</span><span>{err}</span></p>
//                   ))}
//                 </div>
//               )}
//               {apiError && (
//                 <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
//                   <p className="text-sm text-destructive">{apiError}</p>
//                 </div>
//               )}
//               <div className="flex gap-2 pt-2">
//                 <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
//                 <Button type="submit" className="flex-1" disabled={!selectedStatus || loading}>
//                   {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating...</> : "Update Status"}
//                 </Button>
//               </div>
//             </form>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// // ─── Bulk Status Update Modal ───────────────────────────────────────────────

// interface BulkStatusModalProps {
//   orderIds: string[];
//   orders: Order[];
//   onClose: () => void;
//   onSuccess: () => void;
// }

// function BulkStatusUpdateModal({ orderIds, orders, onClose, onSuccess }: BulkStatusModalProps) {
//   const selectedOrders = useMemo(
//     () => orders.filter((o) => orderIds.includes(o.id) && !isTerminalStatus(o.status)),
//     [orders, orderIds]
//   );
//   const skippedCount = orderIds.length - selectedOrders.length;

//   const allowedStatuses = useMemo(() => {
//     if (selectedOrders.length === 0) return [];
//     const allSets = selectedOrders.map((o) => getAllowedTransitions(o.status));
//     return allSets[0].filter((s) => allSets.every((set) => set.includes(s)));
//   }, [selectedOrders]);

//   const [selectedStatus, setSelectedStatus] = useState("");
//   const [defaultDelivery, setDefaultDelivery] = useState("");
//   // per-order tracking: { [orderId]: { trackingNumber, estimatedDelivery } }
//   const [perOrderTracking, setPerOrderTracking] = useState<Record<string, { trackingNumber: string; estimatedDelivery: string }>>({});
//   const [reason, setReason] = useState("");
//   const [notes, setNotes] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [validationErrors, setValidationErrors] = useState<string[]>([]);
//   const [apiError, setApiError] = useState("");

//   const isShipped = selectedStatus.toUpperCase() === "SHIPPED";
//   const needsReason = getRequiredFields(selectedStatus).includes("reason");

//   // Init per-order tracking rows when SHIPPED is selected
//   const handleStatusChange = (v: string) => {
//     setSelectedStatus(v);
//     setValidationErrors([]);
//     if (v.toUpperCase() === "SHIPPED") {
//       const init: Record<string, { trackingNumber: string; estimatedDelivery: string }> = {};
//       selectedOrders.forEach((o) => { init[o.id] = { trackingNumber: "", estimatedDelivery: "" }; });
//       setPerOrderTracking(init);
//     }
//   };

//   const updatePerOrder = (orderId: string, field: "trackingNumber" | "estimatedDelivery", value: string) => {
//     setPerOrderTracking((prev) => ({ ...prev, [orderId]: { ...prev[orderId], [field]: value } }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setValidationErrors([]);
//     setApiError("");

//     const errors: string[] = [];

//     if (isShipped) {
//       if (!defaultDelivery) errors.push("Default estimated delivery date is required.");
//       selectedOrders.forEach((o) => {
//         const label = o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`;
//         if (!perOrderTracking[o.id]?.trackingNumber?.trim()) {
//           errors.push(`Tracking number is required for order ${label}.`);
//         }
//       });
//       if (errors.length > 0) { setValidationErrors(errors); return; }
//     } else if (needsReason && !reason.trim()) {
//       errors.push("Reason is required for this status.");
//       setValidationErrors(errors);
//       return;
//     }

//     setLoading(true);
//     try {
//       const orderIdsPayload = isShipped
//         ? selectedOrders.map((o) => ({
//             id: o.id,
//             trackingNumber: perOrderTracking[o.id]?.trackingNumber,
//             ...(perOrderTracking[o.id]?.estimatedDelivery
//               ? { estimatedDelivery: perOrderTracking[o.id].estimatedDelivery }
//               : {}),
//           }))
//         : selectedOrders.map((o) => o.id);

//       await api.put("/api/seller/orders/bulk-update-status", {
//         status: selectedStatus,
//         ...(isShipped && { estimatedDelivery: defaultDelivery }),
//         ...(reason && { reason }),
//         ...(notes && { notes }),
//         orderIds: orderIdsPayload,
//       });
//       toast.success(
//         `${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""} updated to ${getStatusLabel(selectedStatus)}`
//       );
//       onSuccess();
//       onClose();
//     } catch (err: any) {
//       const msg = err?.message || "Failed to bulk update status";
//       setApiError(msg);
//       toast.error(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const today = new Date().toISOString().split("T")[0];

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <Card className={cn("w-full shadow-2xl", isShipped && selectedOrders.length > 1 ? "max-w-2xl" : "max-w-md")}>
//         <CardHeader>
//           <div className="flex justify-between items-center">
//             <div>
//               <CardTitle className="text-lg">Bulk Update Status</CardTitle>
//               <CardDescription className="mt-0.5">
//                 {selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""} selected
//                 {skippedCount > 0 && ` · ${skippedCount} skipped (terminal)`}
//               </CardDescription>
//             </div>
//             <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {selectedOrders.length === 0 ? (
//             <>
//               <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
//                 <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
//                 <p className="text-sm text-destructive">All selected orders are in a terminal status and cannot be updated further.</p>
//               </div>
//               <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
//             </>
//           ) : allowedStatuses.length === 0 ? (
//             <>
//               <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
//                 <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
//                 <p className="text-sm text-amber-800">
//                   The selected orders are in different stages with no common next status. Select orders in the same status to bulk update.
//                 </p>
//               </div>
//               <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
//             </>
//           ) : (
//             <form onSubmit={handleSubmit} className="space-y-4">
//               {/* Status selector */}
//               <div className="space-y-1.5">
//                 <Label>New Status <span className="text-destructive">*</span></Label>
//                 <Select value={selectedStatus} onValueChange={handleStatusChange}>
//                   <SelectTrigger><SelectValue placeholder="— Select new status —" /></SelectTrigger>
//                   <SelectContent>
//                     {allowedStatuses.map((s) => (
//                       <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <p className="text-xs text-muted-foreground">Status moves forward only — backward transitions are not allowed.</p>
//               </div>

//               {/* SHIPPED: per-order tracking table */}
//               {isShipped && (
//                 <div className="space-y-3">
//                   {/* Default delivery date (applies to any order without its own) */}
//                   <div className="space-y-1.5">
//                     <Label>
//                       Default Estimated Delivery <span className="text-destructive">*</span>
//                       <span className="text-muted-foreground font-normal text-xs ml-1">(used when no per-order date is set)</span>
//                     </Label>
//                     <Input
//                       type="date"
//                       value={defaultDelivery}
//                       onChange={(e) => setDefaultDelivery(e.target.value)}
//                       min={today}
//                     />
//                   </div>

//                   {/* Per-order tracking rows */}
//                   <div className="space-y-1.5">
//                     <Label>Tracking Details per Order</Label>
//                     <div className="rounded-lg border overflow-hidden">
//                       {/* Header */}
//                       <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-muted text-xs font-medium text-muted-foreground px-3 py-2">
//                         <span>Order</span>
//                         <span>Tracking Number <span className="text-destructive">*</span></span>
//                         <span>Est. Delivery <span className="text-muted-foreground font-normal">(optional)</span></span>
//                       </div>
//                       {/* Rows */}
//                       <div className="divide-y max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground)/0.3) transparent" }}>
//                         {selectedOrders.map((o) => {
//                           const label = o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`;
//                           const row = perOrderTracking[o.id] ?? { trackingNumber: "", estimatedDelivery: "" };
//                           return (
//                             <div key={o.id} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center px-3 py-2 bg-background hover:bg-muted/30 transition-colors">
//                               <span className="text-xs font-medium truncate">{label}</span>
//                               <Input
//                                 className="h-7 text-xs font-mono"
//                                 placeholder="TRK-001"
//                                 value={row.trackingNumber}
//                                 onChange={(e) => updatePerOrder(o.id, "trackingNumber", e.target.value)}
//                               />
//                               <Input
//                                 type="date"
//                                 className="h-7 text-xs"
//                                 value={row.estimatedDelivery}
//                                 onChange={(e) => updatePerOrder(o.id, "estimatedDelivery", e.target.value)}
//                                 min={today}
//                                 placeholder={defaultDelivery || "Use default"}
//                               />
//                             </div>
//                           );
//                         })}
//                       </div>
//                     </div>
//                     <p className="text-xs text-muted-foreground">Leave Est. Delivery blank to use the default date above.</p>
//                   </div>
//                 </div>
//               )}

//               {/* Reason (CANCELLED / REFUND / PARTIAL_REFUND) */}
//               {needsReason && (
//                 <div className="space-y-1.5">
//                   <Label>Reason <span className="text-destructive">*</span></Label>
//                   <Textarea placeholder="Provide a reason for this status change..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
//                 </div>
//               )}

//               {/* Notes — hidden for SHIPPED */}
//               {selectedStatus && !isShipped && (
//                 <div className="space-y-1.5">
//                   <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
//                   <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
//                 </div>
//               )}

//               {validationErrors.length > 0 && (
//                 <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
//                   {validationErrors.map((err, i) => (
//                     <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span className="mt-0.5">•</span><span>{err}</span></p>
//                   ))}
//                 </div>
//               )}
//               {apiError && (
//                 <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
//                   <p className="text-sm text-destructive">{apiError}</p>
//                 </div>
//               )}
//               <div className="flex gap-2 pt-2">
//                 <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
//                 <Button type="submit" className="flex-1" disabled={!selectedStatus || loading}>
//                   {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating...</> : `Update ${selectedOrders.length} Order${selectedOrders.length !== 1 ? "s" : ""}`}
//                 </Button>
//               </div>
//             </form>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function AdminOrdersPage() {
//   const router = useRouter();
//   const [activeTab, setActiveTab] = useState<"bySeller" | "all">("all");
//   const [sellers, setSellers] = useState<Seller[]>([]);
//   const [selectedSeller, setSelectedSeller] = useState<string>("");
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [loadingSellers, setLoadingSellers] = useState(true);
//   const [breakdown, setBreakdown] = useState<{directOrders: number; subOrders: number; total: number} | null>(null);
//   const [allOrders, setAllOrders] = useState<DetailedOrder[]>([]);
//   const [loadingAll, setLoadingAll] = useState(false);
//   const [allOrdersPage, setAllOrdersPage] = useState(1);
//   const [allOrdersPerPage, setAllOrdersPerPage] = useState(10);
//   const [allOrdersTotal, setAllOrdersTotal] = useState(0);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [activeStatusOrder, setActiveStatusOrder] = useState<Order | null>(null);
//   const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
//   const [trackingNumber, setTrackingNumber] = useState<string>("");
//   const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");

//   const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
//   const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
//   const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
//   const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
//   const sellerDropdownRef = useRef<HTMLDivElement>(null);

//   // Close dropdown on outside click
//   useEffect(() => {
//     function handleClickOutside(e: MouseEvent) {
//       if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(e.target as Node)) {
//         setIsSellerDropdownOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     fetchSellers();
//   }, []);

//   useEffect(() => {
//     if (activeTab === "all") {
//       fetchAllOrders();
//     }
//   }, [activeTab]);

//   useEffect(() => {
//     if (selectedSeller) {
//       fetchOrders(selectedSeller);
//     } else {
//       setOrders([]);
//     }
//     setCurrentPage(1);
//     setSelectedOrderIds(new Set());
//     setIsBulkSelectMode(false);
//   }, [selectedSeller]);

//   const fetchAllOrders = async () => {
//     setLoadingAll(true);
//     try {
//       const res: DetailedOrdersResponse = await api.get("/api/admin/orders/detailed");
//       if (res.success) {
//         setAllOrders(res.orders || []);
//         setAllOrdersTotal(res.pagination?.total ?? (res.orders?.length ?? 0));
//       } else {
//         setAllOrders([]);
//         setAllOrdersTotal(0);
//         toast.error("Failed to load all orders");
//       }
//     } catch {
//       toast.error("Failed to load all orders");
//       setAllOrders([]);
//       setAllOrdersTotal(0);
//     } finally {
//       setLoadingAll(false);
//     }
//   };

//   const fetchSellers = async () => {
//     setLoadingSellers(true);
//     try {
//       const res = await api.get("/api/users/all");
//       const sellersOnly = Array.isArray(res)
//         ? res.filter((u: { role: string }) => u.role === "SELLER")
//         : (res.users || []).filter((u: { role: string }) => u.role === "SELLER");
//       setSellers(sellersOnly);
//       if (sellersOnly.length > 0) setSelectedSeller(sellersOnly[0].id);
//     } catch {
//       toast.error("Failed to load sellers");
//     } finally {
//       setLoadingSellers(false);
//     }
//   };

//   const fetchOrders = async (sellerId: string) => {
//     setLoading(true);
//     try {
//       const res: OrdersResponse = await api.get(`/api/admin/orders/by-seller/${sellerId}`);
//       if (res.success) {
//         setOrders(res.orders || []);
//         setBreakdown(res.breakdown);
//       } else {
//         setOrders([]);
//         setBreakdown(null);
//         toast.error("Failed to load orders");
//       }
//     } catch {
//       toast.error("Failed to load orders");
//       setOrders([]);
//       setBreakdown(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Add tracking update logic for admin
//   const submitTracking = async () => {
//     if (!activeTrackingOrder) return;
    
//     // Basic validation
//     if (!trackingNumber.trim()) {
//       toast.error("Please enter a tracking number");
//       return;
//     }
//     if (!estimatedDelivery) {
//       toast.error("Please select an estimated delivery date");
//       return;
//     }
    
//     // Date validation
//     const deliveryDate = new Date(estimatedDelivery);
//     const today = new Date();
//     if (deliveryDate < today) {
//       toast.error("Delivery date cannot be in the past");
//       return;
//     }

//     try {
//       const response = await api.put(`/api/admin/orders/tracking/${activeTrackingOrder.id}`, {
//         trackingNumber,
//         estimatedDelivery
//       });
      
//       if (response?.success) {
//         toast.success(`Tracking updated successfully! Tracking: ${trackingNumber}`);
//         setActiveTrackingOrder(null);
//         setTrackingNumber("");
//         setEstimatedDelivery("");
//         fetchOrders(selectedSeller);
//       } else {
//         throw new Error(response?.message || "Failed to update tracking information");
//       }
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : "Failed to update tracking";
//       toast.error(errorMessage);
//     }
//   };

//   // Optimized input handlers
//   const handleTrackingNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     setTrackingNumber(e.target.value);
//   }, []);

//   const handleEstimatedDeliveryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     setEstimatedDelivery(e.target.value);
//   }, []);

//   const handleCloseTrackingModal = useCallback(() => {
//     setActiveTrackingOrder(null);
//     setTrackingNumber("");
//     setEstimatedDelivery("");
//   }, []);

//   // Download invoice functionality
//   const handleDownloadInvoice = async (orderId: string, displayId?: string | null, subDisplayId?: string | null) => {
//     setDownloadingInvoiceId(orderId);
//     try {
//       const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
//       // Sub-orders have their own invoice endpoint; direct orders use the parent endpoint
//       const isSubOrder = !!subDisplayId;
//       const cleanId = (isSubOrder ? subDisplayId! : (displayId ?? orderId)).replace(/^#/, "");
//       const BASE = process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";
//       const endpoint = isSubOrder
//         ? `${BASE}/api/orders/invoice/sub/${cleanId}`
//         : `${BASE}/api/orders/invoice/${cleanId}`;
//       const response = await fetch(endpoint, {
//         method: "GET",
//         headers: {
//           ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         },
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to download invoice");
//       }

//       // Get the blob from response
//       const blob = await response.blob();
      
//       // Create a temporary URL for the blob
//       const url = window.URL.createObjectURL(blob);
      
//       // Create a temporary link element and trigger download
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `invoice-${cleanId}.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//       // Clean up the URL
//       window.URL.revokeObjectURL(url);
      
//       toast.success("Invoice downloaded successfully.");
//     } catch (err: any) {
//       console.error('Download invoice error:', err);
//       toast.error(err.message || "Failed to download invoice.");
//     } finally {
//       setDownloadingInvoiceId(null);
//     }
//   };

//   const renderValue = (val: any) => {
//     if (val === null || val === undefined) return "N/A";
//     if (typeof val === "object") return JSON.stringify(val);
//     return String(val);
//   };

//   const fmtDate = (val: any) => {
//     if (!val) return "N/A";
//     const d = new Date(val);
//     if (isNaN(d.getTime())) return String(val);
//     return d.toLocaleDateString('en-GB');
//   };



//   const q = searchQuery.trim().toLowerCase();
//   const filteredOrders = q
//     ? orders.filter((o) =>
//         o.id.toLowerCase().includes(q) ||
//         (o.subOrderId ?? "").toLowerCase().includes(q) ||
//         (o.parentOrderId ?? "").toLowerCase().includes(q) ||
//         o.customerName.toLowerCase().includes(q) ||
//         o.customerEmail.toLowerCase().includes(q)
//       )
//     : orders;
//   const filteredAllOrders = q
//     ? allOrders.filter((o) =>
//         o.id.toLowerCase().includes(q) ||
//         o.customer.name.toLowerCase().includes(q) ||
//         o.customer.email.toLowerCase().includes(q) ||
//         o.subOrders.some(
//           (s) =>
//             s.subOrderId.toLowerCase().includes(q) ||
//             s.sellerName.toLowerCase().includes(q)
//         )
//       )
//     : allOrders;
//   const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
//   const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const handlePageChange = (page: number) => {
//     setCurrentPage(Math.min(Math.max(1, page), totalPages));
//   };

//   const handleToggleOrderSelection = useCallback((orderId: string) => {
//     setSelectedOrderIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(orderId)) next.delete(orderId);
//       else next.add(orderId);
//       return next;
//     });
//   }, []);

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchQuery(e.target.value);
//     setCurrentPage(1);
//     setAllOrdersPage(1);
//   };

//   const getPaginationPages = () => {
//     const pages: (number | "...")[] = [];
//     if (totalPages <= 7) {
//       for (let i = 1; i <= totalPages; i++) pages.push(i);
//     } else {
//       pages.push(1);
//       if (currentPage > 3) pages.push("...");
//       const start = Math.max(2, currentPage - 1);
//       const end = Math.min(totalPages - 1, currentPage + 1);
//       for (let i = start; i <= end; i++) pages.push(i);
//       if (currentPage < totalPages - 2) pages.push("...");
//       pages.push(totalPages);
//     }
//     return pages;
//   };

//   if (loadingSellers) return (
//     <div className="p-6 max-w-7xl mx-auto space-y-6">
//       {/* Header skeleton */}
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//         <div className="space-y-2">
//           <Skeleton className="h-9 w-40" />
//           <Skeleton className="h-4 w-64" />
//         </div>
//         <div className="flex gap-2 items-end">
//           <div className="space-y-1">
//             <Skeleton className="h-4 w-28" />
//             <Skeleton className="h-10 w-[250px] rounded-md" />
//           </div>
//           <Skeleton className="h-9 w-28 rounded-md" />
//         </div>
//       </div>
//       {/* Order card skeletons */}
//       <div className="grid gap-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <Card key={i} className="overflow-hidden">
//             <Skeleton className="h-32 w-full" />
//           </Card>
//         ))}
//       </div>
//     </div>
//   );

//   const allTotalPages = Math.max(1, Math.ceil(filteredAllOrders.length / allOrdersPerPage));
//   const paginatedAllOrders = filteredAllOrders.slice((allOrdersPage - 1) * allOrdersPerPage, allOrdersPage * allOrdersPerPage);

//   const getAllPaginationPages = () => {
//     const pages: (number | "...")[] = [];
//     if (allTotalPages <= 7) {
//       for (let i = 1; i <= allTotalPages; i++) pages.push(i);
//     } else {
//       pages.push(1);
//       if (allOrdersPage > 3) pages.push("...");
//       const start = Math.max(2, allOrdersPage - 1);
//       const end = Math.min(allTotalPages - 1, allOrdersPage + 1);
//       for (let i = start; i <= end; i++) pages.push(i);
//       if (allOrdersPage < allTotalPages - 2) pages.push("...");
//       pages.push(allTotalPages);
//     }
//     return pages;
//   };

//   return (
//     <div className="p-6 max-w-7xl mx-auto space-y-6">
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">
//             {activeTab === "bySeller" ? "Orders by Seller" : "All Orders"}
//           </h1>
//           <p className="text-muted-foreground">
//             {activeTab === "bySeller" ? (
//               <>
//                 View and manage orders for selected seller
//                 {/* {breakdown && (
//                   <span className="ml-2 text-sm">
//                     ({breakdown.directOrders} direct, {breakdown.subOrders} sub-orders, {breakdown.total} total)
//                   </span>
//                 )} */}
//               </>
//             ) : (
//               <span>All orders across every seller — {allOrdersTotal} total</span>
//             )}
//           </p>
//         </div>
//         <div className="flex flex-col md:flex-row gap-4 md:items-end w-full md:w-auto md:justify-end justify-between">
//           {/* ── Tab switcher ── */}
//           <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1 self-end md:self-auto">
//             <button
//               type="button"
//               onClick={() => setActiveTab("all")}
//               className={cn(
//                 "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
//                 activeTab === "all"
//                   ? "bg-background text-foreground shadow-sm"
//                   : "text-muted-foreground hover:text-foreground"
//               )}
//             >
//               <LayoutList className="h-3.5 w-3.5" />
//               All Orders
//             </button>
//             <button
//               type="button"
//               onClick={() => setActiveTab("bySeller")}
//               className={cn(
//                 "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
//                 activeTab === "bySeller"
//                   ? "bg-background text-foreground shadow-sm"
//                   : "text-muted-foreground hover:text-foreground"
//               )}
//             >
//               <Store className="h-3.5 w-3.5" />
//               By Seller
//             </button>
//           </div>

//           {/* Seller Dropdown — only visible on bySeller tab */}
//           {activeTab === "bySeller" && (
//           <><div className="min-w-[260px] relative" ref={sellerDropdownRef}>
//               <label className="block mb-1 font-medium">Select Seller</label>
//               <div
//                 className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:border-primary/50 cursor-pointer"
//                 onClick={() => setIsSellerDropdownOpen((v) => !v)}
//               >
//                 <span className={selectedSeller ? "text-foreground font-medium" : "text-muted-foreground"}>
//                   {selectedSeller ? (() => {
//                     const s = sellers.find((s) => s.id === selectedSeller);
//                     if (!s) return "Select a seller";
//                     return (
//                       <span className="flex items-center gap-2">
//                         {s.name}
//                         <span className="text-xs text-muted-foreground font-normal">{s.email}</span>
//                       </span>
//                     );
//                   })() : "Select a seller"}
//                 </span>
//                 <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isSellerDropdownOpen && "rotate-180")} />
//               </div>

//               {isSellerDropdownOpen && (
//                 <div className="absolute z-[60] left-0 w-full mt-1 bg-background rounded-lg border shadow-xl p-1 min-w-[380px] animate-in fade-in zoom-in-95">
//                   <div className="max-h-[300px] overflow-y-auto">
//                     {sellers.length === 0 ? (
//                       <div className="py-4 text-center text-sm text-muted-foreground">No sellers found.</div>
//                     ) : sellers.map((seller) => (
//                       <div
//                         key={seller.id}
//                         className={cn(
//                           "flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary",
//                           selectedSeller === seller.id && "bg-primary/5 text-primary font-medium"
//                         )}
//                         onClick={(e) => { e.stopPropagation(); setSelectedSeller(seller.id); setIsSellerDropdownOpen(false); } }
//                       >
//                         <div className={cn(
//                           "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary transition-all",
//                           selectedSeller === seller.id ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
//                         )}>
//                           {selectedSeller === seller.id && <Check className="h-3 w-3" />}
//                         </div>
//                         <div className="flex flex-col min-w-0">
//                           <span className="font-medium truncate">{seller.name}</span>
//                           <span className="text-xs text-muted-foreground truncate">{seller.email}</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div><Button
//               variant="outline"
//               onClick={() => selectedSeller && fetchOrders(selectedSeller)}
//               disabled={loading || !selectedSeller}
//               className="gap-2"
//             >
//                 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
//                 Refresh
//               </Button></>
//           )}

//           {/* Refresh for All Orders tab */}
//           {activeTab === "all" && (
//             <Button
//               variant="outline"
//               onClick={fetchAllOrders}
//               disabled={loadingAll}
//               className="gap-2"
//             >
//               {loadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutList className="h-4 w-4" />}
//               Refresh
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* ── Search bar ── */}
//       <div className="relative w-full max-w-sm">
//         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
//         <Input
//           placeholder="Search by order ID…"
//           value={searchQuery}
//           onChange={handleSearchChange}
//           className="pl-9 h-9"
//         />
//         {searchQuery && (
//           <button
//             type="button"
//             onClick={() => { setSearchQuery(""); setCurrentPage(1); setAllOrdersPage(1); }}
//             className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//           >
//             <X className="h-3.5 w-3.5" />
//           </button>
//         )}
//       </div>

//       {/* ── ALL ORDERS TAB ───────────────────────────────────────────────── */}
//       {activeTab === "all" && (
//         <div className="grid gap-4">
//           {loadingAll ? (
//             <div className="grid gap-4">
//               {Array.from({ length: 4 }).map((_, i) => (
//                 <Card key={i} className="overflow-hidden">
//                   <div className="border-b p-4 flex flex-wrap justify-between items-center gap-4">
//                     <div className="flex items-center gap-3">
//                       <Skeleton className="h-10 w-10 rounded-full" />
//                       <div className="space-y-1.5">
//                         <Skeleton className="h-4 w-32" />
//                         <Skeleton className="h-3 w-24" />
//                       </div>
//                     </div>
//                     <Skeleton className="h-6 w-24 rounded-full" />
//                   </div>
//                   <CardContent className="p-6 space-y-4">
//                     <Skeleton className="h-4 w-full" />
//                     <Skeleton className="h-4 w-3/4" />
//                     <Skeleton className="h-24 w-full" />
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           ) : filteredAllOrders.length === 0 ? (
//             <Card className="p-12 text-center text-muted-foreground">
//               {searchQuery ? `No orders match "${searchQuery}".` : "No orders found."}
//             </Card>
//           ) : (
//             paginatedAllOrders.map((order) => (
//               <Card key={order.id} className="overflow-hidden">
//                 {/* Order header */}
//                 <div className="border-b p-4 flex flex-wrap justify-between items-center gap-4">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
//                       <Package className="h-5 w-5" />
//                     </div>
//                     <div>
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <p className="font-bold">Order {order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`}</p>
//                         <Badge variant="secondary" className="text-xs px-2 py-0.5">{order.orderType}</Badge>
//                         <Badge
//                           variant={order.paymentStatus === "PAID" ? "default" : "destructive"}
//                           className="text-xs px-2 py-0.5"
//                         >
//                           {order.paymentStatus}
//                         </Badge>
//                       </div>
//                       <p className="text-xs text-muted-foreground flex items-center gap-1">
//                         <Calendar className="h-3 w-3" />
//                         {new Date(order.createdAt).toLocaleDateString('en-GB')}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Customer + totals */}
//                   <div className="flex items-center gap-6">
//                     <div className="text-right">
//                       <p className="text-sm font-medium">{order.customer.name}</p>
//                       <p className="text-xs text-muted-foreground">{order.customer.email}</p>
//                       {order.customer.phone && (
//                         <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
//                       )}
//                     </div>
//                     <div className="text-right">
//                       <p className="text-xs text-muted-foreground">Total</p>
//                       <p className="font-semibold">${parseFloat(order.totalAmount).toLocaleString()}</p>
//                     </div>
//                     <Badge variant={getStatusBadgeVariant(order.overallStatus)} className="flex items-center gap-1">
//                       {getStatusLabel(order.overallStatus)}
//                     </Badge>
//                     {order.couponCode && (
//                       <Badge variant="outline" className="text-xs">{order.couponCode}</Badge>
//                     )}
//                   </div>
//                   <div>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       className="flex items-center gap-1"
//                       onClick={() => router.push(`/admindashboard/orders/${order.id}`)}
//                     >
//                       <Eye className="h-4 w-4" /> View
//                     </Button>
//                   </div>
//                 </div>

//                 <CardContent className="p-4 space-y-4">
//                   {/* Shipping address */}
//                   <div className="flex items-start gap-2 text-sm">
//                     <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
//                     <span className="text-muted-foreground">
//                       {order.shippingAddress.line}, {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
//                       {order.shippingAddress.zipCode}, {order.shippingAddress.country}
//                       {order.shippingAddress.phone && ` · ${order.shippingAddress.phone}`}
//                     </span>
//                   </div>

//                   {/* Sub-orders (multi-seller) OR direct order items */}
//                   <div className="space-y-3">
//                     <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
//                       <Store className="h-3 w-3" />
//                       {order.subOrders && order.subOrders.length > 0
//                         ? `${order.sellerCount} Seller${order.sellerCount !== 1 ? "s" : ""}`
//                         : "Order Details"}
//                     </p>
//                     <div className="grid gap-3">
//                       {order.subOrders && order.subOrders.length > 0 ? (
//                         // ── Multi-seller: render each sub-order ──
//                         order.subOrders.map((sub) => (
//                           <div
//                             key={sub.subOrderId}
//                             className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-start gap-3"
//                           >
//                             {/* Seller info */}
//                             <div className="flex items-center gap-2 min-w-[180px]">
//                               {sub.seller?.storeLogo ? (
//                                 <Image
//                                   src={sub.seller.storeLogo}
//                                   alt={sub.seller.storeName || sub.sellerName}
//                                   width={36}
//                                   height={36}
//                                   className="rounded-full object-cover w-9 h-9 border"
//                                 />
//                               ) : (
//                                 <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
//                                   <Store className="h-4 w-4" />
//                                 </div>
//                               )}
//                               <div className="min-w-0">
//                                 <p className="font-semibold text-xs text-primary/80 truncate">
//                                   {sub.subDisplayId ?? sub.subOrderId.slice(-6).toUpperCase()}
//                                 </p>
//                                 <p className="font-medium text-sm truncate">
//                                   {sub.seller?.storeName || sub.sellerName || "—"}
//                                 </p>
//                                 <p className="text-xs text-muted-foreground truncate">
//                                   {sub.sellerName || sub.seller?.name || sub.sellerEmail || "—"}
//                                 </p>
//                               </div>
//                             </div>

//                             {/* Items */}
//                             <div className="flex-1 space-y-1.5">
//                               {sub.items.map((item) => (
//                                 <div key={item.id} className="flex items-center gap-2">
//                                   {item.product.featuredImage && (
//                                     <Image
//                                       src={item.product.featuredImage}
//                                       alt={item.product.title}
//                                       width={36}
//                                       height={36}
//                                       className="rounded object-cover w-9 h-9 border flex-shrink-0"
//                                     />
//                                   )}
//                                   <div className="min-w-0">
//                                     <p className="text-sm font-medium truncate">{item.product.title}</p>
//                                     <p className="text-xs text-muted-foreground">${parseFloat(item.price).toLocaleString()} × {item.quantity}</p>
//                                   </div>
//                                 </div>
//                               ))}
//                             </div>

//                             {/* Sub-order meta */}
//                             <div className="flex flex-col items-end gap-1 text-right">
//                               <Badge variant={getStatusBadgeVariant(sub.status)} className="text-xs">
//                                 {getStatusLabel(sub.status)}
//                               </Badge>
//                               <p className="text-sm font-semibold">${parseFloat(sub.subtotal).toLocaleString()}</p>
//                               {sub.trackingNumber && (
//                                 <p className="text-xs text-muted-foreground flex items-center gap-1">
//                                   <Truck className="h-3 w-3" />{sub.trackingNumber}
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         ))
//                       ) : (
//                         // ── Direct order: items live at top level ──
//                         <div className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-start gap-3">
//                           {/* Seller info */}
//                           <div className="flex items-center gap-2 min-w-[180px]">
//                             {order.seller?.storeLogo ? (
//                               <Image
//                                 src={order.seller.storeLogo}
//                                 alt={order.seller.storeName || order.seller.name || "Seller"}
//                                 width={36}
//                                 height={36}
//                                 className="rounded-full object-cover w-9 h-9 border"
//                               />
//                             ) : (
//                               <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
//                                 <Store className="h-4 w-4" />
//                               </div>
//                             )}
//                             <div className="min-w-0">
//                               <p className="font-medium text-sm truncate">
//                                 {order.seller?.storeName || order.sellerName || "—"}
//                               </p>
//                               <p className="text-xs text-muted-foreground truncate">
//                                 {order.sellerName || order.seller?.name || "—"}
//                               </p>
//                             </div>
//                           </div>

//                           {/* Items */}
//                           <div className="flex-1 space-y-1.5">
//                             {order.items && order.items.length > 0 ? (
//                               order.items.map((item) => (
//                                 <div key={item.id} className="flex items-center gap-2">
//                                   {item.product.featuredImage && (
//                                     <Image
//                                       src={item.product.featuredImage}
//                                       alt={item.product.title}
//                                       width={36}
//                                       height={36}
//                                       className="rounded object-cover w-9 h-9 border flex-shrink-0"
//                                     />
//                                   )}
//                                   <div className="min-w-0">
//                                     <p className="text-sm font-medium truncate">{item.product.title}</p>
//                                     <p className="text-xs text-muted-foreground">${parseFloat(item.price).toLocaleString()} × {item.quantity}</p>
//                                   </div>
//                                 </div>
//                               ))
//                             ) : (
//                               <p className="text-sm text-muted-foreground">No items data available.</p>
//                             )}
//                           </div>

//                           {/* Order meta */}
//                           <div className="flex flex-col items-end gap-1 text-right">
//                             <Badge variant={getStatusBadgeVariant(order.overallStatus)} className="text-xs">
//                               {getStatusLabel(order.overallStatus)}
//                             </Badge>
//                             <p className="text-sm font-semibold">${parseFloat(order.totalAmount).toLocaleString()}</p>
//                             {order.trackingNumber && (
//                               <p className="text-xs text-muted-foreground flex items-center gap-1">
//                                 <Truck className="h-3 w-3" />{order.trackingNumber}
//                               </p>
//                             )}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {/* Payment method */}
//                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                     <CreditCard className="h-3.5 w-3.5" />
//                     <span>{order.paymentMethod}</span>
//                     {order.stripePaymentIntentId && (
//                       <span className="font-mono truncate max-w-[200px]">· {order.stripePaymentIntentId}</span>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))
//           )}

//           {/* All Orders Pagination */}
//           {!loadingAll && filteredAllOrders.length > 0 && (
//             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
//               <div className="flex items-center gap-3 text-sm text-muted-foreground">
//                 <span>
//                   Showing{" "}
//                   <span className="font-medium text-foreground">
//                     {Math.min((allOrdersPage - 1) * allOrdersPerPage + 1, filteredAllOrders.length)}
//                   </span>
//                   {"–"}
//                   <span className="font-medium text-foreground">
//                     {Math.min(allOrdersPage * allOrdersPerPage, filteredAllOrders.length)}
//                   </span>
//                   {" of "}
//                   <span className="font-medium text-foreground">{filteredAllOrders.length}</span>
//                   {" orders"}
//                 </span>
//                 <div className="flex items-center gap-1.5">
//                   <span className="hidden sm:inline">Per page:</span>
//                   <Select
//                     value={String(allOrdersPerPage)}
//                     onValueChange={(v) => { setAllOrdersPerPage(Number(v)); setAllOrdersPage(1); }}
//                   >
//                     <SelectTrigger className="h-8 w-[70px] text-xs">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {[5, 10, 25, 50].map((n) => (
//                         <SelectItem key={n} value={String(n)}>{n}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>
//               <div className="flex items-center gap-1">
//                 <Button variant="outline" size="icon" className="h-8 w-8" disabled={allOrdersPage === 1} onClick={() => setAllOrdersPage((p) => Math.max(1, p - 1))}>
//                   <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 {getAllPaginationPages().map((page, idx) =>
//                   page === "..." ? (
//                     <span key={`e-${idx}`} className="px-1 text-muted-foreground text-sm select-none">&hellip;</span>
//                   ) : (
//                     <Button key={page} variant={page === allOrdersPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setAllOrdersPage(page as number)}>
//                       {page}
//                     </Button>
//                   )
//                 )}
//                 <Button variant="outline" size="icon" className="h-8 w-8" disabled={allOrdersPage === allTotalPages} onClick={() => setAllOrdersPage((p) => Math.min(allTotalPages, p + 1))}>
//                   <ChevronRight className="h-4 w-4" />
//                 </Button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── BY SELLER TAB ───────────────────────────────────────────────────── */}
//       {activeTab === "bySeller" && (
//       <div className="grid gap-4">
//         {/* Selection Toolbar — only visible in bulk-select mode */}
//         {!loading && filteredOrders.length > 0 && !isBulkSelectMode && (
//           <div className="flex justify-end">
//             <Button
//               variant="outline"
//               size="sm"
//               className="gap-1.5"
//               onClick={() => { setIsBulkSelectMode(true); setSelectedOrderIds(new Set()); }}
//             >
//               <ClipboardList className="h-3.5 w-3.5" />
//               Bulk Orders Update
//             </Button>
//           </div>
//         )}
//         {!loading && filteredOrders.length > 0 && isBulkSelectMode && (
//           <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border gap-3 flex-wrap">
//             <div className="flex items-center gap-3">
//               {/* Select-all checkbox */}
//               <div
//                 className={cn(
//                   "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all",
//                   paginatedOrders.filter((o) => !isTerminalStatus(o.status)).length > 0 &&
//                   paginatedOrders.filter((o) => !isTerminalStatus(o.status)).every((o) => selectedOrderIds.has(o.id))
//                     ? "border-primary bg-primary text-primary-foreground"
//                     : "border-muted-foreground/40 bg-background hover:border-primary"
//                 )}
//                 onClick={() => {
//                   const nonTerminalIds = paginatedOrders.filter((o) => !isTerminalStatus(o.status)).map((o) => o.id);
//                   const allSelected = nonTerminalIds.length > 0 && nonTerminalIds.every((id) => selectedOrderIds.has(id));
//                   setSelectedOrderIds((prev) => {
//                     const next = new Set(prev);
//                     if (allSelected) { nonTerminalIds.forEach((id) => next.delete(id)); }
//                     else { nonTerminalIds.forEach((id) => next.add(id)); }
//                     return next;
//                   });
//                 }}
//               >
//                 {paginatedOrders.filter((o) => !isTerminalStatus(o.status)).length > 0 &&
//                  paginatedOrders.filter((o) => !isTerminalStatus(o.status)).every((o) => selectedOrderIds.has(o.id)) && (
//                   <Check className="h-3 w-3" />
//                 )}
//               </div>
//               <span className="text-sm text-muted-foreground">
//                 {selectedOrderIds.size > 0
//                   ? `${selectedOrderIds.size} order${selectedOrderIds.size !== 1 ? "s" : ""} selected`
//                   : "Select orders to bulk update"}
//               </span>
//             </div>
//             <div className="flex items-center gap-2">
//               {selectedOrderIds.size > 0 && (
//                 <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
//                   Clear
//                 </Button>
//               )}
//               {selectedOrderIds.size > 0 && (
//                 <Button size="sm" className="gap-1.5" onClick={() => setIsBulkModalOpen(true)}>
//                   <ClipboardList className="h-3.5 w-3.5" />
//                   Bulk Update ({selectedOrderIds.size})
//                 </Button>
//               )}
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => { setIsBulkSelectMode(false); setSelectedOrderIds(new Set()); }}
//               >
//                 <X className="h-3.5 w-3.5 mr-1" />
//                 Cancel
//               </Button>
//             </div>
//           </div>
//         )}
//         {loading ? (
//           <div className="grid gap-4">
//             {Array.from({ length: 4 }).map((_, i) => (
//               <Card key={i} className="overflow-hidden">
//                 <div className="border-b p-4 flex flex-wrap justify-between items-center gap-4">
//                   <div className="flex items-center gap-3">
//                     <Skeleton className="h-10 w-10 rounded-full" />
//                     <div className="space-y-1.5">
//                       <Skeleton className="h-4 w-32" />
//                       <Skeleton className="h-3 w-24" />
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4">
//                     <div className="space-y-1.5">
//                       <Skeleton className="h-3 w-20" />
//                       <Skeleton className="h-3 w-24" />
//                     </div>
//                     <Skeleton className="h-6 w-24 rounded-full" />
//                   </div>
//                   <Skeleton className="h-9 w-24 rounded-md" />
//                 </div>
//                 <CardContent className="p-6">
//                   <div className="grid md:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                       <Skeleton className="h-3 w-24" />
//                       <Skeleton className="h-4 w-full" />
//                       <Skeleton className="h-4 w-3/4" />
//                       <Skeleton className="h-4 w-1/2" />
//                     </div>
//                     <div className="space-y-2">
//                       <Skeleton className="h-3 w-28" />
//                       <Skeleton className="h-4 w-full" />
//                       <Skeleton className="h-4 w-2/3" />
//                     </div>
//                     <div className="space-y-2">
//                       <Skeleton className="h-3 w-20" />
//                       <Skeleton className="h-6 w-28 rounded-full" />
//                       <Skeleton className="h-4 w-36" />
//                       <Skeleton className="h-9 w-full rounded-md mt-2" />
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : filteredOrders.length === 0 ? (
//           <Card className="p-12 text-center text-muted-foreground">
//             {searchQuery ? `No orders match "${searchQuery}".` : "No orders found."}
//           </Card>
//         ) : (

//           paginatedOrders.map((order) => (
//             <Card key={order.id} className="overflow-hidden">
//               <div className="border-b p-4 flex flex-wrap justify-between items-center gap-4">
//                 <div className="flex items-center gap-3">
//                   {isBulkSelectMode && !isTerminalStatus(order.status) && (
//                     <div
//                       className={cn(
//                         "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all",
//                         selectedOrderIds.has(order.id)
//                           ? "border-primary bg-primary text-primary-foreground"
//                           : "border-muted-foreground/40 bg-background hover:border-primary"
//                       )}
//                       onClick={(e) => { e.stopPropagation(); handleToggleOrderSelection(order.id); }}
//                     >
//                       {selectedOrderIds.has(order.id) && <Check className="h-3 w-3" />}
//                     </div>
//                   )}
//                   <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
//                     <Package className="h-5 w-5" />
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2 flex-wrap">
//                       <p className="font-bold">
//                         {order.isSubOrder
//                           ? (order.subDisplayId ?? order.displaySubId ?? `#${order.subOrderId?.slice(-6).toUpperCase() ?? order.id.slice(-6).toUpperCase()}`)
//                           : (order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`)}
//                       </p>
//                       <Badge 
//                         variant={order.type === 'DIRECT' ? 'default' : 'secondary'} 
//                         className="text-xs px-2 py-0.5"
//                       >
//                         {order.type === 'DIRECT' ? 'Direct' : 'Sub-Order'}
//                       </Badge>
//                     </div>
//                     <p className="text-xs text-muted-foreground flex items-center gap-1">
//                       <Calendar className="h-3 w-3" /> 
//                       {new Date(order.createdAt).toLocaleDateString('en-GB')}
//                     </p>
//                     {order.parentOrderId && (
//                       <p className="text-xs text-primary/70 font-medium">
//                         Parent: {order.parentDisplayId ?? `#${order.parentOrderId.slice(-6).toUpperCase()}`}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                   <div className="text-right">
//                     <p className="text-sm font-medium flex items-center justify-end gap-1">
//                       <ClipboardList className="h-4 w-4" /> Customer
//                     </p>
//                     <p className="text-sm text-muted-foreground">{order.customerName}</p>
//                     <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-sm font-medium flex items-center justify-end gap-1">
//                       <DollarSign className="h-4 w-4" /> Total
//                     </p>
//                     <p className="text-sm font-semibold">${parseFloat(order.totalAmount).toLocaleString()}</p>
//                   </div>
//                   <Badge variant={getStatusBadgeVariant(order.status)} className="flex items-center gap-1">
//                     <Hash className="h-3 w-3" /> {getStatusLabel(order.status)}
//                   </Badge>
//                 </div>
//                 <div>
//                   <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => router.push(`/admindashboard/orders/${order.id}?sellerId=${selectedSeller}`)}>
//                     <Eye className="h-4 w-4" /> View
//                   </Button>
//                 </div>
//               </div>

//               <CardContent className="p-6">
//                 <div className="grid md:grid-cols-4 gap-6">
//                   {/* Items Summary */}
//                   <div className="space-y-2">
//                     <Label className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1">
//                       <ClipboardList className="h-3 w-3" /> Order Items
//                     </Label>
//                     {order.isSubOrder && (order.subDisplayId ?? order.displaySubId) && (
//                       <p className="text-xs font-semibold text-primary/80 bg-primary/5 rounded px-2 py-0.5 w-fit">
//                         {order.subDisplayId ?? order.displaySubId}
//                       </p>
//                     )}
//                     <div className="text-sm space-y-1">
//                       {order.items.map((item, i) => (
//                         <div key={item.id || i} className="flex items-center gap-2">
//                           {(item.product.featuredImage || item.product.images?.[0]) && (
//                             <Image
//                               src={item.product.featuredImage ?? item.product.images![0]}
//                               alt={item.product.title}
//                               width={40}
//                               height={40}
//                               className="w-10 h-10 object-cover rounded"
//                             />
//                           )}
//                           <div className="flex-1 min-w-0">
//                             <p className="truncate font-medium">{item.product.title}</p>
//                             <p className="text-xs text-muted-foreground">
//                               ${parseFloat(item.price).toLocaleString()} x {item.quantity}
//                             </p>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Shipping Information */}
//                   <div className="space-y-2">
//                     <Label className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1">
//                       <MapPin className="h-3 w-3" /> Shipping Details
//                     </Label>
//                     <div className="text-sm space-y-1">
//                       <p className="font-medium">{order.shippingAddressLine}</p>
//                       <p className="text-muted-foreground">
//                         {order.shippingCity}, {order.shippingState}
//                       </p>
//                       <p className="text-muted-foreground">
//                         {order.shippingZipCode}, {order.shippingCountry}
//                       </p>
//                       <p className="text-muted-foreground flex items-center gap-1">
//                         <span>📞</span> {order.shippingPhone}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Payment & Status Information */}
//                   <div className="space-y-3">
//                     <Label className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1">
//                       <CreditCard className="h-3 w-3" /> Payment & Status
//                     </Label>
//                     <div className="space-y-2">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-muted-foreground">Payment:</span>
//                         <div className="flex items-center gap-2">
//                           <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'destructive'} className="text-xs">
//                             {order.paymentStatus}
//                           </Badge>
//                           <span className="text-xs">{order.paymentMethod}</span>
//                         </div>
//                       </div>
//                       <div className="text-xs space-y-1">
//                         <p><span className="text-muted-foreground">Subtotal:</span> ${parseFloat(order.subtotal).toLocaleString()}</p>
//                         {order.shippingAddress?.orderSummary && (
//                           <>
//                             <p><span className="text-muted-foreground">Shipping:</span> ${parseFloat(order.shippingAddress.orderSummary.shippingCost || '0').toLocaleString()}</p>
//                             <p><span className="text-muted-foreground">GST ({order.shippingAddress.orderSummary.gstPercentage}%):</span> ${parseFloat(order.shippingAddress.orderSummary.gstAmount || '0').toLocaleString()}</p>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Actions: Management */}
//                   <div className="space-y-3">
//                     <Label className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1">
//                       <ClipboardList className="h-3 w-3" /> Management
//                     </Label>
//                     {isTerminalStatus(order.status) ? (
//                       <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg text-sm text-muted-foreground">
//                         <AlertTriangle className="h-4 w-4 flex-shrink-0" />
//                         <span>Terminal — no further changes.</span>
//                       </div>
//                     ) : (
//                       <Button variant="outline" className="w-full gap-2" onClick={() => setActiveStatusOrder(order)}>
//                         <ClipboardList className="h-4 w-4" /> Update Status
//                       </Button>
//                     )}
                    
//                     {order.trackingNumber ? (
//                       <div className="bg-blue-50 p-3 rounded-md text-sm border border-blue-100">
//                         <p className="flex items-center gap-2 text-blue-700 font-medium">
//                           <Truck className="h-4 w-4" /> {order.trackingNumber}
//                         </p>
//                         {order.estimatedDelivery && (
//                           <p className="text-blue-600/80 text-xs mt-1">Est: {fmtDate(order.estimatedDelivery)}</p>
//                         )}
//                       </div>
//                     ) : !isTerminalStatus(order.status) ? (
//                       <Button variant="outline" className="w-full gap-2" onClick={() => setActiveTrackingOrder(order)}>
//                         <Truck className="h-4 w-4" /> Add Tracking
//                       </Button>
//                     ) : (
//                       <p className="text-sm text-muted-foreground">No tracking info.</p>
//                     )}
                    
//                     <Button 
//                       variant="outline" 
//                       className="w-full gap-2" 
//                       onClick={() => handleDownloadInvoice(
//                         order.id,
//                         order.type === 'SUB_ORDER' ? order.parentDisplayId : order.displayId,
//                         order.type === 'SUB_ORDER' ? (order.subDisplayId ?? order.displaySubId ?? order.displayId) : undefined
//                       )}
//                       disabled={downloadingInvoiceId === order.id}
//                     >
//                       {downloadingInvoiceId === order.id ? (
//                         <Loader2 className="h-4 w-4 animate-spin" />
//                       ) : (
//                         <Download className="h-4 w-4" />
//                       )}
//                       Invoice
//                     </Button>
//                   </div>


//                 </div>
//               </CardContent>
//             </Card>
//           ))
//         )}
//       </div>

//       )}

//       {/* Pagination */}
//       {activeTab === "bySeller" && !loading && filteredOrders.length > 0 && (
//         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
//           {/* Left: count info + per-page */}
//           <div className="flex items-center gap-3 text-sm text-muted-foreground">
//             <span>
//               Showing{" "}
//               <span className="font-medium text-foreground">
//                 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredOrders.length)}
//               </span>
//               {"–"}
//               <span className="font-medium text-foreground">
//                 {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
//               </span>
//               {" of "}
//               <span className="font-medium text-foreground">{filteredOrders.length}</span>
//               {" orders"}
//             </span>
//             <div className="flex items-center gap-1.5">
//               <span className="hidden sm:inline">Per page:</span>
//               <Select
//                 value={String(itemsPerPage)}
//                 onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
//               >
//                 <SelectTrigger className="h-8 w-[70px] text-xs">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {[5, 10, 25, 50].map((n) => (
//                     <SelectItem key={n} value={String(n)}>{n}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>

//           {/* Right: page buttons */}
//           <div className="flex items-center gap-1">
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               disabled={currentPage === 1}
//               onClick={() => handlePageChange(currentPage - 1)}
//             >
//               <ChevronLeft className="h-4 w-4" />
//             </Button>

//             {getPaginationPages().map((page, idx) =>
//               page === "..." ? (
//                 <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm select-none">
//                   &hellip;
//                 </span>
//               ) : (
//                 <Button
//                   key={page}
//                   variant={page === currentPage ? "default" : "outline"}
//                   size="icon"
//                   className="h-8 w-8 text-xs"
//                   onClick={() => handlePageChange(page as number)}
//                 >
//                   {page}
//                 </Button>
//               )
//             )}

//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               disabled={currentPage === totalPages}
//               onClick={() => handlePageChange(currentPage + 1)}
//             >
//               <ChevronRight className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       )}

//       {/* Bulk Status Update Modal */}
//       {isBulkModalOpen && selectedOrderIds.size > 0 && (
//         <BulkStatusUpdateModal
//           orderIds={[...selectedOrderIds]}
//           orders={orders}
//           onClose={() => setIsBulkModalOpen(false)}
//           onSuccess={() => {
//             setSelectedOrderIds(new Set());
//             fetchOrders(selectedSeller);
//           }}
//         />
//       )}

//       {/* Status Update Modal */}
//       {activeTab === "bySeller" && activeStatusOrder && (
//         <StatusUpdateModal
//           order={activeStatusOrder}
//           onClose={() => setActiveStatusOrder(null)}
//           onSuccess={() => fetchOrders(selectedSeller)}
//         />
//       )}

//       {/* Tracking Modal */}
//       {activeTrackingOrder && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <Card className="w-full max-w-md shadow-2xl border bg-card">
//             <CardHeader className="border-b bg-muted/40">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <CardTitle className="text-lg flex items-center gap-2">
//                     <Truck className="h-5 w-5 text-blue-600" />
//                     Add Tracking Info
//                   </CardTitle>
//                   <CardDescription className="mt-0.5">
//                     Order #{activeTrackingOrder.subDisplayId ?? activeTrackingOrder.displaySubId ?? activeTrackingOrder.displayId ?? `${typeof activeTrackingOrder.id === "string" ? activeTrackingOrder.id.slice(-6).toUpperCase() : activeTrackingOrder.id}`}
//                   </CardDescription>
//                 </div>
//                 <Button variant="ghost" size="icon" onClick={handleCloseTrackingModal}>
//                   <X className="h-4 w-4" />
//                 </Button>
//               </div>
//             </CardHeader>
//             <CardContent className="space-y-4 p-6">
//               {/* Current Status Display */}
//               <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
//                 <span className="text-muted-foreground">Current Status</span>
//                 <Badge variant={getStatusBadgeVariant(activeTrackingOrder.status)}>
//                   {getStatusLabel(activeTrackingOrder.status)}
//                 </Badge>
//               </div>

//               <form onSubmit={(e) => {
//                 e.preventDefault();
//                 submitTracking();
//               }} className="space-y-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="tracking-number">
//                     Tracking Number <span className="text-destructive">*</span>
//                   </Label>
//                   <Input 
//                     id="tracking-number"
//                     placeholder="e.g. 1Z12345E6605272234" 
//                     value={trackingNumber}
//                     onChange={handleTrackingNumberChange}
//                     className="font-mono"
//                     autoFocus
//                     required
//                   />
//                   <p className="text-xs text-muted-foreground">
//                     Enter the courier tracking number
//                   </p>
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="delivery-date">
//                     Estimated Delivery Date <span className="text-destructive">*</span>
//                   </Label>
//                   <Input 
//                     id="delivery-date"
//                     type="date"
//                     value={estimatedDelivery}
//                     onChange={handleEstimatedDeliveryChange}
//                     min={new Date().toISOString().split("T")[0]}
//                     required
//                   />
//                   <p className="text-xs text-muted-foreground">
//                     Expected delivery date for the customer
//                   </p>
//                 </div>

//                 <div className="flex gap-3 pt-4 border-t">
//                   <Button 
//                     type="button"
//                     variant="outline" 
//                     className="flex-1" 
//                     onClick={handleCloseTrackingModal}
//                   >
//                     Cancel
//                   </Button>
//                   <Button 
//                     type="submit"
//                     className="flex-1"
//                     disabled={!trackingNumber.trim() || !estimatedDelivery}
//                   >
//                     <Truck className="h-4 w-4 mr-2" />
//                     Save Tracking
//                   </Button>
//                 </div>
//               </form>
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// }


"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, Loader2, X, Eye, ChevronDown, ChevronLeft, ChevronRight, CreditCard, MapPin, Calendar, ClipboardList, DollarSign, Hash, Download, Check, AlertTriangle, LayoutList, Store, Search, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  getAllowedTransitions,
  getRequiredFields,
  validateStatusUpdate,
  getStatusLabel,
  getStatusBadgeVariant,
  isTerminalStatus,
} from "@/lib/orderStatusRules";

const getFriendlyTrackingErrorMessage = (message: string) => {
  if (/tracking number/i.test(message) && /(already used|already assigned|sub-order)/i.test(message)) {
    return "Track number is already assigned to another order";
  }
  return message;
};

type Seller = {
  id: string;
  name: string;
  email: string;
};

type Product = {
  id: string;
  title: string;
  images?: string[];
  featuredImage?: string | null;
  price: string;
  sellerId: string;
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
  product: Product;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
};

type Order = {
  id: string;
  displayId?: string | null;
  subDisplayId?: string | null;
  displaySubId?: string | null;
  parentDisplayId?: string | null;
  subOrderId?: string | null;
  parentOrderId?: string | null;
  sellerId: string;
  status: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  statusReason?: string | null;
  subtotal: string;
  createdAt: string;
  updatedAt: string;
  type: 'DIRECT' | 'SUB_ORDER';
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress?: any;
  shippingAddressLine: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  shippingPhone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  user: User;
  items: OrderItem[];
  isSubOrder: boolean;
  sellerSpecific: boolean;
  isGuest?: string | boolean | null;
};

type OrdersResponse = {
  success: boolean;
  orders: Order[];
  count: number;
  sellerId?: string;
  breakdown: {
    directOrders: number;
    subOrders: number;
    total: number;
  };
  note?: string;
};

// ─── Detailed (All Orders) Types ─────────────────────────────────────────────

type DetailedSubOrder = {
  displaySubId: string;
  subOrderId: string;
  subDisplayId: string;
  parentOrderId: string;
  parentDisplayId: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  status: string;
  subtotal: string;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  statusReason: string | null;
  seller: {
    id: string;
    name: string;
    email: string;
    storeName: string;
    businessName: string;
    storeLogo: string | null;
  };
  items: {
    id: string;
    quantity: number;
    price: string;
    variantAttributes?: Record<string, string> | null;
    product: {
      id: string;
      title: string;
      featuredImage: string | null;
    };
  }[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

type DetailedOrder = {
  id: string;
  displayId: string;
  orderType: string;
  overallStatus: string;
  legacyStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: string;
  originalTotal: string | null;
  discountAmount: string | null;
  couponCode: string | null;
  stripePaymentIntentId: string | null;
  paypalOrderId: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    line: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
  sellerCount: number;
  subOrders: DetailedSubOrder[];
  // Direct order top-level fields
  sellerId?: string | null;
  sellerName?: string | null;
  seller?: {
    id: string;
    name: string;
    email?: string;
    storeName?: string;
    businessName?: string;
    storeLogo?: string | null;
  } | null;
  items?: {
    id: string;
    quantity: number;
    price: string;
    variantAttributes?: Record<string, string> | null;
    product: {
      id: string;
      title: string;
      featuredImage: string | null;
    };
  }[] | null;
  subtotal?: string | null;
  trackingNumber?: string | null;
  status?: string | null;
  isGuest?: string | boolean | null;
};

type DetailedOrdersResponse = {
  success: boolean;
  orders: DetailedOrder[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
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
      await api.put(`/api/seller/orders/update-status/${order.id}`, payload);
      // NOTE: tracking data is already saved by update-status when status is SHIPPED.
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
              <CardDescription className="mt-0.5">
                Order #{order.subDisplayId ?? order.displaySubId ?? (typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id)}
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
            <p className="text-sm text-muted-foreground text-center py-4">No status transitions available.</p>
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
                    <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span className="mt-0.5">•</span><span>{err}</span></p>
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

// ─── Bulk Status Update Modal ───────────────────────────────────────────────

interface BulkStatusModalProps {
  orderIds: string[];
  orders: Order[];
  onClose: () => void;
  onSuccess: () => void;
}

function BulkStatusUpdateModal({ orderIds, orders, onClose, onSuccess }: BulkStatusModalProps) {
  const selectedOrders = useMemo(
    () => orders.filter((o) => orderIds.includes(o.id) && !isTerminalStatus(o.status)),
    [orders, orderIds]
  );
  const skippedCount = orderIds.length - selectedOrders.length;

  const allowedStatuses = useMemo(() => {
    if (selectedOrders.length === 0) return [];
    const allSets = selectedOrders.map((o) => getAllowedTransitions(o.status));
    return allSets[0].filter((s) => allSets.every((set) => set.includes(s)));
  }, [selectedOrders]);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [defaultDelivery, setDefaultDelivery] = useState("");
  // per-order tracking: { [orderId]: { trackingNumber, estimatedDelivery } }
  const [perOrderTracking, setPerOrderTracking] = useState<Record<string, { trackingNumber: string; estimatedDelivery: string }>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState("");

  const isShipped = selectedStatus.toUpperCase() === "SHIPPED";
  const needsReason = getRequiredFields(selectedStatus).includes("reason");

  // Init per-order tracking rows when SHIPPED is selected
  const handleStatusChange = (v: string) => {
    setSelectedStatus(v);
    setValidationErrors([]);
    if (v.toUpperCase() === "SHIPPED") {
      const init: Record<string, { trackingNumber: string; estimatedDelivery: string }> = {};
      selectedOrders.forEach((o) => { init[o.id] = { trackingNumber: "", estimatedDelivery: "" }; });
      setPerOrderTracking(init);
    }
  };

  const updatePerOrder = (orderId: string, field: "trackingNumber" | "estimatedDelivery", value: string) => {
    setPerOrderTracking((prev) => ({ ...prev, [orderId]: { ...prev[orderId], [field]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setApiError("");

    const errors: string[] = [];

    if (isShipped) {
      if (!defaultDelivery) errors.push("Default estimated delivery date is required.");
      selectedOrders.forEach((o) => {
        const label = o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`;
        if (!perOrderTracking[o.id]?.trackingNumber?.trim()) {
          errors.push(`Tracking number is required for order ${label}.`);
        }
      });
      if (errors.length > 0) { setValidationErrors(errors); return; }
    } else if (needsReason && !reason.trim()) {
      errors.push("Reason is required for this status.");
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const orderIdsPayload = isShipped
        ? selectedOrders.map((o) => ({
            id: o.id,
            trackingNumber: perOrderTracking[o.id]?.trackingNumber,
            ...(perOrderTracking[o.id]?.estimatedDelivery
              ? { estimatedDelivery: perOrderTracking[o.id].estimatedDelivery }
              : {}),
          }))
        : selectedOrders.map((o) => o.id);

      await api.put("/api/seller/orders/bulk-update-status", {
        status: selectedStatus,
        ...(isShipped && { estimatedDelivery: defaultDelivery }),
        ...(reason && { reason }),
        ...(notes && { notes }),
        orderIds: orderIdsPayload,
      });
      toast.success(
        `${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""} updated to ${getStatusLabel(selectedStatus)}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = getFriendlyTrackingErrorMessage(err?.message || "Failed to bulk update status");
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={cn("w-full shadow-2xl", isShipped && selectedOrders.length > 1 ? "max-w-2xl" : "max-w-md")}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Bulk Update Status</CardTitle>
              <CardDescription className="mt-0.5">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? "s" : ""} selected
                {skippedCount > 0 && ` · ${skippedCount} skipped (terminal)`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedOrders.length === 0 ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">All selected orders are in a terminal status and cannot be updated further.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </>
          ) : allowedStatuses.length === 0 ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  The selected orders are in different stages with no common next status. Select orders in the same status to bulk update.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Status selector */}
              <div className="space-y-1.5">
                <Label>New Status <span className="text-destructive">*</span></Label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger><SelectValue placeholder="— Select new status —" /></SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Status moves forward only — backward transitions are not allowed.</p>
              </div>

              {/* SHIPPED: per-order tracking table */}
              {isShipped && (
                <div className="space-y-3">
                  {/* Default delivery date (applies to any order without its own) */}
                  <div className="space-y-1.5">
                    <Label>
                      Default Estimated Delivery <span className="text-destructive">*</span>
                      <span className="text-muted-foreground font-normal text-xs ml-1">(used when no per-order date is set)</span>
                    </Label>
                    <Input
                      type="date"
                      value={defaultDelivery}
                      onChange={(e) => setDefaultDelivery(e.target.value)}
                      min={today}
                    />
                  </div>

                  {/* Per-order tracking rows */}
                  <div className="space-y-1.5">
                    <Label>Tracking Details per Order</Label>
                    <div className="rounded-lg border overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-muted text-xs font-medium text-muted-foreground px-3 py-2">
                        <span>Order</span>
                        <span>Tracking Number <span className="text-destructive">*</span></span>
                        <span>Est. Delivery <span className="text-muted-foreground font-normal">(optional)</span></span>
                      </div>
                      {/* Rows */}
                      <div className="divide-y max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground)/0.3) transparent" }}>
                        {selectedOrders.map((o) => {
                          const label = o.subDisplayId ?? o.displaySubId ?? o.displayId ?? `#${o.id.slice(-6).toUpperCase()}`;
                          const row = perOrderTracking[o.id] ?? { trackingNumber: "", estimatedDelivery: "" };
                          return (
                            <div key={o.id} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center px-3 py-2 bg-background hover:bg-muted/30 transition-colors">
                              <span className="text-xs font-medium truncate">{label}</span>
                              <Input
                                className="h-7 text-xs font-mono"
                                placeholder="TRK-001"
                                value={row.trackingNumber}
                                onChange={(e) => updatePerOrder(o.id, "trackingNumber", e.target.value)}
                              />
                              <Input
                                type="date"
                                className="h-7 text-xs"
                                value={row.estimatedDelivery}
                                onChange={(e) => updatePerOrder(o.id, "estimatedDelivery", e.target.value)}
                                min={today}
                                placeholder={defaultDelivery || "Use default"}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Leave Est. Delivery blank to use the default date above.</p>
                  </div>
                </div>
              )}

              {/* Reason (CANCELLED / REFUND / PARTIAL_REFUND) */}
              {needsReason && (
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-destructive">*</span></Label>
                  <Textarea placeholder="Provide a reason for this status change..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="resize-none" />
                </div>
              )}

              {/* Notes — hidden for SHIPPED */}
              {selectedStatus && !isShipped && (
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive flex items-start gap-1.5"><span className="mt-0.5">•</span><span>{err}</span></p>
                  ))}
                </div>
              )}
              {apiError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={!selectedStatus || loading}>
                  {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Updating...</> : `Update ${selectedOrders.length} Order${selectedOrders.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightOrderId = searchParams.get("highlight");
  const tabParam = searchParams.get("tab");
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [dismissedHighlight, setDismissedHighlight] = useState<string | null>(null);
  const activeHighlight = highlightOrderId && highlightOrderId !== dismissedHighlight ? highlightOrderId : null;
  const [activeTab, setActiveTab] = useState<"bySeller" | "all">(
    () => {
      if (typeof window === "undefined") return "all";
      if (tabParam === "bySeller") return "bySeller";
      if (tabParam === "all") return "all";
      const saved = sessionStorage.getItem("adminOrders_activeTab");
      return saved === "bySeller" ? "bySeller" : "all";
    }
  );
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [breakdown, setBreakdown] = useState<{directOrders: number; subOrders: number; total: number} | null>(null);
  const [allOrders, setAllOrders] = useState<DetailedOrder[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allOrdersPage, setAllOrdersPage] = useState(1);
  const [allOrdersPerPage, setAllOrdersPerPage] = useState(10);
  const [allOrdersTotal, setAllOrdersTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  // ── Date range filters ──────────────────────────────────────────────────────
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [allFilterDateFrom, setAllFilterDateFrom] = useState("");
  const [allFilterDateTo, setAllFilterDateTo] = useState("");
  const [activeStatusOrder, setActiveStatusOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const sellerDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(e.target as Node)) {
        setIsSellerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSellers();
  }, []);

  // Auto-scroll and highlight order from notification click
  useEffect(() => {
    if (!activeHighlight) return;
    // Search in allOrders first (most likely for SLA/bell notifications)
    const allIdx = allOrders.findIndex(o => o.id === activeHighlight);
    if (allIdx !== -1) {
      if (activeTab !== "all") {
        setActiveTab("all");
        sessionStorage.setItem("adminOrders_activeTab", "all");
      }
      setAllOrdersPage(Math.floor(allIdx / allOrdersPerPage) + 1);
      setTimeout(() => {
        if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return;
    }
    // Fall back to bySeller orders
    const sellerIdx = orders.findIndex(o => o.id === activeHighlight);
    if (sellerIdx !== -1) {
      if (activeTab !== "bySeller") {
        setActiveTab("bySeller");
        sessionStorage.setItem("adminOrders_activeTab", "bySeller");
      }
      setCurrentPage(Math.floor(sellerIdx / itemsPerPage) + 1);
      setTimeout(() => {
        if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [activeHighlight, allOrders, orders]);

  useEffect(() => {
    if (activeTab === "all" && allOrders.length === 0) {
      fetchAllOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedSeller) {
      fetchOrders(selectedSeller);
    } else {
      setOrders([]);
    }
    setCurrentPage(1);
    setSelectedOrderIds(new Set());
    setIsBulkSelectMode(false);
  }, [selectedSeller]);

  const fetchAllOrders = async () => {
    setLoadingAll(true);
    try {
      const res: DetailedOrdersResponse = await api.get("/api/admin/orders/detailed");
      if (res.success) {
        setAllOrders(res.orders || []);
        setAllOrdersTotal(res.pagination?.total ?? (res.orders?.length ?? 0));
      } else {
        setAllOrders([]);
        setAllOrdersTotal(0);
        toast.error("Failed to load all orders");
      }
    } catch {
      toast.error("Failed to load all orders");
      setAllOrders([]);
      setAllOrdersTotal(0);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const res = await api.get("/api/users/all");
      const sellersOnly = Array.isArray(res)
        ? res.filter((u: { role: string }) => u.role === "SELLER")
        : (res.users || []).filter((u: { role: string }) => u.role === "SELLER");
      setSellers(sellersOnly);
      const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminOrders_selectedSeller") : null;
      const validSaved = saved && sellersOnly.some((u: { id: string }) => u.id === saved);
      if (!selectedSeller && sellersOnly.length > 0) {
        setSelectedSeller(validSaved ? saved! : sellersOnly[0].id);
      }
    } catch {
      toast.error("Failed to load sellers");
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchOrders = async (sellerId: string) => {
    setLoading(true);
    try {
      const res: OrdersResponse = await api.get(`/api/admin/orders/by-seller/${sellerId}`);
      if (res.success) {
        setOrders(res.orders || []);
        setBreakdown(res.breakdown);
      } else {
        setOrders([]);
        setBreakdown(null);
        toast.error("Failed to load orders");
      }
    } catch {
      toast.error("Failed to load orders");
      setOrders([]);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  // Add tracking update logic for admin
  const submitTracking = async () => {
    if (!activeTrackingOrder) return;
    
    // Basic validation
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }
    if (!estimatedDelivery) {
      toast.error("Please select an estimated delivery date");
      return;
    }
    
    // Date validation
    const deliveryDate = new Date(estimatedDelivery);
    const today = new Date();
    if (deliveryDate < today) {
      toast.error("Delivery date cannot be in the past");
      return;
    }

    try {
      const response = await api.put(`/api/admin/orders/tracking/${activeTrackingOrder.id}`, {
        trackingNumber,
        estimatedDelivery
      });
      
      if (response?.success) {
        toast.success(`Tracking updated successfully! Tracking: ${trackingNumber}`);
        setActiveTrackingOrder(null);
        setTrackingNumber("");
        setEstimatedDelivery("");
        fetchOrders(selectedSeller);
      } else {
        throw new Error(response?.message || "Failed to update tracking information");
      }
    } catch (error) {
      const errorMessage = getFriendlyTrackingErrorMessage(
        error instanceof Error ? error.message : "Failed to update tracking"
      );
      toast.error(errorMessage);
    }
  };

  // Optimized input handlers
  const handleTrackingNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTrackingNumber(e.target.value);
  }, []);

  const handleEstimatedDeliveryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEstimatedDelivery(e.target.value);
  }, []);

  const handleCloseTrackingModal = useCallback(() => {
    setActiveTrackingOrder(null);
    setTrackingNumber("");
    setEstimatedDelivery("");
  }, []);

  // Download invoice functionality
  const handleDownloadInvoice = async (orderId: string, displayId?: string | null, subDisplayId?: string | null) => {
    setDownloadingInvoiceId(orderId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;
      // Sub-orders have their own invoice endpoint; direct orders use the parent endpoint
      const isSubOrder = !!subDisplayId;
      const cleanId = (isSubOrder ? subDisplayId! : (displayId ?? orderId)).replace(/^#/, "");
      const BASE = process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";
      const endpoint = isSubOrder
        ? `${BASE}/api/orders/invoice/sub/${cleanId}`
        : `${BASE}/api/orders/invoice/${cleanId}`;
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



  const q = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    const orderLocalDate = new Date(o.createdAt).toLocaleDateString("en-CA");
    if (filterDateFrom && orderLocalDate < filterDateFrom) return false;
    if (filterDateTo && orderLocalDate > filterDateTo) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      (o.displayId ?? "").toLowerCase().includes(q) ||
      (o.subOrderId ?? "").toLowerCase().includes(q) ||
      (o.subDisplayId ?? "").toLowerCase().includes(q) ||
      (o.displaySubId ?? "").toLowerCase().includes(q) ||
      (o.parentOrderId ?? "").toLowerCase().includes(q) ||
      (o.parentDisplayId ?? "").toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  });
  const filteredAllOrders = allOrders.filter((o) => {
    const orderLocalDate = new Date(o.createdAt).toLocaleDateString("en-CA");
    if (allFilterDateFrom && orderLocalDate < allFilterDateFrom) return false;
    if (allFilterDateTo && orderLocalDate > allFilterDateTo) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      (o.displayId ?? "").toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.email.toLowerCase().includes(q) ||
      o.subOrders.some(
        (s) =>
          s.subOrderId.toLowerCase().includes(q) ||
          (s.subDisplayId ?? "").toLowerCase().includes(q) ||
          (s.displaySubId ?? "").toLowerCase().includes(q) ||
          s.sellerName.toLowerCase().includes(q)
      )
    );
  });
  const hasActiveBySellerFilters = filterDateFrom !== "" || filterDateTo !== "" || q !== "";
  const hasActiveAllFilters = allFilterDateFrom !== "" || allFilterDateTo !== "" || q !== "";
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const handleToggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setAllOrdersPage(1);
  };

  const getPaginationPages = () => {
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

  if (loadingSellers) return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-[250px] rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      {/* Order card skeletons */}
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-32 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );

  const allTotalPages = Math.max(1, Math.ceil(filteredAllOrders.length / allOrdersPerPage));
  const paginatedAllOrders = filteredAllOrders.slice((allOrdersPage - 1) * allOrdersPerPage, allOrdersPage * allOrdersPerPage);

  const getAllPaginationPages = () => {
    const pages: (number | "...")[] = [];
    if (allTotalPages <= 7) {
      for (let i = 1; i <= allTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (allOrdersPage > 3) pages.push("...");
      const start = Math.max(2, allOrdersPage - 1);
      const end = Math.min(allTotalPages - 1, allOrdersPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (allOrdersPage < allTotalPages - 2) pages.push("...");
      pages.push(allTotalPages);
    }
    return pages;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === "bySeller" ? "Orders by Seller" : "All Orders"}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === "bySeller" ? (
              <>
                View and manage orders for selected seller
                {/* {breakdown && (
                  <span className="ml-2 text-sm">
                    ({breakdown.directOrders} direct, {breakdown.subOrders} sub-orders, {breakdown.total} total)
                  </span>
                )} */}
              </>
            ) : (
              <span>All orders across every seller — {allOrdersTotal} total</span>
            )}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:items-end w-full md:w-auto md:justify-end justify-between">
          {/* ── Tab switcher ── */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1 self-end md:self-auto">
            <button
              type="button"
              onClick={() => { setActiveTab("all"); sessionStorage.setItem("adminOrders_activeTab", "all"); }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              All Orders
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("bySeller"); sessionStorage.setItem("adminOrders_activeTab", "bySeller"); }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeTab === "bySeller"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              By Seller
            </button>
          </div>

          {/* Seller Dropdown — only visible on bySeller tab */}
          {activeTab === "bySeller" && (
          <><div className="min-w-[260px] relative" ref={sellerDropdownRef}>
              <label className="block mb-1 font-medium">Select Seller</label>
              <div
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:border-primary/50 cursor-pointer"
                onClick={() => setIsSellerDropdownOpen((v) => !v)}
              >
                <span className={selectedSeller ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {selectedSeller ? (() => {
                    const s = sellers.find((s) => s.id === selectedSeller);
                    if (!s) return "Select a seller";
                    return (
                      <span className="flex items-center gap-2">
                        {s.name}
                        <span className="text-xs text-muted-foreground font-normal">{s.email}</span>
                      </span>
                    );
                  })() : "Select a seller"}
                </span>
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isSellerDropdownOpen && "rotate-180")} />
              </div>

              {isSellerDropdownOpen && (
                <div className="absolute z-[60] left-0 w-full mt-1 bg-background rounded-lg border shadow-xl p-1 min-w-[380px] animate-in fade-in zoom-in-95">
                  <div className="max-h-[300px] overflow-y-auto">
                    {sellers.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">No sellers found.</div>
                    ) : sellers.map((seller) => (
                      <div
                        key={seller.id}
                        className={cn(
                          "flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary",
                          selectedSeller === seller.id && "bg-primary/5 text-primary font-medium"
                        )}
                        onClick={(e) => { e.stopPropagation(); setSelectedSeller(seller.id); sessionStorage.setItem("adminOrders_selectedSeller", seller.id); setIsSellerDropdownOpen(false); } }
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary transition-all",
                          selectedSeller === seller.id ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                        )}>
                          {selectedSeller === seller.id && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{seller.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{seller.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div><Button
              variant="outline"
              onClick={() => selectedSeller && fetchOrders(selectedSeller)}
              disabled={loading || !selectedSeller}
              className="gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button></>
          )}

          {/* Refresh for All Orders tab */}
          {activeTab === "all" && (
            <Button
              variant="outline"
              onClick={fetchAllOrders}
              disabled={loadingAll}
              className="gap-2"
            >
              {loadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by order ID…"
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setCurrentPage(1); setAllOrdersPage(1); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── ALL ORDERS TAB ───────────────────────────────────────────────── */}
      {activeTab === "all" && (
        <div className="grid gap-4">
          {/* Date range filter */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">From Date</Label>
              <Input type="date" value={allFilterDateFrom} onChange={(e) => { setAllFilterDateFrom(e.target.value); setAllOrdersPage(1); }} className="h-9 text-sm w-[160px]" max={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">To Date</Label>
              <Input type="date" value={allFilterDateTo} onChange={(e) => { setAllFilterDateTo(e.target.value); setAllOrdersPage(1); }} className="h-9 text-sm w-[160px]" min={allFilterDateFrom || undefined} max={new Date().toISOString().split("T")[0]} />
            </div>
            {hasActiveAllFilters && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setAllFilterDateFrom(""); setAllFilterDateTo(""); setSearchQuery(""); setAllOrdersPage(1); }}>
                <X className="h-3.5 w-3.5" /> Clear Filters
              </Button>
            )}
            {allOrders.length > 0 && (
              <span className="text-xs text-muted-foreground self-end pb-1.5">
                <span className="font-semibold text-foreground">{filteredAllOrders.length}</span> {filteredAllOrders.length === 1 ? "result" : "results"}
              </span>
            )}
          </div>
          {loadingAll ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Order ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sellers</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
          ) : filteredAllOrders.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {searchQuery ? `No orders match "${searchQuery}".` : "No orders found."}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Order ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sellers</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAllOrders.map((order) => {
                      const displayId = order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`;
                      const totalItems = order.subOrders && order.subOrders.length > 0
                        ? order.subOrders.reduce((acc, s) => acc + s.itemCount, 0)
                        : (order.items?.length ?? 0);
                      const firstItemTitle = order.subOrders && order.subOrders.length > 0
                        ? order.subOrders[0]?.items?.[0]?.product?.title
                        : order.items?.[0]?.product?.title;
                      return (
                        <TableRow
                          key={order.id}
                          ref={order.id === activeHighlight ? (highlightRef as React.RefObject<HTMLTableRowElement>) : undefined}
                          className={order.id === activeHighlight ? "bg-primary/5 ring-1 ring-primary" : ""}
                        >
                          <TableCell>
                            <p className="font-semibold text-sm">{displayId}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("en-GB")}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">{order.orderType}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium flex items-center gap-1">
                              {order.customer.name}
                              {(order as any).isGuest === "guest" || (order as any).isGuest === true ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">Guest</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
                            {firstItemTitle && (
                              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{firstItemTitle}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold">
                              ${parseFloat(order.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.paymentStatus === "PAID" ? "default" : "destructive"} className="text-xs">
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.overallStatus)} className="text-xs whitespace-nowrap">
                              {getStatusLabel(order.overallStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground">
                              {order.sellerCount > 0 ? `${order.sellerCount} seller${order.sellerCount !== 1 ? "s" : ""}` : "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 h-8 text-xs"
                              onClick={() => router.push(`/admindashboard/orders/${order.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* All Orders Pagination */}
          {!loadingAll && filteredAllOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {Math.min((allOrdersPage - 1) * allOrdersPerPage + 1, filteredAllOrders.length)}
                  </span>
                  {"–"}
                  <span className="font-medium text-foreground">
                    {Math.min(allOrdersPage * allOrdersPerPage, filteredAllOrders.length)}
                  </span>
                  {" of "}
                  <span className="font-medium text-foreground">{filteredAllOrders.length}</span>
                  {" orders"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">Per page:</span>
                  <Select
                    value={String(allOrdersPerPage)}
                    onValueChange={(v) => { setAllOrdersPerPage(Number(v)); setAllOrdersPage(1); }}
                  >
                    <SelectTrigger className="h-8 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 25, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={allOrdersPage === 1} onClick={() => setAllOrdersPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getAllPaginationPages().map((page, idx) =>
                  page === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground text-sm select-none">&hellip;</span>
                  ) : (
                    <Button key={page} variant={page === allOrdersPage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setAllOrdersPage(page as number)}>
                      {page}
                    </Button>
                  )
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={allOrdersPage === allTotalPages} onClick={() => setAllOrdersPage((p) => Math.min(allTotalPages, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BY SELLER TAB ───────────────────────────────────────────────────── */}
      {activeTab === "bySeller" && (
      <div className="grid gap-4">
        {/* Date range filter */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">From Date</Label>
            <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }} className="h-9 text-sm w-[160px]" max={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">To Date</Label>
            <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }} className="h-9 text-sm w-[160px]" min={filterDateFrom || undefined} max={new Date().toISOString().split("T")[0]} />
          </div>
          {hasActiveBySellerFilters && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); setCurrentPage(1); }}>
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
          {orders.length > 0 && (
            <span className="text-xs text-muted-foreground self-end pb-1.5">
              <span className="font-semibold text-foreground">{filteredOrders.length}</span> {filteredOrders.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>
        {/* Selection Toolbar — only visible in bulk-select mode */}
        {!loading && filteredOrders.length > 0 && !isBulkSelectMode && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setIsBulkSelectMode(true); setSelectedOrderIds(new Set()); }}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Bulk Orders Update
            </Button>
          </div>
        )}
        {!loading && filteredOrders.length > 0 && isBulkSelectMode && (
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Select-all checkbox */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all",
                  paginatedOrders.filter((o) => !isTerminalStatus(o.status)).length > 0 &&
                  paginatedOrders.filter((o) => !isTerminalStatus(o.status)).every((o) => selectedOrderIds.has(o.id))
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 bg-background hover:border-primary"
                )}
                onClick={() => {
                  const nonTerminalIds = paginatedOrders.filter((o) => !isTerminalStatus(o.status)).map((o) => o.id);
                  const allSelected = nonTerminalIds.length > 0 && nonTerminalIds.every((id) => selectedOrderIds.has(id));
                  setSelectedOrderIds((prev) => {
                    const next = new Set(prev);
                    if (allSelected) { nonTerminalIds.forEach((id) => next.delete(id)); }
                    else { nonTerminalIds.forEach((id) => next.add(id)); }
                    return next;
                  });
                }}
              >
                {paginatedOrders.filter((o) => !isTerminalStatus(o.status)).length > 0 &&
                 paginatedOrders.filter((o) => !isTerminalStatus(o.status)).every((o) => selectedOrderIds.has(o.id)) && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedOrderIds.size > 0
                  ? `${selectedOrderIds.size} order${selectedOrderIds.size !== 1 ? "s" : ""} selected`
                  : "Select orders to bulk update"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrderIds.size > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
                  Clear
                </Button>
              )}
              {selectedOrderIds.size > 0 && (
                <Button size="sm" className="gap-1.5" onClick={() => setIsBulkModalOpen(true)}>
                  <ClipboardList className="h-3.5 w-3.5" />
                  Bulk Update ({selectedOrderIds.size})
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsBulkSelectMode(false); setSelectedOrderIds(new Set()); }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            {searchQuery ? `No orders match "${searchQuery}".` : "No orders found."}
          </Card>
        ) : (
          /* ── TABLE VIEW ── */
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {isBulkSelectMode && <TableHead className="w-10"></TableHead>}
                    <TableHead>Order ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const orderId = order.isSubOrder
                      ? (order.subDisplayId ?? order.displaySubId ?? `#${order.subOrderId?.slice(-6).toUpperCase() ?? order.id.slice(-6).toUpperCase()}`)
                      : (order.displayId ?? `#${order.id.slice(-6).toUpperCase()}`);
                    return (
                      <TableRow key={order.id} className={cn(isBulkSelectMode && selectedOrderIds.has(order.id) && "bg-primary/5")}>
                        {isBulkSelectMode && (
                          <TableCell>
                            {!isTerminalStatus(order.status) && (
                              <div
                                className={cn(
                                  "flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2 transition-all",
                                  selectedOrderIds.has(order.id)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-background hover:border-primary"
                                )}
                                onClick={() => handleToggleOrderSelection(order.id)}
                              >
                                {selectedOrderIds.has(order.id) && <Check className="h-2.5 w-2.5" />}
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <p className="font-medium text-sm">{orderId}</p>
                          {order.parentOrderId && (
                            <p className="text-xs text-primary/70">
                              Parent: {order.parentDisplayId ?? `#${order.parentOrderId.slice(-6).toUpperCase()}`}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.type === "DIRECT" ? "default" : "secondary"} className="text-xs">
                            {order.type === "DIRECT" ? "Direct" : "Sub-Order"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {order.customerName}
                            {order.isGuest === "guest" || order.isGuest === true ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">Guest</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                          {order.items[0] && (
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{order.items[0].product.title}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">${parseFloat(order.totalAmount).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.paymentStatus === "PAID" ? "default" : "destructive"} className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.trackingNumber ? (
                            <div>
                              <p className="text-xs font-mono font-medium">{order.trackingNumber}</p>
                              {order.estimatedDelivery && (
                                <p className="text-xs text-muted-foreground">Est: {fmtDate(order.estimatedDelivery)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {!isTerminalStatus(order.status) && (
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setActiveStatusOrder(order)}>
                                <ClipboardList className="h-3 w-3" /> Update
                              </Button>
                            )}
                            {!order.trackingNumber && !isTerminalStatus(order.status) && (
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setActiveTrackingOrder(order)}>
                                <Truck className="h-3 w-3" /> Track
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => router.push(`/admindashboard/orders/${order.id}?sellerId=${selectedSeller}`)}>
                              <Eye className="h-3 w-3" /> View
                            </Button>
                            <Button
                              variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleDownloadInvoice(
                                order.id,
                                order.type === "SUB_ORDER" ? order.parentDisplayId : order.displayId,
                                order.type === "SUB_ORDER" ? (order.subDisplayId ?? order.displaySubId ?? order.displayId) : undefined
                              )}
                              disabled={downloadingInvoiceId === order.id}
                            >
                              {downloadingInvoiceId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              Invoice
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      )}

      {/* Pagination */}
      {activeTab === "bySeller" && !loading && filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          {/* Left: count info + per-page */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredOrders.length)}
              </span>
              {"–"}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
              </span>
              {" of "}
              <span className="font-medium text-foreground">{filteredOrders.length}</span>
              {" orders"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Per page:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: page buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPaginationPages().map((page, idx) =>
              page === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm select-none">
                  &hellip;
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => handlePageChange(page as number)}
                >
                  {page}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {isBulkModalOpen && selectedOrderIds.size > 0 && (
        <BulkStatusUpdateModal
          orderIds={[...selectedOrderIds]}
          orders={orders}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => {
            setSelectedOrderIds(new Set());
            fetchOrders(selectedSeller);
          }}
        />
      )}

      {/* Status Update Modal */}
      {activeTab === "bySeller" && activeStatusOrder && (
        <StatusUpdateModal
          order={activeStatusOrder}
          onClose={() => setActiveStatusOrder(null)}
          onSuccess={() => fetchOrders(selectedSeller)}
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
                <Button variant="ghost" size="icon" onClick={handleCloseTrackingModal}>
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
                    value={trackingNumber}
                    onChange={handleTrackingNumberChange}
                    className="font-mono"
                    autoFocus
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
                    value={estimatedDelivery}
                    onChange={handleEstimatedDeliveryChange}
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
                    onClick={handleCloseTrackingModal}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    disabled={!trackingNumber.trim() || !estimatedDelivery}
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
    </div>
  );
}

