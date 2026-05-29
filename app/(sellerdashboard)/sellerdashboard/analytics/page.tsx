"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  RefreshCw,
  Trophy,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  AlertCircle,
  Filter,
  X,
  FileDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TopProduct {
  productId: string;
  title: string;
  quantitySold: number;
  revenue: number;
}

interface Analytics {
  totalRevenue?: number;
  totalOrders?: number;
  totalItemsSold?: number;
  averageOrderValue?: number;
  statusBreakdown?: Record<string, number>;
  topProducts?: TopProduct[];
  period?: { startDate?: string; endDate?: string };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (n?: number | string) => {
  const num = parseFloat(n as any);
  return !isNaN(num)
    ? num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
};

const fmtInt = (n?: number | string) => {
  const num = parseFloat(n as any);
  return !isNaN(num) ? Math.round(num).toLocaleString("en-US") : "—";
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DELIVERED:  { label: "Delivered",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",     icon: <CheckCircle className="h-3.5 w-3.5" /> },
  PENDING:    { label: "Pending",    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="h-3.5 w-3.5" /> },
  CANCELLED:  { label: "Cancelled",  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",           icon: <XCircle className="h-3.5 w-3.5" /> },
  SHIPPED:    { label: "Shipped",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       icon: <Truck className="h-3.5 w-3.5" /> },
  PROCESSING: { label: "Processing", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const getStatusCfg = (status: string) =>
  statusConfig[status.toUpperCase()] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  };

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

// â”€â”€â”€ Skeleton loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const fetchAnalytics = useCallback(async (opts: { refresh?: boolean; from?: string; to?: string } = {}) => {
    console.log('[DEBUG] fetchAnalytics called with options:', opts);
    
    // Always show loading state (skeleton) for both initial load and refresh
    setLoading(true);
    setRefreshing(opts.refresh || false);
    
    try {
      const params = new URLSearchParams();
      if (opts.from) params.set("startDate", opts.from);
      if (opts.to) params.set("endDate", opts.to);
      const query = params.toString();
      const apiUrl = `/api/seller/orders/analytics${query ? `?${query}` : ""}`;
      
      console.log('[DEBUG] Making API call to:', apiUrl);
      const res = await api.get(apiUrl);
      console.log('[DEBUG] API response received:', res);
      
      setAnalytics(res?.analytics ?? res ?? null);
      
    } catch (err: any) {
      console.error('[DEBUG] fetchAnalytics error:', err);
      const errorMessage = err?.message || "Failed to load analytics";
      toast.error(errorMessage);
    } finally {
      console.log('[DEBUG] fetchAnalytics cleanup, setting loading states to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleApply = () => {
    console.log('[DEBUG] Applying date filter:', { fromDate, toDate });
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    fetchAnalytics({ from: fromDate, to: toDate });
  };

  const handleReset = () => {
    console.log('[DEBUG] Resetting date filters');
    setFromDate("");
    setToDate("");
    setAppliedFrom("");
    setAppliedTo("");
    fetchAnalytics();
  };

  const statusEntries = Object.entries(analytics?.statusBreakdown ?? {}).sort(
    (a, b) => (b[1] as number) - (a[1] as number)
  );
  const topProducts = analytics?.topProducts ?? [];
  const totalStatusOrders = statusEntries.reduce((s, [, c]) => s + (c as number), 0);

  const handleExportReport = () => {
    if (!analytics) { toast.error("No analytics data to export."); return; }
    const BOM = "\uFEFF";
    const escape = (val: unknown): string => {
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const dateRange = appliedFrom || appliedTo
      ? `${appliedFrom || "Start"} to ${appliedTo || "Present"}`
      : "All time";
    const date = new Date().toISOString().slice(0, 10);
    const sections: string[] = [];

    // Summary section
    sections.push("ANALYTICS SUMMARY");
    sections.push(`Date Range,${escape(dateRange)}`);
    sections.push(`Exported On,${escape(date)}`);
    sections.push("");
    const toNum = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));
    const fmtFixed = (v: unknown) => { const n = toNum(v); return Number.isNaN(n) ? "—" : n.toFixed(2); };

    sections.push("Metric,Value");
    sections.push(`Total Revenue,$${escape(fmtFixed(analytics.totalRevenue))}`);
    sections.push(`Total Orders,${escape(analytics.totalOrders ?? "—")}`);
    sections.push(`Items Sold,${escape(analytics.totalItemsSold ?? "—")}`);
    sections.push(`Average Order Value,$${escape(fmtFixed(analytics.averageOrderValue))}`);
    sections.push("");

    // Order status breakdown
    sections.push("ORDER STATUS BREAKDOWN");
    sections.push("Status,Count,% of Total");
    const statusTotal = statusEntries.reduce((s, [, c]) => s + Number(c), 0);
    for (const [status, count] of statusEntries) {
      const pct = statusTotal > 0 ? ((Number(count) / statusTotal) * 100).toFixed(1) : "0.0";
      sections.push(`${escape(status)},${Number(count)},${pct}%`);
    }
    sections.push("");

    // Top products
    if (topProducts.length > 0) {
      sections.push("TOP PRODUCTS BY SALES");
      sections.push("Rank,Product ID,Product Name,Units Sold,Revenue ($),Avg per Unit ($)");
      topProducts.forEach((p, i) => {
        const revenue = toNum(p.revenue);
        const qty = toNum(p.quantitySold);
        const avg = qty > 0 ? (revenue / qty).toFixed(2) : "0.00";
        sections.push([i + 1, escape(p.productId.slice(-8).toUpperCase()), escape(p.title), qty, revenue.toFixed(2), avg].join(","));
      });
    }

    const csv = sections.join("\n");
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-report-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Analytics report exported successfully.");
  };

  const handleExportTopProducts = () => {
    if (topProducts.length === 0) { toast.error("No product data to export."); return; }
    const BOM = "\uFEFF";
    const escape = (val: unknown): string => {
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const headers = ["Rank", "Product ID", "Product Name", "Units Sold", "Revenue ($)", "Avg. per Unit ($)"];
    const rows = topProducts.map((p, i) => {
      const revenue = Number(p.revenue);
      const qty = Number(p.quantitySold);
      return [
        i + 1,
        p.productId.slice(-8).toUpperCase(),
        p.title,
        qty,
        revenue.toFixed(2),
        qty > 0 ? (revenue / qty).toFixed(2) : "0.00",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `top-products-by-sales-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${topProducts.length} products to CSV.`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Sales performance and order insights for your store.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportReport}
            disabled={loading || !analytics}
          >
            <FileDown className="h-4 w-4" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              console.log('[DEBUG] Refresh button clicked');
              console.log('[DEBUG] Current appliedFrom:', appliedFrom, 'appliedTo:', appliedTo);
              fetchAnalytics({ refresh: true, from: appliedFrom, to: appliedTo });
            }}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Date Range Filter ── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Date Range</span>
          {appliedFrom || appliedTo ? (
            <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {appliedFrom || "Start"} → {appliedTo || "Present"}
            </span>
          ) : (
            <span className="ml-2 text-xs text-muted-foreground">All time</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="h-9 w-[160px]"
              value={fromDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="h-9 w-[160px]"
              value={toDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button className="h-9 gap-2" onClick={handleApply} disabled={loading}>
            <Filter className="h-4 w-4" /> Apply
          </Button>
          {(appliedFrom || appliedTo) && (
            <Button variant="outline" className="h-9 gap-2" onClick={handleReset} disabled={loading}>
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </Card>

      {/* â”€â”€ Stat Cards â”€â”€ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${fmt(analytics?.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gross sales value</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmtInt(analytics?.totalOrders)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Orders received</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                <Package className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fmtInt(analytics?.totalItemsSold)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total units dispatched</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  ${fmt(analytics?.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per order average</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* â”€â”€ Order Status Breakdown â”€â”€ */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-36 rounded-xl" />
              ))}
            </div>
          ) : statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No order data available.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {statusEntries.map(([status, count]) => {
                const cfg = getStatusCfg(status);
                const pct = totalStatusOrders > 0
                  ? Math.round(((count as number) / totalStatusOrders) * 100)
                  : 0;
                return (
                  <div
                    key={status}
                    className={`flex flex-col gap-1 rounded-xl border px-5 py-3 min-w-[130px] ${cfg.color}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
                      {cfg.icon}
                      {cfg.label}
                    </div>
                    <div className="text-2xl font-bold">{fmtInt(count as number)}</div>
                    <div className="text-xs opacity-70">{pct}% of total</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* â”€â”€ Top Products â”€â”€ */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-base">Top Products by Sales</CardTitle>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs"
              onClick={handleExportTopProducts}
              disabled={loading || topProducts.length === 0}
            >
              <FileDown className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No product data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg. per Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, idx) => (
                    <TableRow key={p.productId} className="hover:bg-muted/20">
                      <TableCell className="text-center">
                        {idx < 3 ? (
                          <Trophy className={`h-4 w-4 mx-auto ${medalColors[idx]}`} />
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm">{p.title}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-semibold">
                          {fmtInt(p.quantitySold)} units
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700 dark:text-green-400">
                        ${fmt(p.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        ${p.quantitySold > 0 ? fmt(p.revenue / p.quantitySold) : "â€”"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
