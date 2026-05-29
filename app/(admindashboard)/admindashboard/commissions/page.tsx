"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  TrendingUp,
  Tag,
  Search,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Send,
  Building2,
  ThumbsUp,
  ThumbsDown,
  Download,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
interface Commission {
  id: string;
  title: string;
  type: "PERCENTAGE" | "FIXED" | string;
  value: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FormState {
  title: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "PERCENTAGE",
  value: "",
  description: "",
  isDefault: false,
  isActive: true,
};

// ─── Commission Earned types ──────────────────────────────────────────────────
interface CommissionEarned {
  id: string;
  orderId: string;
  orderDisplayId?: string | null;
  sellerId: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string;
  sellerName?: string | null;
  sellerFullName?: string | null;
  storeName?: string | null;
  businessName?: string | null;
  orderValue: string;
  commissionRate: string;
  commissionAmount: string;
  netPayable: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

interface CommissionEarnedSummary {
  totalOrders: number;
  totalOrderValue: number;
  totalCommissionEarned: number;
  totalNetPayable: number;
  totalPaid: number;
  totalPending: number;
  totalCancelled: number;
  uniqueSellers: number;
}

interface EarnedPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Payout Request types ─────────────────────────────────────────────────────
interface PayoutBankDetails {
  bankName: string | null;
  accountName: string | null;
  bsb: string | null;
  accountNumber: string | null;
}

interface AdminPayoutRequest {
  id: string;
  sellerId: string;
  requestedAmount: string;
  redeemableAtRequest: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  sellerNote: string | null;
  adminNote: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  sellerName: string | null;
  storeName: string | null;
  businessName: string | null;
  bankDetails: PayoutBankDetails | null;
}

interface PayoutPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Seller {
  id: string;
  name?: string | null;
  email?: string | null;
  sellerProfile?: { storeName?: string | null; businessName?: string | null } | null;
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // ── Commission Earned state ────────────────────────────────────────────────
  const [earned, setEarned] = useState<CommissionEarned[]>([]);
  const [earnedLoading, setEarnedLoading] = useState(false);
  const [earnedSummary, setEarnedSummary] = useState<CommissionEarnedSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [earnedPagination, setEarnedPagination] = useState<EarnedPagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [earnedPage, setEarnedPage] = useState(1);
  const [earnedStatusFilter, setEarnedStatusFilter] = useState<string>("ALL");
  const [earnedFrom, setEarnedFrom] = useState("");
  const [earnedTo, setEarnedTo] = useState("");
  const [earnedSellerFilter, setEarnedSellerFilter] = useState<string>("ALL");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [exportingEarnedCsv, setExportingEarnedCsv] = useState(false);

  // ── Payout Requests state ──────────────────────────────────────────────────
  const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequest[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutPagination, setPayoutPagination] = useState<PayoutPagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("ALL");
  const [payoutFromFilter, setPayoutFromFilter] = useState("");
  const [payoutToFilter, setPayoutToFilter] = useState("");
  const [payoutSellerIdFilter, setPayoutSellerIdFilter] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<AdminPayoutRequest | null>(null);
  const [payoutActionNote, setPayoutActionNote] = useState("");
  const [payoutActioning, setPayoutActioning] = useState(false);
  const [pendingPayoutCount, setPendingPayoutCount] = useState<number | null>(null);
  const [approvedPayoutCount, setApprovedPayoutCount] = useState<number | null>(null);
  const [exportingPayoutCsv, setExportingPayoutCsv] = useState(false);

  // ── Seller list for filter dropdown ───────────────────────────────────────
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const sellersLoadedRef = useRef(false);

