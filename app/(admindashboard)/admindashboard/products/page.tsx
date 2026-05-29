"use client";

import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Package, DollarSign, Edit, X, Search, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, AlertCircle, Trash2, RotateCcw, Layers, RefreshCcw, Plus, Crop } from "lucide-react";
import { ImageCropModal } from "@/components/shared/image-crop-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as LucideImage } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import NextImage from "next/image";
import { api, apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductAuditHistory } from "@/components/shared/product-audit-history";

type Seller = {
  id: string;
  name: string;
  email: string;
  pendingCount: number;
};

type Product = {
  id: string;
  title: string;
  price: number;
  status: string;
  isActive?: boolean;
  rejectionReason?: string | null;
  reviewNote?: string | null;
  sellerInactiveReason?: string | null;
  images?: string[];
  featuredImage?: string | null;
  galleryImages?: string[];
  description?: string;
  category?: string;
  stock?: number;
  featured?: boolean;
  tags?: string[] | string;
  seller_id?: string;
  sellerId?: string;
  userId?: string;
  weight?: number | string;
  seller?: { id: string; name: string; email: string; storeName?: string; businessName?: string };
  type?: "SIMPLE" | "VARIABLE";
  variants?: Array<{ price?: number | string; stock?: number | string; sku?: string }>;
};

type TabCounts = { all: number; pending: number; approved: number; rejected: number; inactive: number };

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Active</span>;
    case "PENDING":  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400">Pending</span>;
    case "REJECTED": return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Rejected</span>;
    case "INACTIVE": return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>;
    default:         return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
  }
}

