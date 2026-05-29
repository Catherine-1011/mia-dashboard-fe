"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  RefreshCw,
  Store,
  CreditCard,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────
interface GstPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
}

interface ExecutiveSummary {
  totalOrders: number;
  grossRevenue: number;
  netRevenue: number;
  gstCollected: number;
}

interface Trend {
  prevOrders: number;
  prevNetRevenue: number;
  prevGstCollected: number;
  growthPercentage: number;
}

interface GstBreakdownRow {
  rate: number;
  transactions: number;
  netAmount: number;
  gstAmount: number;
  grossAmount: number;
}

interface PaymentMethod {
  method: string;
  transactions: number;
  netAmount: number;
  gstAmount: number;
  grossAmount: number;
  fees: number;
  netReceived: number;
}

interface TopSeller {
  sellerName: string;
  orders: number;
  netSales: number;
  gstCollected: number;
}

interface Transaction {
  orderId: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  netAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  ref: string;
}

interface GstReport {
  period: GstPeriod;
  executiveSummary: ExecutiveSummary;
  trend: Trend;
  gstBreakdown: GstBreakdownRow[];
  paymentMethods: PaymentMethod[];
  topSellers: TopSeller[];
  transactions: Transaction[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DELIVERED: "default",
  SHIPPED: "secondary",
  PENDING: "outline",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

// ─── Skeleton loaders ──────────────────────────────────────────────────────
const SummaryCardSkeleton = () => (
  <Card>
    <CardContent className="pt-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// ─── Component ─────────────────────────────────────────────────────────────
const ReportPage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<GstReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const TX_PAGE_SIZE = 20;

  const downloadCSV = useCallback(() => {
    if (!report) return;

    const monthName = MONTH_NAMES[report.period.month - 1];
    const filename = `GST-Report-${monthName}-${report.period.year}.csv`;

    const sections: string[] = [];

    // Executive Summary
    sections.push("EXECUTIVE SUMMARY");
    sections.push("Metric,Value");
    sections.push(`Total Orders,${report.executiveSummary.totalOrders}`);
    sections.push(`Gross Revenue,${report.executiveSummary.grossRevenue}`);
    sections.push(`Net Revenue,${report.executiveSummary.netRevenue}`);
    sections.push(`GST Collected,${report.executiveSummary.gstCollected}`);
    sections.push(`Growth %,${report.trend.growthPercentage}`);
    sections.push("");

    // GST Breakdown
    sections.push("GST BREAKDOWN BY RATE");
    sections.push("GST Rate,Transactions,Net Amount,GST Amount,Gross Amount");
    report.gstBreakdown.forEach((r) => {
      sections.push(`${r.rate}%,${r.transactions},${r.netAmount},${r.gstAmount},${r.grossAmount}`);
    });
    sections.push("");

    // Payment Methods
    sections.push("PAYMENT METHOD RECONCILIATION");
    sections.push("Method,Transactions,Net Amount,GST,Gross Amount,Fees,Net Received");
    report.paymentMethods.forEach((pm) => {
      sections.push(`${pm.method},${pm.transactions},${pm.netAmount},${pm.gstAmount},${pm.grossAmount},${pm.fees},${pm.netReceived}`);
    });
    sections.push("");

    // Top Sellers
    sections.push("TOP SELLERS");
    sections.push("Seller,Orders,Net Sales,GST Collected");
    report.topSellers.forEach((s) => {
      sections.push(`"${s.sellerName}",${s.orders},${s.netSales},${s.gstCollected}`);
    });
    sections.push("");

    // Transactions
    sections.push("TRANSACTIONS");
    sections.push("Order ID,Date,Customer,Payment Method,Net Amount,GST Rate,GST Amount,Total Amount,Status,Reference");
    report.transactions.forEach((tx) => {
      const date = new Date(tx.date).toLocaleDateString("en-AU");
      sections.push(`${tx.orderId},${date},"${tx.customerName}",${tx.paymentMethod},${tx.netAmount},${tx.gstRate}%,${tx.gstAmount},${tx.totalAmount},${tx.status},${tx.ref}`);
    });

    const blob = new Blob([sections.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }, [report]);

  const fetchReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem("alpa_token");
      if (!token) throw new Error("No authentication token found");

      const params = new URLSearchParams({ month: String(month), year: String(year) });
      const url = `${process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com"}/api/admin/sales/gst-report?${params}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setReport(data.report);
      setTxPage(1);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load GST report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // year options — current year back 5 years
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Monthly GST Report</h1>
          <p className="text-muted-foreground text-sm">
            {report
              ? `${MONTH_NAMES[report.period.month - 1]} ${report.period.year} · ${formatDate(report.period.startDate)} – ${formatDate(report.period.endDate)}`
              : "Loading period…"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="outline"
            onClick={downloadCSV}
            disabled={!report || loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* ── Executive Summary Cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SummaryCardSkeleton key={i} />)
        ) : report ? (
          <>
            <SummaryCard
              title="Total Orders"
              value={report.executiveSummary.totalOrders.toLocaleString()}
              icon={ShoppingCart}
              iconClass="text-blue-600"
              bgClass="bg-blue-50"
              growth={report.trend.growthPercentage}
              growthLabel="vs last month"
            />
            <SummaryCard
              title="Gross Revenue"
              value={formatCurrency(report.executiveSummary.grossRevenue)}
              icon={DollarSign}
              iconClass="text-green-600"
              bgClass="bg-green-50"
            />
            <SummaryCard
              title="Net Revenue"
              value={formatCurrency(report.executiveSummary.netRevenue)}
              icon={Receipt}
              iconClass="text-purple-600"
              bgClass="bg-purple-50"
            />
            <SummaryCard
              title="GST Collected"
              value={formatCurrency(report.executiveSummary.gstCollected)}
              icon={FileText}
              iconClass="text-orange-600"
              bgClass="bg-orange-50"
            />
          </>
        ) : null}
      </div>

      {/* ── GST Breakdown by Rate ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            GST Breakdown by Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={3} cols={5} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GST Rate</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead className="text-right">GST Amount</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.gstBreakdown.length ? (
                    report.gstBreakdown.map((row) => (
                      <TableRow key={row.rate}>
                        <TableCell>
                          <Badge variant="outline">{row.rate}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.transactions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.netAmount)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{formatCurrency(row.gstAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.grossAmount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment Method Reconciliation ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Method Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={3} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.paymentMethods.length ? (
                    report.paymentMethods.map((pm) => (
                      <TableRow key={pm.method}>
                        <TableCell className="font-medium">{pm.method}</TableCell>
                        <TableCell className="text-right">{pm.transactions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pm.netAmount)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(pm.gstAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pm.grossAmount)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(pm.fees)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(pm.netReceived)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top Sellers ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Top Sellers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right">GST Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.topSellers.length ? (
                    report.topSellers.map((seller, idx) => (
                      <TableRow key={seller.sellerName}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{seller.sellerName}</TableCell>
                        <TableCell className="text-right">{seller.orders.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(seller.netSales)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(seller.gstCollected)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No seller data for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transactions ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Transactions
            {report && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({report.transactions.length.toLocaleString()} records)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.transactions.length ? (
                    report.transactions.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE).map((tx) => (
                      <TableRow key={tx.orderId}>
                        <TableCell className="font-mono text-xs">{tx.orderId}</TableCell>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell>{tx.customerName}</TableCell>
                        <TableCell>{tx.paymentMethod}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.netAmount)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(tx.gstAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(tx.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[tx.status] ?? "secondary"}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No transactions for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {report && report.transactions.length > TX_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((txPage - 1) * TX_PAGE_SIZE) + 1}–{Math.min(txPage * TX_PAGE_SIZE, report.transactions.length)} of {report.transactions.length.toLocaleString()} transactions
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage(1)}
                  disabled={txPage === 1}
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage((p) => p - 1)}
                  disabled={txPage === 1}
                >
                  ‹
                </Button>
                {Array.from({ length: Math.ceil(report.transactions.length / TX_PAGE_SIZE) }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === Math.ceil(report.transactions.length / TX_PAGE_SIZE) || Math.abs(p - txPage) <= 2)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                    ) : (
                      <Button
                        key={item}
                        variant={txPage === item ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setTxPage(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage((p) => p + 1)}
                  disabled={txPage === Math.ceil(report.transactions.length / TX_PAGE_SIZE)}
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTxPage(Math.ceil(report.transactions.length / TX_PAGE_SIZE))}
                  disabled={txPage === Math.ceil(report.transactions.length / TX_PAGE_SIZE)}
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Summary Card sub-component ────────────────────────────────────────────
interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  growth?: number;
  growthLabel?: string;
}

const SummaryCard = ({ title, value, icon: Icon, iconClass, bgClass, growth, growthLabel }: SummaryCardProps) => (
  <Card className="group hover:shadow-md transition-shadow">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg ${bgClass}`}>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {growth !== undefined && growthLabel && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>
          {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% {growthLabel}
        </p>
      )}
    </CardContent>
  </Card>
);

export default ReportPage;
