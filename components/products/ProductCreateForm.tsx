"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Crop, DollarSign, Info, Loader2, Package, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageCropModal } from "@/components/shared/image-crop-modal";
import { apiClient } from "@/lib/api";
import { cn, validateImageFiles } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au";

export type ProductCreateMode = "SELLER" | "PLATFORM_ADMIN";

type ProductCreateFormProps = {
  mode: ProductCreateMode;
  onCancel: () => void;
  onSuccess?: () => void | Promise<void>;
};

type ProductType = "SIMPLE" | "VARIABLE";
type VariantRow = { price: string; stock: string; sku: string; attributes: Record<string, string> };
type CropTarget = "featured" | "gallery";

const PRODUCT_TYPE_INFO: Record<ProductType, string> = {
  SIMPLE: "One product, one price, one stock count. Use this for items that don't come in different options (e.g. sizes or colors).",
  VARIABLE: "One product with multiple options (e.g. Small/Medium/Large), each with its own price, stock, and SKU.",
};

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("alpa_token");
};

const initialForm = () => ({
  title: "",
  description: "",
  price: "",
  stock: "",
  category: "",
  featuredImage: null as File | null,
  galleryImages: [] as File[],
  featured: false,
  tags: "",
  artistName: "",
  weight: "1",
  type: "SIMPLE" as ProductType,
});

