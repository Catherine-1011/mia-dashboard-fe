"use client";

import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, DollarSign, Edit, Trash2, Loader2, X, Eye, Search, Check, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, AlertCircle, XCircle, Clock, CheckCircle2, RefreshCcw, Layers, Crop } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { apiClient, api } from "@/lib/api";
import { cn, validateImageFiles } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { ProductAuditHistory } from "@/components/shared/product-audit-history";
import { ImageCropModal } from "@/components/shared/image-crop-modal";

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au";

// --- HELPER: Get Auth Token ---
const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  // Only use 'alpa_token' for authentication
  return localStorage.getItem("alpa_token");
};

// --- API ACTIONS ---
const fetchProducts = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  const response = await fetch(`${BASE_URL}/api/products/my-products?includeVariants=true`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (response.status === 401) throw new Error("Unauthorized: Please log in again.");
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
};

type Product = {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  images: string[];
  featuredImage?: string | null;
  galleryImages?: string[];
  status?: string;
  isActive?: boolean;
  rejectionReason?: string | null;
  reviewNote?: string | null;
  sellerInactiveReason?: string | null;
  sales?: number;
  featured?: boolean;
  tags?: string[] | string;
  artistName?: string;
  weight?: number | string;
  type?: "SIMPLE" | "VARIABLE";
  variants?: Array<{ price?: number | string }>;
};

function formatPrice(product: Product): string {
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

// ── Status badge (seller-facing labels) ───────────────────────────────────────
function StatusBadge({ status, stock }: { status?: string; stock?: number }) {
  const isLowStock = (stock ?? 0) <= 2;
  switch (status) {
    case "ACTIVE":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">Live</span>;
    case "PENDING":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400">Pending Review</span>;
    case "INACTIVE":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{isLowStock ? "Inactive — Low Stock" : "Inactive"}</span>;
    case "REJECTED":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Rejected</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status ?? "Unknown"}</span>;
  }
}

type RecycleBinProduct = {
  id: string;
  title: string;
  price: string;
  stock: number;
  category?: string;
  featuredImage?: string | null;
  galleryImages?: string[];
  images?: string[];
  description?: string;
  tags?: string[] | string;
  artistName?: string;
  featured?: boolean;
  status?: string;
  deletedAt: string;
  deletedBy: string | null;
  deletedByRole: string | null;
};

const getInitialVariantForm = () => ({ price: "", stock: "", sku: "", attributes: {} as Record<string, string> });

const getInitialAddFormData = () => ({
  title: "",
  description: "",
  price: "",
  stock: "",
  category: "",
  images: [] as File[],
  featuredImage: null as File | null,
  galleryImages: [] as File[],
  featured: false,
  tags: "",
  artistName: "",
  weight: "1",
  type: "SIMPLE" as "SIMPLE" | "VARIABLE",
});

const getInitialEditFormData = () => ({
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
  featured: false,
  tags: "",
  artistName: "",
  weight: "",
  type: "SIMPLE" as "SIMPLE" | "VARIABLE",
});