  const fetchSellerList = async () => {
    if (sellersLoadedRef.current) return;
    setLoadingSellers(true);
    try {
      const res = await api.get("/api/users/all");
      const list: Seller[] = (Array.isArray(res) ? res : res.users || [])
        .filter((u: any) => u.role === "SELLER");
      setSellers(list);
      sellersLoadedRef.current = true;
    } catch {
      // non-critical — filter just won't show names
    } finally {
      setLoadingSellers(false);
    }
  };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/commissions?includeInactive=true");
      const data: Commission[] = Array.isArray(res)
        ? res
        : res?.commissions || res?.data || [];
      setCommissions(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [showModal]);

  // ── Commission Earned fetch ────────────────────────────────────────────────
  const fetchEarned = useCallback(async (page = 1) => {
    setEarnedLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (earnedStatusFilter !== "ALL") params.set("status", earnedStatusFilter);
      if (earnedSellerFilter !== "ALL") params.set("sellerId", earnedSellerFilter);
      if (earnedFrom) params.set("from", earnedFrom);
      if (earnedTo) params.set("to", earnedTo);
      const res = await api.get(`/api/admin/commissions/earned?${params.toString()}`);
      setEarned(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setEarnedPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load commission earned records");
    } finally {
      setEarnedLoading(false);
    }
  }, [earnedStatusFilter, earnedSellerFilter, earnedFrom, earnedTo]);

  const fetchEarnedSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      if (earnedSellerFilter !== "ALL") {
        // The summary endpoint doesn't support sellerId — compute client-side
        // from all records for this seller (fetch up to 1000 which covers any real seller)
        const params = new URLSearchParams({ page: "1", limit: "1000" });
        params.set("sellerId", earnedSellerFilter);
        if (earnedFrom) params.set("from", earnedFrom);
        if (earnedTo) params.set("to", earnedTo);
        const res = await api.get(`/api/admin/commissions/earned?${params.toString()}`);
        const records: CommissionEarned[] = Array.isArray(res?.data) ? res.data : [];
        const computed: CommissionEarnedSummary = {
          totalOrders: records.length,
          totalOrderValue: records.reduce((s, r) => s + parseFloat(r.orderValue || "0"), 0),
          totalCommissionEarned: records.reduce((s, r) => s + parseFloat(r.commissionAmount || "0"), 0),
          totalNetPayable: records.reduce((s, r) => s + parseFloat(r.netPayable || String(parseFloat(r.orderValue || "0") - parseFloat(r.commissionAmount || "0"))), 0),
          totalPaid: records.filter((r) => r.status === "PAID").reduce((s, r) => s + parseFloat(r.commissionAmount || "0"), 0),
          totalPending: records.filter((r) => r.status === "PENDING").reduce((s, r) => s + parseFloat(r.commissionAmount || "0"), 0),
          totalCancelled: records.filter((r) => r.status === "CANCELLED").reduce((s, r) => s + parseFloat(r.commissionAmount || "0"), 0),
          uniqueSellers: 1,
        };
        setEarnedSummary(computed);
      } else {
        const params = new URLSearchParams();
        if (earnedFrom) params.set("from", earnedFrom);
        if (earnedTo) params.set("to", earnedTo);
        const query = params.toString();
        const res = await api.get(`/api/admin/commissions/earned/summary${query ? `?${query}` : ""}`);
        if (res?.summary) setEarnedSummary(res.summary);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load commission summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [earnedSellerFilter, earnedFrom, earnedTo]);

