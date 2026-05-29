"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  Search,
  Eye,
} from "lucide-react";
import { ProductAuditHistory } from "@/components/shared/product-audit-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

// --- TYPES ---
type SellerInfo = {
  id: string;
  name: string;
  email: string;
};

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
  seller?: SellerInfo;
  sellerId?: string;
  sellerName?: string;
};

type RecycleBinMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// --- API HELPERS ---
const fetchAdminRecycleBin = async (params: {
  sellerId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.sellerId) query.set("sellerId", params.sellerId);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api.get(`/api/admin/products/recycle-bin${qs ? `?${qs}` : ""}`);
};

const restoreAdminProduct = async (productId: string) =>
  api.post(`/api/admin/products/${productId}/restore`);

const permanentDeleteProduct = async (productId: string, reason?: string) =>
  apiClient(`/api/admin/products/${productId}/permanent`, {
    method: "DELETE",
    body: reason ? JSON.stringify({ reason }) : undefined,
  });

// --- COMPONENT ---
export default function AdminRecycleBinPage() {
  const [products, setProducts] = useState<RecycleBinProduct[]>([]);
  const [meta, setMeta] = useState<RecycleBinMeta>({ total: 0, page: 1, limit: 50, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerIdFilter, setSellerIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Restore / delete state
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecycleBinProduct | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // View product state
  const [viewProduct, setViewProduct] = useState<RecycleBinProduct | null>(null);

  // --- Load recycle bin ---
  const loadRecycleBin = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminRecycleBin({
        sellerId: sellerIdFilter || undefined,
        page,
        limit,
      });
      setProducts(data?.products || []);
      if (data?.meta) setMeta(data.meta);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load recycle bin");
    } finally {
      setLoading(false);
    }
  }, [sellerIdFilter, page, limit]);

  useEffect(() => {
    loadRecycleBin();
  }, [loadRecycleBin]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [sellerIdFilter]);

  // --- Restore ---
  const handleRestore = async (product: RecycleBinProduct) => {
    setRestoringId(product.id);
    try {
      await restoreAdminProduct(product.id);
      toast.success(`"${product.title}" restored. Set it to Active when ready.`);
      loadRecycleBin();
    } catch (error) {
      toast.error((error as Error).message || "Failed to restore product");
    } finally {
      setRestoringId(null);
    }
  };

  // --- Permanent Delete ---
  const openDeleteConfirm = (product: RecycleBinProduct) => {
    setDeleteTarget(product);
    setDeleteReason("");
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await permanentDeleteProduct(deleteTarget.id, deleteReason.trim() || undefined);
      toast.success(`"${deleteTarget.title}" permanently deleted.`);
      setDeleteTarget(null);
      setDeleteReason("");
      loadRecycleBin();
    } catch (error) {
      toast.error((error as Error).message || "Failed to permanently delete product");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // --- Pagination helpers ---
  const getPaginationPages = (): (number | "...")[] => {
    const total = meta.pages;
    const cur = page;
    const pages: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push("...");
      const start = Math.max(2, cur - 1);
      const end = Math.min(total - 1, cur + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (cur < total - 2) pages.push("...");
      pages.push(total);
    }
    return pages;
  };

  // --- Filtered seller search (client-side quick filter on displayed names) ---
  const filteredProducts = sellerSearch
    ? products.filter((p) => {
        const name = (p.seller?.name || p.sellerName || "").toLowerCase();
        const email = (p.seller?.email || "").toLowerCase();
        const term = sellerSearch.toLowerCase();
        return name.includes(term) || email.includes(term);
      })
    : products;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Product Recycle Bin</h1>
          </div>
          <p className="text-muted-foreground">
            Soft-deleted products. Restore them or permanently remove them.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRecycleBin} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Refresh
        </Button>
      </div>

      {/* Stats card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total in Recycle Bin</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deleted by Sellers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.deletedByRole === "SELLER").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deleted by Admins</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.deletedByRole === "ADMIN").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by seller name or email…"
            value={sellerSearch}
            onChange={(e) => setSellerSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Per page:</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <Trash2 className="h-14 w-14 text-muted-foreground/25" />
            <p className="text-lg font-semibold text-muted-foreground">Recycle Bin is empty</p>
            <p className="text-sm text-muted-foreground">
              No soft-deleted products found{sellerSearch ? " for this search" : ""}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="min-w-full divide-y divide-muted">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Seller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deleted On</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deleted By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/20">
                  {/* Thumbnail */}
                  <td className="px-4 py-2">
                    {product.featuredImage ? (
                      <Image
                        src={product.featuredImage}
                        alt={product.title}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover rounded opacity-60"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/100x100?text=No+Image";
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                        <Package className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-2">
                    <p className="font-semibold text-muted-foreground line-clamp-1">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.category || "—"}</p>
                  </td>

                  {/* Seller */}
                  <td className="px-4 py-2">
                    {product.seller ? (
                      <div>
                        <p className="text-sm font-medium">{product.seller.name}</p>
                        <p className="text-xs text-muted-foreground">{product.seller.email}</p>
                      </div>
                    ) : product.sellerName ? (
                      <p className="text-sm font-medium">{product.sellerName}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-2 text-sm font-semibold">${product.price}</td>

                  {/* Stock */}
                  <td className="px-4 py-2 text-sm">{product.stock}</td>

                  {/* Deleted On */}
                  <td className="px-4 py-2 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(product.deletedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  {/* Deleted By badge */}
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs whitespace-nowrap",
                        product.deletedByRole === "ADMIN"
                          ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                          : "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"
                      )}
                    >
                      {product.deletedByRole === "ADMIN" ? "Deleted by Admin" : "Deleted by Seller"}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setViewProduct(product)}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        disabled={restoringId === product.id}
                        onClick={() => handleRestore(product)}
                      >
                        {restoringId === product.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteConfirm(product)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Permanently
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && meta.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((page - 1) * limit + 1, meta.total)}
              </span>
              {"–"}
              <span className="font-medium text-foreground">
                {Math.min(page * limit, meta.total)}
              </span>
              {" of "}
              <span className="font-medium text-foreground">{meta.total}</span>
              {" products"}
            </span>
          </div>
          {meta.pages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationPages().map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground text-sm select-none"
                  >
                    &hellip;
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === meta.pages}
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* View Product Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => { if (!open) setViewProduct(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
              >
                Deleted
              </span>
              <span className="truncate">{viewProduct?.title}</span>
            </DialogTitle>
          </DialogHeader>

          {viewProduct && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="flex gap-4">
                {viewProduct.featuredImage ? (
                  <Image
                    src={viewProduct.featuredImage}
                    alt={viewProduct.title}
                    width={96}
                    height={96}
                    className="h-24 w-24 object-cover rounded-lg border shrink-0 opacity-80"
                    unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image"; }}
                  />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-lg border shrink-0">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-base">{viewProduct.title}</p>
                  {viewProduct.category && <p className="text-muted-foreground">{viewProduct.category}</p>}
                  <div className="flex flex-wrap gap-3">
                    <span><span className="text-muted-foreground">Price:</span> <span className="font-semibold">${viewProduct.price}</span></span>
                    <span><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{viewProduct.stock}</span></span>
                  </div>
                  {viewProduct.seller && (
                    <p className="text-muted-foreground">
                      Seller: <span className="font-medium text-foreground">{viewProduct.seller.name}</span>
                      {" "}<span className="text-xs">({viewProduct.seller.email})</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      viewProduct.deletedByRole === "ADMIN" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {viewProduct.deletedByRole === "ADMIN" ? "Deleted by Admin" : "Deleted by Seller"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      on {new Date(viewProduct.deletedAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit history */}
              <ProductAuditHistory productId={viewProduct.id} productTitle={viewProduct.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-semibold">Permanently delete this product?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will remove{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.title}&rdquo;
              </span>{" "}
              and all associated data forever. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">
              Reason{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Duplicate listing removed by admin"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              disabled={deleteSubmitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