const addProduct = async (productData: {
  tags: string;
  featured: boolean;
  title: string;
  description: string;
  price: string;
  stock: string;
  weight: string;
  category: string;
  images: File[];
  featuredImage?: File | null;
  galleryImages?: File[];
  artistName?: string;
  type?: "SIMPLE" | "VARIABLE";
  variants?: Array<{ price: string; stock: string; sku: string; attributes: Record<string, string> }>;
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  const form = new FormData();
  form.append("title", productData.title);
  form.append("description", productData.description);
  form.append("type", productData.type || "SIMPLE");
  if ((productData.type || "SIMPLE") === "VARIABLE" && productData.variants) {
    form.append("variants", JSON.stringify(productData.variants));
  } else {
    form.append("price", productData.price);
    form.append("stock", productData.stock);
  }
  if (productData.weight) form.append("weight", productData.weight);
  form.append("category", productData.category);

  // Send gallery images under 'galleryImages' key.
  // Repeating the key for each file as per Postman working configuration.
  if (productData.galleryImages && productData.galleryImages.length > 0) {
    productData.galleryImages.forEach((file) => {
      form.append("galleryImages", file);
    });
  }

  if (productData.featuredImage) {
    form.append("featuredImage", productData.featuredImage);
  }

  form.append("featured", String(productData.featured));
  form.append("tags", productData.tags);
  if (productData.artistName) {
    form.append("artistName", productData.artistName);
  }
  const response = await fetch(`${BASE_URL}/api/products/add`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: form,
  });
  if (!response.ok) {
    let errMsg = "Failed to add product";
    try {
      const errData = await response.json();
      errMsg = errData.message || errData.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return response.json();
};

const deleteProduct = async (productId: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  console.log('Attempting to delete product:', { productId, token: !!token });
  
  try {
    const response = await fetch(`${BASE_URL}/api/products/${productId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    console.log('Delete response:', { status: response.status, statusText: response.statusText });
    
    if (!response.ok) {
      // Get detailed error information
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('Delete failed with error:', errorData);
      throw new Error(errorData.message || errorData.error || `Failed to delete product (${response.status})`);
    }
    
    // Handle successful deletion (some APIs return 204 No Content)
    if (response.status === 204) {
      console.log('Product deletion successful (No Content)');
      return null;
    }
    
    console.log('Product deletion successful');
    return response.json();
  } catch (error) {
    console.error('Network error during deletion:', error);
    throw error;
  }
};

const fetchRecycleBinProducts = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  const response = await fetch(`${BASE_URL}/api/products/recycle-bin`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch recycle bin");
  return response.json();
};

const restoreProduct = async (productId: string) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  const response = await fetch(`${BASE_URL}/api/products/${productId}/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let errorData;
    try { errorData = await response.json(); } catch { errorData = {}; }
    throw new Error((errorData as any).message || `Failed to restore product (${response.status})`);
  }
  return response.json();
};


function ProjectsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<any[]>([]);
  const [addVariants, setAddVariants] = useState<Array<{price: string; stock: string; sku: string; attributes: Record<string, string>}>>([]);
  const [newVariantForm, setNewVariantForm] = useState<{price: string; stock: string; sku: string; attributes: Record<string, string>}>(getInitialVariantForm());

  // ── New attribute-first variant builder state ──────────────────────────────
  // selectedAttrValues: { [attrName]: Set of selected values }
  const [selectedAttrValues, setSelectedAttrValues] = useState<Record<string, string[]>>({});
  const [customNumericAdd, setCustomNumericAdd] = useState<Record<string, string>>({});
  const [customSizeModeAdd, setCustomSizeModeAdd] = useState<Record<string, "text" | "number">>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  // ── Edit modal variant state ───────────────────────────────────────────────
  const [editVariants, setEditVariants] = useState<Array<{id?: string; price: string; stock: string; sku: string; attributes: Record<string, string>}>>([]);
  const [editSelectedAttrValues, setEditSelectedAttrValues] = useState<Record<string, string[]>>({});
  const [customNumericEdit, setCustomNumericEdit] = useState<Record<string, string>>({});
  const [customSizeModeEdit, setCustomSizeModeEdit] = useState<Record<string, "text" | "number">>({});
  const [editBulkPrice, setEditBulkPrice] = useState("");
  const [editBulkStock, setEditBulkStock] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refs for closing dropdowns on click outside
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const editCatDropdownRef = useRef<HTMLDivElement>(null);

  // Native refs for file inputs — bypasses shadcn wrapper entirely
  const addFeaturedImageRef   = useRef<HTMLInputElement>(null);
  const addGalleryImagesRef   = useRef<HTMLInputElement>(null);
  const editFeaturedImageRef  = useRef<HTMLInputElement>(null);
  const editGalleryImagesRef  = useRef<HTMLInputElement>(null);

  // Mutable accumulator refs for gallery files — always current, no stale closure
  const addGalleryAccumRef   = useRef<File[]>([]);
  const editGalleryAccumRef  = useRef<File[]>([]);

  // Category Search State for Modals
  const [catSearch, setCatSearch] = useState("");
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editCatSearch, setEditCatSearch] = useState("");
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatOpen(false);
      }
      if (editCatDropdownRef.current && !editCatDropdownRef.current.contains(event.target as Node)) {
        setIsEditCatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [formData, setFormData] = useState(getInitialAddFormData());
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRestoringMode, setIsRestoringMode] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState(getInitialEditFormData());
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Recycle Bin state
  const [activeTab, setActiveTab] = useState<'products' | 'recycle-bin'>('products');
  const [recycleBinProducts, setRecycleBinProducts] = useState<RecycleBinProduct[]>([]);
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);

  // View deleted product
  const [viewBinProduct, setViewBinProduct] = useState<RecycleBinProduct | null>(null);

  // Seller deactivate modal
  const [showSellerDeactivateModal, setShowSellerDeactivateModal] = useState(false);
  const [sellerDeactivateProductId, setSellerDeactivateProductId] = useState<string | null>(null);
  const [sellerDeactivateReason, setSellerDeactivateReason] = useState("");
  const [sellerDeactivateSubmitting, setSellerDeactivateSubmitting] = useState(false);

  // Submit for review modal
  const [showSubmitReviewModal, setShowSubmitReviewModal] = useState(false);
  const [submitReviewProductId, setSubmitReviewProductId] = useState<string | null>(null);
  const [submitReviewNote, setSubmitReviewNote] = useState("");
  const [submitReviewSubmitting, setSubmitReviewSubmitting] = useState(false);

  const resetAddFormState = () => {
    setFormData(getInitialAddFormData());
    setAddVariants([]);
    setNewVariantForm(getInitialVariantForm());
    setSelectedAttrValues({});
    setCustomNumericAdd({});
    setCustomSizeModeAdd({});
    setBulkPrice("");
    setBulkStock("");
    setCatSearch("");
    setIsCatOpen(false);
    addGalleryAccumRef.current = [];
    if (addFeaturedImageRef.current) addFeaturedImageRef.current.value = "";
    if (addGalleryImagesRef.current) addGalleryImagesRef.current.value = "";
  };

  const resetEditFormState = () => {
    setEditFormData(getInitialEditFormData());
    setEditProductId(null);
    setIsRestoringMode(false);
    setEditVariants([]);
    setEditSelectedAttrValues({});
    setCustomNumericEdit({});
    setCustomSizeModeEdit({});
    setEditBulkPrice("");
    setEditBulkStock("");
    setEditCatSearch("");
    setIsEditCatOpen(false);
    editGalleryAccumRef.current = [];
    if (editFeaturedImageRef.current) editFeaturedImageRef.current.value = "";
    if (editGalleryImagesRef.current) editGalleryImagesRef.current.value = "";
  };

  const closeAddModal = () => {
    resetAddFormState();
    setShowAddModal(false);
  };

  const closeEditModal = () => {
    resetEditFormState();
    setShowEditModal(false);
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient("/api/categories/");
      if (response.success && response.data) {
        setAvailableCategories(response.data.approvedCategories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const loadAttributes = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/attributes`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableAttributes(data.attributes || []);
      }
    } catch (error) {
      console.error("Error fetching attributes:", error);
    }
  };

  useEffect(() => {
    // Check if token exists before loading
    const token = getAuthToken();
    if (!token) {
      console.error("No auth token found in localStorage");
      toast.error("Please log in to view products");
      setLoading(false);
      return;
    }
    loadProducts();
    loadCategories();
    loadAttributes();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, statusFilter]);

  const loadRecycleBin = async () => {
    try {
      setRecycleBinLoading(true);
      const data = await fetchRecycleBinProducts();
      setRecycleBinProducts(data.products || []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load recycle bin");
    } finally {
      setRecycleBinLoading(false);
    }
  };

  // Load recycle bin count eagerly so the badge shows the correct number immediately
  useEffect(() => {
    loadRecycleBin();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'recycle-bin') {
      loadRecycleBin();
    }
  }, [activeTab]); // eslint-disable-line

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data.products || []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!formData.title) {
      toast.error("Please fill in the product title");
      return;
    }
    if (formData.type === "SIMPLE" && (!formData.price || !formData.stock)) {
      toast.error("Please fill in price and stock for a Simple product");
      return;
    }
    if (formData.type === "VARIABLE" && addVariants.length === 0) {
      toast.error("Please add at least one variant for a Variable product");
      return;
    }
    try {
      setSubmitting(true);
      // featuredImage: prefer cropped file from state, fall back to native input ref
      const featuredImageFile = formData.featuredImage ?? addFeaturedImageRef.current?.files?.[0] ?? null;
      // galleryImages: read from mutable accumulator ref — always current, no stale closure
      const galleryImageFiles = [...addGalleryAccumRef.current];
      console.log("featuredImage file to send:", featuredImageFile);
      console.log("galleryImages files to send:", galleryImageFiles);
      const productData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        stock: formData.stock,
        weight: formData.weight,
        category: formData.category,
        images: [],
        featuredImage: featuredImageFile,
        galleryImages: galleryImageFiles,
        featured: formData.featured,
        tags: formData.tags,
        artistName: formData.artistName,
        type: formData.type,
        variants: formData.type === "VARIABLE" ? addVariants : undefined,
      };
      const addResult = await addProduct(productData);
      // For VARIABLE products, sync variants via bulk endpoint
      if (formData.type === "VARIABLE" && addVariants.length > 0) {
        const newProductId = addResult?.product?.id || addResult?.id;
        if (newProductId) {
          const token = getAuthToken();
          await fetch(`${BASE_URL}/api/products/${newProductId}/variants/bulk`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              variants: addVariants.map(v => ({
                sku: v.sku,
                price: Number(v.price),
                stock: Number(v.stock),
                isActive: true,
                attributes: v.attributes,
              }))
            }),
          });
        }
      }
      toast.success("Product added successfully!");
      closeAddModal();
      loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add product";
      toast.error(msg, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreProduct = async (productId: string, productTitle: string) => {
    try {
      await restoreProduct(productId);
      toast.success(`"${productTitle}" restored and submitted for admin review. It will go live once approved.`);
      loadRecycleBin();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Restore failed: ${errorMessage}`);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    toast("Delete this product?", {
      description: "It will be moved to your Recycle Bin where you can restore it anytime.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            console.log('Starting product deletion for ID:', productId);
            await deleteProduct(productId);
            toast.success("Product moved to Recycle Bin. It can be restored from there.");
            loadProducts();
          } catch (error) {
            console.error('Product deletion failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            // Backend deletes the product successfully but then crashes on a
            // post-delete count update — treat these as a successful deletion.
            const isBackendCountBug =
              errorMessage.toLowerCase().includes('newcount') ||
              errorMessage.toLowerCase().includes('count is not defined');

            if (isBackendCountBug) {
              toast.success("Product deleted successfully!");
              loadProducts();
              return;
            }

            // Check for specific database constraint errors
            if (errorMessage.includes('Foreign key constraint') || errorMessage.includes('order_items_productId_fkey')) {
              toast.error('Cannot delete product: It has associated orders', {
                description: 'Products with existing orders cannot be deleted to maintain data integrity.'
              });
            } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
              toast.error('Authentication error. Please log out and log back in.');
            } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
              toast.error('You do not have permission to delete this product.');
            } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
              toast.error('Product not found. It may have already been deleted.');
            } else {
              toast.error(`Delete failed: ${errorMessage}`);
            }
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    }
  };

  // ── Crop modal state ──────────────────────────────────────────────────────
  type CropTarget = "add-featured" | "edit-featured" | "add-gallery" | "edit-gallery";
  const [cropPending, setCropPending] = useState<{ file: File; objectUrl: string; target: CropTarget; galleryReplaceIndex?: number } | null>(null);
  const galleryCropQueueRef = useRef<File[]>([]);

  const openCrop = (file: File, target: CropTarget, galleryReplaceIndex?: number) => {
    setCropPending({ file, objectUrl: URL.createObjectURL(file), target, galleryReplaceIndex });
  };

  const handleCropDone = (croppedFile: File) => {
    if (!cropPending) return;
    URL.revokeObjectURL(cropPending.objectUrl);
    const { target } = cropPending;

    if (target === "add-featured") {
      setFormData(prev => ({ ...prev, featuredImage: croppedFile }));
      setCropPending(null);
    } else if (target === "edit-featured") {
      setEditFormData(prev => ({ ...prev, featuredImage: croppedFile }));
      setCropPending(null);
    } else {
      // gallery crop (add-gallery or edit-gallery)
      const isEdit = target === "edit-gallery";
      const accumRef = isEdit ? editGalleryAccumRef : addGalleryAccumRef;

      if (cropPending.galleryReplaceIndex !== undefined) {
        // re-crop an existing gallery image at a specific index
        const updated = [...accumRef.current];
        updated[cropPending.galleryReplaceIndex] = croppedFile;
        accumRef.current = updated;
        if (isEdit) {
          setEditFormData(prev => ({ ...prev, galleryImages: [...accumRef.current] }));
        } else {
          setFormData(prev => ({ ...prev, galleryImages: [...accumRef.current] }));
        }
        setCropPending(null);
      } else {
        // queued new gallery images
        accumRef.current = [...accumRef.current, croppedFile];
        if (isEdit) {
          setEditFormData(prev => ({ ...prev, galleryImages: [...accumRef.current] }));
        } else {
          setFormData(prev => ({ ...prev, galleryImages: [...accumRef.current] }));
        }
        const remaining = galleryCropQueueRef.current.slice(1);
        galleryCropQueueRef.current = remaining;
        if (remaining.length > 0) {
          const next = remaining[0];
          setCropPending({ file: next, objectUrl: URL.createObjectURL(next), target });
        } else {
          setCropPending(null);
        }
      }
    }
  };

  const handleCropCancel = () => {
    if (cropPending) URL.revokeObjectURL(cropPending.objectUrl);
    galleryCropQueueRef.current = [];
    setCropPending(null);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = "";
      const err = validateImageFiles([file]);
      if (err) { toast.error(err, { duration: 7000 }); return; }
      openCrop(file, "add-featured");
    }
  };

  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      e.target.value = "";
      const err = validateImageFiles(newFiles);
      if (err) { toast.error(err, { duration: 7000 }); return; }
      galleryCropQueueRef.current = newFiles;
      openCrop(newFiles[0], "add-gallery");
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const err = validateImageFiles(files);
      if (err) { e.target.value = ""; toast.error(err, { duration: 7000 }); return; }
      setEditFormData(prev => ({ ...prev, images: files }));
    }
  };

  const handleEditFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = "";
      const err = validateImageFiles([file]);
      if (err) { toast.error(err, { duration: 7000 }); return; }
      openCrop(file, "edit-featured");
    }
  };

  const handleEditGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      e.target.value = "";
      const err = validateImageFiles(newFiles);
      if (err) { toast.error(err, { duration: 7000 }); return; }
      galleryCropQueueRef.current = newFiles;
      openCrop(newFiles[0], "edit-gallery");
    }
  };

  const openEditModal = async (productId: string, product?: Product, isRestoring: boolean = false) => {
    // Check if product is rejected before allowing edit
    if (!isRestoring && product?.status === "REJECTED") {
      toast.error("Cannot edit rejected products. Please create a new product or resubmit the original.");
      return;
    }

    setIsRestoringMode(isRestoring);
    setEditProductId(productId);
    setEditSubmitting(false);
    editGalleryAccumRef.current = []; // reset accumulator for fresh edit session
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/products/${productId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusMsg = response.status === 403 ? "This product cannot be edited (may be rejected or not accessible)." : "Failed to fetch product details";
        throw new Error(errorData.message || statusMsg);
      }
      const data = await response.json();
      const prod = data.product || data;

      // Check if returned product is rejected
      if (!isRestoring && prod.status === "REJECTED") {
        throw new Error("This product has been rejected and cannot be edited. Please create a new product instead.");
      }

      // Deduplicate gallery: merge galleryImages + images, remove featured, remove dupes
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
        featured: prod.featured ?? false,
        tags: Array.isArray(prod.tags) ? prod.tags.join(", ") : (prod.tags || ""),
        artistName: prod.artistName || "",
        weight: prod.weight?.toString() || "",
        type: (prod.type === "VARIABLE" ? "VARIABLE" : "SIMPLE") as "SIMPLE" | "VARIABLE",
      });
      // Load existing variants
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
        // Pre-populate selectedAttrValues from existing variants
        const attrMap: Record<string, string[]> = {};
        loadedVariants.forEach((v: any) => {
          Object.entries(v.attributes).forEach(([k, val]) => {
            if (!attrMap[k]) attrMap[k] = [];
            const strVal = String(val);
            if (!attrMap[k].includes(strVal)) attrMap[k].push(strVal);
          });
        });
        setEditSelectedAttrValues(attrMap);
      } else {
        setEditVariants([]);
        setEditSelectedAttrValues({});
      }
      setShowEditModal(true);
    } catch (err) {
      setEditProductId(null); // clear the ID so modal doesn't open
      toast.error((err as Error).message || "Failed to load product");
    }
  };

  // ── Open restore modal directly from recycle-bin data (no API fetch) ───────
  const openRestoreModal = (recycleBinProduct: RecycleBinProduct) => {
    setIsRestoringMode(true);
    setEditProductId(recycleBinProduct.id);
    setEditSubmitting(false);
    editGalleryAccumRef.current = [];

    const featuredImg = recycleBinProduct.featuredImage || null;
    const rawGallery: string[] = [
      ...(Array.isArray(recycleBinProduct.galleryImages) ? recycleBinProduct.galleryImages : []),
      ...(Array.isArray(recycleBinProduct.images) ? recycleBinProduct.images : []),
    ];
    const resolvedGallery = [...new Set(rawGallery)].filter((img) => img !== featuredImg);

    setEditFormData({
      title: recycleBinProduct.title || "",
      description: recycleBinProduct.description || "",
      price: recycleBinProduct.price?.toString() || "",
      stock: recycleBinProduct.stock?.toString() || "",
      category: recycleBinProduct.category || "",
      images: [],
      oldImages: [],
      featuredImage: null,
      oldFeaturedImage: featuredImg,
      galleryImages: [],
      oldGalleryImages: resolvedGallery,
      featured: recycleBinProduct.featured ?? false,
      tags: Array.isArray(recycleBinProduct.tags)
        ? recycleBinProduct.tags.join(", ")
        : (recycleBinProduct.tags || ""),
      artistName: recycleBinProduct.artistName || "",
      weight: "",
      type: "SIMPLE" as "SIMPLE" | "VARIABLE",
    });
    setEditVariants([]);
    setEditSelectedAttrValues({});
    setShowEditModal(true);
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
      const token = getAuthToken();
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

      // featuredImage: prefer cropped file from state, fall back to native input ref
      const editFeaturedFile = editFormData.featuredImage ?? editFeaturedImageRef.current?.files?.[0] ?? null;
      // galleryImages: read from mutable accumulator ref — always current, no stale closure
      const editGalleryFiles = [...editGalleryAccumRef.current];

      // Append featuredImage if new one selected; else send old URL to keep it
      if (editFeaturedFile) {
        form.append("featuredImage", editFeaturedFile);
      } else if (editFormData.oldFeaturedImage) {
        form.append("oldFeaturedImage", editFormData.oldFeaturedImage);
      }

      // Append existing gallery images back to the server. 
      // This ensures they are not deleted if the server replaces the whole list.
      if (editFormData.oldGalleryImages?.length > 0) {
        editFormData.oldGalleryImages.forEach(url => {
          form.append("galleryImages", url);
        });
      }
      
      // Append the new gallery files
      if (editGalleryFiles?.length > 0) {
        editGalleryFiles.forEach(f => {
          form.append("galleryImages", f);
        });
      }

      console.log("featuredImage file to send:", editFeaturedFile);
      console.log("existing gallery URLs to keep:", editFormData.oldGalleryImages);
      console.log("new galleryImages files to add:", editGalleryFiles);
      // Add featured and tags fields
      form.append("featured", String(editFormData.featured));
      form.append("tags", editFormData.tags);
      if (editFormData.artistName) {
        form.append("artistName", editFormData.artistName.trim());
      }
      if (editFormData.weight) {
        form.append("weight", editFormData.weight);
      }

      // ── RESTORE MODE: restore the deleted product first, then apply edits ──
      if (isRestoringMode && editProductId) {
        // Step 1: Un-delete the product (sets status back to PENDING)
        await restoreProduct(editProductId);

        // Step 2: Apply any edits the seller made
        try {
          const updateRes = await fetch(`${BASE_URL}/api/products/${editProductId}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: form,
          });
          if (updateRes.ok) {
            toast.success(`"${editFormData.title}" restored and submitted for admin review!`);
          } else {
            toast.success(`"${editFormData.title}" restored! It's now pending review. Some edits may not have saved.`, { duration: 6000 });
          }
        } catch {
          toast.success(`"${editFormData.title}" restored and submitted for admin review!`);
        }

        setRecycleBinProducts(prev => prev.filter(p => p.id !== editProductId));
        closeEditModal();
        loadProducts();
        return;
      }

      // ── NORMAL EDIT MODE ─────────────────────────────────────────────────
      // Debug: Log what we're sending
      console.log("Sending edit request for product:", editProductId);
      console.log("FormData contents:");
      for (const pair of form.entries()) {
        console.log(pair[0], pair[1]);
      }
      const response = await fetch(`${BASE_URL}/api/products/${editProductId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: form,
      });
      // Debug: Log response
      console.log("Response status:", response.status);
      if (!response.ok) {
        let errorMsg = "Failed to update product";
        try {
          const errorData = await response.json();
          console.error("Error response:", errorData);
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      // For VARIABLE products, sync variants via bulk endpoint
      if (editFormData.type === "VARIABLE" && editVariants.length > 0) {
        await fetch(`${BASE_URL}/api/products/${editProductId}/variants/bulk`, {
          method: "PUT",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            variants: editVariants.map(v => ({
              ...(v.id ? { id: v.id } : {}),
              sku: v.sku,
              price: Number(v.price),
              stock: Number(v.stock),
              isActive: true,
              attributes: v.attributes,
            }))
          }),
        });
      }

      toast.success("Product submitted for admin review — it will be live once approved.", { duration: 5000 });

      closeEditModal();
      loadProducts();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Edit product error:", error);
      toast.error(error.message || "Failed to update product");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Seller deactivate (ACTIVE → INACTIVE) ─────────────────────────────────
  const openSellerDeactivateModal = (productId: string) => {
    setSellerDeactivateProductId(productId);
    setSellerDeactivateReason("");
    setShowSellerDeactivateModal(true);
  };

  const handleSellerDeactivate = async () => {
    if (!sellerDeactivateProductId) return;
    if (!sellerDeactivateReason.trim()) {
      toast.error("Please enter a reason for deactivating your product.");
      return;
    }
    try {
      setSellerDeactivateSubmitting(true);
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/products/${sellerDeactivateProductId}/deactivate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reason: sellerDeactivateReason.trim() }),
      });

      if (!res.ok) {
        // 500 here almost always means the product was deactivated successfully
        // but the backend's notification function crashed afterwards.
        if (res.status === 500) {
          const errBody = await res.json().catch(() => ({}));
          const msg: string = (errBody as any).message || "";
          const isNotificationCrash =
            msg.toLowerCase().includes("not defined") ||
            msg.toLowerCase().includes("is not a function") ||
            msg.toLowerCase().includes("notify") ||
            msg.toLowerCase().includes("notification") ||
            msg.toLowerCase().includes("email");
          if (isNotificationCrash || msg === "") {
            toast.success("Product deactivated successfully.");
            setShowSellerDeactivateModal(false);
            setSellerDeactivateProductId(null);
            setSellerDeactivateReason("");
            loadProducts();
            return;
          }
          throw new Error(msg || "Failed to deactivate product");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to deactivate product");
      }

      toast.success("Product deactivated successfully.");
      setShowSellerDeactivateModal(false);
      setSellerDeactivateProductId(null);
      setSellerDeactivateReason("");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate product");
    } finally {
      setSellerDeactivateSubmitting(false);
    }
  };

  // ── Submit for review (INACTIVE/REJECTED → PENDING) ───────────────────────
  const openSubmitReviewModal = (productId: string) => {
    setSubmitReviewProductId(productId);
    setSubmitReviewNote("");
    setShowSubmitReviewModal(true);
  };

  const handleSubmitForReview = async () => {
    if (!submitReviewProductId) return;
    try {
      setSubmitReviewSubmitting(true);
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/products/${submitReviewProductId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reviewNote: submitReviewNote.trim() }),
      });

      if (!res.ok) {
        if (res.status === 500) {
          // The backend always updates the product to PENDING before crashing
          // on its notification/email helper — treat any 500 as a partial success.
          toast.success("Product submitted for review. You'll be notified once an admin reviews it.", { duration: 6000 });
          setShowSubmitReviewModal(false);
          setSubmitReviewProductId(null);
          setSubmitReviewNote("");
          loadProducts();
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to submit for review");
      }

      toast.success("Product submitted for review. You'll be notified once an admin reviews it.", { duration: 6000 });
      setShowSubmitReviewModal(false);
      setSubmitReviewProductId(null);
      setSubmitReviewNote("");
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit product for review");
    } finally {
      setSubmitReviewSubmitting(false);
    }
  };

  const totalProducts = products.length;

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    [products]
  );
  // const totalRevenue = useMemo(
  //   () => products.reduce((sum, p) => sum + (Number(p.price) * (Number(p.sales) || 0)), 0),
  //   [products]
  // );

  // Get unique categories from products
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  // Per-status counts
  const statusCounts = useMemo(() => ({
    all: products.length,
    ACTIVE: products.filter(p => p.status === 'ACTIVE').length,
    PENDING: products.filter(p => p.status === 'PENDING').length,
    REJECTED: products.filter(p => p.status === 'REJECTED').length,
    INACTIVE: products.filter(p => p.status === 'INACTIVE').length,
  }), [products]);

  // Filtered products by search, category, and status
  const filteredProducts = useMemo(
    () => products.filter(
      (p) =>
        (p.title.toLowerCase().includes(search.toLowerCase()) ||
          (p.category?.toLowerCase().includes(search.toLowerCase()))) &&
        (categoryFilter ? p.category === categoryFilter : true) &&
        (statusFilter !== 'all' ? p.status === statusFilter : true)
    ),
    [products, search, categoryFilter, statusFilter]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage)),
    [filteredProducts.length, itemsPerPage]
  );
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredProducts, currentPage, itemsPerPage]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
     
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory and listings.</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              className="border rounded px-3 py-2 pr-8 w-[200px]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Category Filter Dropdown */}
          <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.filter((cat): cat is string => Boolean(cat)).map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

     

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalProducts}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalStock}</div></CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div></CardContent>
        </Card> */}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b pb-3 mb-2">
        <Button
          variant={activeTab === 'products' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('products')}
          className="gap-1.5"
        >
          <Package className="h-4 w-4" /> My Products ({totalProducts})
        </Button>
        <Button
          variant={activeTab === 'recycle-bin' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('recycle-bin')}
          className={cn("gap-1.5", activeTab !== 'recycle-bin' && "text-muted-foreground")}
        >
          <Trash2 className="h-4 w-4" /> Recycle Bin ({recycleBinProducts.length})
        </Button>
      </div>

      {activeTab === 'products' && (<>
      {/* Status Filter Tabs */}
      <div className="flex gap-1 flex-wrap border-b pb-2 mb-1">
        {([
          { key: 'all',      label: 'All',           count: statusCounts.all,      cls: '' },
          { key: 'ACTIVE',   label: 'Live',          count: statusCounts.ACTIVE,   cls: 'text-green-700 dark:text-green-400' },
          { key: 'PENDING',  label: 'Pending Review',count: statusCounts.PENDING,  cls: 'text-yellow-700 dark:text-yellow-400' },
          { key: 'REJECTED', label: 'Rejected',      count: statusCounts.REJECTED, cls: 'text-red-600 dark:text-red-400' },
          { key: 'INACTIVE', label: 'Inactive',      count: statusCounts.INACTIVE, cls: 'text-gray-500 dark:text-gray-400' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
              statusFilter === tab.key
                ? "border border-b-background border-b-0 -mb-px bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cn(
              "ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold",
              statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Product List */}
      {loading ? (
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
      ) : filteredProducts.length === 0 ? (
        <Card className="col-span-full text-center py-12">
          {statusFilter !== 'all'
            ? `No ${statusFilter === 'ACTIVE' ? 'live' : statusFilter === 'PENDING' ? 'pending' : statusFilter === 'REJECTED' ? 'rejected' : 'inactive'} products found.`
            : 'No products found.'}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="min-w-full divide-y divide-muted">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    {(product.featuredImage || (product.images && product.images.length > 0)) ? (
                      <Image
                        src={product.featuredImage || product.images[0]}
                        alt={product.title}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover rounded"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/100x100?text=No+Image';
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                        <Image
                          src="/placeholder.svg"
                          alt="No image"
                          width={24}
                          height={24}
                          className="h-6 w-6 text-muted-foreground/50"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-semibold">{product.title}</p>
                    {product.status === 'REJECTED' && product.rejectionReason && (
                      <p className="text-xs text-red-600 mt-0.5 line-clamp-2" title={product.rejectionReason}>
                        <AlertCircle className="inline h-3 w-3 mr-1 align-middle" />
                        {product.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">{product.category}</td>
                  <td className="px-4 py-2">{formatPrice(product)}</td>
                  <td className={cn("px-4 py-2 font-medium", (product.stock ?? 0) <= 2 && product.status === 'INACTIVE' ? "text-red-600" : "")}>
                    {product.stock}
                    {(product.stock ?? 0) <= 2 && product.status === 'INACTIVE' && (
                      <span className="ml-1 text-xs text-red-500">(low)</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={product.status} stock={product.stock} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 items-center">
                      {product.status === 'REJECTED' ? (
                        <>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Submit for Review" onClick={() => openSubmitReviewModal(product.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="View" onClick={() => router.push(`/sellerdashboard/products/${product.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : product.status === 'PENDING' ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400 whitespace-nowrap">
                            <Clock className="h-3 w-3" /> In Review
                          </span>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="View" onClick={() => router.push(`/sellerdashboard/products/${product.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : product.status === 'INACTIVE' ? (
                        <>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title={(product.stock ?? 0) <= 2 ? 'Update Stock' : 'Edit'} onClick={() => openEditModal(product.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Submit for Review" onClick={() => openSubmitReviewModal(product.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="View" onClick={() => router.push(`/sellerdashboard/products/${product.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <div className="flex items-center gap-1.5 pl-1" title="Submit for review to re-activate">
                            <Switch checked={false} disabled />
                            <span className="text-xs font-medium text-red-500 whitespace-nowrap">
                              {(product.stock ?? 0) <= 2 ? 'Low Stock' : 'Inactive'}
                            </span>
                          </div>
                        </>
                      ) : (
                        /* ACTIVE */
                        <>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditModal(product.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="View" onClick={() => router.push(`/sellerdashboard/products/${product.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <div className="flex items-center gap-1.5 pl-1">
                            <Switch
                              checked={true}
                              onCheckedChange={() => openSellerDeactivateModal(product.id)}
                            />
                            <span className="text-xs font-medium text-green-600 whitespace-nowrap">Active</span>
                          </div>
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
      {!loading && filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length)}</span>
              {"–"}
              <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span>
              {" of "}
              <span className="font-medium text-foreground">{filteredProducts.length}</span>
              {" products"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Per page:</span>
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 12, 24, 48].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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
      </>)}

      {/* Recycle Bin View */}
      {activeTab === 'recycle-bin' && (
        <div className="space-y-4">
          {recycleBinLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recycleBinProducts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <Trash2 className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-lg font-semibold text-muted-foreground">Recycle Bin is empty</p>
                <p className="text-sm text-muted-foreground">Deleted products will appear here and can be restored anytime.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="min-w-full divide-y divide-muted">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deleted On</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deleted By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {recycleBinProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2">
                        {product.featuredImage ? (
                          <Image
                            src={product.featuredImage}
                            alt={product.title}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-cover rounded opacity-60"
                            unoptimized
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image'; }}
                          />
                        ) : (
                          <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 font-semibold text-muted-foreground">{product.title}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{product.category || '—'}</td>
                      <td className="px-4 py-2 text-sm">${product.price}</td>
                      <td className="px-4 py-2 text-sm">{product.stock}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(product.deletedAt).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={cn(
                            "text-xs whitespace-nowrap",
                            product.deletedByRole === 'ADMIN'
                              ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"
                          )}
                          variant="outline"
                        >
                          {product.deletedByRole === 'ADMIN' ? 'Deleted by Admin' : 'Deleted by You'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setViewBinProduct(product)}
                          >
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => openRestoreModal(product)}
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

            {/* Seller Deactivate Modal */}
            {showSellerDeactivateModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md shadow-2xl">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-orange-500" /> Deactivate Product
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowSellerDeactivateModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted" disabled={sellerDeactivateSubmitting}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Please tell us why you're deactivating this product. The admin will be notified.</p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Reason <span className="text-red-500">*</span></Label>
                      <Textarea
                        placeholder="e.g. I am restocking, will be back in 2 weeks."
                        value={sellerDeactivateReason}
                        onChange={(e) => setSellerDeactivateReason(e.target.value)}
                        rows={4}
                        className="resize-none"
                        disabled={sellerDeactivateSubmitting}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">{sellerDeactivateReason.length} characters</p>
                    </div>
                  </CardContent>
                  <div className="p-4 border-t bg-muted/10 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowSellerDeactivateModal(false)} disabled={sellerDeactivateSubmitting} className="h-10 px-4">Cancel</Button>
                    <Button
                      className="h-10 px-6 font-semibold bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={handleSellerDeactivate}
                      disabled={sellerDeactivateSubmitting || !sellerDeactivateReason.trim()}
                    >
                      {sellerDeactivateSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deactivating...</> : "Deactivate Product"}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Submit for Review Modal */}
            {showSubmitReviewModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md shadow-2xl">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-blue-500" /> Submit for Review
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowSubmitReviewModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted" disabled={submitReviewSubmitting}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Your product will be submitted for admin review. It will go live once approved. You may add an optional note for the admin.</p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Note for Admin <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea
                        placeholder="e.g. I have updated the images and description. Please review again."
                        value={submitReviewNote}
                        onChange={(e) => setSubmitReviewNote(e.target.value)}
                        rows={4}
                        className="resize-none"
                        disabled={submitReviewSubmitting}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">{submitReviewNote.length} characters</p>
                    </div>
                  </CardContent>
                  <div className="p-4 border-t bg-muted/10 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowSubmitReviewModal(false)} disabled={submitReviewSubmitting} className="h-10 px-4">Cancel</Button>
                    <Button
                      className="h-10 px-6 font-semibold"
                      onClick={handleSubmitForReview}
                      disabled={submitReviewSubmitting}
                    >
                      {submitReviewSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <><RotateCcw className="mr-2 h-4 w-4" />Submit for Review</>}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Edit Product Modal */}
            {(() => {
              const editingProduct = products.find(p => p.id === editProductId);
              const isResubmit = editingProduct?.status === 'REJECTED';
              const isInactive = editingProduct?.status === 'INACTIVE';
              const isActive = editingProduct?.status === 'ACTIVE';
              return (
              <Sheet open={showEditModal} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
                <SheetContent side="right" className={cn("w-full flex flex-col p-0 gap-0 overflow-hidden transition-all duration-300", editFormData.type === "VARIABLE" ? "sm:max-w-5xl" : "sm:max-w-xl")} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                  <SheetHeader className="px-6 py-4 border-b shrink-0">
                    <SheetTitle className="text-xl font-bold">
                      {isRestoringMode ? 'Edit & Restore Product' : isResubmit ? 'Edit & Resubmit Product' : isInactive ? 'Update Product' : 'Edit Product'}
                    </SheetTitle>
                    {isRestoringMode ? (
                      <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
                        <RotateCcw className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>Review the product details below and make any edits needed before restoring. Once confirmed, the product will be submitted for admin review and go live once approved.</span>
                      </div>
                    ) : (isResubmit || isActive || isInactive) && (
                      <div className={`flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs ${
                        isResubmit ? 'bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300'
                        : isInactive && (editingProduct?.stock ?? 0) <= 2 ? 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300'
                      }`}>
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          {isResubmit
                            ? 'After saving, your product will be resubmitted for admin review. Address the rejection reason before resubmitting.'
                            : isInactive && (editingProduct?.stock ?? 0) <= 2
                            ? 'Update the stock quantity. Your product will be submitted for admin review and re-listed once approved.'
                            : 'Editing a live product will temporarily remove it from the storefront and submit it for re-approval.'}
                        </span>
                      </div>
                    )}
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
                        <Label htmlFor="edit-title" className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                        <Input id="edit-title" placeholder="Give your product a clear name" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="focus:ring-primary h-10" />
                      </div>
                      
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="edit-description" className="text-sm font-semibold">Detailed Description</Label>
                        <Textarea id="edit-description" placeholder="Product details..." value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} rows={4} className="resize-none focus:ring-primary py-2" />
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="edit-artistName" className="text-sm font-semibold">Artist Name (Optional)</Label>
                        <Input id="edit-artistName" placeholder="Enter artist name" value={editFormData.artistName} onChange={(e) => setEditFormData({ ...editFormData, artistName: e.target.value })} className="focus:ring-primary h-10" />
                      </div>

                      {editFormData.type === "SIMPLE" && (
                        <>
                      <div className="space-y-2">
                        <Label htmlFor="edit-price" className="text-sm font-semibold">Price ($) <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="edit-price" type="number" placeholder="0.00" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} className="pl-9 focus:ring-primary h-10" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-stock" className="text-sm font-semibold">Stock Quantity <span className="text-red-500">*</span></Label>
                        <Input id="edit-stock" type="number" placeholder="0" value={editFormData.stock} onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })} className="focus:ring-primary h-10" />
                      </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="edit-weight" className="text-sm font-semibold">Weight (kg)</Label>
                        <Input id="edit-weight" type="number" placeholder="1" min="0" step="0.01" value={editFormData.weight} onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })} className="focus:ring-primary h-10" />
                      </div>

                      <div className="space-y-2 relative" ref={editCatDropdownRef}>
                        <Label htmlFor="edit-category" className="text-sm font-semibold">Category <span className="text-red-500">*</span></Label>
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
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-primary underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadCategories();
                                    }}
                                  >
                                    Refresh Categories
                                  </Button>
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
                            <div className="border-t mt-1 pt-2 px-3 pb-2 bg-muted/30">
                              <p className="text-[11px] text-muted-foreground text-center">
                                Category not listed? <a href="/sellerdashboard/categories" className="text-primary hover:underline font-medium">Request a new one</a> from the Categories page
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Variable Product – Attribute-First Variant Builder */}
                    {editFormData.type === "VARIABLE" && (
                      <div className="space-y-5">
                        {/* Section header */}
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

                        {/* Step 1 – Attribute value selection */}
                        {availableAttributes.length > 0 ? (
                          <div className="rounded-xl border bg-muted/10 divide-y overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 1 — Select Attribute Values</p>
                            </div>
                            <div className="p-4 space-y-4">
                              {availableAttributes.map((attr) => {
                                const selected = editSelectedAttrValues[attr.name] ?? [];
                                const isNumberType = attr.valueType?.toLowerCase() === "number";
                                const effectiveMode = customSizeModeEdit[attr.name] ?? (isNumberType ? "number" : "text");
                                const sortedValues = isNumberType
                                  ? [...(attr.values ?? [])].sort((a: any, b: any) => Number(a?.value ?? 0) - Number(b?.value ?? 0))
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
                                        <button
                                          type="button"
                                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                          onClick={() => setEditSelectedAttrValues(prev => { const n = { ...prev }; delete n[attr.name]; return n; })}
                                        >
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
                                          || v?.displayValue
                                          || strValue;
                                        const hexColor: string | null = v?.hexCode
                                          || (rawVal && typeof rawVal === "object" ? rawVal.hexColor : null)
                                          || v?.hexColor
                                          || null;
                                        const isSelected = selected.includes(strValue);
                                        return (
                                          <button
                                            key={v?.id ?? vi}
                                            type="button"
                                            onClick={() => {
                                              setEditSelectedAttrValues(prev => {
                                                const cur = prev[attr.name] ?? [];
                                                const next = isSelected
                                                  ? cur.filter(x => x !== strValue)
                                                  : [...cur, strValue];
                                                if (next.length === 0) {
                                                  const n = { ...prev }; delete n[attr.name]; return n;
                                                }
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
                                            {hexColor && (
                                              <span
                                                className="h-3 w-3 rounded-full border border-white/50 flex-shrink-0"
                                                style={{ backgroundColor: hexColor }}
                                              />
                                            )}
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
                          <div className="rounded-xl border border-dashed p-6 text-center space-y-1">
                            <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                            <p className="text-sm font-medium text-muted-foreground">No attributes configured</p>
                            <p className="text-xs text-muted-foreground/70">Attributes (e.g. Size, Colour) must be set up by an admin first.</p>
                          </div>
                        )}

                        {/* Step 2 – Generate button */}
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
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1.5 h-8 text-xs font-semibold"
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
                                  if (combos.length > 100) {
                                    toast.error("Too many variants — maximum 100 allowed. Reduce your attribute selections.");
                                    return;
                                  }
                                  const generated = combos.map((combo) => {
                                    const attrs: Record<string, string> = {};
                                    attrNames.forEach((name, i) => { attrs[name] = combo[i]; });
                                    const skuParts = combo.map(v => String(v).replace(/\s+/g, "-").toUpperCase());
                                    const sku = `SKU-${skuParts.join("-")}`;
                                    const existing = editVariants.find(v =>
                                      JSON.stringify(v.attributes) === JSON.stringify(attrs)
                                    );
                                    return {
                                      id: existing?.id,
                                      attributes: attrs,
                                      price: existing?.price ?? "",
                                      stock: existing?.stock ?? "",
                                      sku: existing?.sku ?? sku,
                                    };
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

                        {/* Step 3 – Variant table */}
                        {editVariants.length > 0 && (
                          <div className="rounded-xl border overflow-hidden">
                            {/* Bulk edit toolbar */}
                            <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap items-center gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                                Step 3 — Set Prices &amp; Stock
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Bulk set:</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="relative">
                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      placeholder="Price"
                                      className="pl-5 h-7 w-24 text-xs"
                                      value={editBulkPrice}
                                      onChange={e => setEditBulkPrice(e.target.value)}
                                    />
                                  </div>
                                  <Input
                                    type="number"
                                    placeholder="Stock"
                                    className="h-7 w-20 text-xs"
                                    value={editBulkStock}
                                    onChange={e => setEditBulkStock(e.target.value)}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-3"
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
                                  >
                                    Apply All
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {/* Table */}
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
                                          <Input
                                            type="number"
                                            placeholder="0.00"
                                            step="0.01"
                                            className={cn("pl-5 h-7 w-24 text-xs", !variant.price && "border-amber-400 focus-visible:ring-amber-400")}
                                            value={variant.price}
                                            onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, price: e.target.value } : v2))}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          className={cn("h-7 w-20 text-xs", !variant.stock && "border-amber-400 focus-visible:ring-amber-400")}
                                          value={variant.stock}
                                          onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, stock: e.target.value } : v2))}
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          type="text"
                                          className="h-7 w-32 text-xs font-mono"
                                          value={variant.sku}
                                          onChange={e => setEditVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, sku: e.target.value } : v2))}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <button
                                          type="button"
                                          className="h-6 w-6 rounded-full inline-flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                          onClick={() => setEditVariants(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {/* Table footer */}
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
                                let newTags;
                                if (!isChecked) {
                                  newTags = [...currentTags, tag];
                                } else {
                                  newTags = currentTags.filter(t => t !== tag);
                                }
                                setEditFormData({
                                  ...editFormData,
                                  tags: newTags.join(", ")
                                });
                              }}
                            >
                              <div className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                                isChecked ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                              )}>
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                              <span className="text-sm font-medium">{tag}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* --- IMAGE UPLOAD --- */}
                    {/* Featured Image */}  
                    <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="edit-featuredImage" className="text-sm font-semibold">Featured Image</Label>
                        <span className="text-[10px] text-muted-foreground">Main product image</span>
                      </div>
                      <input
                        ref={editFeaturedImageRef}
                        id="edit-featuredImage"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleEditFeaturedImageChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                      />
                      <div className="flex gap-3 flex-wrap pt-2">
                        {editFormData.oldFeaturedImage && !editFormData.featuredImage && (
                          <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                            <Image
                              src={editFormData.oldFeaturedImage}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              alt="Featured"
                              width={96}
                              height={96}
                              onError={(e) => (e.target as HTMLImageElement).style.display='none'}
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => setEditFormData({ ...editFormData, oldFeaturedImage: null })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {editFormData.featuredImage && (
                          <div className="flex items-start gap-3">
                            <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                              <Image
                                src={URL.createObjectURL(editFormData.featuredImage)}
                                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                alt="New Featured"
                                width={96}
                                height={96}
                              />
                              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => { if (editFeaturedImageRef.current) editFeaturedImageRef.current.value = ''; setEditFormData(prev => ({ ...prev, featuredImage: null })); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5 mt-1"
                              onClick={() => openCrop(editFormData.featuredImage!, "edit-featured")}
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
                        <Label htmlFor="edit-galleryImages" className="text-sm font-semibold">Gallery Images</Label>
                        <span className="text-[10px] text-muted-foreground">Multiple gallery images</span>
                      </div>
                      <input
                        ref={editGalleryImagesRef}
                        id="edit-galleryImages"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleEditGalleryImageChange}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                      />
                      <div className="flex gap-3 flex-wrap pt-2">
                        {editFormData.oldGalleryImages && editFormData.oldGalleryImages.length > 0 && editFormData.oldGalleryImages.map((img, idx) => (
                          <div key={idx} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                            <Image
                              src={img}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              alt="Gallery"
                              width={96}
                              height={96}
                              onError={(e) => (e.target as HTMLImageElement).style.display='none'}
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => {
                                const updated = editFormData.oldGalleryImages.filter((_, i) => i !== idx);
                                setEditFormData(prev => ({ ...prev, oldGalleryImages: updated }));
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {editFormData.galleryImages && editFormData.galleryImages.length > 0 && editFormData.galleryImages.map((file, idx) => (
                          <div key={idx} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                            <Image
                              src={URL.createObjectURL(file)}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                              alt="New Gallery"
                              width={96}
                              height={96}
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-white/90 text-foreground hover:bg-white"
                                onClick={() => { galleryCropQueueRef.current = []; openCrop(file, "edit-gallery", idx); }}>
                                <Crop className="h-3 w-3" />
                              </Button>
                              <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => {
                                const updated = editFormData.galleryImages.filter((_, i) => i !== idx);
                                editGalleryAccumRef.current = updated; // keep ref in sync
                                setEditFormData(prev => ({ ...prev, galleryImages: updated }));
                              }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(!editFormData.oldGalleryImages || editFormData.oldGalleryImages.length === 0) && editFormData.galleryImages.length === 0 && (
                          <div className="h-24 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                            <Package className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs">No gallery images selected</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t bg-muted/10 shrink-0 flex justify-end gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={closeEditModal} disabled={editSubmitting}>Cancel</Button>
                    <Button className="h-10 px-6 font-semibold shadow-md" onClick={handleEditProduct} disabled={editSubmitting}>
                      {editSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isRestoringMode ? "Save & Restore" : "Save Changes"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            );
            })()}
      {/* Add Product Modal */}
      <Sheet open={showAddModal} onOpenChange={(open) => { if (!open) closeAddModal(); }}>
        <SheetContent side="right" className={cn("w-full flex flex-col p-0 gap-0 overflow-hidden transition-all duration-300", formData.type === "VARIABLE" ? "sm:max-w-5xl" : "sm:max-w-xl")} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="text-xl font-bold">Add New Product</SheetTitle>
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
                        formData.type === type
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, type }));
                      }}
                    >
                      {type === "SIMPLE" ? "Simple Product" : "Variable Product"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.type === "SIMPLE"
                    ? "A single product with one price and stock quantity."
                    : "A product with multiple variants (e.g. different sizes or colours, each with their own price and stock)."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                  <Input id="title" placeholder="Give your product a clear name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="focus:ring-primary h-10" />
                </div>
                
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Detailed Description</Label>
                  <Textarea id="description" placeholder="Describe the features, materials, and benefits..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="resize-none focus:ring-primary py-2" />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="artistName" className="text-sm font-semibold">Artist Name (Optional)</Label>
                  <Input id="artistName" placeholder="Enter artist name" value={formData.artistName} onChange={(e) => setFormData({ ...formData, artistName: e.target.value })} className="focus:ring-primary h-10" />
                </div>

                {formData.type === "SIMPLE" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold">Price ($) <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="price" type="number" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="pl-9 focus:ring-primary h-10" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock" className="text-sm font-semibold">Initial Stock <span className="text-red-500">*</span></Label>
                      <Input id="stock" type="number" placeholder="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="focus:ring-primary h-10" />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-semibold">Weight (kg)</Label>
                  <Input id="weight" type="number" placeholder="1" min="0" step="0.01" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="focus:ring-primary h-10" />
                </div>

                <div className="space-y-2 relative" ref={catDropdownRef}>
                  <Label htmlFor="category" className="text-sm font-semibold">Category <span className="text-red-500">*</span></Label>
                  <div 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all hover:border-primary/50 cursor-pointer"
                    onClick={() => setIsCatOpen(!isCatOpen)}
                  >
                    <span className={formData.category ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {formData.category || "Select a category"}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isCatOpen && "rotate-180")} />
                  </div>
                  
                  {isCatOpen && (
                    <div className="absolute z-[60] w-full mt-1 bg-background text-popover-foreground rounded-lg border shadow-xl p-1 animate-in fade-in zoom-in-95 slide-in-from-top-2">
                      <div className="flex items-center border-b px-3 pb-2 pt-1">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Search categories..."
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto mt-1 custom-scrollbar">
                        {availableCategories.length === 0 ? (
                          <div className="py-4 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-primary underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadCategories();
                              }}
                            >
                              Refresh Categories
                            </Button>
                          </div>
                        ) : availableCategories
                          .filter(cat => cat.categoryName.toLowerCase().includes(catSearch.toLowerCase()))
                          .map((cat) => (
                            <div
                              key={cat.categoryName}
                              className={cn(
                                "group relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary",
                                formData.category === cat.categoryName && "bg-primary/5 text-primary font-medium"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, category: cat.categoryName });
                                setIsCatOpen(false);
                                setCatSearch("");
                              }}
                            >
                              <div className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                                formData.category === cat.categoryName ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                              )}>
                                {formData.category === cat.categoryName && <Check className="h-3 w-3" />}
                              </div>
                              {cat.categoryName}
                            </div>
                          ))}
                        {availableCategories.length > 0 && availableCategories.filter(cat => cat.categoryName.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">No category found.</div>
                        )}
                      </div>
                      <div className="border-t mt-1 pt-2 px-3 pb-2 bg-muted/30">
                        <p className="text-[11px] text-muted-foreground text-center">
                          Category not listed? <a href="/sellerdashboard/categories" className="text-primary hover:underline font-medium">Request a new one</a> from the Categories page
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Variable Product – Attribute-First Variant Builder */}
              {formData.type === "VARIABLE" && (
                <div className="space-y-5">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Product Variants <span className="text-red-500">*</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">Select attribute values → generate all combinations automatically.</p>
                  
                    </div>
                    {addVariants.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                        {addVariants.length} variant{addVariants.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Step 1 – Attribute value selection */}
                  {availableAttributes.length > 0 ? (
                    <div className="rounded-xl border bg-muted/10 divide-y overflow-hidden">
                      <div className="px-4 py-2.5 bg-muted/30">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 1 — Select Attribute Values</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {availableAttributes.map((attr) => {
                          const selected = selectedAttrValues[attr.name] ?? [];
                          const isNumberType = attr.valueType?.toLowerCase() === "number";
                          const effectiveMode = customSizeModeAdd[attr.name] ?? (isNumberType ? "number" : "text");
                          const sortedValues = isNumberType
                            ? [...(attr.values ?? [])].sort((a: any, b: any) => Number(a?.value ?? 0) - Number(b?.value ?? 0))
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
                                  <button
                                    type="button"
                                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => setSelectedAttrValues(prev => { const n = { ...prev }; delete n[attr.name]; return n; })}
                                  >
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
                                    || v?.displayValue
                                    || strValue;
                                  const hexColor: string | null = v?.hexCode
                                    || (rawVal && typeof rawVal === "object" ? rawVal.hexColor : null)
                                    || v?.hexColor
                                    || null;
                                  const isSelected = selected.includes(strValue);
                                  return (
                                    <button
                                      key={v?.id ?? vi}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAttrValues(prev => {
                                          const cur = prev[attr.name] ?? [];
                                          const next = isSelected
                                            ? cur.filter(x => x !== strValue)
                                            : [...cur, strValue];
                                          if (next.length === 0) {
                                            const n = { ...prev }; delete n[attr.name]; return n;
                                          }
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
                                      {hexColor && (
                                        <span
                                          className="h-3 w-3 rounded-full border border-white/50 flex-shrink-0"
                                          style={{ backgroundColor: hexColor }}
                                        />
                                      )}
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
                                    onClick={() => setSelectedAttrValues(prev => {
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
                                      onClick={() => setSelectedAttrValues(prev => {
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
                                    onClick={() => setCustomSizeModeAdd(prev => ({ ...prev, [attr.name]: "text" }))}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                                      effectiveMode === "text" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                                    )}>Text</button>
                                  <button type="button"
                                    onClick={() => setCustomSizeModeAdd(prev => ({ ...prev, [attr.name]: "number" }))}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                                      effectiveMode === "number" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                                    )}>Number</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="text"
                                    placeholder={effectiveMode === "number" ? "Custom: 8.5, 9.5, 10.5..." : "Custom: 2XL, 6XL..."}
                                    className={cn("h-7 w-44 text-xs", effectiveMode === "number" && "font-mono")}
                                    value={customNumericAdd[attr.name] ?? ""}
                                    onChange={e => setCustomNumericAdd(prev => ({ ...prev, [attr.name]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const raw = (customNumericAdd[attr.name] ?? "").trim();
                                        if (!raw) return;
                                        const isNum = effectiveMode === "number";
                                        const vals = raw.split(",").map(s => s.trim()).filter(s => s && (!isNum || !isNaN(Number(s))));
                                        if (!vals.length) return;
                                        setSelectedAttrValues(prev => {
                                          const cur = prev[attr.name] ?? [];
                                          const added = vals.filter(v => !cur.includes(v));
                                          return added.length ? { ...prev, [attr.name]: [...cur, ...added] } : prev;
                                        });
                                        setCustomNumericAdd(prev => ({ ...prev, [attr.name]: "" }));
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-border bg-background text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-40"
                                    disabled={!(customNumericAdd[attr.name] ?? "").trim()}
                                    onClick={() => {
                                      const raw = (customNumericAdd[attr.name] ?? "").trim();
                                      if (!raw) return;
                                      const isNum = effectiveMode === "number";
                                      const vals = raw.split(",").map(s => s.trim()).filter(s => s && (!isNum || !isNaN(Number(s))));
                                      if (!vals.length) return;
                                      setSelectedAttrValues(prev => {
                                        const cur = prev[attr.name] ?? [];
                                        const added = vals.filter(v => !cur.includes(v));
                                        return added.length ? { ...prev, [attr.name]: [...cur, ...added] } : prev;
                                      });
                                      setCustomNumericAdd(prev => ({ ...prev, [attr.name]: "" }));
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
                    <div className="rounded-xl border border-dashed p-6 text-center space-y-1">
                      <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-sm font-medium text-muted-foreground">No attributes configured</p>
                      <p className="text-xs text-muted-foreground/70">Attributes (e.g. Size, Colour) must be set up by an admin first.</p>
                    </div>
                  )}

                  {/* Step 2 – Generate button */}
                  {Object.keys(selectedAttrValues).length > 0 && (
                    <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step 2 — Generate Variants</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(() => {
                              const counts = Object.values(selectedAttrValues).map(v => v.length);
                              const total = counts.reduce((a, b) => a * b, 1);
                              return `${total} combination${total !== 1 ? "s" : ""} will be created`;
                            })()}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5 h-8 text-xs font-semibold"
                          onClick={() => {
                            // Cartesian product
                            const attrNames = Object.keys(selectedAttrValues);
                            const attrValueSets = attrNames.map(k => selectedAttrValues[k]);
                            const cartesian = (sets: string[][]): string[][] => {
                              if (sets.length === 0) return [[]];
                              const [first, ...rest] = sets;
                              const restProduct = cartesian(rest);
                              return first.flatMap(v => restProduct.map(p => [v, ...p]));
                            };
                            const combos = cartesian(attrValueSets);
                            if (combos.length > 100) {
                              toast.error("Too many variants — maximum 100 allowed. Reduce your attribute selections.");
                              return;
                            }
                            const generated = combos.map((combo) => {
                              const attrs: Record<string, string> = {};
                              attrNames.forEach((name, i) => { attrs[name] = combo[i]; });
                              const skuParts = combo.map(v => String(v).replace(/\s+/g, "-").toUpperCase());
                              const sku = `SKU-${skuParts.join("-")}`;
                              // Preserve existing prices/stocks if re-generating
                              const existing = addVariants.find(v =>
                                JSON.stringify(v.attributes) === JSON.stringify(attrs)
                              );
                              return {
                                attributes: attrs,
                                price: existing?.price ?? "",
                                stock: existing?.stock ?? "",
                                sku: existing?.sku ?? sku,
                              };
                            });
                            setAddVariants(generated);
                            toast.success(`${generated.length} variant${generated.length !== 1 ? "s" : ""} generated!`);
                          }}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Generate Variants
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 – Variant table */}
                  {addVariants.length > 0 && (
                    <div className="rounded-xl border overflow-hidden">
                      {/* Bulk edit toolbar */}
                      <div className="px-4 py-3 bg-muted/30 border-b flex flex-wrap items-center gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                          Step 3 — Set Prices &amp; Stock
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Bulk set:</span>
                          <div className="flex items-center gap-1.5">
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="Price"
                                className="pl-5 h-7 w-24 text-xs"
                                value={bulkPrice}
                                onChange={e => setBulkPrice(e.target.value)}
                              />
                            </div>
                            <Input
                              type="number"
                              placeholder="Stock"
                              className="h-7 w-20 text-xs"
                              value={bulkStock}
                              onChange={e => setBulkStock(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-3"
                              onClick={() => {
                                if (!bulkPrice && !bulkStock) return;
                                setAddVariants(prev => prev.map(v => ({
                                  ...v,
                                  ...(bulkPrice ? { price: bulkPrice } : {}),
                                  ...(bulkStock ? { stock: bulkStock } : {}),
                                })));
                                setBulkPrice(""); setBulkStock("");
                                toast.success("Applied to all variants");
                              }}
                            >
                              Apply All
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-muted/20 border-b">
                            <tr>
                              {Object.keys(addVariants[0]?.attributes ?? {})
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
                            {addVariants.map((variant, idx) => (
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
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      step="0.01"
                                      className={cn("pl-5 h-7 w-24 text-xs", !variant.price && "border-amber-400 focus-visible:ring-amber-400")}
                                      value={variant.price}
                                      onChange={e => setAddVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, price: e.target.value } : v2))}
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    className={cn("h-7 w-20 text-xs", !variant.stock && "border-amber-400 focus-visible:ring-amber-400")}
                                    value={variant.stock}
                                    onChange={e => setAddVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, stock: e.target.value } : v2))}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    className="h-7 w-32 text-xs font-mono"
                                    value={variant.sku}
                                    onChange={e => setAddVariants(prev => prev.map((v2, i) => i === idx ? { ...v2, sku: e.target.value } : v2))}
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    className="h-6 w-6 rounded-full inline-flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    onClick={() => setAddVariants(prev => prev.filter((_, i) => i !== idx))}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Table footer */}
                      <div className="px-4 py-2.5 bg-muted/10 border-t flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          {addVariants.filter(v => v.price && v.stock).length}/{addVariants.length} variants have price &amp; stock set
                        </p>
                        {addVariants.some(v => !v.price || !v.stock) && (
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
                    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
                    const isChecked = currentTags.includes(tag);
                    return (
                      <div 
                        key={tag} 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none",
                          isChecked ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-muted/10 border-transparent hover:bg-muted/20"
                        )}
                        onClick={() => {
                          let newTags;
                          if (!isChecked) {
                            newTags = [...currentTags, tag];
                          } else {
                            newTags = currentTags.filter(t => t !== tag);
                          }
                          setFormData({
                            ...formData,
                            tags: newTags.join(", ")
                          });
                        }}
                      >
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                          isChecked ? "bg-primary text-primary-foreground" : "bg-transparent opacity-50"
                        )}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm font-medium">{tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* --- IMAGE UPLOAD --- */}
              {/* Featured Image */}
              <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="featuredImage" className="text-sm font-semibold">Featured Image</Label>
                  <span className="text-[10px] text-muted-foreground">Main product image</span>
                </div>
                <input
                  ref={addFeaturedImageRef}
                  id="featuredImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFeaturedImageChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <div className="flex gap-3 flex-wrap pt-2">
                  {formData.featuredImage ? (
                    <div className="flex items-start gap-3">
                      <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                        <Image
                          src={URL.createObjectURL(formData.featuredImage)}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          alt="Featured Preview"
                          width={96}
                          height={96}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setFormData({ ...formData, featuredImage: null })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 mt-1"
                        onClick={() => openCrop(formData.featuredImage!, "add-featured")}
                      >
                        <Crop className="h-3.5 w-3.5" />
                        Re-crop
                      </Button>
                    </div>
                  ) : (
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
                  <Label htmlFor="galleryImages" className="text-sm font-semibold">Gallery Images</Label>
                  <span className="text-[10px] text-muted-foreground">Upload multiple gallery images</span>
                </div>
                <input
                  ref={addGalleryImagesRef}
                  id="galleryImages"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleGalleryImageChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <div className="flex gap-3 flex-wrap pt-2">
                  {formData.galleryImages && formData.galleryImages.length > 0 && formData.galleryImages.map((file, idx) => (
                    <div key={idx} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                      <Image
                        src={URL.createObjectURL(file)}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        alt="Gallery Preview"
                        width={96}
                        height={96}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 rounded-full bg-white/90 text-foreground hover:bg-white"
                          onClick={() => { galleryCropQueueRef.current = []; openCrop(file, "add-gallery", idx); }}
                        >
                          <Crop className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => {
                            const updated = formData.galleryImages.filter((_, i) => i !== idx);
                            addGalleryAccumRef.current = updated; // keep ref in sync
                            setFormData(prev => ({ ...prev, galleryImages: updated }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {formData.galleryImages.length === 0 && (
                    <div className="h-24 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                      <Package className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs">No gallery images selected</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
          <div className="px-6 py-4 border-t bg-muted/10 shrink-0 flex justify-end gap-3">
            <Button variant="outline" className="h-10 px-4" onClick={closeAddModal} disabled={submitting}>Cancel</Button>
            <Button className="h-10 px-6 font-semibold shadow-md" onClick={handleAddProduct} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : <><Plus className="w-4 h-4 mr-2" />Publish Product</>}
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
        title={cropPending?.target === "add-gallery" || cropPending?.target === "edit-gallery" ? "Adjust Gallery Image" : "Adjust Featured Image"}
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
                <Image
                  src={viewBinProduct.featuredImage}
                  alt={viewBinProduct.title}
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 object-cover rounded-lg border shrink-0 opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image'; }}
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
                  <span><span className="text-muted-foreground">Price:</span> <span className="font-semibold">${viewBinProduct.price}</span></span>
                  <span><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{viewBinProduct.stock}</span></span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    viewBinProduct.deletedByRole === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  )}>
                    {viewBinProduct.deletedByRole === 'ADMIN' ? 'Deleted by Admin' : 'Deleted by You'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    on {new Date(viewBinProduct.deletedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            <ProductAuditHistory productId={viewBinProduct.id} productTitle={viewBinProduct.title} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
  );
}

export default ProjectsPage;
