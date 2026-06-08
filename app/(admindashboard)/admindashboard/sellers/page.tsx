"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
  
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Check,
  X,
  Eye,
  Flag,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";
import { toast } from "sonner";

type Seller = {
  id: string;
  sellerId: string;
  email: string;
  businessName: string;
  storeName: string;
  contactPerson: string;
  phone: string;
  businessType: string;
  address: string;
  productCount: number;
  status: string;
  minimumProductsUploaded: boolean;
  createdAt: string;
  updatedAt: string;
  bankDetails?: {
    bsb: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  stripeStatus?: string;
};

export default function SellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [stripeStatuses, setStripeStatuses] = useState<{ [key: string]: string }>({});
  async function fetchSellers() {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/sellers");
      setSellers(res.sellers || []);
    } catch (err) {
      toast.error("Failed to load sellers");
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSellers();
  }, []);

  const setLoaderFor = (sellerId: string, state: boolean) =>
    setActionLoading((prev) => ({ ...prev, [sellerId]: state }));

  const handleApprove = async (sellerId: string) => {
    setLoaderFor(sellerId + "-approve", true);
    try {
      await api.post(`/api/admin/sellers/approve/${sellerId}`);
      toast.success("Seller approved");
      fetchSellers();
    } catch {
      toast.error("Failed to approve seller");
    } finally {
      setLoaderFor(sellerId + "-approve", false);
    }
  };

  const handleReject = async (sellerId: string) => {
    setLoaderFor(sellerId + "-reject", true);
    try {
      await api.post(`/api/admin/sellers/${sellerId}/reject`, {});
      toast.success("Seller rejected");
      fetchSellers();
    } catch {
      toast.error("Failed to reject seller");
    } finally {
      setLoaderFor(sellerId + "-reject", false);
    }
  };

  const handleStripeSync = async (sellerId: string) => {
    setLoaderFor(sellerId + "-stripe", true);
    try {
      const res = await api.post(`/api/admin/sellers/stripe-sync/${sellerId}`);
      const status = res?.stripeStatus ?? res?.stripe_status ?? res?.status ?? "synced";
      setStripeStatuses((prev) => ({ ...prev, [sellerId]: status }));
      toast.success("Stripe status synced");
    } catch {
      toast.error("Failed to sync Stripe status");
    } finally {
      setLoaderFor(sellerId + "-stripe", false);
    }
  };

  const handleActivate = async (seller: Seller) => {
    if ((seller.productCount ?? 0) < 1) {
      toast.error("Seller must upload at least 1 product before activation.");
      return;
    }
    setLoaderFor(seller.sellerId + "-activate", true);
    try {
      await api.post(`/api/admin/sellers/activate/${seller.sellerId}`, {});
      toast.success("Seller activated");
      fetchSellers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate seller");
    } finally {
      setLoaderFor(seller.sellerId + "-activate", false);
    }
  };

  const filtered = sellers
    .filter((seller) => {
      if (tab === "pending") return seller.status === "PENDING";
      if (tab === "rejected") return seller.status === "REJECTED";
      return true;
    })
    .filter((seller) => {
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return (
        seller.businessName?.toLowerCase().includes(s) ||
        seller.storeName?.toLowerCase().includes(s) ||
        seller.email?.toLowerCase().includes(s) ||
        seller.contactPerson?.toLowerCase().includes(s)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sellers</h2>
          <p className="text-muted-foreground">Manage seller accounts and requests.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search sellers by name or email..."
                className="pl-8 pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Sellers</TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {sellers.filter((s) => s.status === "PENDING").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold h-4 min-w-4 px-1">
                {sellers.filter((s) => s.status === "PENDING").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>
                {tab === "all" && `All Sellers (${filtered.length})`}
                {tab === "pending" && `Pending Requests (${filtered.length})`}
                {tab === "rejected" && `Rejected Sellers (${filtered.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stripe</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24 mb-1" />
                          <Skeleton className="h-3 w-28" />
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Skeleton className="h-7 w-20 rounded-md" />
                            <Skeleton className="h-7 w-16 rounded-md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stripe</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No sellers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell>
                            <span className="font-medium block">{seller.businessName}</span>
                            <span className="text-xs text-muted-foreground block">{seller.storeName}</span>
                            <span className="text-xs text-muted-foreground block">Contact: {seller.contactPerson}</span>
                          </TableCell>
                          <TableCell>{seller.email}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              (seller.productCount ?? 0) >= 1 ? "text-green-600" : "text-muted-foreground"
                            }`}>
                              {seller.productCount ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                seller.status === "ACTIVE"
                                  ? "default"
                                  : seller.status === "PENDING"
                                  ? "secondary"
                                  : seller.status === "REJECTED"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {seller.status.charAt(0) + seller.status.slice(1).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const stripe = stripeStatuses[seller.sellerId] ?? seller.stripeStatus;
                              if (!stripe) return <span className="text-muted-foreground text-xs">—</span>;
                              const lower = stripe.toLowerCase();
                              const variant =
                                lower === "active" ? "default"
                                : lower === "pending" ? "secondary"
                                : lower === "restricted" || lower === "rejected" ? "destructive"
                                : "outline";
                              return (
                                <Badge variant={variant} className="text-xs capitalize">
                                  {stripe}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(seller.createdAt).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {seller.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="gap-1 text-xs h-7"
                                    disabled={actionLoading[seller.sellerId + "-approve"]}
                                    onClick={() => handleApprove(seller.sellerId)}
                                  >
                                    {actionLoading[seller.sellerId + "-approve"] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1 text-xs h-7"
                                    disabled={actionLoading[seller.sellerId + "-reject"]}
                                    onClick={() => handleReject(seller.sellerId)}
                                  >
                                    {actionLoading[seller.sellerId + "-reject"] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                    Reject
                                  </Button>
                                </>
                              )}
                              {seller.status === "APPROVED" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1 text-xs h-7"
                                  disabled={
                                    actionLoading[seller.sellerId + "-activate"] ||
                                    (seller.productCount ?? 0) < 1
                                  }
                                  onClick={() => handleActivate(seller)}
                                  title={(seller.productCount ?? 0) < 1 ? "Seller needs at least 1 product" : ""}
                                >
                                  {actionLoading[seller.sellerId + "-activate"] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Flag className="h-3 w-3" />
                                  )}
                                  Activate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs h-7"
                                disabled={actionLoading[seller.sellerId + "-stripe"]}
                                onClick={() => handleStripeSync(seller.sellerId)}
                                title="Sync Stripe status"
                              >
                                {actionLoading[seller.sellerId + "-stripe"] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                Stripe
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs h-7"
                                onClick={() => router.push(`/admindashboard/sellers/${seller.sellerId}`)}
                              >
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}