  const handleExportEarnedCsv = async () => {
    setExportingEarnedCsv(true);
    try {
      const allRecords: CommissionEarned[] = [];
      let currentPage = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({ page: String(currentPage), limit: "100" });
        if (earnedStatusFilter !== "ALL") params.set("status", earnedStatusFilter);
        if (earnedSellerFilter !== "ALL") params.set("sellerId", earnedSellerFilter);
        if (earnedFrom) params.set("from", earnedFrom);
        if (earnedTo) params.set("to", earnedTo);
        const res = await api.get(`/api/admin/commissions/earned?${params.toString()}`);
        const pageRecords: CommissionEarned[] = Array.isArray(res?.data) ? res.data : [];
        allRecords.push(...pageRecords);
        if (res?.pagination) totalPages = res.pagination.totalPages;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allRecords.length === 0) {
        toast.info("No records to export for the current filters.");
        return;
      }

      const headers = ["Order ID", "Seller Name", "Business Name", "Store Name", "Customer Name", "Customer Email", "Order Value", "Commission Rate (%)", "Commission Amount", "Net Payable", "Status", "Date"];
      const rows = allRecords.map((r) => [
        r.orderDisplayId || r.orderId,
        r.sellerName || r.sellerFullName || "",
        r.businessName || "",
        r.storeName || "",
        r.customerName || "",
        r.customerEmail || "",
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
      const sellerLabel = earnedSellerFilter !== "ALL"
        ? `-${sellers.find((s) => s.id === earnedSellerFilter)?.sellerProfile?.storeName || sellers.find((s) => s.id === earnedSellerFilter)?.name || earnedSellerFilter}`
        : "-all-sellers";
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `commission-earned${sellerLabel}-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRecords.length} record${allRecords.length !== 1 ? "s" : ""} to CSV.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV");
    } finally {
      setExportingEarnedCsv(false);
    }
  };

  const handleExportPayoutCsv = async () => {
    setExportingPayoutCsv(true);
    try {
      const allRecords: AdminPayoutRequest[] = [];
      let currentPage = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({ page: String(currentPage), limit: "100" });
        if (payoutStatusFilter !== "ALL") params.set("status", payoutStatusFilter);
        if (payoutSellerIdFilter.trim()) params.set("sellerId", payoutSellerIdFilter.trim());
        if (payoutFromFilter) params.set("from", payoutFromFilter);
        if (payoutToFilter) params.set("to", payoutToFilter);
        const res = await api.get(`/api/admin/commissions/payout-requests?${params.toString()}`);
        const pageRecords: AdminPayoutRequest[] = Array.isArray(res?.data) ? res.data : [];
        allRecords.push(...pageRecords);
        if (res?.pagination) totalPages = res.pagination.totalPages;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allRecords.length === 0) {
        toast.info("No records to export for the current filters.");
        return;
      }

      const headers = ["Seller Name", "Business Name", "Store Name", "Requested Amount", "Redeemable At Request", "Status", "Seller Note", "Admin Note", "Submitted Date", "Processed Date"];
      const rows = allRecords.map((r) => [
        r.sellerName || "",
        r.businessName || "",
        r.storeName || "",
        parseFloat(r.requestedAmount).toFixed(2),
        parseFloat(r.redeemableAtRequest).toFixed(2),
        r.status,
        r.sellerNote || "",
        r.adminNote || "",
        new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }),
        r.processedAt ? new Date(r.processedAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "",
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
      link.download = `payout-requests-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allRecords.length} payout request${allRecords.length !== 1 ? "s" : ""} to CSV.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV");
    } finally {
      setExportingPayoutCsv(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setUpdatingStatusId(id);
    try {
      await api.put(`/api/admin/commissions/earned/${id}/status`, { status: "PAID" });
      toast.success("Commission marked as Paid");
      setEarned((prev) => prev.map((r) => r.id === id ? { ...r, status: "PAID" } : r));
      fetchEarnedSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ── Payout Request fetchers ────────────────────────────────────────────────
  const fetchPayoutRequests = useCallback(async (page = 1) => {
    setPayoutLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (payoutStatusFilter !== "ALL") params.set("status", payoutStatusFilter);
      if (payoutSellerIdFilter.trim()) params.set("sellerId", payoutSellerIdFilter.trim());
      if (payoutFromFilter) params.set("from", payoutFromFilter);
      if (payoutToFilter) params.set("to", payoutToFilter);
      const res = await api.get(`/api/admin/commissions/payout-requests?${params.toString()}`);
      setPayoutRequests(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setPayoutPagination(res.pagination);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load payout requests");
    } finally {
      setPayoutLoading(false);
    }
  }, [payoutStatusFilter, payoutSellerIdFilter, payoutFromFilter, payoutToFilter]);

  const fetchPayoutCounts = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        api.get("/api/admin/commissions/payout-requests?status=PENDING&limit=1"),
        api.get("/api/admin/commissions/payout-requests?status=APPROVED&limit=1"),
      ]);
      setPendingPayoutCount(pendingRes?.pagination?.total ?? null);
      setApprovedPayoutCount(approvedRes?.pagination?.total ?? null);
    } catch {
      // non-critical
    }
  };

