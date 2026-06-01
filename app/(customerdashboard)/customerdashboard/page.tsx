"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  Heart,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  User,
  Settings,
  ArrowRight,
  Package,
} from "lucide-react";

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  items?: { title?: string; quantity: number; product?: { title?: string } }[];
};

type Profile = {
  name?: string;
  email?: string;
  profileImage?: string;
};

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ElementType;
  }
> = {
  delivered: { label: "Delivered", variant: "default", icon: CheckCircle2 },
  shipped: { label: "Shipped", variant: "secondary", icon: Truck },
  processing: { label: "Processing", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "outline", icon: CheckCircle2 },
  pending: { label: "Pending", variant: "outline", icon: Clock },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, ordersData, wishlistData] =
          await Promise.allSettled([
            api.get("/api/profile"),
            api.get("/api/orders/my-orders"),
            api.get("/api/wishlist"),
          ]);

        if (profileData.status === "fulfilled") {
          setProfile(profileData.value?.profile ?? profileData.value);
        }
        if (ordersData.status === "fulfilled") {
          const raw = ordersData.value;
          setOrders(Array.isArray(raw) ? raw : (raw?.orders ?? []));
        }
        if (wishlistData.status === "fulfilled") {
          const raw = wishlistData.value;
          setWishlistCount(
            Array.isArray(raw)
              ? raw.length
              : (raw?.pagination?.total ??
                  raw?.wishlist?.length ??
                  raw?.total ??
                  raw?.count ??
                  0),
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status?.toLowerCase()),
  ).length;
  const deliveredOrders = orders.filter(
    (o) => o.status?.toLowerCase() === "delivered",
  ).length;
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const firstName = profile?.name?.split(" ")[0] ?? "there";

  return (
    <div className="p-6 space-y-8 mx-auto w-full">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {firstName}! 👋
            </h1>
          )}
          <p className="mt-1 text-muted-foreground">
            Here's a summary of your shopping activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/customerdashboard/profile">
              <User className="h-4 w-4 mr-1.5" /> Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/customerdashboard/settings">
              <Settings className="h-4 w-4 mr-1.5" /> Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={totalOrders}
          loading={loading}
        />
        <StatCard
          icon={Truck}
          label="Active Orders"
          value={activeOrders}
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Delivered"
          value={deliveredOrders}
          loading={loading}
        />
        <StatCard
          icon={Heart}
          label="Wishlist Items"
          value={wishlistCount ?? "—"}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 gap-0 py-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <p className="text-base font-semibold">Recent Orders</p>
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/customerdashboard/orders"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <CardContent className="px-6 py-4 space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                <Package className="h-10 w-10 opacity-40" />
                <p className="text-sm">No orders yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="https://madeinarnhemland.com.au/shop">
                    Start Shopping
                  </Link>
                </Button>
              </div>
            ) : (
              recentOrders.map((order) => {
                const s = order.status?.toLowerCase() ?? "confirmed";
                const cfg = statusConfig[s] ?? statusConfig.confirmed;
                const StatusIcon = cfg.icon;
                const firstItem = order.items?.[0];
                const itemTitle =
                  firstItem?.product?.title ?? firstItem?.title ?? "Order";
                const itemCount =
                  order.items?.reduce((acc, i) => acc + (i.quantity ?? 0), 0) ??
                  0;

                return (
                  <div key={order.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {itemTitle}
                        {itemCount > 1 ? ` +${itemCount - 1} more` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        &nbsp;·&nbsp; ${Number(order.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <Badge
                      variant={cfg.variant}
                      className="shrink-0 flex items-center gap-1 text-xs"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="gap-0 py-0">
          <div className="px-6 py-4 border-b">
            <p className="text-base font-semibold">Quick Actions</p>
          </div>
          <CardContent className="px-6 py-3 space-y-1.5">
            {[
              {
                href: "/customerdashboard/orders",
                icon: ShoppingBag,
                label: "My Orders",
                desc: "Track & view orders",
              },
              {
                href: "/customerdashboard/wishlists",
                icon: Heart,
                label: "My Wishlist",
                desc: "Saved items",
              },
              {
                href: "/customerdashboard/profile",
                icon: User,
                label: "My Profile",
                desc: "Update your info",
              },
              {
                href: "/customerdashboard/settings",
                icon: Settings,
                label: "Settings",
                desc: "Account preferences",
              },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
