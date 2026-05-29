"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, X, Trash2, RefreshCw, Pencil, Eye, RotateCcw,
  Skull, Loader2, Tag, AlertTriangle, ChevronDown, Package,
  CheckSquare, Square,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SellerCoupon {
  id: string;
  code: string;
  sellerId: string;
  couponType: "discount" | "bundle";
  discountType: "percentage" | "flat" | null;
  discountValue: number | null;
  maxDiscount: number | null;
  bundleQty: number | null;
  bundlePrice: number | null;
  minQty: number;
  productIds: string[];
  expiresAt: string;
  usageLimit: number | null;
  usagePerUser: number;
  usageCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  softDeletedAt: string | null;
  softDeletedBy: string | null;
  restoredAt: string | null;
  restoredBy: string | null;
  seller?: { id: string; name: string; email: string };
}

interface SellerProduct {
  id: string;
  title: string;
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatCouponValue(coupon: SellerCoupon) {
  if (coupon.couponType === "bundle") {
    return `${coupon.bundleQty ?? "?"}× for $${(coupon.bundlePrice ?? 0).toFixed(2)}`;
  }
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue ?? 0}% off`;
  }
  return `$${(coupon.discountValue ?? 0).toFixed(2)} off`;
}

export default function SellerCouponsPage() {
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [recycleBin, setRecycleBin] = useState<SellerCoupon[]>([]);
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "recycle-bin">("active");

  // Products for multi-select
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<SellerCoupon | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [couponType, setCouponType] = useState<"discount" | "bundle">("discount");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [bundleQty, setBundleQty] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [expiry, setExpiry] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [usagePerUser, setUsagePerUser] = useState("1");
  const [isActive, setIsActive] = useState(true);

  // Product dropdown
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // View
  const [viewCoupon, setViewCoupon] = useState<SellerCoupon | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Soft delete
  const [softDeleteTarget, setSoftDeleteTarget] = useState<SellerCoupon | null>(null);
  const [softDeleteReason, setSoftDeleteReason] = useState("");
  const [isSoftDeleteOpen, setIsSoftDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restore
  const [restoreTarget, setRestoreTarget] = useState<SellerCoupon | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Hard delete
  const [hardDeleteTarget, setHardDeleteTarget] = useState<SellerCoupon | null>(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState("");
  const [hardDeleteReason, setHardDeleteReason] = useState("");
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);

  // Close product dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/seller-coupons");
      setCoupons(Array.isArray(res.coupons) ? res.coupons : []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecycleBin = useCallback(async () => {
    try {
      setRecycleBinLoading(true);
      const res = await api.get("/api/seller-coupons?recycleBin=true");
      setRecycleBin(Array.isArray(res.coupons) ? res.coupons : []);
    } catch {
      toast.error("Failed to load recycle bin");
    } finally {
      setRecycleBinLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const res = await api.get("/api/products/my-products");
      const raw = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setProducts(raw.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
    } catch {
      // Non-critical — product multi-select just stays empty
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, [fetchCoupons, fetchProducts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === "recycle-bin") fetchRecycleBin();
  }, [activeTab]);

  const resetForm = () => {
    setCouponType("discount");
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMaxDiscount("");
    setBundleQty("");
    setBundlePrice("");
    setMinQty("1");
    setSelectedProductIds([]);
    setExpiry("");
    setUsageLimit("");
    setUsagePerUser("1");
    setIsActive(true);
  };

  const openEdit = (coupon: SellerCoupon) => {
    setEditingCoupon(coupon);
    setCouponType(coupon.couponType);
    setCode(coupon.code);
    setDiscountType(coupon.discountType ?? "percentage");
    setDiscountValue(coupon.discountValue !== null ? String(coupon.discountValue) : "");
    setMaxDiscount(coupon.maxDiscount !== null ? String(coupon.maxDiscount) : "");
    setBundleQty(coupon.bundleQty !== null ? String(coupon.bundleQty) : "");
    setBundlePrice(coupon.bundlePrice !== null ? String(coupon.bundlePrice) : "");
    setMinQty(String(coupon.minQty));
    setSelectedProductIds(coupon.productIds ?? []);
    setExpiry(coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "");
    setUsageLimit(coupon.usageLimit !== null ? String(coupon.usageLimit) : "");
    setUsagePerUser(String(coupon.usagePerUser));
    setIsActive(coupon.isActive);
    setShowModal(true);
  };

  const openView = (coupon: SellerCoupon) => {
    setViewCoupon(coupon);
    setIsViewOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !expiry) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (couponType === "discount") {
      if (!discountValue) { toast.error("Discount value is required."); return; }
      const v = Number(discountValue);
      if (isNaN(v) || v <= 0) { toast.error("Discount value must be a positive number."); return; }
      if (discountType === "percentage" && v > 100) { toast.error("Percentage discount cannot exceed 100."); return; }
    } else {
      const qty = Number(bundleQty);
      const price = Number(bundlePrice);
      if (!bundleQty || isNaN(qty) || qty < 2) { toast.error("Bundle quantity must be at least 2."); return; }
      if (!bundlePrice || isNaN(price) || price <= 0) { toast.error("Bundle price must be a positive number."); return; }
    }

    setSubmitting(true);
    try {
      const expiryISO = new Date(expiry + "T23:59:59Z").toISOString();
      const payload: Record<string, unknown> = {
        code: code.toUpperCase(),
        couponType,
        minQty: Number(minQty) || 1,
        productIds: selectedProductIds,
        expiresAt: expiryISO,
        usageLimit: usageLimit !== "" ? Number(usageLimit) : null,
        usagePerUser: Number(usagePerUser) || 1,
        isActive,
      };
      if (couponType === "discount") {
        payload.discountType = discountType;
        payload.discountValue = Number(discountValue);
        payload.maxDiscount = maxDiscount !== "" ? Number(maxDiscount) : null;
      } else {
        payload.bundleQty = Number(bundleQty);
        payload.bundlePrice = Number(bundlePrice);
      }

      if (editingCoupon) {
        await api.put(`/api/seller-coupons/${editingCoupon.id}`, payload);
        toast.success(`"${code.toUpperCase()}" updated successfully!`);
      } else {
        await api.post("/api/seller-coupons", payload);
        toast.success(`Coupon "${code.toUpperCase()}" created!`);
      }
      resetForm();
      setEditingCoupon(null);
      setShowModal(false);
      await fetchCoupons();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate")) {
        toast.error("Coupon code already exists", { description: "Use a different code." });
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error(editingCoupon ? "Failed to update coupon" : "Failed to create coupon");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!softDeleteTarget) return;
    setIsProcessing(true);
    try {
      await api.delete(`/api/seller-coupons/${softDeleteTarget.id}`, softDeleteReason ? { reason: softDeleteReason } : undefined);
      toast.success(`"${softDeleteTarget.code}" moved to recycle bin`);
      setIsSoftDeleteOpen(false);
      setSoftDeleteTarget(null);
      setSoftDeleteReason("");
      await fetchCoupons();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete coupon");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsProcessing(true);
    try {
      await api.patch(`/api/seller-coupons/${restoreTarget.id}/restore`);
      toast.success(`"${restoreTarget.code}" restored successfully`);
      setIsRestoreOpen(false);
      setRestoreTarget(null);
      await Promise.all([fetchRecycleBin(), fetchCoupons()]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to restore coupon");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    if (hardDeleteConfirm !== hardDeleteTarget.code) { toast.error("Coupon code does not match."); return; }
    setIsProcessing(true);
    try {
      await api.delete(
        `/api/seller-coupons/${hardDeleteTarget.id}/permanent`,
        { reason: hardDeleteReason || "Permanently deleted via Seller Dashboard" }
      );
      toast.success(`"${hardDeleteTarget.code}" permanently deleted`);
      setIsHardDeleteOpen(false);
      setHardDeleteTarget(null);
      setHardDeleteConfirm("");
      setHardDeleteReason("");
      await fetchRecycleBin();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to permanently delete coupon");
    } finally {
      setIsProcessing(false);
    }
  };

  const getProductTitle = (id: string) => products.find(p => p.id === id)?.title ?? id;

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Coupons</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount and bundle coupons for your store.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCoupons} disabled={loading} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => { resetForm(); setEditingCoupon(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> New Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Total Coupons</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-3xl font-bold">{coupons.length}</p>
            <Tag className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Active</p>
          <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
            {coupons.filter(c => c.isActive && !isExpired(c.expiresAt)).length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5 border-yellow-200 dark:border-yellow-900 dark:bg-yellow-900/10">
          <p className="text-xs font-medium text-muted-foreground">Expired</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
            {coupons.filter(c => isExpired(c.expiresAt)).length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Inactive</p>
          <p className="text-3xl font-bold mt-1 text-muted-foreground">
            {coupons.filter(c => !c.isActive && !isExpired(c.expiresAt)).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-4 flex-wrap">
        {([
          { key: "active" as const,      label: "Active Coupons", count: coupons.length, icon: <Tag className="h-4 w-4" /> },
          { key: "recycle-bin" as const, label: "Recycle Bin",    count: null,           icon: <Trash2 className="h-4 w-4" /> },
        ]).map(tab => (
          <Button key={tab.key} variant={activeTab === tab.key ? "default" : "ghost"} size="sm" onClick={() => setActiveTab(tab.key)} className="gap-1.5">
            {tab.icon}
            {tab.label}
            {tab.count !== null && (
              <span className={cn("ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold", activeTab === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Active Coupons Tab */}
      {activeTab === "active" && (
        loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Tag className="h-10 w-10 opacity-20" />
            <p className="text-sm">No coupons yet. Create your first one.</p>
            <Button size="sm" onClick={() => { resetForm(); setEditingCoupon(null); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Create Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Min Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Per User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {coupons.map((coupon, idx) => (
                  <tr key={coupon.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono font-bold text-sm tracking-wider bg-muted px-2 py-0.5 rounded">{coupon.code}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                        coupon.couponType === "bundle"
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                          : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                      )}>
                        {coupon.couponType === "bundle" ? "Bundle" : "Discount"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">{formatCouponValue(coupon)}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">
                      {coupon.productIds.length === 0
                        ? "All products"
                        : `${coupon.productIds.length} product${coupon.productIds.length !== 1 ? "s" : ""}`}
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{coupon.minQty}</td>
                    <td className="px-4 py-2 text-sm">{coupon.usageCount ?? 0}{coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : " / ∞"}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{coupon.usagePerUser}</td>
                    <td className="px-4 py-2">
                      {isExpired(coupon.expiresAt) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Expired</span>
                      ) : coupon.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(coupon.expiresAt)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openView(coupon)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(coupon)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20"
                          onClick={() => { setSoftDeleteTarget(coupon); setSoftDeleteReason(""); setIsSoftDeleteOpen(true); }}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Recycle Bin Tab */}
      {activeTab === "recycle-bin" && (
        recycleBinLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading recycle bin…
          </div>
        ) : recycleBin.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Trash2 className="h-10 w-10 opacity-20" />
            <p className="text-sm">Recycle bin is empty</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-orange-50/50 dark:bg-orange-950/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deleted On</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {recycleBin.map((coupon, idx) => (
                  <tr key={coupon.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono font-bold text-sm tracking-wider bg-muted px-2 py-0.5 rounded">{coupon.code}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                        coupon.couponType === "bundle"
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                          : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                      )}>
                        {coupon.couponType === "bundle" ? "Bundle" : "Discount"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">{formatCouponValue(coupon)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {coupon.softDeletedAt ? formatDateShort(coupon.softDeletedAt) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openView(coupon)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-900/20"
                          onClick={() => { setRestoreTarget(coupon); setIsRestoreOpen(true); }}
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-900/20"
                          onClick={() => { setHardDeleteTarget(coupon); setHardDeleteConfirm(""); setHardDeleteReason(""); setIsHardDeleteOpen(true); }}
                        >
                          <Skull className="h-3 w-3" /> Delete Permanently
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* View Coupon Dialog */}
      <Dialog open={isViewOpen} onOpenChange={(o) => { setIsViewOpen(o); if (!o) setViewCoupon(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Coupon — <span className="font-mono">{viewCoupon?.code}</span>
            </DialogTitle>
          </DialogHeader>
          {viewCoupon && (
            <div className="space-y-4 py-2">
              {viewCoupon.softDeletedAt && (
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-3 flex gap-2 text-sm text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">This coupon is in the Recycle Bin</p>
                    <p className="text-xs mt-0.5">Deleted on {formatDate(viewCoupon.softDeletedAt)}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-xl border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code</p>
                  <p className="mt-0.5 font-mono font-bold tracking-wider text-base">{viewCoupon.code}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</p>
                  <span className={cn(
                    "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                    viewCoupon.couponType === "bundle"
                      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                  )}>
                    {viewCoupon.couponType === "bundle" ? "Bundle" : "Discount"}
                  </span>
                </div>
                {viewCoupon.couponType === "discount" ? (
                  <>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Discount Type</p>
                      <p className="mt-0.5 capitalize">{viewCoupon.discountType ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Discount Value</p>
                      <p className="mt-0.5 font-semibold">{formatCouponValue(viewCoupon)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Max Discount Cap</p>
                      <p className="mt-0.5">{viewCoupon.maxDiscount !== null ? `$${viewCoupon.maxDiscount.toFixed(2)}` : "—"}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bundle Qty</p>
                      <p className="mt-0.5 font-semibold">{viewCoupon.bundleQty ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bundle Price (ex-GST)</p>
                      <p className="mt-0.5 font-semibold">{viewCoupon.bundlePrice !== null ? `$${viewCoupon.bundlePrice.toFixed(2)}` : "—"}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Min Qty</p>
                  <p className="mt-0.5">{viewCoupon.minQty}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
                  <p className="mt-0.5">
                    {isExpired(viewCoupon.expiresAt) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Expired</span>
                    ) : viewCoupon.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Expires</p>
                  <p className="mt-0.5">{formatDateShort(viewCoupon.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Usage</p>
                  <p className="mt-0.5">{viewCoupon.usageCount ?? 0}{viewCoupon.usageLimit !== null ? ` / ${viewCoupon.usageLimit}` : " / ∞"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Per-User Limit</p>
                  <p className="mt-0.5">{viewCoupon.usagePerUser}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Products</p>
                  <p className="mt-0.5">
                    {viewCoupon.productIds.length === 0
                      ? "All store products"
                      : viewCoupon.productIds.map(id => getProductTitle(id)).join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Created</p>
                  <p className="mt-0.5">{formatDate(viewCoupon.createdAt)}</p>
                </div>
                {viewCoupon.restoredAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Last Restored</p>
                    <p className="mt-0.5">{formatDate(viewCoupon.restoredAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editingCoupon ? `Editing ${editingCoupon.code}` : "Fill in the details to generate a new coupon."}</p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => { setShowModal(false); setEditingCoupon(null); resetForm(); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

                {/* Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="sc-code" className="text-sm font-medium">Coupon Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="sc-code"
                    placeholder="E.g. SUMMER10"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={30}
                    disabled={!!editingCoupon}
                    className={`font-mono tracking-widest uppercase h-10 ${editingCoupon ? "bg-muted text-muted-foreground" : ""}`}
                    required
                  />
                  {editingCoupon && <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>}
                </div>

                {/* Coupon Type Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Coupon Type <span className="text-red-500">*</span></Label>
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      className={cn("flex-1 py-2 text-sm font-medium transition-colors", couponType === "discount" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60")}
                      onClick={() => setCouponType("discount")}
                    >
                      Discount
                    </button>
                    <button
                      type="button"
                      className={cn("flex-1 py-2 text-sm font-medium transition-colors", couponType === "bundle" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60")}
                      onClick={() => setCouponType("bundle")}
                    >
                      Bundle
                    </button>
                  </div>
                </div>

                {/* Discount Fields */}
                {couponType === "discount" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Discount Type <span className="text-red-500">*</span></Label>
                      <div className="flex rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          className={cn("flex-1 py-2 text-sm transition-colors", discountType === "percentage" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60")}
                          onClick={() => setDiscountType("percentage")}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          className={cn("flex-1 py-2 text-sm transition-colors", discountType === "flat" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60")}
                          onClick={() => setDiscountType("flat")}
                        >
                          Flat ($)
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sc-discountValue" className="text-sm font-medium">
                          {discountType === "percentage" ? "Percentage" : "Flat Amount"} <span className="text-red-500">*</span>
                          {discountType === "percentage" && <span className="text-muted-foreground font-normal ml-1">(1–100)</span>}
                        </Label>
                        <div className="relative">
                          <Input
                            id="sc-discountValue"
                            type="number"
                            placeholder={discountType === "percentage" ? "10" : "5.00"}
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                            min={0.01}
                            max={discountType === "percentage" ? 100 : undefined}
                            step={discountType === "flat" ? "0.01" : "1"}
                            className="h-10 pr-8"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                            {discountType === "percentage" ? "%" : "$"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sc-maxDiscount" className="text-sm font-medium">
                          Max Discount Cap ($)
                          {discountType === "flat" && <span className="text-muted-foreground font-normal ml-1 text-xs">(n/a)</span>}
                        </Label>
                        <div className="relative">
                          <Input
                            id="sc-maxDiscount"
                            type="number"
                            placeholder={discountType === "flat" ? "N/A" : "No cap"}
                            value={maxDiscount}
                            onChange={e => setMaxDiscount(e.target.value)}
                            min={0.01}
                            step="0.01"
                            disabled={discountType === "flat"}
                            className="h-10 pr-8 disabled:opacity-50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
                        </div>
                        {discountType === "flat" && <p className="text-xs text-muted-foreground">Not applicable for flat discounts.</p>}
                      </div>
                    </div>
                  </>
                )}

                {/* Bundle Fields */}
                {couponType === "bundle" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sc-bundleQty" className="text-sm font-medium">Bundle Qty <span className="text-red-500">*</span></Label>
                      <Input
                        id="sc-bundleQty"
                        type="number"
                        placeholder="3"
                        value={bundleQty}
                        onChange={e => setBundleQty(e.target.value)}
                        min={2}
                        step="1"
                        className="h-10"
                        required
                      />
                      <p className="text-xs text-muted-foreground">Min 2 units per bundle</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sc-bundlePrice" className="text-sm font-medium">Fixed Price for Bundle (ex-GST) <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="sc-bundlePrice"
                          type="number"
                          placeholder="25.00"
                          value={bundlePrice}
                          onChange={e => setBundlePrice(e.target.value)}
                          min={0.01}
                          step="0.01"
                          className="h-10 pr-8"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expiry Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="sc-expiry" className="text-sm font-medium">Expiry Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="sc-expiry"
                    type="date"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-10"
                    required
                  />
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground font-medium uppercase tracking-widest">Optional</span></div>
                </div>

                {/* Min Qty + Usage Limit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-minQty" className="text-sm font-medium">Min Quantity</Label>
                    <Input
                      id="sc-minQty"
                      type="number"
                      value={minQty}
                      onChange={e => setMinQty(e.target.value)}
                      min={1}
                      step="1"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">Min qty per product to qualify</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sc-usageLimit" className="text-sm font-medium">Total Usage Limit</Label>
                    <Input
                      id="sc-usageLimit"
                      type="number"
                      placeholder="Unlimited"
                      value={usageLimit}
                      onChange={e => setUsageLimit(e.target.value)}
                      min={1}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Per-User Limit */}
                <div className="space-y-1.5">
                  <Label htmlFor="sc-usagePerUser" className="text-sm font-medium">Per-User Limit</Label>
                  <Input
                    id="sc-usagePerUser"
                    type="number"
                    value={usagePerUser}
                    onChange={e => setUsagePerUser(e.target.value)}
                    min={1}
                    className="h-10"
                  />
                </div>

                {/* Products multi-select */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Qualifying Products</Label>
                  <p className="text-xs text-muted-foreground">Leave empty to apply to all your products.</p>
                  <div className="relative" ref={productDropdownRef}>
                    <button
                      type="button"
                      className="w-full h-10 px-3 flex items-center justify-between text-sm rounded-md border border-input bg-background hover:bg-muted/30 transition-colors"
                      onClick={() => setProductDropdownOpen(v => !v)}
                    >
                      <span className={cn("truncate", selectedProductIds.length === 0 ? "text-muted-foreground" : "text-foreground")}>
                        {selectedProductIds.length === 0
                          ? productsLoading ? "Loading products…" : "All products (none selected)"
                          : `${selectedProductIds.length} product${selectedProductIds.length !== 1 ? "s" : ""} selected`}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0 ml-2", productDropdownOpen && "rotate-180")} />
                    </button>
                    {productDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {productsLoading ? (
                          <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
                        ) : products.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Package className="h-3 w-3" /> No products found</div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-xs text-left text-muted-foreground hover:bg-muted/40 transition-colors border-b border-border"
                              onClick={() => setSelectedProductIds([])}
                            >
                              Clear selection (all products)
                            </button>
                            {products.map(p => {
                              const selected = selectedProductIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                                  onClick={() => setSelectedProductIds(prev =>
                                    selected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                  )}
                                >
                                  {selected
                                    ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                                    : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                                  <span className="truncate">{p.title}</span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedProductIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedProductIds.map(id => (
                        <span key={id} className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                          {getProductTitle(id)}
                          <button
                            type="button"
                            className="hover:text-foreground"
                            onClick={() => setSelectedProductIds(prev => prev.filter(pid => pid !== id))}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{editingCoupon ? "Coupon Status" : "Active on Creation"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isActive ? "Coupon is usable by customers." : "Coupon is disabled and cannot be used."}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isActive ? "bg-green-500" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${isActive ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingCoupon(null); resetForm(); }} className="min-w-[90px]">Cancel</Button>
                <Button type="submit" disabled={submitting} className="min-w-[120px]">
                  {submitting ? (editingCoupon ? "Saving…" : "Creating…") : (editingCoupon ? "Save Changes" : "Create Coupon")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Delete Confirm */}
      <Dialog open={isSoftDeleteOpen} onOpenChange={(o) => { setIsSoftDeleteOpen(o); if (!o) setSoftDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-orange-500" /> Move to Recycle Bin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">&ldquo;{softDeleteTarget?.code}&rdquo;</strong> will be moved to the recycle bin and disabled. It can be restored later.
            </p>
            <div className="space-y-2">
              <Label htmlFor="sc-soft-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="sc-soft-reason" value={softDeleteReason} onChange={e => setSoftDeleteReason(e.target.value)} placeholder="Reason for deletion..." className="resize-none h-20" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsSoftDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" disabled={isProcessing} onClick={handleSoftDelete}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Move to Bin</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirm */}
      <Dialog open={isRestoreOpen} onOpenChange={(o) => { setIsRestoreOpen(o); if (!o) setRestoreTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-teal-500" /> Restore Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">&ldquo;{restoreTarget?.code}&rdquo;</strong> will be restored from the recycle bin. It will remain <strong>inactive</strong> until you manually re-enable it.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsRestoreOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={isProcessing} onClick={handleRestore}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4 mr-2" />Restore</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirm */}
      <Dialog open={isHardDeleteOpen} onOpenChange={(o) => { setIsHardDeleteOpen(o); if (!o) { setHardDeleteTarget(null); setHardDeleteConfirm(""); setHardDeleteReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Skull className="w-4 h-4" /> Permanently Delete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-3 flex gap-2 text-sm text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>This action is <strong>irreversible</strong>. The coupon will be permanently deleted. Audit logs are retained.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground font-mono">{hardDeleteTarget?.code}</strong> to confirm:
            </p>
            <Input
              value={hardDeleteConfirm}
              onChange={e => setHardDeleteConfirm(e.target.value)}
              placeholder="Type coupon code to confirm"
              className="font-mono"
            />
            <div className="space-y-2">
              <Label htmlFor="sc-hard-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="sc-hard-reason" value={hardDeleteReason} onChange={e => setHardDeleteReason(e.target.value)} placeholder="Reason for permanent deletion…" className="resize-none h-16" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsHardDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                disabled={isProcessing || hardDeleteConfirm !== hardDeleteTarget?.code}
                onClick={handleHardDelete}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Skull className="w-4 h-4 mr-2" />Delete Forever</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