  const handlePayoutAction = async (status: "APPROVED" | "REJECTED" | "COMPLETED") => {
    if (!selectedPayout) return;
    setPayoutActioning(true);
    try {
      await api.put(`/api/admin/commissions/payout-requests/${selectedPayout.id}/status`, {
        status,
        ...(payoutActionNote.trim() ? { adminNote: payoutActionNote.trim() } : {}),
      });
      toast.success(`Payout request marked as ${status}`);
      setSelectedPayout(null);
      setPayoutActionNote("");
      fetchPayoutRequests(payoutPage);
      fetchPayoutCounts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update payout request");
    } finally {
      setPayoutActioning(false);
    }
  };

  const payoutBadgeStyle = (status: AdminPayoutRequest["status"]) => {
    switch (status) {
      case "PENDING":   return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 hover:bg-yellow-100";
      case "APPROVED":  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 hover:bg-blue-100";
      case "REJECTED":  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 hover:bg-red-100";
      case "COMPLETED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100";
    }
  };

  const handleApplyEarnedFilters = () => {
    setEarnedPage(1);
    fetchEarned(1);
    fetchEarnedSummary();
  };

  const handleEarnedPageChange = (newPage: number) => {
    setEarnedPage(newPage);
    fetchEarned(newPage);
  };

  // ── modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Commission) => {
    setEditingId(c.id);
    setForm({
      title: c.title ?? "",
      type: (c.type === "FIXED" ? "FIXED" : "PERCENTAGE") as "PERCENTAGE" | "FIXED",
      value: String(c.value ?? ""),
      description: c.description ?? "",
      isDefault: c.isDefault ?? false,
      isActive: c.isActive ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const setField = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const valueNum = parseFloat(form.value);
  const valueValid =
    !isNaN(valueNum) &&
    valueNum >= 0 &&
    (form.type === "FIXED" || valueNum <= 100);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!valueValid) { toast.error(form.type === "PERCENTAGE" ? "Rate must be 0–100" : "Value must be a positive number"); return; }

    const payload = {
      title: form.title.trim(),
      type: form.type,
      value: String(valueNum),
      description: form.description.trim() || null,
      isDefault: form.isDefault,
      isActive: form.isActive,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/api/admin/commissions/${editingId}`, payload);
        // Optimistically patch local state so inactive rows stay visible
        // even if the GET endpoint filters them out
        const updated: Commission = res?.commission ?? { ...commissions.find((c) => c.id === editingId)!, ...payload };
        setCommissions((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)));
        toast.success("Commission updated successfully");
        closeModal();
      } else {
        await api.post("/api/admin/commissions", payload);
        toast.success("Commission created successfully");
        closeModal();
        fetchCommissions();
      }
    } catch (err: any) {
      toast.error(err?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/commissions/${deleteId}`, {
          reason: ""
      });
      toast.success("Commission deleted");
      setDeleteId(null);
      fetchCommissions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete commission");
    } finally {
      setDeleting(false);
    }
  };

