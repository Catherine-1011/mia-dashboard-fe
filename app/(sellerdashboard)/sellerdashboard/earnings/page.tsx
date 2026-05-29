"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DollarSign,
  Percent,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Unlock,
  Lock,
  Send,
  History,
  X,
  Loader2,
  Download,
} from "lucide-react";

// --- types ---
interface EarningRecord {
  id: string;
  orderId: string;
  displayOrderId?: string;
  customerName: string;
  orderValue: string;
  commissionRate: string;
  commissionAmount: string;
  netPayable: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
}

interface EarningTotals {
  totalOrderValue: number;
  totalCommissionDeducted: number;
  totalNetPayable: number;
  totalPaid: number;
  totalPending: number;
  redeemableAmount?: number;
  lockedAmount?: number;
  eligibleOrderCount?: number;
  cancelledAmount?: number; // NEW: Cancelled order amounts
}

interface RedeemableSummary {
  totalPending: number;
  redeemableAmount: number;
  lockedAmount: number;
  totalPaid: number;
  eligibleOrderCount: number;
  cancelledAmount?: number; // NEW: Cancelled order amounts
}

interface OpenPayoutRequest {
  id: string;
  requestedAmount: string;
  redeemableAtRequest: string;
  createdAt: string;
}

interface PayoutHistoryRecord {
  id: string;
  requestedAmount: string;
  redeemableAtRequest: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  sellerNote: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SellerEarningsPage() {
  const [records, setRecords] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<EarningTotals | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [wallet, setWallet] = useState<RedeemableSummary | null>(null);
  const [pendingPayoutRequest, setPendingPayoutRequest] = useState<OpenPayoutRequest | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const [exportingCsv, setExportingCsv] = useState(false);

  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryRecord[]>([]);
  const [payoutHistoryLoading, setPayoutHistoryLoading] = useState(false);
  const [payoutHistoryPagination, setPayoutHistoryPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [payoutHistoryPage, setPayoutHistoryPage] = useState(1);

  const fetchEarnings = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await api.get(`/api/commissions/earned/my?${params.toString()}`);
      setRecords(Array.isArray(res?.data) ? res.data : []);
      if (res?.totals) setTotals(res.totals);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await api.get("/api/commissions/payout/redeemable");
      if (res?.summary) setWallet(res.summary);
      setPendingPayoutRequest(res?.pendingPayoutRequest ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load wallet summary");
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const fetchPayoutHistory = useCallback(async (p = 1) => {
    setPayoutHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      const res = await api.get(`/api/commissions/payout/requests?${params.toString()}`);
      setPayoutHistory(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setPayoutHistoryPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load payout history");
    } finally {
      setPayoutHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings(1);
    fetchWallet();
  }, []);

  // Math validation (as per API documentation)
  useEffect(() => {
    if (totals && process.env.NODE_ENV === 'development') {
      const sum = totals.totalPaid + totals.totalPending;
      const diff = Math.abs(totals.totalNetPayable - sum);
      if (diff > 0.01) {
        console.warn(`💰 Commission math error: totalNetPayable ${totals.totalNetPayable} ≠ totalPaid ${totals.totalPaid} + totalPending ${totals.totalPending} = ${sum}`);
        console.warn('This indicates a backend calculation issue or data inconsistency');
      }
    }
  }, [totals]);

  const handleApplyFilters = () => { setPage(1); fetchEarnings(1); };

  const handleReset = () => {
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
    setTimeout(() => fetchEarnings(1), 0);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); fetchEarnings(newPage); };

  const openPayoutModal = () => {
    setPayoutAmount(wallet ? wallet.redeemableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
    setPayoutNote("");
    setShowPayoutModal(true);
  };

  const handleSubmitPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!payoutAmount || isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    if (wallet && amount > wallet.redeemableAmount) {
      toast.error(`Amount exceeds redeemable balance of $${wallet.redeemableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return;
    }
    setSubmittingPayout(true);
    try {
      await api.post("/api/commissions/payout/request", {
        requestedAmount: amount,
        ...(payoutNote.trim() ? { note: payoutNote.trim() } : {}),
      });
      toast.success("Payout request submitted successfully!");
      setShowPayoutModal(false);
      fetchWallet();
      fetchPayoutHistory(1);
      setPayoutHistoryPage(1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit payout request");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const allRecords: EarningRecord[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({ page: String(currentPage), limit: "100" });
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        const res = await api.get(`/api/commissions/earned/my?${params.toString()}`);
        const pageRecords: EarningRecord[] = Array.isArray(res?.data) ? res.data : [];
        allRecords.push(...pageRecords);
        if (res?.pagination) totalPages = res.pagination.totalPages;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allRecords.length === 0) {
        toast.info("No records to export for the current filters.");
        return;
      }

      const headers = ["Order ID", "Customer Name", "Order Value", "Commission Rate (%)", "Commission Amount", "Net Payable", "Status", "Date"];
      const rows = allRecords.map((r) => [
        r.displayOrderId || r.orderId,
        r.customerName || "",
        parseFloat(r.orderValue).toFixed(2),
        parseFloat(r.commissionRate).toFixed(2),
        parseFloat(r.commissionAmount).toFixed(2),
        r.netPayable ? parseFloat(r.netPayable).toFixed(2) : (parseFloat(r.orderValue) - parseFloat(r.commissionAmount)).toFixed(2),
        r.status,
        new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
      ]);

      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const csvContent = [
        headers.map(escape).join(","),
        ...rows.map((row) => row.map((cell) => escape(String(cell))).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `commission-records-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRecords.length} record${allRecords.length !== 1 ? "s" : ""} to CSV.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  const payoutButtonDisabled = walletLoading || !wallet || wallet.redeemableAmount <= 0 || !!pendingPayoutRequest;

  const payoutBadgeStyle = (status: PayoutHistoryRecord["status"]) => {
    switch (status) {
      case "PENDING":   return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 hover:bg-yellow-100";
      case "APPROVED":  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 hover:bg-blue-100";
      case "REJECTED":  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 hover:bg-red-100";
      case "COMPLETED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Earnings</h1>
        <p className="text-muted-foreground">Commission breakdown and payout summary for your orders.</p>
      </div>

      {/* Payout Wallet Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" /> Payout Wallet
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {pendingPayoutRequest && (
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">
                  Pending request: ${parseFloat(pendingPayoutRequest.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Badge>
              )}
              <Button
                size="sm"
                className="gap-2"
                onClick={openPayoutModal}
                disabled={payoutButtonDisabled}
                title={
                  walletLoading ? "Loading..."
                  : pendingPayoutRequest ? "You already have a pending payout request"
                  : !wallet || wallet.redeemableAmount <= 0 ? "No redeemable balance available"
                  : "Request payout"
                }
              >
                <Send className="h-4 w-4" /> Request Payout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Total Pending</p>
              <p className="text-xl font-bold">
                {walletLoading ? <Skeleton className="h-7 w-20 inline-block" /> : wallet ? `$${wallet.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Unlock className="h-3 w-3 text-green-500" /> Redeemable Now
              </p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {walletLoading ? <Skeleton className="h-7 w-20 inline-block" /> : wallet ? `$${wallet.redeemableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
              </p>
              {wallet && !walletLoading && (
                <p className="text-xs text-muted-foreground">
                  {wallet.eligibleOrderCount} eligible order{wallet.eligibleOrderCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3 text-orange-500" /> Locked
              </p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {walletLoading ? <Skeleton className="h-7 w-20 inline-block" /> : wallet ? `$${wallet.lockedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
              </p>

            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Total Paid Out</p>
              <p className="text-xl font-bold">
                {walletLoading ? <Skeleton className="h-7 w-20 inline-block" /> : wallet ? `$${wallet.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="records" className="space-y-6">
        <TabsList>
          <TabsTrigger value="records" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Commission Records
          </TabsTrigger>
          <TabsTrigger
            value="payout-history"
            className="gap-2"
            onClick={() => { fetchPayoutHistory(1); setPayoutHistoryPage(1); }}
          >
            <History className="h-4 w-4" /> Payout History
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 - Commission Records */}
        <TabsContent value="records" className="space-y-6">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading && !totals ? <Skeleton className="h-8 w-24" /> : totals ? `$${totals.totalOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total order value (all-time)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Commission Deducted</CardTitle>
                <Percent className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {loading && !totals ? <Skeleton className="h-8 w-24" /> : totals ? `$${totals.totalCommissionDeducted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Platform fee across all orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Net Payable</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {loading && !totals ? <Skeleton className="h-8 w-24" /> : totals ? `$${totals.totalNetPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">gross - commission (all-time)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {loading && !totals ? <Skeleton className="h-8 w-24" /> : totals ? `$${totals.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">awaiting disbursement</p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ NEW: Show cancelled amounts for transparency (as per API docs) */}
          {(totals?.cancelledAmount && totals.cancelledAmount > 0) && (
            <div className="mt-4">
              <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>${totals.cancelledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> from cancelled orders
                    <span className="text-xs opacity-75 ml-1">(not included in payout calculations)</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {totals && (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
              <span>Gross Sales: <strong className="text-foreground">${totals.totalOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              <span>Commission: <strong className="text-orange-600 dark:text-orange-400">${totals.totalCommissionDeducted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              <span>= Net Payable: <strong className="text-green-600 dark:text-green-400">${totals.totalNetPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              <span className="ml-auto">Paid out: <strong className="text-foreground">${totals.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          )}

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" className="h-9 w-[150px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" className="h-9 w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button onClick={handleApplyFilters} className="h-9 gap-2">
                <Search className="h-4 w-4" /> Apply
              </Button>
              <Button variant="outline" className="h-9 gap-2" onClick={handleReset}>
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 ml-auto"
                onClick={handleExportCSV}
                disabled={exportingCsv || loading}
              >
                {exportingCsv
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
                  : <><Download className="h-4 w-4" /> Export CSV</>
                }
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400 font-semibold">Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No earnings records found. Try adjusting the filters or click Apply.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell>
                          <span className="font-mono text-xs text-primary">{r.displayOrderId || r.orderId}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{r.customerName || "---"}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(r.orderValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-orange-300 text-orange-600 dark:text-orange-400">
                            {parseFloat(r.commissionRate).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          -${parseFloat(r.commissionAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            ${r.netPayable ? parseFloat(r.netPayable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (parseFloat(r.orderValue) - parseFloat(r.commissionAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.status === "PAID" ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100">Paid</Badge>
                          ) : r.status === "CANCELLED" ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 hover:bg-red-100">Cancelled</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 hover:bg-yellow-100">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pagination.limit) + 1}--{Math.min(page * pagination.limit, pagination.total)} of {pagination.total} records
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.totalPages} onClick={() => handlePageChange(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </TabsContent>

        {/* TAB 2 - Payout History */}
        <TabsContent value="payout-history" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">All payout requests you have submitted.</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { fetchPayoutHistory(1); setPayoutHistoryPage(1); }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Submitted</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Redeemable At Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Your Note</TableHead>
                    <TableHead>Admin Note</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistoryLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : payoutHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No payout requests yet. Use the Request Payout button above to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payoutHistory.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="font-bold text-green-700 dark:text-green-400">
                          ${parseFloat(r.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          ${parseFloat(r.redeemableAtRequest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge className={payoutBadgeStyle(r.status)}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {r.sellerNote || "---"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {r.adminNote || "---"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {r.processedAt
                            ? new Date(r.processedAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
                            : "---"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!payoutHistoryLoading && payoutHistoryPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((payoutHistoryPage - 1) * payoutHistoryPagination.limit) + 1}--{Math.min(payoutHistoryPage * payoutHistoryPagination.limit, payoutHistoryPagination.total)} of {payoutHistoryPagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={payoutHistoryPage <= 1}
                    onClick={() => { setPayoutHistoryPage(payoutHistoryPage - 1); fetchPayoutHistory(payoutHistoryPage - 1); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{payoutHistoryPage} / {payoutHistoryPagination.totalPages}</span>
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={payoutHistoryPage >= payoutHistoryPagination.totalPages}
                    onClick={() => { setPayoutHistoryPage(payoutHistoryPage + 1); fetchPayoutHistory(payoutHistoryPage + 1); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Payout Modal */}
      {showPayoutModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !submittingPayout) setShowPayoutModal(false); }}
        >
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" /> Request Payout
                </CardTitle>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                  onClick={() => setShowPayoutModal(false)}
                  disabled={submittingPayout}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {wallet && (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redeemable Balance</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${wallet.redeemableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Eligible Orders</span>
                    <span className="font-semibold">{wallet.eligibleOrderCount}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="payout-amount">
                  Amount to Request (AUD) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">$</span>
                  <Input
                    id="payout-amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    max={wallet?.redeemableAmount}
                    className="pl-7"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    disabled={submittingPayout}
                    placeholder="0.00"
                  />
                </div>
                {wallet && payoutAmount && parseFloat(payoutAmount) > wallet.redeemableAmount && (
                  <p className="text-xs text-red-500">Exceeds redeemable balance of ${wallet.redeemableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payout-note">Note (optional)</Label>
                <Input
                  id="payout-note"
                  placeholder="e.g. Monthly payout"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  disabled={submittingPayout}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowPayoutModal(false)} disabled={submittingPayout}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayout}
                  disabled={
                    submittingPayout ||
                    !payoutAmount ||
                    parseFloat(payoutAmount) <= 0 ||
                    (!!wallet && parseFloat(payoutAmount) > wallet.redeemableAmount)
                  }
                  className="gap-2 min-w-[140px]"
                >
                  {submittingPayout
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    : <><Send className="h-4 w-4" /> Submit Request</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
