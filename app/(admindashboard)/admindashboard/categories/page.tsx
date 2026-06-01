"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
	Plus, Loader2, Clock, X, CheckCircle2, Package,
	Trash2, RotateCcw, Skull, ChevronLeft, ChevronRight,
	Eye, Filter, Pencil, AlertTriangle, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditLogDiffModal, type AuditLogEntry } from "@/components/shared/audit-log-diff-modal";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ApprovedCategory {
	id: string | null;
	categoryName: string;
	totalProductCount: number;
	/** true only when a seller (not admin) originally submitted this category request */
	requestBySeller?: boolean;
	approvalMessage?: string;
	approvedAt?: string;
}

interface PendingRequest {
	id: string;
	categoryName: string;
	description: string;
	sampleProduct: string;
	requestedAt: string;
	requestedBy: string;
	seller_id: string;
	email: string;
	seller_name: string;
	storeName: string;
	businessName: string;
	seller_status: string;
}

interface RejectedRequest {
	id: string;
	categoryName: string;
	description: string;
	sampleProduct: string;
	requestedAt: string;
	requestedBy: string;
	seller_id: string;
	email: string;
	seller_name: string;
	storeName: string;
	businessName: string;
	seller_status: string;
	rejectionReason?: string;
	rejectionMessage?: string;
}

interface DeletedCategory {
	id: string;
	categoryName: string;
	description?: string;
	status: string;
	softDeletedAt: string;
	softDeletedBy?: string;
	deleted_by_email?: string;
	deleted_by_name?: string;
}

interface CategoriesResponse {
	success: boolean;
	data: {
		approvedCategories: ApprovedCategory[];
		pendingRequests: PendingRequest[];
		rejectedRequests: RejectedRequest[];
		totalApproved: number;
		totalProducts: number;
		totalCategories: number;
		totalPending: number;
		totalRejected: number;
	};
}

