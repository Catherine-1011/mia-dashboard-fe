"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, DollarSign, Edit, Trash2, Loader2, X, Eye, Search, Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com";

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
  const response = await fetch(`${BASE_URL}/api/products/my-products`, {
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
  status?: string;
  sales?: number;
  featured?: boolean;
  tags?: string[] | string;
};

const addProduct = async (productData: {
  tags: string;
  featured: boolean;
  title: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  images: File[];
}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  const form = new FormData();
  form.append("title", productData.title);
  form.append("description", productData.description);
  form.append("price", productData.price);
  form.append("stock", productData.stock);
  form.append("category", productData.category);
  for (let i = 0; i < productData.images.length; i++) {
    form.append("images", productData.images[i]);
  }
  form.append("featured", String(productData.featured));
  form.append("tags", productData.tags);
  const response = await fetch(`${BASE_URL}/api/products/add`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: form,
  });
  if (!response.ok) throw new Error("Failed to add product");
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


function ProjectsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [layout, setLayout] = useState<'table' | 'card'>("table");
  
  // Refs for closing dropdowns on click outside
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const editCatDropdownRef = useRef<HTMLDivElement>(null);

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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    images: [] as File[],
    featured: false,
    tags: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    images: [] as File[],
    oldImages: [] as string[],
    featured: false,
    tags: "",
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("");

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
  }, []);

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
    if (!formData.title || !formData.price || !formData.stock) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setSubmitting(true);
      const productData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        stock: formData.stock,
        category: formData.category,
        images: formData.images,
        featured: formData.featured,
        tags: formData.tags,
      };
      await addProduct(productData);
      toast.success("Product added successfully!");
      setShowAddModal(false);
      setFormData({ title: "", description: "", price: "", stock: "", category: "", images: [], featured: false, tags: "" });
      loadProducts();
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    
    try {
      console.log('Starting product deletion for ID:', productId);
      await deleteProduct(productId);
      toast.success("Product deleted successfully!");
      loadProducts();
    } catch (error) {
      console.error('Product deletion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
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
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditFormData({ ...editFormData, images: Array.from(e.target.files) });
    }
  };

  const openEditModal = async (productId: string) => {
    setEditProductId(productId);
    setEditSubmitting(false);
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/api/products/${productId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch product details");
      const data = await response.json();
      const prod = data.product || data;
      setEditFormData({
        title: prod.title || "",
        description: prod.description || "",
        price: prod.price?.toString() || "",
        stock: prod.stock?.toString() || "",
        category: prod.category || "",
        images: [],
        oldImages: prod.images || [],
        featured: prod.featured ?? false,
        tags: Array.isArray(prod.tags) ? prod.tags.join(", ") : (prod.tags || ""),
      });
      setShowEditModal(true);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load product");
    }
  };

  const handleEditProduct = async () => {
    if (!editProductId) return;
    if (!editFormData.title || !editFormData.price || !editFormData.stock) {
      toast.error("Please fill in all required fields");
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
      // Only append images if new images are selected
      if (editFormData.images && editFormData.images.length > 0) {
        for (let i = 0; i < editFormData.images.length; i++) {
          form.append("images", editFormData.images[i]);
        }
      }
      // Add featured and tags fields
      form.append("featured", String(editFormData.featured));
      form.append("tags", editFormData.tags);
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
      toast.success("Product updated successfully!");
      setShowEditModal(false);
      setEditProductId(null);
      loadProducts();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Edit product error:", error);
      toast.error(error.message || "Failed to update product");
    } finally {
      setEditSubmitting(false);
    }
  };
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + (Number(p.price) * (Number(p.sales) || 0)), 0);

  // Get unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Filtered products by search and category
  const filteredProducts = products.filter(
    (p) =>
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.toLowerCase().includes(search.toLowerCase()))) &&
      (categoryFilter ? p.category === categoryFilter : true)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory and listings.</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0 items-center">
          <input
            type="text"
            placeholder="Search products..."
            className="border rounded px-3 py-2 w-[200px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {/* Category Filter Dropdown */}
          <select
            className="border rounded px-3 py-2 w-[180px]"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <Button variant={layout === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setLayout('table')}>Tabular View</Button>
          <Button variant={layout === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setLayout('card')}>Card View</Button>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="col-span-full text-center py-12">No products found.</Card>
      ) : layout === 'table' ? (
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
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
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
                  <td className="px-4 py-2 font-semibold">{product.title}</td>
                  <td className="px-4 py-2">{product.category}</td>
                  <td className="px-4 py-2">${product.price}</td>
                  <td className="px-4 py-2">{product.stock}</td>
                  <td className="px-4 py-2">
                    <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>{product.status || 'Active'}</Badge>
                  </td>
                  <td className="px-4 py-2 flex gap-1">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditModal(product.id)}><Edit className="h-3 w-3" /> Edit</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                    >
                      {expandedProductId === product.id ? (
                        <>
                          <X className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> View
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
                {expandedProductId === product.id && (
                  <tr>
                    <td colSpan={7} className="bg-muted/10 p-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-bold text-lg mb-2">{product.title}</h3>
                          <p className="mb-2 text-muted-foreground">{product.description}</p>
                          <div className="mb-2"><strong>Category:</strong> {product.category}</div>
                          <div className="mb-2"><strong>Price:</strong> ${product.price}</div>
                          <div className="mb-2"><strong>Stock:</strong> {product.stock}</div>
                          <div className="mb-2"><strong>Status:</strong> {product.status || 'Active'}</div>
                          <div className="mb-2"><strong>Sales:</strong> {product.sales ?? 0}</div>
                          <div className="mb-2"><strong>Featured:</strong> {product.featured ? 'Yes' : 'No'}</div>
                          <div className="mb-2">
                            <strong>Tags:</strong> 
                            {product.tags ? (
                              Array.isArray(product.tags) ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{tag}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.tags.split(',').map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{tag.trim()}</span>
                                  ))}
                                </div>
                              )
                            ) : 'None'}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {product.images && product.images.length > 0 ? (
                            product.images.map((img, idx) => (
                              <div key={idx} className="w-80 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                <Image
                                  src={img}
                                  alt={product.title}
                                  width={120}
                                  height={120}
                                  className="w-full object-cover"
                                  unoptimized
                                />
                              </div>
                            ))
                          ) : (
                            <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center">
                              <Image
                                src="/placeholder.svg"
                                alt="No image"
                                width={48}
                                height={48}
                                className="opacity-50"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="flex flex-col">
              <Card className="overflow-hidden flex flex-col">
                <div className="relative h-48 w-full bg-muted">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      width={400}
                      height={192}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://placehold.co/400x300?text=No+Image';
                      }}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Image
                        src="/placeholder.svg"
                        alt="No image"
                        width={48}
                        height={48}
                        className="h-12 w-12 text-muted-foreground/50"
                      />
                    </div>
                  )}
                  <Badge 
                    className="absolute top-2 right-2" 
                    variant={product.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {product.status || "Active"}
                  </Badge>
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-1">{product.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">{product.category}</span>
                    <span className="font-bold text-lg text-primary">${product.price}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Stock Available</span>
                    <span className="font-semibold">{product.stock} units</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditModal(product.id)}><Edit className="h-3 w-3" /> Edit</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                    >
                      {expandedProductId === product.id ? (
                        <>
                          <X className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> View
                        </>
                      )}
                    </Button>
                  </div>
                  {expandedProductId === product.id && (
                    <div className="mt-4 p-4 rounded bg-muted/10 border">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-bold text-lg mb-2">{product.title}</h3>
                          <p className="mb-2 text-muted-foreground">{product.description}</p>
                          <div className="mb-2"><strong>Category:</strong> {product.category}</div>
                          <div className="mb-2"><strong>Price:</strong> ${product.price}</div>
                          <div className="mb-2"><strong>Stock:</strong> {product.stock}</div>
                          <div className="mb-2"><strong>Status:</strong> {product.status || 'Active'}</div>
                          <div className="mb-2"><strong>Sales:</strong> {product.sales ?? 0}</div>
                          <div className="mb-2"><strong>Featured:</strong> {product.featured ? 'Yes' : 'No'}</div>
                          <div className="mb-2">
                            <strong>Tags:</strong> 
                            {product.tags ? (
                              Array.isArray(product.tags) ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{tag}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {product.tags.split(',').map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{tag.trim()}</span>
                                  ))}
                                </div>
                              )
                            ) : 'None'}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {product.images && product.images.length > 0 ? (
                            product.images.map((img, idx) => (
                              <div key={idx} className="w-32 h-32 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                <Image
                                  src={img}
                                  alt={product.title}
                                  width={120}
                                  height={120}
                                  className="max-w-full max-h-full object-contain"
                                  unoptimized
                                />
                              </div>
                            ))
                          ) : (
                            <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center">
                              <Image
                                src="/placeholder.svg"
                                alt="No image"
                                width={48}
                                height={48}
                                className="opacity-50"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
            {/* Edit Product Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                  <CardHeader className="border-b sticky top-0 bg-background z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold">Edit Product</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted"><X className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="edit-title" className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                        <Input id="edit-title" placeholder="Give your product a clear name" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="focus:ring-primary h-10" />
                      </div>
                      
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label htmlFor="edit-description" className="text-sm font-semibold">Detailed Description</Label>
                        <Textarea id="edit-description" placeholder="Product details..." value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} rows={4} className="resize-none focus:ring-primary py-2" />
                      </div>

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
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <Label htmlFor="edit-featured" className="text-sm font-semibold cursor-pointer">Featured Product</Label>
                          <p className="text-[11px] text-muted-foreground">Highlight this on homepage</p>
                        </div>
                        <Switch
                          id="edit-featured"
                          checked={editFormData.featured}
                          onCheckedChange={(checked) => setEditFormData({ ...editFormData, featured: checked })}
                        />
                      </div>
                    </div>

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
                    <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="edit-images" className="text-sm font-semibold">Product Media</Label>
                        <span className="text-[10px] text-muted-foreground">Add or update images</span>
                      </div>
                      <Input id="edit-images" type="file" accept="image/*" multiple onChange={handleEditImageChange} className="bg-background cursor-pointer" />
                      <div className="flex gap-3 flex-wrap pt-2">
                        {editFormData.oldImages && editFormData.oldImages.length > 0 && editFormData.oldImages.map((img, idx) => (
                          <div key={idx} className="h-20 w-20 rounded border overflow-hidden flex items-center justify-center bg-muted">
                            <Image
                              src={img}
                              className="h-full w-full object-cover"
                              alt="Preview"
                              width={80}
                              height={80}
                              onError={(e) => (e.target as HTMLImageElement).style.display='none'}
                              unoptimized
                            />
                          </div>
                        ))}
                        {editFormData.images && editFormData.images.length > 0 && editFormData.images.map((file, idx) => (
                          <div key={idx} className="h-20 w-20 rounded border overflow-hidden flex items-center justify-center bg-muted">
                            <Image
                              src={URL.createObjectURL(file)}
                              className="h-full w-full object-cover"
                              alt="Preview"
                              width={80}
                              height={80}
                              onError={(e) => (e.target as HTMLImageElement).style.display='none'}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm mt-4 border-t py-4">
                      <Button className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20" onClick={handleEditProduct} disabled={editSubmitting}>
                        {editSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Changes"}
                      </Button>
                      <Button variant="outline" className="h-11 px-8" onClick={() => setShowEditModal(false)} disabled={editSubmitting}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
      {/* Add Product Modal */}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <CardHeader className="border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Add New Product</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)} className="h-8 w-8 p-0 rounded-full hover:bg-muted"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Product Title <span className="text-red-500">*</span></Label>
                  <Input id="title" placeholder="Give your product a clear name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="focus:ring-primary h-10" />
                </div>
                
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Detailed Description</Label>
                  <Textarea id="description" placeholder="Describe the features, materials, and benefits..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="resize-none focus:ring-primary py-2" />
                </div>

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

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="featured" className="text-sm font-semibold cursor-pointer">Featured Product</Label>
                    <p className="text-[11px] text-muted-foreground">Highlight this on homepage</p>
                  </div>
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
              </div>

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
              <div className="space-y-3 p-4 rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="images" className="text-sm font-semibold">Product Media</Label>
                  <span className="text-[10px] text-muted-foreground">Upload up to 5 images</span>
                </div>
                <Input id="images" type="file" accept="image/*" multiple onChange={handleImageChange} className="bg-background cursor-pointer" />
                <div className="flex gap-3 flex-wrap pt-2">
                  {formData.images && formData.images.length > 0 && formData.images.map((file, idx) => (
                    <div key={idx} className="relative group h-24 w-24 rounded-lg border-2 border-muted overflow-hidden bg-background shadow-sm">
                      <Image
                        src={URL.createObjectURL(file)}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        alt="Preview"
                        width={96}
                        height={96}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => {
                              const newImages = [...formData.images];
                              newImages.splice(idx, 1);
                              setFormData({...formData, images: newImages});
                            }}
                          >
                           <X className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
                  {formData.images.length === 0 && (
                    <div className="h-24 w-full flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-lg border-2 border-dashed border-muted">
                      <Package className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs">No images selected yet</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm mt-4 border-t py-4">
                <Button className="flex-1 h-11 text-base font-semibold shadow-lg shadow-primary/20" onClick={handleAddProduct} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <> <Plus className="w-5 h-5 mr-2" /> Publish Product</>}
                </Button>
                <Button variant="outline" className="h-11 px-8" onClick={() => setShowAddModal(false)} disabled={submitting}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