const postProduct = async (
  mode: ProductCreateMode,
  productData: ReturnType<typeof initialForm> & { variants?: VariantRow[] }
) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${BASE_URL}/api/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    const url = data.url ?? data.secure_url ?? data.imageUrl ?? data.data?.url ?? null;
    if (!response.ok || !url) {
      throw new Error(data.message || data.error || "Image upload failed");
    }
    return url as string;
  };

  if (mode === "PLATFORM_ADMIN") {
    const [featuredImageUrl, galleryImageUrls] = await Promise.all([
      productData.featuredImage ? uploadImage(productData.featuredImage) : Promise.resolve(null),
      Promise.all(productData.galleryImages.map(uploadImage)),
    ]);

    const response = await fetch(`${BASE_URL}/api/admin/products/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: productData.title.trim(),
        description: productData.description.trim(),
        category: productData.category.trim(),
        price: Number(productData.price),
        stock: productData.stock ? Number(productData.stock) : 0,
        weight: Number(productData.weight),
        featuredImage: featuredImageUrl,
        galleryImages: galleryImageUrls,
        tags: productData.tags,
        artistName: productData.artistName.trim(),
        featured: productData.featured,
        type: "SIMPLE",
      }),
    });

    if (!response.ok) {
      let message = "Failed to add product";
      try {
        const data = await response.json();
        message = data.message || data.error || message;
      } catch {}
      throw new Error(message);
    }

    return response.json();
  }

  const form = new FormData();
  form.append("title", productData.title.trim());
  form.append("description", productData.description.trim());
  form.append("type", productData.type);
  if (productData.type === "VARIABLE") {
    form.append("variants", JSON.stringify(productData.variants || []));
  } else {
    form.append("price", productData.price);
    form.append("stock", productData.stock);
  }
  form.append("weight", productData.weight);
  form.append("category", productData.category.trim());
  productData.galleryImages.forEach((file) => form.append("galleryImages", file));
  if (productData.featuredImage) form.append("featuredImage", productData.featuredImage);
  form.append("featured", String(productData.featured));
  form.append("tags", productData.tags);
  if (productData.artistName.trim()) form.append("artistName", productData.artistName.trim());

  const response = await fetch(`${BASE_URL}/api/products/add`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    let message = "Failed to add product";
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
};

export function ProductCreateForm({ mode, onCancel, onSuccess }: ProductCreateFormProps) {
  const [formData, setFormData] = useState(initialForm());
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [newVariant, setNewVariant] = useState<VariantRow>({ price: "", stock: "", sku: "", attributes: { Option: "" } });
  const [submitting, setSubmitting] = useState(false);
  const [cropPending, setCropPending] = useState<{ file: File; objectUrl: string; target: CropTarget; galleryReplaceIndex?: number } | null>(null);
  const galleryCropQueueRef = useRef<File[]>([]);
  const galleryAccumRef = useRef<File[]>([]);
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient("/api/categories/");
        if (response?.success && response?.data) {
          setCategories(response.data.approvedCategories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    loadCategories();
  }, []);

  const reset = () => {
    setFormData(initialForm());
    setVariants([]);
    setNewVariant({ price: "", stock: "", sku: "", attributes: { Option: "" } });
    galleryAccumRef.current = [];
    galleryCropQueueRef.current = [];
    if (featuredInputRef.current) featuredInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const openCrop = (file: File, target: CropTarget, galleryReplaceIndex?: number) => {
    setCropPending({ file, objectUrl: URL.createObjectURL(file), target, galleryReplaceIndex });
  };

  const handleCropDone = (croppedFile: File) => {
    if (!cropPending) return;
    URL.revokeObjectURL(cropPending.objectUrl);
    if (cropPending.target === "featured") {
      setFormData((prev) => ({ ...prev, featuredImage: croppedFile }));
      setCropPending(null);
      return;
    }

    if (cropPending.galleryReplaceIndex !== undefined) {
      const updated = [...galleryAccumRef.current];
      updated[cropPending.galleryReplaceIndex] = croppedFile;
      galleryAccumRef.current = updated;
      setFormData((prev) => ({ ...prev, galleryImages: [...updated] }));
      setCropPending(null);
      return;
    }

    galleryAccumRef.current = [...galleryAccumRef.current, croppedFile];
    setFormData((prev) => ({ ...prev, galleryImages: [...galleryAccumRef.current] }));
    const remaining = galleryCropQueueRef.current.slice(1);
    galleryCropQueueRef.current = remaining;
    if (remaining.length > 0) {
      setCropPending({ file: remaining[0], objectUrl: URL.createObjectURL(remaining[0]), target: "gallery" });
    } else {
      setCropPending(null);
    }
  };

  const handleCropCancel = () => {
    if (cropPending) URL.revokeObjectURL(cropPending.objectUrl);
    galleryCropQueueRef.current = [];
    setCropPending(null);
  };

  const handleFeaturedImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = validateImageFiles([file]);
    if (error) {
      toast.error(error, { duration: 7000 });
      return;
    }
    openCrop(file, "featured");
  };

  const handleGalleryImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (files.length === 0) return;
    const error = validateImageFiles(files);
    if (error) {
      toast.error(error, { duration: 7000 });
      return;
    }
    galleryCropQueueRef.current = files;
    openCrop(files[0], "gallery");
  };

  const submit = async () => {
    if (!formData.title.trim()) {
      toast.error("Please fill in the product title");
      return;
    }
    if (!formData.category.trim()) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.weight) {
      toast.error("Please enter product weight");
      return;
    }
    if (formData.type === "SIMPLE" && (!formData.price || !formData.stock)) {
      toast.error("Please fill in price and stock for a Simple product");
      return;
    }
    if (formData.type === "VARIABLE" && variants.length === 0) {
      toast.error("Please add at least one variant for a Variable product");
      return;
    }
    try {
      setSubmitting(true);
      const result = await postProduct(mode, {
        ...formData,
        galleryImages: [...galleryAccumRef.current],
        variants: formData.type === "VARIABLE" ? variants : undefined,
      });

      if (mode === "SELLER" && formData.type === "VARIABLE" && variants.length > 0) {
        const productId = result?.product?.id || result?.id;
        const token = getAuthToken();
        if (productId) {
          await fetch(`${BASE_URL}/api/products/${productId}/variants/bulk`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              variants: variants.map((variant) => ({
                sku: variant.sku,
                price: Number(variant.price),
                stock: Number(variant.stock),
                isActive: true,
                attributes: variant.attributes,
              })),
            }),
          });
        }
      }

      toast.success(mode === "SELLER" ? "Product added successfully!" : "Platform product created as Pending.");
      reset();
      await onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add product";
      toast.error(message, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.categoryName?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const addVariant = () => {
    const option = newVariant.attributes.Option.trim();
    if (!option || !newVariant.price || !newVariant.stock) {
      toast.error("Variant option, price, and stock are required");
      return;
    }
    setVariants((prev) => [...prev, { ...newVariant, attributes: { Option: option } }]);
    setNewVariant({ price: "", stock: "", sku: "", attributes: { Option: "" } });
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Product Type</Label>
          <div className="flex rounded-lg border p-1 bg-muted/20 gap-1">
            {(["SIMPLE", "VARIABLE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                title={PRODUCT_TYPE_INFO[type]}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all inline-flex items-center justify-center gap-1.5",
                  formData.type === type ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFormData((prev) => ({ ...prev, type }))}
              >
                {type === "SIMPLE" ? "Simple Product" : "Variable Product"}
                <Info className="h-3.5 w-3.5 opacity-50" />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {PRODUCT_TYPE_INFO[formData.type]}
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
            <Package className="h-4 w-4 text-muted-foreground" />
            Basic Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="title" className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="Give your product a clear name" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} className="h-10 bg-background" />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="description" className="text-sm font-semibold">Detailed Description</Label>
              <Textarea id="description" placeholder="Describe the features, materials, and benefits..." value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} rows={4} className="resize-none py-2 bg-background" />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="artistName" className="text-sm font-semibold">Artist Name (Optional)</Label>
              <Input id="artistName" placeholder="Enter artist name" value={formData.artistName} onChange={(event) => setFormData({ ...formData, artistName: event.target.value })} className="h-10 bg-background" />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Pricing, Stock &amp; Category
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === "SIMPLE" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-semibold">Price ($) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" placeholder="0.00" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} className="pl-9 h-10 bg-background" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-semibold">Initial Stock <span className="text-red-500">*</span></Label>
                  <Input id="stock" type="number" placeholder="0" value={formData.stock} onChange={(event) => setFormData({ ...formData, stock: event.target.value })} className="h-10 bg-background" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-semibold">Weight (kg) <span className="text-red-500">*</span></Label>
              <Input id="weight" type="number" placeholder="1" min="0" step="0.01" value={formData.weight} onChange={(event) => setFormData({ ...formData, weight: event.target.value })} className="h-10 bg-background" />
            </div>

            <div className={cn("space-y-2", formData.type === "VARIABLE" && "md:col-span-2")}>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Category <span className="text-red-500">*</span></Label>
                {formData.category && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    onClick={() => setFormData({ ...formData, category: "" })}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="rounded-md border bg-background">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input className="h-9 w-full bg-transparent text-sm outline-none" placeholder="Search categories..." value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} />
                </div>
                <div className="max-h-44 overflow-y-auto p-1">
                  {filteredCategories.map((category) => (
                    <button
                      key={category.categoryName}
                      type="button"
                      className={cn("flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-primary/5", formData.category === category.categoryName && "bg-primary/5 text-primary font-medium")}
                      onClick={() => setFormData({ ...formData, category: category.categoryName })}
                    >
                      <span className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary", formData.category === category.categoryName ? "bg-primary text-primary-foreground" : "opacity-50")}>
                        {formData.category === category.categoryName && <Check className="h-3 w-3" />}
                      </span>
                      {category.categoryName}
                    </button>
                  ))}
                  {filteredCategories.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No category found.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {formData.type === "VARIABLE" && (
          <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
            <Label className="text-sm font-semibold">Product Variants <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Option, e.g. Small" value={newVariant.attributes.Option} onChange={(event) => setNewVariant((prev) => ({ ...prev, attributes: { Option: event.target.value } }))} className="bg-background" />
              <Input type="number" placeholder="Price" value={newVariant.price} onChange={(event) => setNewVariant((prev) => ({ ...prev, price: event.target.value }))} className="bg-background" />
              <Input type="number" placeholder="Stock" value={newVariant.stock} onChange={(event) => setNewVariant((prev) => ({ ...prev, stock: event.target.value }))} className="bg-background" />
              <Button type="button" variant="outline" onClick={addVariant} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Variant
              </Button>
            </div>
            {variants.length > 0 ? (
              <div className="overflow-x-auto rounded-md border bg-background">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Option</th>
                      <th className="px-3 py-2 text-left font-medium">Price</th>
                      <th className="px-3 py-2 text-left font-medium">Stock</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {variants.map((variant, index) => (
                      <tr key={`${variant.attributes.Option}-${index}`} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{variant.attributes.Option}</td>
                        <td className="px-3 py-2">${variant.price}</td>
                        <td className="px-3 py-2">{variant.stock} in stock</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" className="text-red-500 hover:text-red-600" onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}>
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1">No variants added yet — add at least one option above.</p>
            )}
          </div>
        )}

        <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Promotion Tags</Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="featured-switch" className="text-xs text-muted-foreground font-normal">Featured product</Label>
              <Switch id="featured-switch" checked={formData.featured} onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["New Arrival", "Sale", "Best Seller", "Limited Edition"].map((tag) => {
              const currentTags = formData.tags ? formData.tags.split(",").map((item) => item.trim()).filter(Boolean) : [];
              const checked = currentTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all", checked ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:text-foreground")}
                  onClick={() => {
                    const nextTags = checked ? currentTags.filter((item) => item !== tag) : [...currentTags, tag];
                    setFormData({ ...formData, tags: nextTags.join(", ") });
                  }}
                >
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border border-primary", checked ? "bg-primary text-primary-foreground" : "opacity-40")}>
                    {checked && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="font-medium">{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/10">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="featuredImage" className="text-sm font-semibold">Featured Image</Label>
            <span className="text-[10px] text-muted-foreground">Main product image</span>
          </div>
          <input ref={featuredInputRef} id="featuredImage" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleFeaturedImageChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary" />
          <div className="flex gap-3 flex-wrap pt-2">
            {formData.featuredImage ? (
              <div className="flex items-start gap-3">
                <div className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                  <Image src={URL.createObjectURL(formData.featuredImage)} className="h-full w-full object-cover" alt="Featured Preview" width={96} height={96} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => setFormData({ ...formData, featuredImage: null })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5 mt-1" onClick={() => openCrop(formData.featuredImage!, "featured")}>
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

        <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/10">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="galleryImages" className="text-sm font-semibold">Gallery Images</Label>
            <span className="text-[10px] text-muted-foreground">Upload multiple gallery images</span>
          </div>
          <input ref={galleryInputRef} id="galleryImages" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" multiple onChange={handleGalleryImageChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary" />
          <div className="flex gap-3 flex-wrap pt-2">
            {formData.galleryImages.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                <Image src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="Gallery Preview" width={96} height={96} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <Button variant="secondary" size="icon" className="h-6 w-6 rounded-full bg-white/90 text-foreground hover:bg-white" onClick={() => openCrop(file, "gallery", index)}>
                    <Crop className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => {
                      const updated = formData.galleryImages.filter((_, i) => i !== index);
                      galleryAccumRef.current = updated;
                      setFormData((prev) => ({ ...prev, galleryImages: updated }));
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
        <Button variant="outline" className="h-10 px-4" onClick={cancel} disabled={submitting}>Cancel</Button>
        <Button className="h-10 px-6 font-semibold shadow-md" onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</> : <><Plus className="w-4 h-4 mr-2" />Publish Product</>}
        </Button>
      </div>

      <ImageCropModal
        open={!!cropPending}
        imageSrc={cropPending?.objectUrl ?? null}
        originalFileName={cropPending?.file.name}
        onCropDone={handleCropDone}
        onCancel={handleCropCancel}
        aspectRatio={3 / 2}
        title={cropPending?.target === "gallery" ? "Adjust Gallery Image" : "Adjust Featured Image"}
      />
    </>
  );
}