// ─── Price display helper ─────────────────────────────────────────────────────
type PriceDisplayable = { price?: number | string | null; type?: string; variants?: Array<{ price?: number | string }> };
function formatPrice(product: PriceDisplayable): string {
  // If API returns a pre-computed price string (e.g. "28 - 30" for variable products)
  if (typeof product.price === "string" && product.price.trim() !== "") {
    const parts = product.price.split("-").map((p) => p.trim());
    if (parts.length === 2 && parts[0] !== "" && parts[1] !== "") {
      return parts[0] === parts[1] ? `$${parts[0]}` : `$${parts[0]} – $${parts[1]}`;
    }
    const p = Number(product.price);
    return isNaN(p) ? "—" : `$${p.toFixed(2)}`;
  }
  // Fallback: compute from variants array if present
  if (product.type === "VARIABLE" && Array.isArray(product.variants) && product.variants.length > 0) {
    const prices = product.variants
      .map(v => Number(v.price))
      .filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return "—";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }
  const p = Number(product.price);
  return isNaN(p) || p === 0 ? "—" : `$${p.toFixed(2)}`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const productBelongsTo = (p: Product, sellerId: string) =>
  p.seller_id === sellerId || p.sellerId === sellerId || p.userId === sellerId;

const parsePendingResponse = (res: any): Product[] => {
  if (res?.success && res?.products) return res.products;
  if (res?.data) return res.data;
  if (Array.isArray(res)) return res;
  return [];
};

// ─── Pending pill component ───────────────────────────────────────────────────
function PendingPill({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 whitespace-nowrap">
        {count} pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
      0 pending
    </span>
  );
}

type RecycleBinProduct = {
  id: string;
  title: string;
  price: string;
  stock: number;
  category?: string;
  featuredImage?: string | null;
  status?: string;
  deletedAt: string;
  deletedBy: string | null;
  deletedByRole: "ADMIN" | "SELLER" | null;
  seller?: { id: string; name: string; email: string };
  sellerId?: string;
  sellerName?: string;
};

export default function AdminProductsPage() {
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const tokenMatch = document.cookie.match(/(?:^|; )token=([^;]*)/);
      const roleMatch = document.cookie.match(/(?:^|; )userRole=([^;]*)/);
      if (!tokenMatch || !roleMatch) {
        window.location.href = "/auth/login";
      }
    }
  }, []);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>(
    () => (typeof window !== "undefined" ? sessionStorage.getItem("adminProducts_selectedSeller") ?? "" : "")
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(true);

  const [activeView, setActiveView] = useState<"all" | "approved" | "pending" | "rejected" | "inactive" | "recycle-bin">("approved");
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [rejectedProducts, setRejectedProducts] = useState<Product[]>([]);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [inactiveProducts, setInactiveProducts] = useState<Product[]>([]);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [tabCounts, setTabCounts] = useState<TabCounts>({ all: 0, pending: 0, approved: 0, rejected: 0, inactive: 0 });

  // Recycle Bin state
  const [recycleBinProducts, setRecycleBinProducts] = useState<RecycleBinProduct[]>([]);
  const [loadingRecycleBin, setLoadingRecycleBin] = useState(false);

  // Permanent delete confirm
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecycleBinProduct | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // View deleted product
  const [viewBinProduct, setViewBinProduct] = useState<RecycleBinProduct | null>(null);

  const allPendingRef = useRef<Product[]>([]);
  const allRejectedRef = useRef<Product[]>([]);

  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectProductId, setRejectProductId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Admin deactivate modal
  const [showAdminDeactivateModal, setShowAdminDeactivateModal] = useState(false);
  const [adminDeactivateProductId, setAdminDeactivateProductId] = useState<string | null>(null);
  const [adminDeactivateReason, setAdminDeactivateReason] = useState("");
  const [adminDeactivateSubmitting, setAdminDeactivateSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductStatus, setEditProductStatus] = useState<string>("");
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    images: [] as File[],
    oldImages: [] as string[],
    featuredImage: null as File | null,
    oldFeaturedImage: null as string | null,
    galleryImages: [] as File[],
    oldGalleryImages: [] as string[],
    tags: "",
    artistName: "",
    weight: "",
    featured: false,
    type: "SIMPLE" as "SIMPLE" | "VARIABLE",
  });

  // ── Variant state for edit modal ───────────────────────────────────────────
  const [editVariants, setEditVariants] = useState<Array<{id?: string; price: string; stock: string; sku: string; attributes: Record<string, string>}>>([]);
  const [editSelectedAttrValues, setEditSelectedAttrValues] = useState<Record<string, string[]>>({});
  const [customNumericEdit, setCustomNumericEdit] = useState<Record<string, string>>({});
  const [customSizeModeEdit, setCustomSizeModeEdit] = useState<Record<string, "text" | "number">>({});
  const [editBulkPrice, setEditBulkPrice] = useState("");
  const [editBulkStock, setEditBulkStock] = useState("");
  const [availableAttributes, setAvailableAttributes] = useState<any[]>([]);

  // ── Create-attribute inline form ───────────────────────────────────────────
  const [showCreateAttr, setShowCreateAttr] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrDisplayName, setNewAttrDisplayName] = useState("");
  const [newAttrValueType, setNewAttrValueType] = useState<"text" | "number">("text");
  const [newAttrValuesInput, setNewAttrValuesInput] = useState("");
  const [isCreatingAttr, setIsCreatingAttr] = useState(false);

  async function handleCreateAttribute() {
    const name = newAttrName.trim();
    const displayName = newAttrDisplayName.trim() || name;
    if (!name) { toast.error("Attribute name is required"); return; }
    const rawValues = newAttrValuesInput.split(",").map(v => v.trim()).filter(Boolean);
    if (rawValues.length === 0) { toast.error("Add at least one value"); return; }
    const values = rawValues.map(v => ({ value: v, displayValue: v }));
    setIsCreatingAttr(true);
    try {
      const res = await api.post("/api/attributes", { name, displayName, valueType: newAttrValueType, values });
      if (!res?.id && !res?.attribute?.id) throw new Error(res?.message || "Failed to create attribute");
      toast.success(`Attribute "${displayName}" created`);
      await loadAttributes();
      setShowCreateAttr(false);
      setNewAttrName(""); setNewAttrDisplayName(""); setNewAttrValueType("text"); setNewAttrValuesInput("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create attribute");
    } finally {
      setIsCreatingAttr(false);
    }
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false);
  const sellerDropdownRef = useRef<HTMLDivElement>(null);
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const [editCatSearch, setEditCatSearch] = useState("");
  const editCatDropdownRef = useRef<HTMLDivElement>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const editFeaturedImageRef = useRef<HTMLInputElement>(null);
  const editGalleryImagesRef = useRef<HTMLInputElement>(null);

  // ── Crop modal state
  const [cropPending, setCropPending] = useState<{ file: File; objectUrl: string } | null>(null);

  const openCrop = (file: File) => {
    setCropPending({ file, objectUrl: URL.createObjectURL(file) });
  };

  const handleCropDone = (croppedFile: File) => {
    if (cropPending) URL.revokeObjectURL(cropPending.objectUrl);
    setEditFormData((prev) => ({ ...prev, featuredImage: croppedFile }));
    setCropPending(null);
  };

  const handleCropCancel = () => {
    if (cropPending) URL.revokeObjectURL(cropPending.objectUrl);
    setCropPending(null);
  };
  // ────────────────────────────────────────

  // Mutable accumulator ref for gallery files — always current, no stale closure
  const editGalleryAccumRef = useRef<File[]>([]);

  const selectedSellerRef = useRef(selectedSeller);
  const activeViewRef = useRef(activeView);
  const sellersRef = useRef<Seller[]>([]);
  useEffect(() => {
    selectedSellerRef.current = selectedSeller;
    if (selectedSeller) sessionStorage.setItem("adminProducts_selectedSeller", selectedSeller);
  }, [selectedSeller]);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { sellersRef.current = sellers; }, [sellers]);

  // Tracks which tabs have already been fetched for the currently selected seller.
  // Avoids refetching (and flashing to 0) when switching back to an already-loaded tab.
  const fetchedTabsRef = useRef<Set<string>>(new Set());

  const totalProducts = products.length;
  const totalStock = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  // const totalRevenue = products.reduce((s, p) => s + Number(p.price) * (Number((p as any).sales) || 0), 0);

  // ── click-outside ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (editCatDropdownRef.current && !editCatDropdownRef.current.contains(e.target as Node)) setIsEditCatOpen(false);
      if (sellerDropdownRef.current && !sellerDropdownRef.current.contains(e.target as Node)) setIsSellerDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── categories ─────────────────────────────────────────────────────────────
  const loadCategories = async () => {
    try {
      const res = await api.get("/api/categories/");
      if (res?.success && res?.data) setAvailableCategories(res.data.approvedCategories || []);
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  };

  // ── attributes (for variable product variants) ─────────────────────────────
  const loadAttributes = async () => {
    try {
      const res = await api.get("/api/attributes");
      const attrs = res?.attributes || [];
      setAvailableAttributes(attrs);
    } catch (e) {
      console.error("Error fetching attributes:", e);
    }
  };

  useEffect(() => { loadCategories(); loadAttributes(); }, []);

  // ── unified tab fetch (uses new endpoint) ────────────────────────────────
  const fetchTabProducts = async (
    sellerId: string,
    status: "all" | "approved" | "pending" | "rejected" | "inactive" | "recycle-bin"
  ) => {
    if (status === "recycle-bin") {
      fetchRecycleBin(sellerId);
      return;
    }
    const setLoadingMap: Record<string, (v: boolean) => void> = {
      approved: setLoading, pending: setLoadingPending, all: setLoadingAll,
      rejected: setLoadingRejected, inactive: setLoadingInactive,
    };
    const setDataMap: Record<string, (d: Product[]) => void> = {
      approved: setProducts, pending: setPendingProducts, all: setAllProducts,
      rejected: setRejectedProducts, inactive: setInactiveProducts,
    };
    setLoadingMap[status](true);
    try {
      const qs = `?status=${status}${sellerId ? `&sellerId=${encodeURIComponent(sellerId)}` : ""}`;
      const res = await api.get(`/api/admin/products${qs}`);
      const data: Product[] = res?.products || [];
      setDataMap[status](data);
      if (res?.counts) setTabCounts((prev) => ({ ...prev, ...res.counts }));
    } catch (err: any) {
      toast.error(`Failed to load ${status} products: ${err?.message || "Unknown error"}`);
      setDataMap[status]([]);
    } finally {
      setLoadingMap[status](false);
    }
  };

  // ── refresh pending (only updates per-seller dropdown pills — never touches tabCounts) ──
  const refreshPending = async (currentSellers: Seller[]): Promise<Product[]> => {
    try {
      const res = await api.get("/api/admin/products?status=pending");
      const allPending: Product[] = res?.products || parsePendingResponse(res);
      allPendingRef.current = allPending;
      // NOTE: do NOT set tabCounts here — this is a global (cross-seller) query
      // and would show inflated numbers. tabCounts is managed solely by fetchTabProducts.
      setSellers(
        currentSellers.map((s) => ({
          ...s,
          pendingCount: allPending.filter((p) => productBelongsTo(p, s.id)).length,
        }))
      );
      return allPending;
    } catch (err) {
      console.error("Failed to fetch pending products:", err);
      return allPendingRef.current;
    }
  };

  // ── fetch sellers ──────────────────────────────────────────────────────────
  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const res = await api.get("/api/users/all");
      const rawSellers: Seller[] = (Array.isArray(res) ? res : res.users || [])
        .filter((u: any) => u.role === "SELLER")
        .map((u: any) => ({ ...u, pendingCount: 0 }));
      setSellers(rawSellers);
      const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminProducts_selectedSeller") : null;
      const validSaved = saved && rawSellers.some((s) => s.id === saved);
      if (!selectedSellerRef.current && rawSellers.length > 0) {
        setSelectedSeller(validSaved ? saved! : rawSellers[0].id);
      }
      await refreshPending(rawSellers);
    } catch (err: any) {
      toast.error(`Failed to load sellers: ${err?.message || "Unknown error"}`);
      setSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  };

  // Thin wrappers kept for call-site compatibility
  const fetchProducts = (sellerId: string) => fetchTabProducts(sellerId, "approved");
  const applyPendingFilter = (sellerId: string) => fetchTabProducts(sellerId, "pending");
  const fetchAllProducts = (sellerId: string) => fetchTabProducts(sellerId, "all");
  const applyRejectedFilter = (sellerId: string) => fetchTabProducts(sellerId, "rejected");
  const fetchInactiveProducts = (sellerId: string) => fetchTabProducts(sellerId, "inactive");

  const fetchRecycleBin = async (sellerId: string) => {
    setLoadingRecycleBin(true);
    try {
      const qs = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : "";
      const res = await api.get(`/api/admin/products/recycle-bin${qs}`);
      setRecycleBinProducts(res?.products || []);
    } catch (err: any) {
      toast.error(`Failed to load recycle bin: ${err?.message || "Unknown error"}`);
      setRecycleBinProducts([]);
    } finally {
      setLoadingRecycleBin(false);
    }
  };

  // ── kept for legacy — refreshes rejected cache only, never touches tabCounts
  const refreshRejected = async (currentSellers: Seller[]): Promise<Product[]> => {
    try {
      const res = await api.get("/api/admin/products?status=rejected");
      const all: Product[] = res?.products || [];
      allRejectedRef.current = all;
      // NOTE: do NOT set tabCounts here — global query, would show wrong counts
      return all;
    } catch (err) {
      console.error("Failed to fetch rejected products:", err);
      return allRejectedRef.current;
    }
  };

  useEffect(() => { fetchSellers(); }, []); // eslint-disable-line

  // ── When the selected SELLER changes: wipe everything and fetch the active tab fresh ──
  useEffect(() => {
    if (!selectedSeller) {
      setProducts([]); setPendingProducts([]); setAllProducts([]);
      setRejectedProducts([]); setInactiveProducts([]);
      setTabCounts({ all: 0, pending: 0, approved: 0, rejected: 0, inactive: 0 });
      fetchedTabsRef.current = new Set();
      return;
    }
    // Reset the cache so every tab re-fetches for the new seller
    fetchedTabsRef.current = new Set();
    setProducts([]);
    setPendingProducts([]);
    setAllProducts([]);
    setRejectedProducts([]);
    setInactiveProducts([]);
    setRecycleBinProducts([]);
    setTabCounts({ all: 0, pending: 0, approved: 0, rejected: 0, inactive: 0 });
    fetchedTabsRef.current.add(activeView);
    if (activeView === "recycle-bin") {
      fetchRecycleBin(selectedSeller);
    } else {
      fetchTabProducts(selectedSeller, activeView);
    }
    // Always fetch recycle bin count eagerly so the badge shows immediately
    if (activeView !== "recycle-bin") {
      fetchRecycleBin(selectedSeller);
    }
    setCurrentPage(1);
  }, [selectedSeller]); // eslint-disable-line

  // ── When the active TAB changes: only fetch if not already loaded for this seller ──
  useEffect(() => {
    if (!selectedSeller) return;
    if (fetchedTabsRef.current.has(activeView)) {
      // Data already in state — just reset pagination, no refetch, no flash
      setCurrentPage(1);
      return;
    }
    fetchedTabsRef.current.add(activeView);
    if (activeView === "recycle-bin") {
      fetchRecycleBin(selectedSeller);
    } else {
      fetchTabProducts(selectedSeller, activeView);
    }
    setCurrentPage(1);
  }, [activeView]); // eslint-disable-line

  // ── edit modal ─────────────────────────────────────────────────────────────
  const openEditModal = async (productId: string) => {
    setEditProductId(productId);
    setEditSubmitting(false);
    editGalleryAccumRef.current = [];
    setEditVariants([]);
    setEditSelectedAttrValues({});

    try {
      const res = await api.get(`/api/products/${productId}`);
      const prod = res.product || res;

      console.log("[openEditModal] raw product keys:", Object.keys(prod));

      const featuredImg: string | null = prod.featuredImage || null;
      const rawGallery: string[] = [
        ...(Array.isArray(prod.galleryImages) ? prod.galleryImages : []),
        ...(Array.isArray(prod.images) ? prod.images : []),
      ];
      const resolvedGallery: string[] = [...new Set(rawGallery)].filter(
        (img) => img !== featuredImg
      );

      setEditFormData({
        title: prod.title || "",
        description: prod.description || "",
        price: prod.price?.toString() || "",
        stock: prod.stock?.toString() || "",
        category: prod.category || "",
        images: [],
        oldImages: prod.images || [],
        featuredImage: null,
        oldFeaturedImage: featuredImg,
        galleryImages: [],
        oldGalleryImages: resolvedGallery,
        tags: Array.isArray(prod.tags) ? prod.tags.join(", ") : prod.tags || "",
        artistName: prod.artistName || "",
        weight: prod.weight?.toString() || "",
        featured: prod.featured ?? false,
        type: (prod.type === "VARIABLE" ? "VARIABLE" : "SIMPLE") as "SIMPLE" | "VARIABLE",
      });
      setEditProductStatus(prod.status || "");

      // Load variants for VARIABLE products
      if (prod.type === "VARIABLE" && Array.isArray(prod.variants) && prod.variants.length > 0) {
        const loadedVariants = prod.variants.map((v: any) => {
          // Backend returns attributes as either plain strings OR objects { value, displayValue, hexColor, valueType }
          // Normalise to plain { attrName: "value" } so the generate/save logic works correctly
          const flatAttrs: Record<string, string> = {};
          Object.entries(v.attributes || {}).forEach(([k, val]: [string, any]) => {
            if (val && typeof val === "object") {
              flatAttrs[k] = String(val.value ?? val.displayValue ?? "");
            } else {
              flatAttrs[k] = String(val ?? "");
            }
          });
          return {
            id: v.id,
            price: v.price?.toString() || "",
            stock: v.stock?.toString() || "",
            sku: v.sku || "",
            attributes: flatAttrs,
          };
        });
        setEditVariants(loadedVariants);
        const attrMap: Record<string, string[]> = {};
        loadedVariants.forEach((v: any) => {
          Object.entries(v.attributes).forEach(([k, val]) => {
            if (!attrMap[k]) attrMap[k] = [];
            const strVal = String(val);
            if (!attrMap[k].includes(strVal)) attrMap[k].push(strVal);
          });
        });
        setEditSelectedAttrValues(attrMap);
      }

      setShowEditModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load product");
    }
  };

  const handleEditProduct = async () => {
    if (!editProductId) return;
    if (!editFormData.title) {
      toast.error("Please fill in the product title");
      return;
    }
    if (editFormData.type === "SIMPLE" && (!editFormData.price || !editFormData.stock)) {
      toast.error("Please fill in price and stock");
      return;
    }
    if (editFormData.type === "VARIABLE" && editVariants.length === 0) {
      toast.error("Please generate at least one variant");
      return;
    }

    try {
      setEditSubmitting(true);
      const form = new FormData();
      form.append("title", editFormData.title.trim());
      form.append("description", editFormData.description.trim());
      form.append("type", editFormData.type);
      if (editFormData.type === "VARIABLE") {
        form.append("variants", JSON.stringify(editVariants));
      } else {
        form.append("price", String(editFormData.price));
        form.append("stock", String(editFormData.stock));
      }
      form.append("category", editFormData.category.trim());
      form.append("tags", editFormData.tags);
      form.append("featured", String(editFormData.featured));
      if (editFormData.artistName) form.append("artistName", editFormData.artistName.trim());
      if (editFormData.weight) form.append("weight", editFormData.weight);

      // Featured image: prefer cropped file from state, fall back to input ref
      const featuredFile = editFormData.featuredImage ?? editFeaturedImageRef.current?.files?.[0] ?? null;
      if (featuredFile) {
        form.append("featuredImage", featuredFile);
      } else if (editFormData.oldFeaturedImage) {
        form.append("oldFeaturedImage", editFormData.oldFeaturedImage);
      }

      // Gallery images — send existing URLs + new files
      if (editFormData.oldGalleryImages?.length > 0) {
        editFormData.oldGalleryImages.forEach((url) => {
          form.append("existingGalleryImages", url);
        });
      }
      const galleryFiles = [...editGalleryAccumRef.current];
      if (galleryFiles.length > 0) {
        galleryFiles.forEach((f) => {
          form.append("galleryImages", f);
        });
      }
      if (galleryFiles.length === 0 && editFormData.oldGalleryImages?.length > 0) {
        form.append("keepExistingGallery", "true");
      }

      const stockNum = editFormData.type === "SIMPLE" ? Number(editFormData.stock) : Math.max(...editVariants.map(v => Number(v.stock) || 0));
      const wasRejected = editProductStatus === "REJECTED";

      await api.put(`/api/products/${editProductId}`, form);

      // For VARIABLE products, sync variants via bulk endpoint
      if (editFormData.type === "VARIABLE" && editVariants.length > 0) {
        await api.put(`/api/products/${editProductId}/variants/bulk`, {
          variants: editVariants.map(v => ({
            ...(v.id ? { id: v.id } : {}),
            sku: v.sku,
            price: Number(v.price),
            stock: Number(v.stock),
            isActive: true,
            attributes: v.attributes,
          }))
        });
      }

      if (wasRejected) {
        await api.post(`/api/admin/products/approve/${editProductId}`);
        if (editFormData.type === "SIMPLE" && stockNum <= 2) {
          await api.put(`/api/admin/products/deactivate/${editProductId}`, { reason: "Auto-deactivated due to low stock (≤ 2 units). Please update stock to re-activate." });
          toast.success("Product approved and saved — marked Inactive due to low stock (≤ 2). Update stock to activate.", { duration: 7000 });
        } else {
          toast.success("Product approved and is now Active.", { duration: 5000 });
        }
      } else {
        toast.success(`"${editFormData.title.trim()}" updated successfully!`, { duration: 5000 });
      }

      setShowEditModal(false);
      setEditProductId(null);
      setEditProductStatus("");
      editGalleryAccumRef.current = [];
      setEditVariants([]);
      setEditSelectedAttrValues({});
      fetchedTabsRef.current = new Set();
      fetchTabProducts(selectedSellerRef.current, activeViewRef.current);
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── approve / reject / inactivate / activate ──────────────────────────────
  const openAdminDeactivateModal = (productId: string) => {
    setAdminDeactivateProductId(productId);
    setAdminDeactivateReason("");
    setShowAdminDeactivateModal(true);
  };

  const handleAdminDeactivate = async () => {
    if (!adminDeactivateProductId) return;
    if (!adminDeactivateReason.trim()) {
      toast.error("Please enter a reason for deactivating this product.");
      return;
    }
    try {
      setAdminDeactivateSubmitting(true);
      await api.put(`/api/admin/products/deactivate/${adminDeactivateProductId}`, { reason: adminDeactivateReason.trim() });
      toast.success("Product deactivated. The seller has been notified with the reason.");
      setShowAdminDeactivateModal(false);
      setAdminDeactivateProductId(null);
      setAdminDeactivateReason("");
      fetchedTabsRef.current = new Set([activeViewRef.current]);
      fetchTabProducts(selectedSellerRef.current, activeViewRef.current);
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate product");
    } finally {
      setAdminDeactivateSubmitting(false);
    }
  };

  const handleActivate = async (productId: string) => {
    try {
      await api.put(`/api/admin/products/activate/${productId}`);
      toast.success("Product activated successfully!");
      fetchedTabsRef.current = new Set([activeViewRef.current]);
      fetchTabProducts(selectedSellerRef.current, activeViewRef.current);
    } catch {
      toast.error("Failed to activate product");
    }
  };

  const [approveSubmittingId, setApproveSubmittingId] = useState<string | null>(null);

  const handleApproveProduct = async (productId: string) => {
    try {
      setApproveSubmittingId(productId);
      await api.post(`/api/admin/products/approve/${productId}`);
      toast.success("Product approved successfully!");
      await refreshPending(sellersRef.current);
      fetchedTabsRef.current = new Set([activeViewRef.current]);
      fetchTabProducts(selectedSellerRef.current, activeViewRef.current);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve product");
    } finally {
      setApproveSubmittingId(null);
    }
  };

  const openRejectModal = (productId: string) => {
    setRejectProductId(productId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectProduct = async () => {
    if (!rejectProductId) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    try {
      setRejectSubmitting(true);
      await api.post(`/api/admin/products/reject/${rejectProductId}`, { reason: rejectReason.trim() });
      toast.success("Product rejected successfully!");
      setShowRejectModal(false);
      setRejectProductId(null);
      setRejectReason("");
      await refreshPending(sellersRef.current);
      fetchedTabsRef.current = new Set([activeViewRef.current]);
      fetchTabProducts(selectedSellerRef.current, activeViewRef.current);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject product");
    } finally {
      setRejectSubmitting(false);
    }
  };

  // ── Recycle Bin actions ───────────────────────────────────────────────────
  const handleRestoreFromBin = async (product: RecycleBinProduct) => {
    setRestoringId(product.id);
    try {
      await api.post(`/api/admin/products/${product.id}/restore`);
      toast.success(`"${product.title}" restored. Set it to Active when ready.`);
      fetchRecycleBin(selectedSeller);
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore product");
    } finally {
      setRestoringId(null);
    }
  };

  const openDeleteConfirm = (product: RecycleBinProduct) => {
    setDeleteTarget(product);
    setDeleteReason("");
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await apiClient(`/api/admin/products/${deleteTarget.id}/permanent`, {
        method: "DELETE",
        body: deleteReason.trim() ? JSON.stringify({ reason: deleteReason.trim() }) : undefined,
      });
      toast.success(`"${deleteTarget.title}" permanently deleted.`);
      setDeleteTarget(null);
      setDeleteReason("");
      fetchRecycleBin(selectedSeller);
    } catch (err: any) {
      toast.error(err?.message || "Failed to permanently delete product");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSoftDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to move this product to the Recycle Bin?")) return;
    try {
      await apiClient(`/api/admin/products/${productId}`, { method: "DELETE" });
      toast.success("Product moved to recycle bin");
      fetchProducts(selectedSeller);
      fetchRecycleBin(selectedSeller);
    } catch (err: any) {
      toast.error(err?.message || "Failed to move product to recycle bin");
    }
  };

  const currentProducts =
    activeView === "approved" ? products :
    activeView === "pending" ? pendingProducts :
    activeView === "all" ? allProducts :
    activeView === "rejected" ? rejectedProducts :
    activeView === "inactive" ? inactiveProducts :
    []; // recycle-bin handled separately

  const rbTotalPages = Math.max(1, Math.ceil(recycleBinProducts.length / itemsPerPage));
  const rbPaginatedProducts = recycleBinProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categories = Array.from(new Set(currentProducts.map(p => p.category).filter(Boolean)));
  const filteredCurrentProducts = currentProducts.filter(p =>
    (search ? (p.title?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())) : true) &&
    (categoryFilter ? p.category === categoryFilter : true)
  );

  const totalPages = Math.max(1, Math.ceil(filteredCurrentProducts.length / itemsPerPage));
  const paginatedProducts = filteredCurrentProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setExpandedProductId(null);
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">View and manage products by seller.</p>
        </div>

        <div className="flex flex-wrap gap-2 items-end w-full md:w-auto md:justify-end">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              className="border rounded px-3 py-2 pr-8 w-[200px] h-10 bg-background text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            className="border rounded px-3 py-2 w-[180px] h-10 bg-background text-sm"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Seller Dropdown */}
          <div className="min-w-[260px] relative" ref={sellerDropdownRef}>
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
                      {s.name} <PendingPill count={s.pendingCount} />
                    </span>
                  );
                })() : "Select a seller"}
              </span>
              <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isSellerDropdownOpen && "rotate-180")} />
            </div>

            {isSellerDropdownOpen && (
              <div className="absolute z-[60] right-0 w-full mt-1 bg-background rounded-lg border shadow-xl p-1 min-w-[400px] animate-in fade-in zoom-in-95">
                <div className="max-h-[300px] overflow-y-auto">
                  {loadingSellers ? (
                    <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : sellers.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">No sellers found.</div>
                  ) : sellers.map((seller) => (
                    <div
                      key={seller.id}
                      className={cn(
                        "flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary",
                        selectedSeller === seller.id && "bg-primary/5 text-primary font-medium"
                      )}
                      onClick={(e) => { e.stopPropagation(); setSelectedSeller(seller.id); setIsSellerDropdownOpen(false); }}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary transition-all",
                        selectedSeller === seller.id ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                      )}>
                        {selectedSeller === seller.id && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <div className="flex flex-col min-w-0 mr-3">
                          <span className="font-medium truncate">{seller.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{seller.email}</span>
                        </div>
                        <PendingPill count={seller.pendingCount} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-1 border-b pb-3 mb-2">
        <Button
          variant={activeView !== "recycle-bin" ? "default" : "ghost"}
          size="sm"
          onClick={() => { if (activeView === "recycle-bin") { setActiveView("approved"); setCurrentPage(1); } }}
          className="gap-1.5"
        >
          <Package className="h-4 w-4" /> Products ({(tabCounts.all || allProducts.length) || (products.length + pendingProducts.length + rejectedProducts.length + inactiveProducts.length)})
        </Button>
        <Button
          variant={activeView === "recycle-bin" ? "default" : "ghost"}
          size="sm"
          onClick={() => { setActiveView("recycle-bin"); setCurrentPage(1); }}
          className={cn("gap-1.5", activeView !== "recycle-bin" && "text-muted-foreground")}
        >
          <Trash2 className="h-4 w-4" /> Recycle Bin ({recycleBinProducts.length})
        </Button>
      </div>

      {activeView !== "recycle-bin" && (
        <div className="flex gap-1 flex-wrap border-b pb-2 mb-1">
          {([
            { key: "all",      label: "All",      count: tabCounts.all || allProducts.length,         cls: "" },
            { key: "approved", label: "Approved", count: tabCounts.approved || products.length,       cls: "text-green-700 dark:text-green-400" },
            { key: "pending",  label: "Pending",  count: tabCounts.pending || pendingProducts.length, cls: "text-yellow-700 dark:text-yellow-400" },
            { key: "rejected", label: "Rejected", count: tabCounts.rejected || rejectedProducts.length, cls: "text-red-600 dark:text-red-400" },
            { key: "inactive", label: "Inactive", count: tabCounts.inactive || inactiveProducts.length, cls: "text-gray-500 dark:text-gray-400" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveView(tab.key); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
                activeView === tab.key
                  ? "border border-b-background border-b-0 -mb-px bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                activeView === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Recycle Bin Tab ─────────────────────────────────────────────────── */}
      {activeView === "recycle-bin" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Recycle Bin</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{recycleBinProducts.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Deleted by Sellers</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{recycleBinProducts.filter(p => p.deletedByRole === "SELLER").length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Deleted by Admins</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{recycleBinProducts.filter(p => p.deletedByRole === "ADMIN").length}</div></CardContent>
            </Card>
          </div>

          {loadingRecycleBin ? (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="min-w-full divide-y divide-muted">
                <thead className="bg-muted/50">
                  <tr>{["Image","Title","Seller","Price","Stock","Deleted On","Deleted By","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-12 w-12 rounded" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="h-8 w-16 rounded-md" /><Skeleton className="h-8 w-28 rounded-md" /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : recycleBinProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <Trash2 className="h-12 w-12 text-muted-foreground/25" />
                <p className="text-lg font-semibold text-muted-foreground">Recycle Bin is empty for this seller</p>
                <p className="text-sm text-muted-foreground">No soft-deleted products found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="min-w-full divide-y divide-muted">
                <thead className="bg-muted/50">
                  <tr>{["Image","Title","Seller","Price","Stock","Deleted On","Deleted By","Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {rbPaginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2">
                        {product.featuredImage ? (
                          <NextImage src={product.featuredImage} alt={product.title} width={48} height={48}
                            className="h-12 w-12 object-cover rounded opacity-60" unoptimized
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"; }} />
                        ) : (
                          <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                            <LucideImage className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-semibold text-muted-foreground line-clamp-1">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.category || "—"}</p>
                      </td>
                      <td className="px-4 py-2">
                        {product.seller ? (
                          <div>
                            <p className="text-sm font-medium">{product.seller.name}</p>
                            <p className="text-xs text-muted-foreground">{product.seller.email}</p>
                          </div>
                        ) : product.sellerName ? (
                          <p className="text-sm font-medium">{product.sellerName}</p>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatPrice(product)}</td>
                      <td className="px-4 py-2 text-sm">{product.stock}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(product.deletedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                          product.deletedByRole === "ADMIN" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {product.deletedByRole === "ADMIN" ? "Deleted by Admin" : "Deleted by Seller"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setViewBinProduct(product)}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={restoringId === product.id} onClick={() => handleRestoreFromBin(product)}>
                            {restoringId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Restore
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteConfirm(product)}>
                            <Trash2 className="h-3 w-3" /> Delete Permanently
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingRecycleBin && rbTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, recycleBinProducts.length)}–{Math.min(currentPage * itemsPerPage, recycleBinProducts.length)} of {recycleBinProducts.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === rbTotalPages} onClick={() => handlePageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Standard product views ──────────────────────────────────────────── */}
      {activeView !== "recycle-bin" && (<>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{currentProducts.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{currentProducts.reduce((s, p) => s + (Number(p.stock) || 0), 0)}</div></CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${currentProducts.reduce((s, p) => {
            const price = p.type === "VARIABLE" && Array.isArray(p.variants) && p.variants.length > 0
              ? Math.min(...p.variants.map(v => Number(v.price)).filter(n => !isNaN(n) && n > 0))
              : Number(p.price);
            return s + (isFinite(price) ? price : 0) * (Number((p as any).sales) || 0);
          }, 0).toLocaleString()}</div></CardContent>
        </Card> */}
      </div>

      {/* Product list */}
      {(activeView === "approved" ? loading : activeView === "pending" ? loadingPending : activeView === "all" ? loadingAll : activeView === "rejected" ? loadingRejected : loadingInactive) ? (
        <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-muted/50">
                <tr>
                  {["Image", "Title", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-12 w-12 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Skeleton className="h-8 w-16 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-14 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      ) : filteredCurrentProducts.length === 0 ? (
        <Card className="col-span-full text-center py-12">
          {(search || categoryFilter) ? "No products match your search." : `No ${activeView === "approved" ? "approved" : activeView === "pending" ? "pending" : activeView === "rejected" ? "rejected" : activeView === "inactive" ? "inactive" : ""} products found.`}
        </Card>
      ) : (

        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="min-w-full divide-y divide-muted">
            <thead className="bg-muted/50">
              <tr>
                {["Image", "Title", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2">
                      {(product.featuredImage || product.images?.length) ? (
                        <NextImage src={product.featuredImage || product.images![0]} alt={product.title || "Product"} width={48} height={48}
                          className="h-12 w-12 object-cover rounded"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"; }} />
                      ) : (
                        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                          <LucideImage className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-semibold">{product.title}</p>
                      {product.seller && (
                        <p className="text-xs text-muted-foreground mt-0.5">{product.seller.name}</p>
                      )}
                      {product.rejectionReason && (
                        <p className="text-xs text-red-600 mt-0.5 line-clamp-2" title={product.rejectionReason}>
                          <AlertCircle className="inline h-3 w-3 mr-1 align-middle" />
                          {product.rejectionReason}
                        </p>
                      )}
                      {product.status === "PENDING" && product.reviewNote && (
                        <p className="text-xs text-blue-600 mt-0.5 line-clamp-2" title={product.reviewNote}>
                          <AlertCircle className="inline h-3 w-3 mr-1 align-middle" />
                          Seller note: {product.reviewNote}
                        </p>
                      )}
                      {product.status === "INACTIVE" && product.sellerInactiveReason && (
                        <p className="text-xs text-orange-600 mt-0.5 line-clamp-2" title={product.sellerInactiveReason}>
                          <AlertCircle className="inline h-3 w-3 mr-1 align-middle" />
                          Seller reason: {product.sellerInactiveReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">{product.category}</td>
                    <td className="px-4 py-2 text-primary font-bold">{formatPrice(product)}</td>
                    <td className="px-4 py-2">{product.stock}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 items-center">
                        {(product.status === "ACTIVE" || product.status === "INACTIVE") ? (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditModal(product.id)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="outline" size="sm" className="gap-1"
                              onClick={() => router.push(`/admindashboard/products/${product.id}`)}
                              title="View">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleSoftDeleteProduct(product.id)} title="Move to Recycle Bin">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <div className="flex items-center gap-1.5 px-2">
                              <Switch
                                checked={product.status === "ACTIVE"}
                                disabled={(product.stock ?? 0) <= 2 && product.status !== "ACTIVE"}
                                title={(product.stock ?? 0) <= 2 && product.status !== "ACTIVE" ? "Cannot activate — stock is 2 or less" : undefined}
                                onCheckedChange={(checked) =>
                                  checked ? handleActivate(product.id) : openAdminDeactivateModal(product.id)
                                }
                              />
                              <span className={`text-xs font-medium ${product.status === "INACTIVE" ? "text-red-500" : "text-green-600"}`}>
                                {product.status === "INACTIVE" ? ((product.stock ?? 0) <= 2 ? "Low Stock" : "Inactive") : "Active"}
                              </span>
                            </div>
                          </>
                        ) : product.status === "PENDING" ? (
                          <>
                            <Button variant="outline" size="sm" className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApproveProduct(product.id)} disabled={approveSubmittingId === product.id}>
                              {approveSubmittingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => openRejectModal(product.id)}><XCircle className="h-3 w-3" />Reject</Button>
                            <Button variant="outline" size="sm" className="gap-1"
                              onClick={() => router.push(`/admindashboard/products/${product.id}`)}
                              title="View">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </>
                        ) : (
                          /* REJECTED: edit + view only — no Approve until seller resubmits */
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditModal(product.id)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="outline" size="sm" className="gap-1"
                              onClick={() => router.push(`/admindashboard/products/${product.id}`)}
                              title="View">
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      )}

      {/* Pagination */}
      {!((activeView === "approved" ? loading : activeView === "pending" ? loadingPending : activeView === "all" ? loadingAll : activeView === "rejected" ? loadingRejected : loadingInactive)) && filteredCurrentProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          {/* Left: count info + per-page */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCurrentProducts.length)}
              </span>
              {"\u2013"}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredCurrentProducts.length)}
              </span>
              {" of "}
              <span className="font-medium text-foreground">{filteredCurrentProducts.length}</span>
              {" products"}
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
                  {[6, 12, 24, 48].map((n) => (
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
      </>)} {/* end activeView !== "recycle-bin" */}

      {/* Admin Deactivate Modal */}
      {showAdminDeactivateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-orange-500" /> Deactivate Product
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAdminDeactivateModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted" disabled={adminDeactivateSubmitting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">A reason is required. The seller will be notified with this reason.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Reason for Deactivation <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="e.g. Product images do not meet quality standards."
                  value={adminDeactivateReason}
                  onChange={(e) => setAdminDeactivateReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={adminDeactivateSubmitting}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{adminDeactivateReason.length} characters</p>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAdminDeactivateModal(false)} disabled={adminDeactivateSubmitting} className="h-10 px-4">Cancel</Button>
              <Button
                className="h-10 px-6 font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleAdminDeactivate}
                disabled={adminDeactivateSubmitting || !adminDeactivateReason.trim()}
              >
                {adminDeactivateSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deactivating...</> : "Deactivate Product"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" /> Reject Product
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted" disabled={rejectSubmitting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Please provide a reason for rejecting this product. The seller will be notified.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Rejection Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="e.g. Product images are unclear, description is incomplete, pricing is incorrect..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={rejectSubmitting}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{rejectReason.length} characters</p>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={rejectSubmitting} className="h-10 px-4">Cancel</Button>
              <Button variant="destructive" onClick={handleRejectProduct} disabled={rejectSubmitting || !rejectReason.trim()} className="h-10 px-6 font-semibold">
                {rejectSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting...</> : <><XCircle className="mr-2 h-4 w-4" />Reject Product</>}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Drawer */}
      <Sheet open={showEditModal} onOpenChange={(open) => { if (!open) { editGalleryAccumRef.current = []; setEditVariants([]); setEditSelectedAttrValues({}); setShowEditModal(false); } }}>
        <SheetContent side="right" className={cn("w-full flex flex-col p-0 gap-0 overflow-hidden transition-all duration-300", editFormData.type === "VARIABLE" ? "sm:max-w-5xl" : "sm:max-w-xl")} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="text-xl font-bold">Edit Product</SheetTitle>
            {editProductStatus === "REJECTED" ? (
              <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>This product was rejected. Saving will auto-approve it and make it Active.</span>
              </div>
            ) : null}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Product Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Product Type</Label>
              <div className="flex rounded-lg border p-1 bg-muted/20 gap-1">
                {(["SIMPLE", "VARIABLE"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
                      editFormData.type === type
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setEditFormData((prev) => ({ ...prev, type }))}
                  >
                    {type === "SIMPLE" ? "Simple Product" : "Variable Product"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {editFormData.type === "SIMPLE"
                  ? "A single product with one price and stock quantity."
                  : "A product with multiple variants (e.g. different sizes or colours, each with their own price and stock)."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                <Input placeholder="Give your product a clear name" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="focus:ring-primary h-10" />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-sm font-semibold">Detailed Description</Label>
                <Textarea placeholder="Product details..." value={editFormData.description} rows={4} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} className="resize-none focus:ring-primary py-2" />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-sm font-semibold">Artist Name (Optional)</Label>
                <Input placeholder="Enter artist name" value={editFormData.artistName} onChange={(e) => setEditFormData({ ...editFormData, artistName: e.target.value })} className="focus:ring-primary h-10" />
              </div>

              {editFormData.type === "SIMPLE" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Price ($) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" placeholder="0.00" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} className="pl-9 focus:ring-primary h-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Stock Quantity <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="0" value={editFormData.stock} onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })} className="focus:ring-primary h-10" />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Weight (kg)</Label>
                <Input type="number" placeholder="1" min="0" step="0.01" value={editFormData.weight} onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })} className="focus:ring-primary h-10" />
              </div>

              <div className="space-y-2 relative" ref={editCatDropdownRef}>
                <Label className="text-sm font-semibold">Category <span className="text-red-500">*</span></Label>
                <div
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all hover:border-primary/50 cursor-pointer"
                  onClick={() => setIsEditCatOpen(!isEditCatOpen)}
                >
                  <span className={editFormData.category ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {editFormData.category || "Select a category"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isEditCatOpen && "rotate-180")} />
                </div>
                {isEditCatOpen && (
                  <div className="absolute z-[60] w-full mt-1 bg-background text-popover-foreground rounded-lg border shadow-xl p-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                    <div className="flex items-center border-b px-3 pb-2 pt-1">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Search categories..."
                        value={editCatSearch}
                        onChange={(e) => setEditCatSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto mt-1 custom-scrollbar">
                      {availableCategories.length === 0 ? (
                        <div className="py-4 text-center">
                          <Button variant="ghost" size="sm" className="text-xs text-primary underline"
                            onClick={(e) => { e.stopPropagation(); loadCategories(); }}>Refresh Categories</Button>
                        </div>
                      ) : availableCategories
                        .filter(cat => cat.categoryName.toLowerCase().includes(editCatSearch.toLowerCase()))
                        .map((cat) => (
                          <div
                            key={cat.categoryName}
                            className={cn(
                              "group relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary",
                              editFormData.category === cat.categoryName && "bg-primary/5 text-primary font-medium"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditFormData({ ...editFormData, category: cat.categoryName });
                              setIsEditCatOpen(false);
                              setEditCatSearch("");
                            }}
                          >
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                              editFormData.category === cat.categoryName ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                            )}>
                              {editFormData.category === cat.categoryName && <Check className="h-3 w-3" />}
                            </div>
                            {cat.categoryName}
                          </div>
                        ))}
                      {availableCategories.length > 0 && availableCategories.filter(cat => cat.categoryName.toLowerCase().includes(editCatSearch.toLowerCase())).length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">No category found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Variable Product – Attribute-First Variant Builder */}
            {editFormData.type === "VARIABLE" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Product Variants <span className="text-red-500">*</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Select attribute values → generate all combinations automatically.</p>
                  </div>
                  {editVariants.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                      {editVariants.length} variant{editVariants.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {availableAttributes.length > 0 ? (
                  <div className="rounded-xl border bg-muted/10 divide-y overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 1 — Select Attribute Values</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateAttr(v => !v)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        New Attribute
                      </button>
                    </div>
                    {showCreateAttr && (
                      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Create New Attribute</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                            <Input
                              placeholder="e.g. shoe_size"
                              className="h-8 text-xs"
                              value={newAttrName}
                              onChange={e => setNewAttrName(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">Lowercase, no spaces (used as key)</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Display Name</Label>
                            <Input
                              placeholder="e.g. Shoe Size"
                              className="h-8 text-xs"
                              value={newAttrDisplayName}
                              onChange={e => setNewAttrDisplayName(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">Label shown to customers</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value Type <span className="text-red-500">*</span></Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setNewAttrValueType("text")}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                                newAttrValueType === "text"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              Text
                              <span className="block text-[10px] font-normal opacity-70 mt-0.5">S, M, L, XL</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewAttrValueType("number")}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                                newAttrValueType === "number"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              Number
                              <span className="block text-[10px] font-normal opacity-70 mt-0.5">6, 7, 8, 9, 10</span>
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Values <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder={newAttrValueType === "number" ? "6, 7, 8, 9, 10, 11" : "XS, S, M, L, XL"}
                            className="h-8 text-xs"
                            value={newAttrValuesInput}
                            onChange={e => setNewAttrValuesInput(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">Comma-separated list of values</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setShowCreateAttr(false); setNewAttrName(""); setNewAttrDisplayName(""); setNewAttrValueType("text"); setNewAttrValuesInput(""); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={isCreatingAttr}
                            onClick={handleCreateAttribute}
                          >
                            {isCreatingAttr ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Create Attribute
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-4">
                      {availableAttributes.map((attr) => {
                        const selected = editSelectedAttrValues[attr.name] ?? [];
                        const isNumberType = attr.valueType?.toLowerCase() === "number";
                        const effectiveMode = customSizeModeEdit[attr.name] ?? (isNumberType ? "number" : "text");
                        const sortedValues = isNumberType
                          ? [...(attr.values ?? [])].sort((a: any, b: any) => {
                              const aVal = Number(a?.value ?? 0);
                              const bVal = Number(b?.value ?? 0);
                              return aVal - bVal;
                            })
                          : (attr.values ?? []);
                        return (
                          <div key={attr.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-semibold text-foreground">{(attr.displayName || attr.name).replace(/^\w/, (c: string) => c.toUpperCase())}</Label>
                                <span className={cn(
                                  "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                  effectiveMode === "number"
                                    ? "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800"
                                    : "text-muted-foreground bg-muted/50 border-border"
                                )}>
                                  {effectiveMode === "number" ? "number" : "text"}
                                </span>
                              </div>
                              {selected.length > 0 && (
                                <button type="button" className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                  onClick={() => setEditSelectedAttrValues(prev => { const n = { ...prev }; delete n[attr.name]; return n; })}>
                                  Clear
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {sortedValues.map((v: any, vi: number) => {
                                const rawVal = v?.value;
                                const strValue: string = rawVal && typeof rawVal === "object"
                                  ? String(rawVal.value ?? rawVal.displayValue ?? "")
                                  : String(rawVal ?? "");
                                const displayText: string = v?.displayName
                                  || (rawVal && typeof rawVal === "object" ? (rawVal.displayValue ?? rawVal.value) : null)
                                  || v?.displayValue || strValue;
                                const hexColor: string | null = v?.hexCode
                                  || (rawVal && typeof rawVal === "object" ? rawVal.hexColor : null)
                                  || v?.hexColor || null;
                                const isSelected = selected.includes(strValue);
                                return (
                                  <button
                                    key={v?.id ?? vi}
                                    type="button"
                                    onClick={() => {
                                      setEditSelectedAttrValues(prev => {
                                        const cur = prev[attr.name] ?? [];
                                        const next = isSelected ? cur.filter(x => x !== strValue) : [...cur, strValue];
                                        if (next.length === 0) { const n = { ...prev }; delete n[attr.name]; return n; }
                                        return { ...prev, [attr.name]: next };
                                      });
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all select-none",
                                      isNumberType ? "rounded font-mono" : "rounded-full",
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                                        : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                                    )}
                                  >
                                    {hexColor && <span className="h-3 w-3 rounded-full border border-white/50 flex-shrink-0" style={{ backgroundColor: hexColor }} />}
                                    {displayText}
                                    {isSelected && <Check className="h-3 w-3 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                              {/* Custom selected values (typed in by user) */}
                              {selected.filter(sv => !sortedValues.some((v: any) => {
                                const raw = v?.value;
                                return String(raw && typeof raw === "object" ? (raw.value ?? raw.displayValue ?? "") : raw ?? "") === sv;
                              })).map(customVal => (
                                <button
                                  key={`custom-${customVal}`}
                                  type="button"
                                  onClick={() => setEditSelectedAttrValues(prev => {
                                    const cur = prev[attr.name] ?? [];
                                    const next = cur.filter(x => x !== customVal);
                                    if (next.length === 0) { const n = { ...prev }; delete n[attr.name]; return n; }
                                    return { ...prev, [attr.name]: next };
                                  })}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 select-none",
                                    isNumberType ? "rounded font-mono" : "rounded-full"
                                  )}
                                >
                                  {customVal}
                                  <X className="h-3 w-3 flex-shrink-0" />
                                </button>
                              ))}
                              {/* Quick-pick presets — shown when no attribute values are configured */}
                              {(attr.name !== "color" && attr.name !== "material") && sortedValues.length === 0 && (
                                effectiveMode === "text"
                                  ? ["XS", "S", "M", "L", "XL", "2XL", "3XL"]
                                  : ["5", "6", "7", "8", "9", "10", "11", "12", "13"]
                              ).map(preset => {
                                const isPresetSelected = selected.includes(preset);
                                return (
                                  <button
                                    key={`preset-${preset}`}
                                    type="button"
                                    onClick={() => setEditSelectedAttrValues(prev => {
                                      const cur = prev[attr.name] ?? [];
                                      const next = isPresetSelected ? cur.filter(x => x !== preset) : [...cur, preset];
                                      if (next.length === 0) { const n = { ...prev }; delete n[attr.name]; return n; }
                                      return { ...prev, [attr.name]: next };
                                    })}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all select-none",
                                      effectiveMode === "number" ? "rounded font-mono" : "rounded-full",
                                      isPresetSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                                        : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                                    )}
                                  >
                                    {preset}
                                    {isPresetSelected && <Check className="h-3 w-3 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                            {attr.name !== "color" && attr.name !== "material" && (
                            <div className="space-y-2 mt-2 pt-2 border-t border-dashed">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Add sizes as:</span>
                                <button type="button"
                                  onClick={() => setCustomSizeModeEdit(prev => ({ ...prev, [attr.name]: "text" }))}
                                  className={cn("px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                                    effectiveMode === "text" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                                  )}>Text</button>
                                <button type="button"
                                  onClick={() => setCustomSizeModeEdit(prev => ({ ...prev, [attr.name]: "number" }))}
                                  className={cn("px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                                    effectiveMode === "number" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                                  )}>Number</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  placeholder={effectiveMode === "number" ? "Custom: 8.5, 9.5, 10.5..." : "Custom: 2XL, 6XL..."}
                                  className={cn("h-7 w-44 text-xs", effectiveMode === "number" && "font-mono")}
                                  value={customNumericEdit[attr.name] ?? ""}
                                  onChange={e => setCustomNumericEdit(prev => ({ ...prev, [attr.name]: e.target.value }))}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const raw = (customNumericEdit[attr.name] ?? "").trim();
                                      if (!raw) return;
                                      const isNum = effectiveMode === "number";
                                      const vals = raw.split(",").map(s => s.trim()).filter(s => s && (!isNum || !isNaN(Number(s))));
                                      if (!vals.length) return;
                                      setEditSelectedAttrValues(prev => {
                                        const cur = prev[attr.name] ?? [];
                                        const added = vals.filter(v => !cur.includes(v));
                                        return added.length ? { ...prev, [attr.name]: [...cur, ...added] } : prev;
                                      });
                                      setCustomNumericEdit(prev => ({ ...prev, [attr.name]: "" }));
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-border bg-background text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-40"
                                  disabled={!(customNumericEdit[attr.name] ?? "").trim()}
                                  onClick={() => {
                                    const raw = (customNumericEdit[attr.name] ?? "").trim();
                                    if (!raw) return;
                                    const isNum = effectiveMode === "number";
                                    const vals = raw.split(",").map(s => s.trim()).filter(s => s && (!isNum || !isNaN(Number(s))));
                                    if (!vals.length) return;
                                    setEditSelectedAttrValues(prev => {
                                      const cur = prev[attr.name] ?? [];
                                      const added = vals.filter(v => !cur.includes(v));
                                      return added.length ? { ...prev, [attr.name]: [...cur, ...added] } : prev;
                                    });
                                    setCustomNumericEdit(prev => ({ ...prev, [attr.name]: "" }));
                                  }}
                                >
                                  <Plus className="h-3 w-3" /> Add
                                </button>
                              </div>
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    {!showCreateAttr ? (
                      <div className="border-dashed p-6 text-center space-y-3">
                        <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm font-medium text-muted-foreground">No attributes configured</p>
                        <p className="text-xs text-muted-foreground/70">Create an attribute (e.g. Size, Colour) to enable variants.</p>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreateAttr(true)}>
                          <Plus className="h-3.5 w-3.5" />
                          Create First Attribute
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Create New Attribute</p>
                          <button type="button" onClick={() => setShowCreateAttr(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. shoe_size" className="h-8 text-xs" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
                            <p className="text-[10px] text-muted-foreground">Lowercase, no spaces</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Display Name</Label>
                            <Input placeholder="e.g. Shoe Size" className="h-8 text-xs" value={newAttrDisplayName} onChange={e => setNewAttrDisplayName(e.target.value)} />
                            <p className="text-[10px] text-muted-foreground">Label shown to customers</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value Type <span className="text-red-500">*</span></Label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setNewAttrValueType("text")} className={cn("flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all", newAttrValueType === "text" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50")}>
                              Text<span className="block text-[10px] font-normal opacity-70 mt-0.5">S, M, L, XL</span>
                            </button>
                            <button type="button" onClick={() => setNewAttrValueType("number")} className={cn("flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all", newAttrValueType === "number" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50")}>
                              Number<span className="block text-[10px] font-normal opacity-70 mt-0.5">6, 7, 8, 9, 10</span>
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Values <span className="text-red-500">*</span></Label>
                          <Input placeholder={newAttrValueType === "number" ? "6, 7, 8, 9, 10, 11" : "XS, S, M, L, XL"} className="h-8 text-xs" value={newAttrValuesInput} onChange={e => setNewAttrValuesInput(e.target.value)} />
                          <p className="text-[10px] text-muted-foreground">Comma-separated</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowCreateAttr(false); setNewAttrName(""); setNewAttrDisplayName(""); setNewAttrValueType("text"); setNewAttrValuesInput(""); }}>Cancel</Button>
                          <Button type="button" size="sm" className="h-7 text-xs gap-1" disabled={isCreatingAttr} onClick={handleCreateAttribute}>
                            {isCreatingAttr ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Create Attribute
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {Object.keys(editSelectedAttrValues).length > 0 && (
                  <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 2 — Generate Variants</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => {
                            const counts = Object.values(editSelectedAttrValues).map(v => v.length);
                            const total = counts.reduce((a, b) => a * b, 1);
                            return `${total} combination${total !== 1 ? "s" : ""} will be created`;
                          })()}
                        </p>
                      </div>
                      <Button type="button" size="sm" className="gap-1.5 h-8 text-xs font-semibold"
                        onClick={() => {
                          const attrNames = Object.keys(editSelectedAttrValues);
                          const attrValueSets = attrNames.map(k => editSelectedAttrValues[k]);
                          const cartesian = (sets: string[][]): string[][] => {
                            if (sets.length === 0) return [[]];
                            const [first, ...rest] = sets;
                            const restProduct = cartesian(rest);
                            return first.flatMap(v => restProduct.map(p => [v, ...p]));
                          };
                          const combos = cartesian(attrValueSets);
                          if (combos.length > 100) { toast.error("Too many variants — maximum 100 allowed."); return; }
                          const generated = combos.map((combo) => {
                            const attrs: Record<string, string> = {};
                            attrNames.forEach((name, i) => { attrs[name] = combo[i]; });
                            const skuParts = combo.map(v => String(v).replace(/\s+/g, "-").toUpperCase());
                            const sku = `SKU-${skuParts.join("-")}`;
                            const existing = editVariants.find(v => JSON.stringify(v.attributes) === JSON.stringify(attrs));
                            return { id: existing?.id, attributes: attrs, price: existing?.price ?? "", stock: existing?.stock ?? "", sku: existing?.sku ?? sku };
                          });
                          setEditVariants(generated);
                          toast.success(`${generated.length} variant${generated.length !== 1 ? "s" : ""} generated!`);
                        }}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Generate Variants
                      </Button>
                    </div>
                  </div>
                )}

                {editVariants.length > 0 && (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap items-center gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                        Step 3 — Set Prices &amp; Stock
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Bulk set:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input type="number" placeholder="Price" className="pl-5 h-7 w-24 text-xs" value={editBulkPrice} onChange={e => setEditBulkPrice(e.target.value)} />
                          </div>
                          <Input type="number" placeholder="Stock" className="h-7 w-20 text-xs" value={editBulkStock} onChange={e => setEditBulkStock(e.target.value)} />
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-3"
                            onClick={() => {
                              if (!editBulkPrice && !editBulkStock) return;
                              setEditVariants(prev => prev.map(v => ({
                                ...v,
                                ...(editBulkPrice ? { price: editBulkPrice } : {}),
                                ...(editBulkStock ? { stock: editBulkStock } : {}),
                              })));
                              setEditBulkPrice(""); setEditBulkStock("");
                              toast.success("Applied to all variants");
                            }}
                          >Apply All</Button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/20 border-b">
                          <tr>
                            {Object.keys(editVariants[0]?.attributes ?? {})
                              .sort((a, b) => (b.toLowerCase().includes("color") ? 1 : 0) - (a.toLowerCase().includes("color") ? 1 : 0))
                              .map(k => (
                                <th key={k} className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">{k}</th>
                              ))}
                            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Price ($)*</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Stock*</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">SKU</th>
                            <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Del</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/60">
                          {editVariants.map((variant, idx) => (
                            <tr key={idx} className={cn("hover:bg-muted/10 transition-colors", (!variant.price || !variant.stock) && "bg-amber-50/40 dark:bg-amber-950/10")}>
                              {Object.keys(variant.attributes)
                                .sort((a, b) => (b.toLowerCase().includes("color") ? 1 : 0) - (a.toLowerCase().includes("color") ? 1 : 0))
                                .map(k => {
                                  const v = variant.attributes[k];
                                  return (
                                    <td key={k} className="px-3 py-2">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[11px]">
                                        {typeof v === "object" && v !== null
                                          ? String((v as any).value ?? (v as any).displayValue ?? JSON.stringify(v))
                                          : String(v ?? "")}
                                      </span>
                                    </td>
                                  );
                                })}
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input type="number" placeholder="0.00" step="0.01"
                                    className={cn("pl-5 h-7 w-24 text-xs", !variant.price && "border-amber-400 focus-visible:ring-amber-400")}
                                    value={variant.price}
                                    onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, price: e.target.value } : v2))}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Input type="number" placeholder="0"
                                  className={cn("h-7 w-20 text-xs", !variant.stock && "border-amber-400 focus-visible:ring-amber-400")}
                                  value={variant.stock}
                                  onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, stock: e.target.value } : v2))}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input type="text" className="h-7 w-32 text-xs font-mono" value={variant.sku}
                                  onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, sku: e.target.value } : v2))}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button type="button"
                                  className="h-6 w-6 rounded-full inline-flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  onClick={() => setEditVariants(prev => prev.filter((_, i) => i !== idx))}>
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 bg-muted/10 border-t flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {editVariants.filter(v => v.price && v.stock).length}/{editVariants.length} variants have price &amp; stock set
                      </p>
                      {editVariants.some(v => !v.price || !v.stock) && (
                        <span className="text-[11px] text-amber-600 font-medium">⚠ Fill in price &amp; stock for all variants before publishing</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Promotion Tags</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {["New Arrival", "Sale", "Best Seller", "Limited Edition"].map(tag => {
                  const currentTags = editFormData.tags ? editFormData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
                  const isChecked = currentTags.includes(tag);
                  return (
                    <div
                      key={tag}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none",
                        isChecked ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-muted/10 border-transparent hover:bg-muted/20"
                      )}
                      onClick={() => {
                        const newTags = isChecked ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
                        setEditFormData({ ...editFormData, tags: newTags.join(", ") });
                      }}
                    >
                      <div className={cn("flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                        isChecked ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50")}>
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm font-medium">{tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold cursor-pointer">Featured Product</Label>
                <p className="text-[11px] text-muted-foreground">Highlight this product on the homepage</p>
              </div>
              <Switch checked={editFormData.featured} onCheckedChange={(checked) => setEditFormData({ ...editFormData, featured: checked })} />
            </div>

            {/* Featured Image */}
            <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-semibold">Featured Image</Label>
                <span className="text-[10px] text-muted-foreground">Main product image</span>
              </div>
              <input
                ref={editFeaturedImageRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) { e.target.value = ""; openCrop(file); }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <div className="flex gap-3 flex-wrap pt-2">
                {editFormData.oldFeaturedImage && !editFormData.featuredImage && (
                  <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                    <NextImage src={editFormData.oldFeaturedImage} alt="Featured" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full"
                        onClick={() => setEditFormData((prev) => ({ ...prev, oldFeaturedImage: null }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {editFormData.featuredImage && (
                  <div className="flex items-start gap-3">
                    <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                      <NextImage src={URL.createObjectURL(editFormData.featuredImage)} alt="New Featured" fill className="object-cover transition-transform group-hover:scale-110" />
                      <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full"
                          onClick={() => { if (editFeaturedImageRef.current) editFeaturedImageRef.current.value = ''; setEditFormData(prev => ({ ...prev, featuredImage: null })); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 mt-1"
                      onClick={() => openCrop(editFormData.featuredImage!)}
                    >
                      <Crop className="h-3.5 w-3.5" />
                      Re-crop
                    </Button>
                  </div>
                )}
                {!editFormData.oldFeaturedImage && !editFormData.featuredImage && (
                  <div className="h-24 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                    <Package className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">No featured image selected</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-semibold">Gallery Images</Label>
                <span className="text-[10px] text-muted-foreground">{editFormData.oldGalleryImages.length + editFormData.galleryImages.length} image(s) total</span>
              </div>
              <input
                ref={editGalleryImagesRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const newFiles = Array.from(e.target.files);
                    editGalleryAccumRef.current = [...editGalleryAccumRef.current, ...newFiles];
                    setEditFormData((prev) => ({ ...prev, galleryImages: [...editGalleryAccumRef.current] }));
                    e.target.value = "";
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <div className="flex gap-3 flex-wrap pt-2">
                {editFormData.oldGalleryImages.map((img, idx) => (
                  <div key={`old-${idx}`} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                    <NextImage src={img} alt={`Gallery ${idx}`} fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full"
                        onClick={() => setEditFormData((prev) => ({ ...prev, oldGalleryImages: prev.oldGalleryImages.filter((_, i) => i !== idx) }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {editFormData.galleryImages.map((file, idx) => (
                  <div key={`new-${idx}`} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                    <NextImage src={URL.createObjectURL(file)} alt={`New ${idx}`} fill className="object-cover transition-transform group-hover:scale-110" />
                    <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full"
                        onClick={() => {
                          const updated = editFormData.galleryImages.filter((_, i) => i !== idx);
                          editGalleryAccumRef.current = updated;
                          setEditFormData((prev) => ({ ...prev, galleryImages: updated }));
                        }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {editFormData.oldGalleryImages.length === 0 && editFormData.galleryImages.length === 0 && (
                  <div className="h-24 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                    <Package className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">No gallery images selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t bg-muted/10 shrink-0 flex justify-end gap-3">
            <Button variant="outline" className="h-10 px-4" onClick={() => { editGalleryAccumRef.current = []; setEditVariants([]); setEditSelectedAttrValues({}); setShowEditModal(false); }} disabled={editSubmitting}>Cancel</Button>
            <Button className="h-10 px-6 font-semibold shadow-md" onClick={handleEditProduct} disabled={editSubmitting}>
              {editSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={!!cropPending}
        imageSrc={cropPending?.objectUrl ?? null}
        originalFileName={cropPending?.file.name}
        onCropDone={handleCropDone}
        onCancel={handleCropCancel}
        aspectRatio={3/2}
      />

      {/* View Deleted Product Dialog */}
      <Dialog open={!!viewBinProduct} onOpenChange={(open) => { if (!open) setViewBinProduct(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
                Deleted
              </span>
              <span className="truncate">{viewBinProduct?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {viewBinProduct && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {viewBinProduct.featuredImage ? (
                  <NextImage
                    src={viewBinProduct.featuredImage}
                    alt={viewBinProduct.title}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 object-cover rounded-lg border shrink-0 opacity-80"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"; }}
                  />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-lg border shrink-0">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-base">{viewBinProduct.title}</p>
                  {viewBinProduct.category && <p className="text-muted-foreground">{viewBinProduct.category}</p>}
                  <div className="flex flex-wrap gap-3">
                    <span><span className="text-muted-foreground">Price:</span> <span className="font-semibold">{formatPrice(viewBinProduct)}</span></span>
                    <span><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{viewBinProduct.stock}</span></span>
                  </div>
                  {viewBinProduct.seller && (
                    <p className="text-muted-foreground">
                      Seller: <span className="font-medium text-foreground">{viewBinProduct.seller.name}</span>
                      {" "}<span className="text-xs">({viewBinProduct.seller.email})</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      viewBinProduct.deletedByRole === "ADMIN" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {viewBinProduct.deletedByRole === "ADMIN" ? "Deleted by Admin" : "Deleted by Seller"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      on {new Date(viewBinProduct.deletedAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
              <ProductAuditHistory productId={viewBinProduct.id} productTitle={viewBinProduct.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Permanently delete this product?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will remove <span className="font-semibold text-foreground">&ldquo;{deleteTarget?.title}&rdquo;</span> and all associated data forever. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="e.g. Duplicate listing removed by admin"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              disabled={deleteSubmitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : <><Trash2 className="mr-2 h-4 w-4" />Delete Permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}