// ─── Audit action badge config ───────────────────────────────────────────────────
const AUDIT_ACTION_CONFIG: Record<string, { label: string; className: string }> = {
	CATEGORY_CREATED:      { label: "Created",             className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
	CATEGORY_REQUESTED:    { label: "Requested",           className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700" },
	CATEGORY_APPROVED:     { label: "Approved",            className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
	CATEGORY_REJECTED:     { label: "Rejected",            className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
	CATEGORY_EDITED:       { label: "Edited",              className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
	CATEGORY_RESUBMITTED:  { label: "Resubmitted",         className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700" },
	CATEGORY_SOFT_DELETED: { label: "Soft Deleted",        className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" },
	CATEGORY_RESTORED:     { label: "Restored",            className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
	CATEGORY_HARD_DELETED: { label: "Permanently Deleted", className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700" },
};

function getAuditBadge(action: string) {
	return AUDIT_ACTION_CONFIG[action] ?? { label: action.replace(/_/g, " "), className: "bg-muted text-muted-foreground border-border" };
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("en-AU", {
		day: "2-digit", month: "short", year: "numeric",
		hour: "2-digit", minute: "2-digit", hour12: true,
	});
}

function getCategoryName(entry: AuditLogEntry): string {
	const name =
		(entry.newData?.categoryName as string | undefined) ??
		(entry.previousData?.categoryName as string | undefined);
	return name ?? "—";
}

// ─── Component ───────────────────────────────────────────────────────────────────
const AdminCategoriesPage = () => {
	// ── Main data ────────────────────────────────────────────────────────────────
	const [data, setData] = useState<CategoriesResponse["data"] | null>(null);
	const [loading, setLoading] = useState(true);

	// ── Pending approve/reject ────────────────────────────────────────────────────
	const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [actionMessage, setActionMessage] = useState("");

	// ── Direct creation ───────────────────────────────────────────────────────────
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newCategories, setNewCategories] = useState("");

	// ── Edit category ─────────────────────────────────────────────────────────────
	const [editTarget, setEditTarget] = useState<ApprovedCategory | null>(null);
	const [editName, setEditName] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [isEditOpen, setIsEditOpen] = useState(false);

	// ── Soft delete ───────────────────────────────────────────────────────────────
	const [softDeleteTarget, setSoftDeleteTarget] = useState<ApprovedCategory | null>(null);
	const [softDeleteReason, setSoftDeleteReason] = useState("");
	const [isSoftDeleteOpen, setIsSoftDeleteOpen] = useState(false);

	// ── Recycle Bin ───────────────────────────────────────────────────────────────
	const [deletedCategories, setDeletedCategories] = useState<DeletedCategory[]>([]);
	const [deletedLoading, setDeletedLoading] = useState(false);
	const [hardDeleteTarget, setHardDeleteTarget] = useState<DeletedCategory | null>(null);
	const [hardDeleteConfirm, setHardDeleteConfirm] = useState("");
	const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);

	// ── Audit Logs ────────────────────────────────────────────────────────────────
	const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
	const [auditLoading, setAuditLoading] = useState(false);
	const [auditPage, setAuditPage] = useState(1);
	const [auditTotal, setAuditTotal] = useState(0);
	const [auditTotalPages, setAuditTotalPages] = useState(1);
	const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");
	const [auditFetched, setAuditFetched] = useState(false);
	const [selectedLogEntry, setSelectedLogEntry] = useState<AuditLogEntry | null>(null);
	const [diffOpen, setDiffOpen] = useState(false);

	// ── Active tab tracking ───────────────────────────────────────────────────────
	const [activeTab, setActiveTab] = useState("active");

	const router = useRouter();

	// ─── Fetch main categories ─────────────────────────────────────────────────────
	const fetchCategoriesData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await apiClient("/api/categories/");
			if (response.success && response.data) {
				setData(response.data);
			}
		} catch {
			toast.error("Failed to load categories data");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchCategoriesData(); }, [fetchCategoriesData]);

	// ─── Fetch recycle bin ──────────────────────────────────────────────────────
	const fetchDeletedCategories = useCallback(async () => {
		setDeletedLoading(true);
		try {
			const token = localStorage.getItem("alpa_token");
			const res = await fetch(`${BASE_URL}/api/categories/deleted`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			const body = await res.json();
			if (body.success) setDeletedCategories(body.data?.deletedCategories ?? []);
		} catch {
			toast.error("Failed to load recycle bin");
		} finally {
			setDeletedLoading(false);
		}
	}, []);

	// ─── Fetch audit logs ───────────────────────────────────────────────────────
	const fetchAuditLogs = useCallback(async (page: number, action: string) => {
		setAuditLoading(true);
		try {
			const token = localStorage.getItem("alpa_token");
			const params = new URLSearchParams({ page: String(page), limit: "20" });
			if (action !== "ALL") params.set("action", action);
			const res = await fetch(`${BASE_URL}/api/categories/logs?${params}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			const body = await res.json();
			if (body.success) {
				setAuditLogs(body.data?.logs ?? []);
				setAuditTotal(body.data?.total ?? 0);
				setAuditTotalPages(body.data?.totalPages ?? 1);
			}
		} catch {
			toast.error("Failed to load audit logs");
		} finally {
			setAuditLoading(false);
			setAuditFetched(true);
		}
	}, []);

	// Lazy-load recycle bin & audit logs when their tabs are first visited
	useEffect(() => {
		if (activeTab === "recycle-bin") fetchDeletedCategories();
		if (activeTab === "audit-logs" && !auditFetched) fetchAuditLogs(auditPage, auditActionFilter);
	}, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

	// Re-fetch audit logs when filter or page changes
	useEffect(() => {
		if (activeTab === "audit-logs") fetchAuditLogs(auditPage, auditActionFilter);
	}, [auditPage, auditActionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

	// ─── Approve ────────────────────────────────────────────────────────────────
	const handleApproveRequest = async (id: string, message?: string) => {
		try {
			setIsProcessing(true);
			const response = await apiClient(`/api/categories/approve/${id}`, {
				method: "POST",
				body: JSON.stringify({ approvalMessage: message || "Your category request has been approved." }),
			});
			if (response.success) {
				toast.success("Category request approved!");
				setSelectedRequest(null);
				setActionMessage("");
				fetchCategoriesData();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to approve request");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Reject ─────────────────────────────────────────────────────────────────
	const handleRejectRequest = async (id: string, message?: string) => {
		try {
			setIsProcessing(true);
			const response = await apiClient(`/api/categories/reject/${id}`, {
				method: "POST",
				body: JSON.stringify({ rejectionMessage: message || "Rejected by admin" }),
			});
			if (response.success) {
				toast.success("Category request rejected!");
				setSelectedRequest(null);
				setActionMessage("");
				fetchCategoriesData();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to reject request");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Direct Create ───────────────────────────────────────────────────────────
	const handleDirectCreate = async () => {
		if (!newCategories.trim()) { toast.error("Please enter at least one category name"); return; }
		const categoriesList = newCategories.split(/[,\n]/).map(c => c.trim()).filter(c => c.length > 0);
		if (categoriesList.length === 0) { toast.error("Please enter valid category names"); return; }
		try {
			setIsProcessing(true);
			const response = await apiClient("/api/categories/create-direct", {
				method: "POST",
				body: JSON.stringify({ categories: categoriesList }),
			});
			if (response.success) {
				const { totalCreated, skipped } = response.data;
				let msg = `${totalCreated} categories created successfully.`;
				if (skipped > 0) msg += ` ${skipped} skipped (already exist).`;
				toast.success(msg);
				setIsCreateOpen(false);
				setNewCategories("");
				fetchCategoriesData();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to create categories");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Edit ────────────────────────────────────────────────────────────────────
	const openEdit = (cat: ApprovedCategory) => {
		setEditTarget(cat);
		setEditName(cat.categoryName);
		setEditDesc("");
		setIsEditOpen(true);
	};

	const handleEdit = async () => {
		if (!editTarget || !editTarget.id || !editName.trim()) return;
		try {
			setIsProcessing(true);
			const response = await apiClient(`/api/categories/${editTarget.id}`, {
				method: "PUT",
				body: JSON.stringify({
					categoryName: editName.trim(),
					...(editDesc.trim() ? { description: editDesc.trim() } : {}),
				}),
			});
			if (response.success) {
				toast.success("Category updated successfully!");
				setIsEditOpen(false);
				setEditTarget(null);
				fetchCategoriesData();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to update category");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Soft Delete ─────────────────────────────────────────────────────────────
	const openSoftDelete = (cat: ApprovedCategory) => {
		setSoftDeleteTarget(cat);
		setSoftDeleteReason("");
		setIsSoftDeleteOpen(true);
	};

	const handleSoftDelete = async () => {
		if (!softDeleteTarget || !softDeleteTarget.id) return;
		try {
			setIsProcessing(true);
			const response = await apiClient(`/api/categories/${softDeleteTarget.id}`, {
				method: "DELETE",
				body: JSON.stringify(softDeleteReason.trim() ? { reason: softDeleteReason.trim() } : {}),
			});
			if (response.success) {
				toast.success(`"${softDeleteTarget.categoryName}" moved to recycle bin`);
				setIsSoftDeleteOpen(false);
				setSoftDeleteTarget(null);
				fetchCategoriesData();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete category");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Restore ─────────────────────────────────────────────────────────────────
	const handleRestore = async (cat: DeletedCategory) => {
		try {
			setIsProcessing(true);
			const token = localStorage.getItem("alpa_token");
			const res = await fetch(`${BASE_URL}/api/categories/restore/${cat.id}`, {
				method: "POST",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			const body = await res.json();
			if (body.success) {
				toast.success(`"${cat.categoryName}" restored successfully`);
				fetchDeletedCategories();
				fetchCategoriesData();
			} else {
				toast.error(body.message || "Failed to restore category");
			}
		} catch {
			toast.error("Failed to restore category");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Hard Delete ─────────────────────────────────────────────────────────────
	const openHardDelete = (cat: DeletedCategory) => {
		setHardDeleteTarget(cat);
		setHardDeleteConfirm("");
		setIsHardDeleteOpen(true);
	};

	const handleHardDelete = async () => {
		if (!hardDeleteTarget) return;
		if (hardDeleteConfirm !== hardDeleteTarget.categoryName) {
			toast.error("Category name does not match.");
			return;
		}
		try {
			setIsProcessing(true);
			const token = localStorage.getItem("alpa_token");
			const res = await fetch(`${BASE_URL}/api/categories/hard-delete/${hardDeleteTarget.id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ reason: "Permanently deleted via Admin Dashboard" }),
			});
			const body = await res.json();
			if (body.success) {
				toast.success(`"${hardDeleteTarget.categoryName}" permanently deleted`);
				setIsHardDeleteOpen(false);
				setHardDeleteTarget(null);
				fetchDeletedCategories();
			} else {
				toast.error(body.message || "Failed to permanently delete category");
			}
		} catch {
			toast.error("Failed to permanently delete category");
		} finally {
			setIsProcessing(false);
		}
	};

	// ─── Loading skeleton ────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-9 w-40" />
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
				</div>
				<div className="space-y-3">
					<div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
					<Skeleton className="h-64 rounded-lg" />
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex flex-col items-center justify-center h-96 gap-4">
				<Package className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-muted-foreground">Failed to load categories data</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* ── Header ── */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Categories</h1>
					<p className="text-muted-foreground mt-1">
						Manage categories, review seller requests, and audit the full change history
					</p>
				</div>
				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="w-4 h-4" />
							Add New Categories
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Add New Categories</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="categories-input">Category Names</Label>
								<Textarea
									id="categories-input"
									placeholder="Enter category names (separate by comma or newline)"
									value={newCategories}
									onChange={(e) => setNewCategories(e.target.value)}
									className="h-32 resize-none"
								/>
								<p className="text-[10px] text-muted-foreground">Example: Books, Tools, Gardening</p>
							</div>
							<Button className="w-full" disabled={isProcessing || !newCategories.trim()} onClick={handleDirectCreate}>
								{isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
								Create Categories
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* ── Stats ── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="p-5">
					<p className="text-xs font-medium text-muted-foreground">Total Categories</p>
					<div className="flex items-center justify-between mt-1">
						<p className="text-3xl font-bold">{data.totalCategories}</p>
						<Package className="w-5 h-5 text-muted-foreground" />
					</div>
				</Card>
				<Card className="p-5">
					<p className="text-xs font-medium text-muted-foreground">Total Products</p>
					<p className="text-3xl font-bold mt-1">{data.totalProducts}</p>
				</Card>
				<Card className="p-5 border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-900/10">
					<p className="text-xs font-medium text-muted-foreground">Pending Requests</p>
					<div className="flex items-center justify-between mt-1">
						<p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{data.totalPending}</p>
						<Clock className="w-5 h-5 text-yellow-500" />
					</div>
				</Card>
				<Card className="p-5 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10">
					<p className="text-xs font-medium text-muted-foreground">Rejected Requests</p>
					<div className="flex items-center justify-between mt-1">
						<p className="text-3xl font-bold text-red-600 dark:text-red-500">{data.totalRejected}</p>
						<X className="w-5 h-5 text-red-500" />
					</div>
				</Card>
			</div>

			{/* ── Tab Switcher ── */}
			<div className="flex gap-1 border-b pb-4 flex-wrap">
				{([
					{ key: "active",      label: "Active",      count: data.totalApproved, icon: <CheckCircle2 className="h-4 w-4" /> },
					{ key: "pending",     label: "Pending",     count: data.totalPending,  icon: <Clock className="h-4 w-4" /> },
					{ key: "rejected",    label: "Rejected",    count: data.totalRejected, icon: <X className="h-4 w-4" /> },
					{ key: "recycle-bin", label: "Recycle Bin", count: null,               icon: <Trash2 className="h-4 w-4" /> },
					{ key: "audit-logs",  label: "Audit Logs",  count: null,               icon: <ScrollText className="h-4 w-4" /> },
				] as const).map(tab => (
					<Button
						key={tab.key}
						variant={activeTab === tab.key ? "default" : "ghost"}
						size="sm"
						onClick={() => setActiveTab(tab.key)}
						className="gap-1.5"
					>
						{tab.icon}
						{tab.label}
						{tab.count !== null && (
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
						)}
					</Button>
				))}
			</div>

			{/* ── Active Tab ── */}
			{activeTab === "active" && (
				data.approvedCategories.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
						<Package className="h-10 w-10 opacity-20" />
						<p className="text-sm">No approved categories yet</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg border bg-background">
						<table className="min-w-full divide-y divide-muted">
							<thead className="bg-muted/50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">#</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Category Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Products</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-muted">
								{data.approvedCategories.map((cat, idx) => (
									<tr key={cat.id ?? idx} className="hover:bg-muted/20">
										<td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
										<td className="px-4 py-2">
											<div className="flex items-center gap-2">
												<span className="font-semibold">{cat.categoryName}</span>
												{cat.requestBySeller && (
													<span className="text-[9px] border rounded px-1 py-0 text-muted-foreground">Seller Request</span>
												)}
											</div>
										</td>
										<td className="px-4 py-2">
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
												<Package className="h-3 w-3" />{cat.totalProductCount ?? 0}
											</span>
										</td>
										<td className="px-4 py-2">
											<div className="flex gap-1 flex-wrap">
												<Button variant="outline" size="sm" className="gap-1" disabled={!cat.id} onClick={() => openEdit(cat)}>
													<Pencil className="h-3 w-3" /> Edit
												</Button>
												<Button variant="outline" size="sm" className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20" disabled={!cat.id} onClick={() => openSoftDelete(cat)}>
													<Trash2 className="h-3 w-3" /> Delete
												</Button>
												<Button variant="outline" size="sm" className="gap-1" disabled={!cat.id} onClick={() => cat.id && router.push(`/admindashboard/categories/${cat.id}`)}>
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

			{/* ── Pending Tab ── */}
			{activeTab === "pending" && (
				data.totalPending === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
						<Clock className="h-10 w-10 opacity-20" />
						<p className="text-sm">No pending category requests</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg border bg-background">
						<table className="min-w-full divide-y divide-muted">
							<thead className="bg-yellow-50/50 dark:bg-yellow-950/20">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">#</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Category Info</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Seller Details</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Sample Product</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Requested On</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-muted">
								{data.pendingRequests.map((request, idx) => (
									<tr key={request.id} className="hover:bg-muted/20">
										<td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
										<td className="px-4 py-2">
											<p className="font-semibold">{request.categoryName}</p>
											<p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{request.description}</p>
										</td>
										<td className="px-4 py-2">
											<p className="font-medium text-sm">{request.seller_name}</p>
											<p className="text-xs text-muted-foreground">{request.storeName}</p>
										</td>
										<td className="px-4 py-2">
											<span className="text-xs bg-muted px-2 py-0.5 rounded italic">{request.sampleProduct}</span>
										</td>
										<td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
											{new Date(request.requestedAt).toLocaleDateString('en-GB')}
										</td>
										<td className="px-4 py-2">
											<div className="flex gap-1 flex-wrap">
												<Dialog open={selectedRequest?.id === request.id} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setActionMessage(""); } }}>
													<DialogTrigger asChild>
														<Button variant="outline" size="sm" className="gap-1" onClick={() => { setSelectedRequest(request); setActionMessage(""); }}>
															Review
														</Button>
													</DialogTrigger>
													<DialogContent className="max-w-md">
														<DialogHeader><DialogTitle>Review Category Request</DialogTitle></DialogHeader>
														<div className="space-y-6 py-4">
															<div>
																<h3 className="font-semibold text-xl">{request.categoryName}</h3>
																<p className="text-muted-foreground text-sm mt-1">{request.description}</p>
															</div>
															<div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-xl border">
																<div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Seller</p><p className="mt-0.5">{request.seller_name}</p></div>
																<div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Business</p><p className="mt-0.5">{request.businessName}</p></div>
																<div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Store</p><p className="mt-0.5">{request.storeName}</p></div>
																<div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sample Product</p><p className="mt-0.5">{request.sampleProduct}</p></div>
															</div>
															<div className="space-y-2">
																<Label htmlFor="action-message">Response Message (Optional)</Label>
																<Textarea id="action-message" placeholder="Enter a message for the seller..." value={actionMessage} onChange={(e) => setActionMessage(e.target.value)} className="h-24 resize-none" />
															</div>
															<div className="flex gap-3">
																<Button variant="destructive" className="flex-1" disabled={isProcessing} onClick={() => handleRejectRequest(request.id, actionMessage)}>
																	{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-2" />Reject</>}
																</Button>
																<Button className="flex-1" disabled={isProcessing} onClick={() => handleApproveRequest(request.id, actionMessage)}>
																	{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" />Approve</>}
																</Button>
															</div>
														</div>
													</DialogContent>
												</Dialog>
												<Button
													variant="secondary" size="sm" disabled={isProcessing}
													className="gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 dark:text-yellow-400"
													onClick={() => handleApproveRequest(request.id)}
												>
													<CheckCircle2 className="h-3 w-3" /> Quick Approve
												</Button>
												<Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/admindashboard/categories/${request.id}`)}>
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

			{/* ── Rejected Tab ── */}
			{activeTab === "rejected" && (
				data.totalRejected === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
						<X className="h-10 w-10 opacity-20" />
						<p className="text-sm">No rejected category requests</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg border bg-background">
						<table className="min-w-full divide-y divide-muted">
							<thead className="bg-red-50/50 dark:bg-red-950/20">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">#</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Category Name</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Seller</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Rejection Reason</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Requested On</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-muted">
								{data.rejectedRequests.map((request, idx) => (
									<tr key={request.id} className="hover:bg-muted/20">
										<td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
										<td className="px-4 py-2 font-semibold">{request.categoryName}</td>
										<td className="px-4 py-2">
											<p className="text-sm font-medium">{request.seller_name}</p>
											<p className="text-xs text-muted-foreground">{request.storeName}</p>
										</td>
										<td className="px-4 py-2">
											<p className="text-xs text-muted-foreground italic line-clamp-2 max-w-[240px]">
												{request.rejectionReason ?? request.rejectionMessage ?? "—"}
											</p>
										</td>
										<td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
											{new Date(request.requestedAt).toLocaleDateString('en-GB')}
										</td>
										<td className="px-4 py-2">
											<Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/admindashboard/categories/${request.id}`)}>
												<Eye className="h-3 w-3" /> View
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)
			)}

			{/* ── Recycle Bin Tab ── */}
			{activeTab === "recycle-bin" && (
				deletedLoading ? (
					<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading recycle bin...
					</div>
				) : deletedCategories.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
						<Trash2 className="h-10 w-10 opacity-20" />
						<p className="text-sm">Recycle bin is empty</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg border bg-background">
						<table className="min-w-full divide-y divide-muted">
							<thead className="bg-orange-50/50 dark:bg-orange-950/20">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">#</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Category</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Status Before Delete</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Deleted By</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Deleted On</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-muted">
								{deletedCategories.map((cat, idx) => (
									<tr key={cat.id} className="hover:bg-muted/20">
										<td className="px-4 py-2 text-sm text-muted-foreground">{idx + 1}</td>
										<td className="px-4 py-2">
											<p className="font-semibold">{cat.categoryName}</p>
											{cat.description && <p className="text-xs text-muted-foreground line-clamp-1">{cat.description}</p>}
										</td>
										<td className="px-4 py-2">
											<span className="text-xs border rounded px-1.5 py-0.5">{cat.status}</span>
										</td>
										<td className="px-4 py-2">
											<p className="text-sm">{cat.deleted_by_name ?? "—"}</p>
											<p className="text-xs text-muted-foreground">{cat.deleted_by_email ?? ""}</p>
										</td>
										<td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
											{new Date(cat.softDeletedAt).toLocaleDateString('en-GB')}
										</td>
										<td className="px-4 py-2">
											<div className="flex gap-1 flex-wrap">
												<Button
													variant="outline" size="sm" disabled={isProcessing}
													className="gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-900/20"
													onClick={() => handleRestore(cat)}
												>
													<RotateCcw className="h-3 w-3" /> Restore
												</Button>
												<Button
													variant="outline" size="sm"
													className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-900/20"
													onClick={() => openHardDelete(cat)}
												>
													<Trash2 className="h-3 w-3" /> Delete Permanently
												</Button>
												<Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/admindashboard/categories/${cat.id}`)}>
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

			{/* ── Audit Logs Tab ── */}
			{activeTab === "audit-logs" && (<>
				{/* Filter bar */}
				<div className="flex flex-wrap items-center gap-3 mb-4">
					<Filter className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Filter by action:</span>
					<Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v); setAuditPage(1); }}>
						<SelectTrigger className="w-52 h-8 text-xs">
							<SelectValue placeholder="All actions" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All actions</SelectItem>
							{Object.entries(AUDIT_ACTION_CONFIG).map(([key, cfg]) => (
								<SelectItem key={key} value={key}>{cfg.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
					{auditTotal > 0 && (
						<span className="ml-auto text-xs text-muted-foreground">{auditTotal} event{auditTotal !== 1 ? "s" : ""}</span>
					)}
				</div>

				{auditLoading ? (
					<div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs...
					</div>
				) : auditLogs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
						<ScrollText className="h-10 w-10 opacity-20" />
						<p className="text-sm">No audit events found</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-lg border bg-background">
						<table className="min-w-full divide-y divide-muted">
							<thead className="bg-muted/50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">#</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Category</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Action</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Actor</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Timestamp</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Diff</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-muted">
								{auditLogs.map((entry, idx) => {
									const badge = getAuditBadge(entry.action);
									const catName = getCategoryName(entry);
									return (
										<tr
											key={entry.id}
											className="hover:bg-muted/20 cursor-pointer"
											onClick={() => { setSelectedLogEntry(entry); setDiffOpen(true); }}
										>
											<td className="px-4 py-2 text-sm text-muted-foreground">{(auditPage - 1) * 20 + idx + 1}</td>
											<td className="px-4 py-2">
												<p className="font-semibold text-sm">{catName}</p>
												<p className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{entry.entityId}</p>
											</td>
											<td className="px-4 py-2">
												<span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border whitespace-nowrap", badge.className)}>
													{badge.label}
												</span>
											</td>
											<td className="px-4 py-2">
												<p className="text-xs font-medium">{entry.actorEmail ?? entry.actorId ?? "System"}</p>
												{entry.actorRole && (
													<span className={cn(
														"inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-medium mt-0.5",
														entry.actorRole === "ADMIN"  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" :
														entry.actorRole === "SELLER" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
														"bg-muted text-muted-foreground"
													)}>{entry.actorRole}</span>
												)}
											</td>
											<td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(entry.createdAt)}</td>
											<td className="px-4 py-2">
												<Button
													variant="ghost" size="sm" className="h-7 w-7 p-0"
													onClick={(e) => { e.stopPropagation(); setSelectedLogEntry(entry); setDiffOpen(true); }}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{auditTotalPages > 1 && (
					<div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
						<span>Page {auditPage} of {auditTotalPages} · {auditTotal} total events</span>
						<div className="flex gap-1">
							<Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={auditPage <= 1 || auditLoading} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>
								<ChevronLeft className="h-3 w-3" />Prev
							</Button>
							<Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={auditPage >= auditTotalPages || auditLoading} onClick={() => setAuditPage((p) => p + 1)}>
								Next<ChevronRight className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}
			</>)}

			{/* ── Edit Modal ── */}
			<Dialog open={isEditOpen} onOpenChange={(o) => { setIsEditOpen(o); if (!o) setEditTarget(null); }}>
				<DialogContent className="max-w-md">
					<DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">Category Name <span className="text-destructive">*</span></Label>
							<Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Category name" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-desc">Description <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span></Label>
							<Textarea id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Leave blank to keep existing" className="resize-none h-20" />
						</div>
						<Button className="w-full" disabled={isProcessing || !editName.trim()} onClick={handleEdit}>
							{isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
							Save Changes
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Soft Delete Confirm ── */}
			<Dialog open={isSoftDeleteOpen} onOpenChange={(o) => { setIsSoftDeleteOpen(o); if (!o) setSoftDeleteTarget(null); }}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Trash2 className="w-4 h-4 text-orange-500" />Move to Recycle Bin
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<p className="text-sm text-muted-foreground">
							<strong className="text-foreground">&ldquo;{softDeleteTarget?.categoryName}&rdquo;</strong> will be moved to the recycle bin. It can be restored later.
						</p>
						<div className="space-y-2">
							<Label htmlFor="soft-delete-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
							<Textarea id="soft-delete-reason" value={softDeleteReason} onChange={(e) => setSoftDeleteReason(e.target.value)} placeholder="Reason for deletion..." className="resize-none h-20" />
						</div>
						<div className="flex gap-3">
							<Button variant="outline" className="flex-1" onClick={() => setIsSoftDeleteOpen(false)}>Cancel</Button>
							<Button variant="destructive" className="flex-1" disabled={isProcessing} onClick={handleSoftDelete}>
								{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Move to Bin</>}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Hard Delete Confirm ── */}
			<Dialog open={isHardDeleteOpen} onOpenChange={(o) => { setIsHardDeleteOpen(o); if (!o) { setHardDeleteTarget(null); setHardDeleteConfirm(""); } }}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-rose-600">
							<Skull className="w-4 h-4" />Permanently Delete
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-3 flex gap-2 text-sm text-rose-700 dark:text-rose-400">
							<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
							<p>This action is <strong>irreversible</strong>. The category row will be permanently removed. Audit logs are retained.</p>
						</div>
						<p className="text-sm text-muted-foreground">
							Type <strong className="text-foreground font-mono">{hardDeleteTarget?.categoryName}</strong> to confirm:
						</p>
						<Input value={hardDeleteConfirm} onChange={(e) => setHardDeleteConfirm(e.target.value)} placeholder="Type category name to confirm" />
						<div className="flex gap-3">
							<Button variant="outline" className="flex-1" onClick={() => setIsHardDeleteOpen(false)}>Cancel</Button>
							<Button
								variant="destructive" className="flex-1 bg-rose-600 hover:bg-rose-700"
								disabled={isProcessing || hardDeleteConfirm !== hardDeleteTarget?.categoryName}
								onClick={handleHardDelete}
							>
								{isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Skull className="w-4 h-4 mr-2" />Delete Forever</>}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Diff Modal ── */}
			<AuditLogDiffModal
				entry={selectedLogEntry}
				open={diffOpen}
				onOpenChange={(o) => { setDiffOpen(o); if (!o) setSelectedLogEntry(null); }}
			/>
		</div>
	);
};

export default AdminCategoriesPage;
