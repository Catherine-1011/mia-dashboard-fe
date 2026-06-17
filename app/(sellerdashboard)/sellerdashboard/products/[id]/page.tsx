"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft, Edit, Trash2, Loader2, Package, DollarSign,
  X, Check, ChevronDown, Search, Layers, AlertCircle, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProductAuditHistory } from "@/components/shared/product-audit-history";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const getAuthToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("alpa_token") : null;

type AttributeValue = {
  name: string;
  value: string;
  hexColor?: string | null;
};

type Variant = {
  id: string;
  sku?: string | null;
  price: number | string;
  stock: number;
  attributes?: AttributeValue[];
  isActive?: boolean;
};

type Product = {
  id: string;
  title: string;
  description?: string;
  type?: "SIMPLE" | "VARIABLE";
  price: number;
  stock: number;
  sku?: string | null;
  category?: string;
  images: string[];
  featuredImage?: string | null;
  galleryImages?: string[];
  status?: string;
  rejectionReason?: string | null;
  reviewNote?: string | null;
  sellerInactiveReason?: string | null;
  sales?: number;
  featured?: boolean;
  tags?: string[] | string;
  artistName?: string;
  weight?: number | string;
  variants?: Variant[];
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function ProductDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct]     = useState<Product | null>(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(false);
  const [showEdit, setShowEdit]   = useState(false);

  // Edit form state
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [editSubmitting, setEditSubmitting]   = useState(false);
  const [isEditCatOpen, setIsEditCatOpen]     = useState(false);
  const [editCatSearch, setEditCatSearch]     = useState("");
  const editCatDropdownRef                    = useRef<HTMLDivElement>(null);
  const editFeaturedImageRef                  = useRef<HTMLInputElement>(null);
  const editGalleryImagesRef                  = useRef<HTMLInputElement>(null);
  const editGalleryAccumRef                   = useRef<File[]>([]);
  const [editFormData, setEditFormData] = useState({
    title: "", description: "", price: "", stock: "", weight: "", category: "",
    images: [] as File[], oldImages: [] as string[],
    featuredImage: null as File | null, oldFeaturedImage: null as string | null,
    galleryImages: [] as File[], oldGalleryImages: [] as string[],
    featured: false, tags: "", artistName: "",
  });

  // ── Fetch product ──────────────────────────────────────────────────────────
  const loadProduct = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/products/${id}?includeVariants=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch product");
      const data = await res.json();
      setProduct(data.product ?? data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/categories/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) setAvailableCategories(data.data.approvedCategories ?? []);
    } catch {/* ignore */}
  };

  useEffect(() => { loadProduct(); loadCategories(); }, [id]); // eslint-disable-line

  // ── Click outside category dropdown ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (editCatDropdownRef.current && !editCatDropdownRef.current.contains(e.target as Node)) {
        setIsEditCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Open edit modal pre-filled ─────────────────────────────────────────────
  const openEdit = () => {
    if (!product) return;
    editGalleryAccumRef.current = [];
    const featuredImg = product.featuredImage ?? null;
    const rawGallery = [
      ...(Array.isArray(product.galleryImages) ? product.galleryImages : []),
      ...(Array.isArray(product.images) ? product.images : []),
    ];
    const resolvedGallery = [...new Set(rawGallery)].filter((img) => img !== featuredImg);
    setEditFormData({
      title: product.title ?? "",
      description: product.description ?? "",
      price: product.price?.toString() ?? "",
      stock: product.stock?.toString() ?? "",
      weight: product.weight?.toString() ?? "",
      category: product.category ?? "",
      images: [], oldImages: product.images ?? [],
      featuredImage: null, oldFeaturedImage: featuredImg,
      galleryImages: [], oldGalleryImages: resolvedGallery,
      featured: product.featured ?? false,
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags ?? ""),
      artistName: product.artistName ?? "",
    });
    setShowEdit(true);
  };

  // ── Save edits ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    const isVar = product?.type === "VARIABLE";
    if (!editFormData.title) {
      toast.error("Please fill in the product title");
      return;
    }
    if (!isVar && (!editFormData.price || !editFormData.stock)) {
      toast.error("Please fill in price and stock");
      return;
    }
    try {
      setEditSubmitting(true);
      const token = getAuthToken();
      const form = new FormData();
      form.append("title", editFormData.title.trim());
      form.append("description", editFormData.description.trim());
      form.append("price", String(editFormData.price));
      form.append("stock", String(editFormData.stock));
      form.append("category", editFormData.category.trim());
      form.append("featured", String(editFormData.featured));
      form.append("tags", editFormData.tags);
      if (editFormData.artistName) form.append("artistName", editFormData.artistName.trim());
      if (editFormData.weight) form.append("weight", editFormData.weight);

      const featuredFile = editFeaturedImageRef.current?.files?.[0] ?? null;
      if (featuredFile) {
        form.append("featuredImage", featuredFile);
      } else if (editFormData.oldFeaturedImage) {
        form.append("oldFeaturedImage", editFormData.oldFeaturedImage);
      }

      editFormData.oldGalleryImages.forEach((url) => form.append("galleryImages", url));
      [...editGalleryAccumRef.current].forEach((f) => form.append("galleryImages", f));

      const res = await fetch(`${BASE_URL}/api/products/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update product");
      }
      toast.success("Product updated successfully!");
      setShowEdit(false);
      editGalleryAccumRef.current = [];
      loadProduct();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm(`Delete "${product?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete product");
      }
      toast.success("Product deleted.");
      router.push("/sellerdashboard/products");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Gallery image handlers ────────────────────────────────────────────────
  const handleEditGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const merged = [...editGalleryAccumRef.current, ...files];
    editGalleryAccumRef.current = merged;
    setEditFormData((prev) => ({ ...prev, galleryImages: merged }));
    e.target.value = "";
  };

  // ── Derived values (must be before any early returns to satisfy Rules of Hooks) ──
  const tags = Array.isArray(product?.tags)
    ? product.tags
    : product?.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const isVariable = product?.type === "VARIABLE";
  const variants = product?.variants ?? [];

  // Price range for VARIABLE products
  const variantPriceRange = useMemo(() => {
    if (!isVariable || variants.length === 0) return null;
    const prices = variants.map((v) => Number(v.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }, [isVariable, variants]);

  const totalVariantStock = useMemo(() => {
    if (!isVariable || variants.length === 0) return 0;
    return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }, [isVariable, variants]);

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" onClick={() => router.push("/sellerdashboard/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Back + Actions ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/sellerdashboard/products")}>
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openEdit}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>

      {/* ── Main Detail Card ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Images column */}
            <div className="space-y-4">
              {/* Featured image */}
              {product.featuredImage ? (
                <div className="rounded-xl overflow-hidden border bg-muted aspect-[4/3] w-full">
                  <Image
                    src={product.featuredImage}
                    alt={product.title}
                    width={600}
                    height={450}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : product.images?.[0] ? (
                <div className="rounded-xl overflow-hidden border bg-muted aspect-[4/3] w-full">
                  <Image
                    src={product.images[0]}
                    alt={product.title}
                    width={600}
                    height={450}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="rounded-xl border bg-muted aspect-[4/3] w-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}

              {/* Gallery thumbnails */}
              {(product.galleryImages?.length ?? 0) > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {product.galleryImages!.map((img, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg border overflow-hidden bg-muted flex-shrink-0">
                      <Image src={img} alt={`Gallery ${i + 1}`} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info column */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h1 className="text-2xl font-bold leading-tight">{product.title}</h1>
                <div className="flex items-center gap-2 shrink-0 mt-1 flex-wrap">
                  {/* Product type badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                    isVariable
                      ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                      : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                  )}>
                    {isVariable ? <Layers className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                    {isVariable ? "Variable" : "Simple"}
                  </span>
                  {/* Status badge */}
                  <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                    {product.status === "ACTIVE" ? "Live" : product.status === "PENDING" ? "Pending Review" : product.status === "REJECTED" ? "Rejected" : product.status === "INACTIVE" ? "Inactive" : (product.status ?? "Unknown")}
                  </Badge>
                </div>
              </div>

              {product.artistName && (
                <p className="text-sm text-muted-foreground">By <span className="font-medium text-foreground">{product.artistName}</span></p>
              )}

              {/* Rejection reason */}
              {product.status === "REJECTED" && product.rejectionReason && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Rejection Reason</p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{product.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Review note */}
              {product.reviewNote && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-3 py-2.5">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Seller Note</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">{product.reviewNote}</p>
                  </div>
                </div>
              )}

              {/* Price & Stock */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                  <DollarSign className="h-5 w-5" />
                  {isVariable ? (variantPriceRange ?? "—") : Number(product.price).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground border rounded-lg px-3 py-1">
                  Stock: <span className="font-semibold text-foreground">{isVariable ? totalVariantStock : product.stock}</span>
                </div>
                {isVariable && variants.length > 0 && (
                  <div className="text-sm text-muted-foreground border rounded-lg px-3 py-1">
                    <span className="font-semibold text-foreground">{variants.length}</span> variant{variants.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</p>
                  <p className="text-sm font-medium mt-0.5">{product.category ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sales</p>
                  <p className="text-sm font-medium mt-0.5">{product.sales ?? 0}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Featured</p>
                  <p className="text-sm font-medium mt-0.5">{product.featured ? "Yes" : "No"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Weight</p>
                  <p className="text-sm font-medium mt-0.5">{product.weight != null ? `${product.weight} kg` : "—"}</p>
                </div>
                {product.sku && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">SKU</p>
                    <p className="text-sm font-mono font-medium mt-0.5">{product.sku}</p>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Variants Table (VARIABLE products) ────────────────────── */}
          {isVariable && variants.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Product Variants</h2>
                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{variants.length}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attributes</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {variants.map((variant, i) => (
                      <tr key={variant.id ?? i} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              const attrs = variant.attributes;

                              // Normalize a raw attribute value to a plain string
                              // The API may return string | {value, displayValue, hexColor}
                              const toStr = (v: unknown): string => {
                                if (v == null) return "";
                                if (typeof v === "object") {
                                  const o = v as any;
                                  return String(o.value ?? o.displayValue ?? o.displayName ?? "");
                                }
                                return String(v);
                              };

                              // Extract hex color from a raw value if present
                              const toHex = (v: unknown): string | null => {
                                if (v && typeof v === "object") {
                                  return (v as any).hexColor ?? (v as any).hexCode ?? null;
                                }
                                return null;
                              };

                              type Pair = { name: string; value: string; hexColor: string | null };
                              let pairs: Pair[] = [];

                              if (Array.isArray(attrs)) {
                                // [{name, value, hexColor?}] — value itself may be a nested obj
                                pairs = (attrs as any[]).map((a) => ({
                                  name: String(a.name ?? ""),
                                  value: toStr(a.value),
                                  hexColor: toHex(a.value) ?? a.hexColor ?? a.hexCode ?? null,
                                }));
                              } else if (attrs && typeof attrs === "object") {
                                // {Size: "M"} or {Size: {value:"M", displayValue:...}}
                                pairs = Object.entries(attrs as Record<string, unknown>).map(([name, val]) => ({
                                  name,
                                  value: toStr(val),
                                  hexColor: toHex(val),
                                }));
                              }

                              if (pairs.length === 0) {
                                return <span className="text-muted-foreground text-xs">—</span>;
                              }
                              return pairs.map((attr, ai) => (
                                <span
                                  key={ai}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                                >
                                  {attr.hexColor && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-white/50 shrink-0"
                                      style={{ backgroundColor: attr.hexColor }}
                                    />
                                  )}
                                  <span className="text-muted-foreground font-normal">{attr.name}:</span>{" "}
                                  {attr.value}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">{variant.sku ?? "—"}</span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold">${Number(variant.price).toFixed(2)}</td>
                        <td className={cn("px-4 py-2.5 font-medium", Number(variant.stock) <= 2 ? "text-red-600" : "")}>
                          {variant.stock}
                          {Number(variant.stock) <= 2 && <span className="ml-1 text-xs text-red-500">(low)</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            variant.isActive !== false
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {variant.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Audit History ──────────────────────────────────────────── */}
          <div className="mt-8">
            <ProductAuditHistory productId={product.id} productTitle={product.title} />
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Edit Product</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                  onClick={() => { editGalleryAccumRef.current = []; setShowEdit(false); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Variable product notice */}
              {product.type === "VARIABLE" && (
                <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 px-3 py-2.5">
                  <Layers className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    This is a <strong>Variable product</strong>. Price and stock are managed per-variant. You can edit description, images, tags and other details here. To change variant prices or stock, use the variants manager.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="Product title" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea placeholder="Product description..." value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} rows={4} className="resize-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold">Artist Name</Label>
                  <Input placeholder="Artist name" value={editFormData.artistName} onChange={(e) => setEditFormData({ ...editFormData, artistName: e.target.value })} className="h-10" />
                </div>
                {product.type !== "VARIABLE" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Price ($) <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" placeholder="0.00" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} className="pl-9 h-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Stock <span className="text-red-500">*</span></Label>
                      <Input type="number" placeholder="0" value={editFormData.stock} onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })} className="h-10" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Weight (kg)</Label>
                  <Input type="number" placeholder="1" min="0" step="0.01" value={editFormData.weight} onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })} className="h-10" />
                </div>

                {/* Category */}
                <div className="space-y-2 relative col-span-2" ref={editCatDropdownRef}>
                  <Label className="text-sm font-semibold">Category</Label>
                  <div
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary/50"
                    onClick={() => setIsEditCatOpen(!isEditCatOpen)}
                  >
                    <span className={editFormData.category ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {editFormData.category || "Select a category"}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isEditCatOpen && "rotate-180")} />
                  </div>
                  {isEditCatOpen && (
                    <div className="absolute z-[60] w-full mt-1 bg-background rounded-lg border shadow-xl p-1 animate-in fade-in zoom-in-95">
                      <div className="flex items-center border-b px-3 pb-2 pt-1">
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        <input
                          className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Search categories..."
                          value={editCatSearch}
                          onChange={(e) => setEditCatSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto mt-1">
                        {availableCategories
                          .filter((cat) => cat.categoryName.toLowerCase().includes(editCatSearch.toLowerCase()))
                          .map((cat) => (
                            <div
                              key={cat.categoryName}
                              className={cn(
                                "flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm hover:bg-primary/5 hover:text-primary",
                                editFormData.category === cat.categoryName && "bg-primary/5 text-primary font-medium"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditFormData({ ...editFormData, category: cat.categoryName });
                                setIsEditCatOpen(false);
                                setEditCatSearch("");
                              }}
                            >
                              <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary", editFormData.category === cat.categoryName ? "bg-primary text-primary-foreground" : "opacity-50")}>
                                {editFormData.category === cat.categoryName && <Check className="h-3 w-3" />}
                              </div>
                              {cat.categoryName}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 col-span-2">
                  <div>
                    <Label className="text-sm font-semibold cursor-pointer">Featured Product</Label>
                    <p className="text-[11px] text-muted-foreground">Highlight this on homepage</p>
                  </div>
                  <Switch checked={editFormData.featured} onCheckedChange={(v) => setEditFormData({ ...editFormData, featured: v })} />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tags</Label>
                <div className="flex flex-wrap gap-3">
                  {["New Arrival", "Sale", "Best Seller", "Limited Edition"].map((tag) => {
                    const current = editFormData.tags ? editFormData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
                    const checked = current.includes(tag);
                    return (
                      <div
                        key={tag}
                        className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all", checked ? "bg-primary/10 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20")}
                        onClick={() => {
                          const next = checked ? current.filter((t) => t !== tag) : [...current, tag];
                          setEditFormData({ ...editFormData, tags: next.join(", ") });
                        }}
                      >
                        <div className={cn("flex h-4 w-4 items-center justify-center rounded border border-primary", checked ? "bg-primary text-primary-foreground" : "opacity-50")}>
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm font-medium">{tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Featured Image */}
              <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-semibold">Featured Image</Label>
                  <span className="text-[10px] text-muted-foreground">Main product image</span>
                </div>
                <input ref={editFeaturedImageRef} type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setEditFormData((prev) => ({ ...prev, featuredImage: file }));
                }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <div className="flex gap-3 flex-wrap pt-2">
                  {editFormData.oldFeaturedImage && !editFormData.featuredImage && (
                    <div className="relative group h-20 w-20 rounded border overflow-hidden bg-muted">
                      <Image src={editFormData.oldFeaturedImage} alt="Featured" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => setEditFormData({ ...editFormData, oldFeaturedImage: null })}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {editFormData.featuredImage && (
                    <div className="relative group h-20 w-20 rounded border overflow-hidden bg-muted">
                      <Image src={URL.createObjectURL(editFormData.featuredImage)} alt="New" width={80} height={80} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                    </div>
                  )}
                  {!editFormData.oldFeaturedImage && !editFormData.featuredImage && (
                    <div className="h-20 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                      <Package className="h-6 w-6 mb-1 opacity-20" />
                      <p className="text-xs">No featured image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Images */}
              <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-semibold">Gallery Images</Label>
                  <span className="text-[10px] text-muted-foreground">Multiple gallery images</span>
                </div>
                <input ref={editGalleryImagesRef} type="file" accept="image/*" multiple onChange={handleEditGalleryImageChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                <div className="flex gap-3 flex-wrap pt-2">
                  {editFormData.oldGalleryImages.map((img, idx) => (
                    <div key={idx} className="relative group h-20 w-20 rounded border overflow-hidden bg-muted">
                      <Image src={img} alt="Gallery" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => setEditFormData((prev) => ({ ...prev, oldGalleryImages: prev.oldGalleryImages.filter((_, i) => i !== idx) }))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {editFormData.galleryImages.map((file, idx) => (
                    <div key={idx} className="relative group h-20 w-20 rounded border overflow-hidden bg-muted">
                      <Image src={URL.createObjectURL(file)} alt="New" width={80} height={80} className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[9px] text-center py-0.5">New</span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={() => {
                          const updated = editFormData.galleryImages.filter((_, i) => i !== idx);
                          editGalleryAccumRef.current = updated;
                          setEditFormData((prev) => ({ ...prev, galleryImages: updated }));
                        }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {editFormData.oldGalleryImages.length === 0 && editFormData.galleryImages.length === 0 && (
                    <div className="h-20 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                      <Package className="h-6 w-6 mb-1 opacity-20" />
                      <p className="text-xs">No gallery images</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-2 sticky bottom-0 bg-background/80 backdrop-blur-sm border-t py-4">
                <Button className="flex-1 h-11 text-base font-semibold" onClick={handleSaveEdit} disabled={editSubmitting}>
                  {editSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Changes"}
                </Button>
                <Button variant="outline" className="h-11 px-8" onClick={() => { editGalleryAccumRef.current = []; setShowEdit(false); }} disabled={editSubmitting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
