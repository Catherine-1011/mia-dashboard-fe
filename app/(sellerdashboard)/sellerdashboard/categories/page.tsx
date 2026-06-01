"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Loader2, Clock, CheckCircle2, Package, Search, AlertCircle, RefreshCcw, Eye, Trash2, X } from "lucide-react";

// --- CONFIGURATION ---
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://backend.madeinarnhemland.com.au";

// --- HELPER: Get Auth Token ---
const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("alpa_token");
};

// --- Seller Profile Type ---
type SellerProfile = {
  id: string;
  status: string;
  approvedAt?: string | null;
  storeName?: string;
  businessName?: string;
};

// --- FETCH SELLER PROFILE ---
const fetchSellerProfile = async (): Promise<SellerProfile> => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found. Please log in.");
  
  const response = await fetch(`${BASE_URL}/api/seller-profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) throw new Error("Unauthorized: Please log in again.");
  if (!response.ok) throw new Error("Failed to fetch seller profile");
  
  const data = await response.json();
  return data.data;
};

interface Category {
  id?: string | null;
  categoryName: string;
  productCount?: number;    
  myProductCount?: number;
  isRequestedCategory?: boolean;
  requestedByMe?: boolean;
}

interface PendingRequest {
  id: string;
  categoryName: string;
  description: string;
  sampleProduct: string;
  requestedAt: string;
  status: string;
}

interface RejectedRequest {
  id: string;
  categoryName: string;
  rejectionMessage: string;
  rejectedAt: string;
  status: string;
}

interface CategoryResponse {
  success: boolean;
  data: {
    approvedCategories: Category[];
    myPendingRequests: PendingRequest[];
    myRejectedRequests: RejectedRequest[];
    totalCategories: number;
    totalMyPending: number;
  };
}

interface CategoryRequestForm {
  categoryName: string;
  description: string;
}

const CategoriesPage = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<RejectedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PendingRequest | RejectedRequest | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  
  // Seller profile state
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userInteracting, setUserInteracting] = useState(false);

  const form = useForm<CategoryRequestForm>({
    defaultValues: {
      categoryName: "",
      description: "",
    },
  });

  useEffect(() => {
    fetchCategories();
    loadSellerProfile();
  }, []);

  const loadSellerProfile = async () => {
    try {
      setProfileLoading(true);
      const profile = await fetchSellerProfile();
      setSellerProfile(profile);
    } catch (error) {
      console.error('Error fetching seller profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Auto-refresh seller profile when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (!profileLoading && sellerProfile && !userInteracting) {
        loadSellerProfile();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !profileLoading && sellerProfile && !userInteracting) {
        loadSellerProfile();
      }
    };

    // Track user interactions to prevent auto-refresh interference
    const handleUserInteraction = () => {
      setUserInteracting(true);
      // Clear the flag after 5 seconds of no interaction
      setTimeout(() => setUserInteracting(false), 5000);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
    };
  }, [profileLoading, sellerProfile, userInteracting]);

  // Periodic check every 2 minutes for status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!profileLoading && sellerProfile && sellerProfile.status !== "APPROVED" && sellerProfile.status !== "ACTIVE" && !userInteracting) {
        loadSellerProfile();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [profileLoading, sellerProfile, userInteracting]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient("/api/categories/");
      
      if (response.success && response.data) {
        setCategories(response.data.approvedCategories || []);
        setPendingRequests(response.data.myPendingRequests || []);
        setRejectedRequests(response.data.myRejectedRequests || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryRequestForm) => {
    // Check seller approval status before allowing category request
    if (sellerProfile?.status !== "APPROVED" && sellerProfile?.status !== "ACTIVE") {
      toast.error("Your account needs to be approved before you can request categories");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await apiClient("/api/categories/request", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.success) {
        toast.success("Category request submitted successfully!");
        form.reset();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error submitting category request:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit request";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await apiClient(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      if (response.success) {
        toast.success(`Category "${deleteTarget.categoryName}" moved to recycle bin`);
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchCategories();
      } else {
        throw new Error(response.message ?? "Failed to delete");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myTotalProducts = categories.reduce((sum, cat) => sum + (cat.myProductCount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Browse available categories and manage your category requests
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) form.reset(); }}>
          <DialogTrigger asChild>
            <Button 
              className={cn("gap-2", sellerProfile !== null && sellerProfile?.status !== "APPROVED" && sellerProfile?.status !== "ACTIVE" && "opacity-50 cursor-not-allowed")}
              onClick={() => {
                if (sellerProfile !== null && sellerProfile?.status !== "APPROVED" && sellerProfile?.status !== "ACTIVE") {
                  toast.error("Your account needs to be approved before you can request categories");
                  return;
                }
              }}
              disabled={sellerProfile !== null && sellerProfile?.status !== "APPROVED" && sellerProfile?.status !== "ACTIVE"}
            >
              <Plus className="w-4 h-4" />
              Request Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request New Category</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryName"
                  rules={{ required: "Category name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Electronics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: "Description is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the category and its purpose..." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading categories&hellip;
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground">Available Categories</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-3xl font-bold">{categories.length}</p>
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground">My Products</p>
              <p className="text-3xl font-bold mt-1">{myTotalProducts}</p>
            </Card>
            <Card className="p-5 border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-900/10">
              <p className="text-xs font-medium text-muted-foreground">Pending Requests</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{pendingRequests.length}</p>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </Card>
            <Card className="p-5 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10">
              <p className="text-xs font-medium text-muted-foreground">Rejected Requests</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-3xl font-bold text-red-600 dark:text-red-500">{rejectedRequests.length}</p>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            </Card>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 border-b pb-4 flex-wrap">
            {([
              { key: "available", label: "Available", count: categories.length,       icon: <CheckCircle2 className="h-4 w-4" /> },
              { key: "pending",   label: "Pending",   count: pendingRequests.length,  icon: <Clock className="h-4 w-4" /> },
              { key: "rejected",  label: "Rejected",  count: rejectedRequests.length, icon: <X className="h-4 w-4" /> },
            ] as const).map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setActiveTab(tab.key);
                  setUserInteracting(true);
                  setTimeout(() => setUserInteracting(false), 3000);
                }}
                className="gap-1.5"
              >
                {tab.icon}
                {tab.label}
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold",
                  activeTab === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.key === "pending" && tab.count > 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                    : tab.key === "rejected" && tab.count > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>

          {/* Available Tab */}
          {activeTab === "available" && (
            categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Package className="h-10 w-10 opacity-20" />
                <p className="text-sm">No approved categories yet</p>
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Request a Category
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {filteredCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No categories matching &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="min-w-full divide-y divide-muted">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Origin</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">My Products</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted">
                        {filteredCategories.map((category, index) => (
                          <tr key={index} className="hover:bg-muted/20">
                            <td className="px-4 py-2 text-sm text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-2 font-semibold">{category.categoryName}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 border-none text-[10px] uppercase">
                                  Active
                                </Badge>
                                {category.requestedByMe && (
                                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] uppercase">
                                    My Request
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Package className="h-3 w-3" />{category.myProductCount || 0}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <Button variant="outline" size="sm" className="gap-1" disabled={!category.id} onClick={() => category.id && router.push(`/sellerdashboard/categories/${category.id}`)}>
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )
          )}

          {/* Pending Tab */}
          {activeTab === "pending" && (
            pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Clock className="h-10 w-10 opacity-20" />
                <p className="text-sm">No pending category requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-yellow-50/50 dark:bg-yellow-950/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Requested On</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted">
                    {pendingRequests.map((request, idx) => (
                      <tr key={request.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{request.categoryName}</span>
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">Pending</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px]">
                          <p className="line-clamp-2">{request.description}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(request.requestedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/sellerdashboard/categories/${request.id}`)}>
                              <Eye className="h-3 w-3" /> View
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

          {/* Rejected Tab */}
          {activeTab === "rejected" && (
            rejectedRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <X className="h-10 w-10 opacity-20" />
                <p className="text-sm">No rejected category requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="min-w-full divide-y divide-muted">
                  <thead className="bg-red-50/50 dark:bg-red-950/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rejection Feedback</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rejected On</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted">
                    {rejectedRequests.map((request, idx) => (
                      <tr key={request.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2 font-semibold text-destructive">{request.categoryName}</td>
                        <td className="px-4 py-2">
                          <p className="text-xs text-muted-foreground italic line-clamp-2 max-w-[240px]">
                            {request.rejectionMessage ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(request.rejectedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline" size="sm"
                              className="gap-1 text-primary border-primary/20 hover:bg-primary/10 hover:text-primary"
                              onClick={() => router.push(`/sellerdashboard/categories/${request.id}`)}
                            >
                              <RefreshCcw className="h-3 w-3" /> Fix &amp; Resubmit
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="gap-1 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => { setDeleteTarget(request); setIsDeleteDialogOpen(true); }}
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

        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(o) => { if (!isDeleting) { setIsDeleteDialogOpen(o); if (!o) setDeleteTarget(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Move to Recycle Bin
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to move{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.categoryName}</span>{" "}
              to the recycle bin? An admin will need to permanently delete it from there.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isDeleting} onClick={() => { setIsDeleteDialogOpen(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Move to Bin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