  // ── filtered ───────────────────────────────────────────────────────────────
  const filtered = commissions.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const activeCount = commissions.filter((c) => c.isActive !== false).length;
  const avgRate =
    commissions.filter((c) => c.type === "PERCENTAGE").length > 0
      ? (
          commissions
            .filter((c) => c.type === "PERCENTAGE")
            .reduce((s, c) => s + (Number(c.value) || 0), 0) /
          commissions.filter((c) => c.type === "PERCENTAGE").length
        ).toFixed(1)
      : "0";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground">Manage commission rates and view earned commissions per order.</p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="plans" className="gap-2">
            <Percent className="h-4 w-4" /> Commission Plans
          </TabsTrigger>
          <TabsTrigger value="earned" className="gap-2" onClick={() => { fetchSellerList(); fetchEarned(1); fetchEarnedSummary(); }}>
            <DollarSign className="h-4 w-4" /> Commission Earned
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-2" onClick={() => { fetchPayoutRequests(1); fetchPayoutCounts(); setPayoutPage(1); }}>
            <Send className="h-4 w-4" /> Payout Requests
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════ TAB 1 — PLANS ═══════════════════════════ */}
        <TabsContent value="plans" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-muted-foreground">Create and manage commission plans assigned to sellers.</p>
            <Button onClick={openCreate} className="gap-2 self-start md:self-auto">
              <Plus className="h-4 w-4" /> Add Commission
            </Button>
          </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : commissions.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-12" /> : activeCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. % Rate</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : `${avgRate}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by name, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {search
                      ? `No commissions match "${search}"`
                      : "No commissions yet. Click Add Commission to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.title}</span>
                        {c.isDefault && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.type === "PERCENTAGE" ? "border-blue-300 text-blue-600 dark:text-blue-400" : "border-amber-300 text-amber-600 dark:text-amber-400"}>
                        {c.type === "PERCENTAGE" ? "Percentage" : "Fixed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-bold text-primary text-sm px-2.5 py-0.5 rounded-full bg-primary/10">
                        {c.type === "PERCENTAGE" ? `${c.value}%` : `$${c.value}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.isActive !== false ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-0">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="text-sm text-muted-foreground truncate">{c.description || "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() => openEdit(c)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  {editingId ? "Edit Commission" : "New Commission"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {editingId ? "Update commission details below." : "Define a new commission rate."}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 p-6">

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="c-title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="c-title"
                    ref={firstInputRef}
                    placeholder="e.g. Standard Commission"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label>Type <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField("type", t)}
                        disabled={submitting}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                          form.type === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {t === "PERCENTAGE" ? "Percentage" : "Fixed Amount"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <Label htmlFor="c-value">
                    {form.type === "PERCENTAGE" ? "Rate (%)" : "Amount ($)"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="c-value"
                      type="number"
                      min={0}
                      max={form.type === "PERCENTAGE" ? 100 : undefined}
                      step={0.01}
                      placeholder={form.type === "PERCENTAGE" ? "e.g. 10" : "e.g. 50"}
                      value={form.value}
                      onChange={(e) => setField("value", e.target.value)}
                      disabled={submitting}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                      {form.type === "PERCENTAGE" ? "%" : "$"}
                    </span>
                  </div>
                  {form.value && !valueValid && (
                    <p className="text-xs text-red-500">
                      {form.type === "PERCENTAGE" ? "Rate must be between 0 and 100" : "Value must be a positive number"}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="c-desc">
                    Description{" "}
                    <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="c-desc"
                    rows={3}
                    placeholder="Brief note about this commission rule…"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    disabled={submitting}
                    className="resize-none"
                  />
                </div>

                {/* isDefault toggle */}
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Set as Default</p>
                    <p className="text-xs text-muted-foreground">Apply this commission to sellers without a specific rate</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isDefault}
                    onClick={() => setField("isDefault", !form.isDefault)}
                    disabled={submitting}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      form.isDefault ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        form.isDefault ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* isActive toggle */}
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Deactivate to pause this commission rule</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isActive}
                    onClick={() => setField("isActive", !form.isActive)}
                    disabled={submitting}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      form.isActive ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        form.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>

              <div className="flex gap-2 justify-end px-6 pb-6">
                <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !form.title.trim() || !valueValid}
                  className="gap-2 min-w-[120px]"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4" /> {editingId ? "Save Changes" : "Create"}</>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      {deleteId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteId(null); }}
        >
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" /> Delete Commission
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {commissions.find((c) => c.id === deleteId)?.title}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2 min-w-[100px]"
                >
                  {deleting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                  ) : (
                    <><Trash2 className="h-4 w-4" /> Delete</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        </TabsContent>

        {/* ═══════════════════════ TAB 2 — EARNED ══════════════════════════ */}
        <TabsContent value="earned" className="space-y-6">

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? <Skeleton className="h-8 w-24" /> : earnedSummary ? `$${earnedSummary.totalOrderValue.toFixed(2)}` : "—"}
                </div>
                {earnedSummary && <p className="text-xs text-muted-foreground mt-1">{earnedSummary.totalOrders} orders</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                <Percent className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {summaryLoading ? <Skeleton className="h-8 w-24" /> : earnedSummary ? `$${earnedSummary.totalCommissionEarned.toFixed(2)}` : "—"}
                </div>
                {earnedSummary && <p className="text-xs text-muted-foreground mt-1">${earnedSummary.totalPending.toFixed(2)} pending</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Payable to Sellers</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summaryLoading ? <Skeleton className="h-8 w-24" /> : earnedSummary ? `$${earnedSummary.totalNetPayable.toFixed(2)}` : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">gross − commission</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unique Sellers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? <Skeleton className="h-8 w-12" /> : earnedSummary ? earnedSummary.uniqueSellers : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Seller</Label>
                <Select value={earnedSellerFilter} onValueChange={setEarnedSellerFilter}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="All Sellers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sellers</SelectItem>
                    {loadingSellers ? (
                      <SelectItem value="__loading__" disabled>Loading sellers…</SelectItem>
                    ) : (
                      sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.sellerProfile?.storeName || s.sellerProfile?.businessName || s.name || s.email || s.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={earnedStatusFilter} onValueChange={setEarnedStatusFilter}>
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
                <Input
                  type="date"
                  className="h-9 w-[150px]"
                  value={earnedFrom}
                  onChange={(e) => setEarnedFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  className="h-9 w-[150px]"
                  value={earnedTo}
                  onChange={(e) => setEarnedTo(e.target.value)}
                />
              </div>
              <Button onClick={handleApplyEarnedFilters} className="h-9 gap-2">
                <Search className="h-4 w-4" /> Apply
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2"
                onClick={() => {
                  setEarnedSellerFilter("ALL");
                  setEarnedStatusFilter("ALL");
                  setEarnedFrom("");
                  setEarnedTo("");
                  setEarnedPage(1);
                  setTimeout(() => { fetchEarned(1); fetchEarnedSummary(); }, 0);
                }}
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 ml-auto"
                onClick={handleExportEarnedCsv}
                disabled={exportingEarnedCsv || earnedLoading}
              >
                {exportingEarnedCsv
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
                  : <><Download className="h-4 w-4" /> Export CSV</>
                }
              </Button>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead className="text-green-700 dark:text-green-400 font-semibold">Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnedLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : earned.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        No commission records found. Try adjusting the filters or click Apply.
                      </TableCell>
                    </TableRow>
                  ) : (
                    earned.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/20">
                        <TableCell>
                          <span className="font-mono text-xs text-primary">{r.orderDisplayId || r.orderId}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{r.storeName || r.sellerName || "—"}</span>
                            {r.businessName && <span className="text-xs text-muted-foreground">{r.businessName}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{r.customerName || "—"}</span>
                            {r.customerEmail && <span className="text-xs text-muted-foreground">{r.customerEmail}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">${parseFloat(r.orderValue).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-blue-300 text-blue-600 dark:text-blue-400">
                            {parseFloat(r.commissionRate).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-muted-foreground">${parseFloat(r.commissionAmount).toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            ${r.netPayable ? parseFloat(r.netPayable).toFixed(2) : (parseFloat(r.orderValue) - parseFloat(r.commissionAmount)).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.status === "PAID" ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100">
                              Paid
                            </Badge>
                          ) : r.status === "CANCELLED" ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 hover:bg-red-100">
                              Cancelled
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 hover:bg-yellow-100">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                              disabled={updatingStatusId === r.id}
                              onClick={() => handleMarkAsPaid(r.id)}
                            >
                              {updatingStatusId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!earnedLoading && earnedPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((earnedPage - 1) * earnedPagination.limit) + 1}–{Math.min(earnedPage * earnedPagination.limit, earnedPagination.total)} of {earnedPagination.total} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={earnedPage <= 1}
                    onClick={() => handleEarnedPageChange(earnedPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {earnedPage} / {earnedPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={earnedPage >= earnedPagination.totalPages}
                    onClick={() => handleEarnedPageChange(earnedPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </TabsContent>

        {/* ════════════════ TAB 3 — PAYOUT REQUESTS ══════════════════════ */}
        <TabsContent value="payouts" className="space-y-6">

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {pendingPayoutCount === null ? <Skeleton className="h-8 w-12" /> : pendingPayoutCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {approvedPayoutCount === null ? <Skeleton className="h-8 w-12" /> : approvedPayoutCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Requests (This View)</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payoutLoading ? <Skeleton className="h-8 w-12" /> : payoutPagination.total}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Seller ID</Label>
                <Input
                  className="h-9 w-[180px]"
                  placeholder="Search by seller ID"
                  value={payoutSellerIdFilter}
                  onChange={(e) => setPayoutSellerIdFilter(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" className="h-9 w-[150px]" value={payoutFromFilter} onChange={(e) => setPayoutFromFilter(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" className="h-9 w-[150px]" value={payoutToFilter} onChange={(e) => setPayoutToFilter(e.target.value)} />
              </div>
              <Button className="h-9 gap-2" onClick={() => { setPayoutPage(1); fetchPayoutRequests(1); }}>
                <Search className="h-4 w-4" /> Apply
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2"
                onClick={() => {
                  setPayoutStatusFilter("ALL");
                  setPayoutSellerIdFilter("");
                  setPayoutFromFilter("");
                  setPayoutToFilter("");
                  setPayoutPage(1);
                  setTimeout(() => fetchPayoutRequests(1), 0);
                }}
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 ml-auto"
                onClick={handleExportPayoutCsv}
                disabled={exportingPayoutCsv || payoutLoading}
              >
                {exportingPayoutCsv
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
                  : <><Download className="h-4 w-4" /> Export CSV</>
                }
              </Button>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Seller</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Redeemable At Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : payoutRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No payout requests found. Try adjusting the filters or click Apply.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payoutRequests.map((r) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-muted/20 cursor-pointer"
                        onClick={() => { setSelectedPayout(r); setPayoutActionNote(r.adminNote || ""); }}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{r.sellerName || "—"}</span>
                            {r.businessName && <span className="text-xs text-muted-foreground">{r.businessName}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{r.storeName || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-700 dark:text-green-400">
                            ${parseFloat(r.requestedAmount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          ${parseFloat(r.redeemableAtRequest).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={payoutBadgeStyle(r.status)}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {(r.status === "PENDING" || r.status === "APPROVED") && (
                              <Button
                                size="sm" variant="outline"
                                className="h-8 gap-1 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={(e) => { e.stopPropagation(); setSelectedPayout(r); setPayoutActionNote(r.adminNote || ""); }}
                              >
                                <ThumbsUp className="h-3 w-3" /> Review
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!payoutLoading && payoutPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((payoutPage - 1) * payoutPagination.limit) + 1}–{Math.min(payoutPage * payoutPagination.limit, payoutPagination.total)} of {payoutPagination.total} requests
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={payoutPage <= 1}
                    onClick={() => { setPayoutPage(payoutPage - 1); fetchPayoutRequests(payoutPage - 1); }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{payoutPage} / {payoutPagination.totalPages}</span>
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={payoutPage >= payoutPagination.totalPages}
                    onClick={() => { setPayoutPage(payoutPage + 1); fetchPayoutRequests(payoutPage + 1); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </TabsContent>

      </Tabs>

      {/* ─── Payout Request Action Modal ──────────────────────────────────── */}
      {selectedPayout && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !payoutActioning) setSelectedPayout(null); }}
        >
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" /> Payout Request
                </CardTitle>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                  onClick={() => setSelectedPayout(null)}
                  disabled={payoutActioning}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Request info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Seller</span>
                  <span className="font-semibold">{selectedPayout.sellerName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Store</span>
                  <span className="font-semibold">{selectedPayout.storeName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Requested Amount</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    ${parseFloat(selectedPayout.requestedAmount).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Redeemable At Request</span>
                  <span className="font-semibold">${parseFloat(selectedPayout.redeemableAtRequest).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <Badge className={payoutBadgeStyle(selectedPayout.status)}>{selectedPayout.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Submitted</span>
                  <span className="font-semibold">
                    {new Date(selectedPayout.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              {selectedPayout.sellerNote && (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                  <span className="text-xs text-muted-foreground block mb-1">Seller Note</span>
                  <p>{selectedPayout.sellerNote}</p>
                </div>
              )}

              {/* Bank Details */}
              {selectedPayout.bankDetails && (
                <div className="rounded-lg border border-border px-4 py-3 text-sm space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 mb-2">
                    <Building2 className="h-4 w-4 text-primary" /> Bank Transfer Details
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">{selectedPayout.bankDetails.bankName || "—"}</span>
                    <span className="text-muted-foreground">Account Name</span>
                    <span className="font-medium">{selectedPayout.bankDetails.accountName || "—"}</span>
                    <span className="text-muted-foreground">BSB</span>
                    <span className="font-mono font-medium">{selectedPayout.bankDetails.bsb || "—"}</span>
                    <span className="text-muted-foreground">Account No.</span>
                    <span className="font-mono font-medium">{selectedPayout.bankDetails.accountNumber || "—"}</span>
                  </div>
                </div>
              )}

              {/* Admin note */}
              {(selectedPayout.status === "PENDING" || selectedPayout.status === "APPROVED") && (
                <div className="space-y-1.5">
                  <Label htmlFor="admin-note">Admin Note (optional)</Label>
                  <Input
                    id="admin-note"
                    placeholder="e.g. Paid via ANZ transfer — ref TXN98765"
                    value={payoutActionNote}
                    onChange={(e) => setPayoutActionNote(e.target.value)}
                    disabled={payoutActioning}
                  />
                </div>
              )}

              {selectedPayout.adminNote && selectedPayout.status !== "PENDING" && selectedPayout.status !== "APPROVED" && (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                  <span className="text-xs text-muted-foreground block mb-1">Admin Note</span>
                  <p>{selectedPayout.adminNote}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedPayout(null)} disabled={payoutActioning}>
                  Close
                </Button>
                {selectedPayout.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      disabled={payoutActioning}
                      onClick={() => handlePayoutAction("REJECTED")}
                    >
                      {payoutActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      disabled={payoutActioning}
                      onClick={() => handlePayoutAction("APPROVED")}
                    >
                      {payoutActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      Approve
                    </Button>
                    <Button
                      className="gap-2"
                      disabled={payoutActioning}
                      onClick={() => handlePayoutAction("COMPLETED")}
                    >
                      {payoutActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Mark Completed
                    </Button>
                  </>
                )}
                {selectedPayout.status === "APPROVED" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      disabled={payoutActioning}
                      onClick={() => handlePayoutAction("REJECTED")}
                    >
                      {payoutActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                      Reject
                    </Button>
                    <Button
                      className="gap-2"
                      disabled={payoutActioning}
                      onClick={() => handlePayoutAction("COMPLETED")}
                    >
                      {payoutActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Mark Completed
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

