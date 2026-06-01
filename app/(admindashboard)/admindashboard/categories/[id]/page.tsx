"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ArrowLeft, Loader2, Tag, CheckCircle2, XCircle,
	Package, Clock, Trash2, Skull, AlertTriangle,
	Pencil, RotateCcw, Store, User, Calendar, MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryAuditHistory } from "@/components/shared/category-audit-history";
import { cn } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au";

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryStatus = "APPROVED" | "PENDING" | "REJECTED" | "DELETED";

interface CategoryDetail {
	id: string;
	categoryName: string;
	status: CategoryStatus;
	description?: string;
	sampleProduct?: string;
	isRequestedCategory?: boolean;
	totalProductCount?: number;
	approvalMessage?: string;
	approvedAt?: string;
	rejectedAt?: string;
	updatedAt?: string;
	restoredAt?: string;
	rejectionReason?: string;
	rejectionMessage?: string;
	requestedAt?: string;
	// Rich person info from GET /api/categories/:id
	requested_by_name?: string;
	requested_by_email?: string;
	approved_by_name?: string;
	approved_by_email?: string;
	rejected_by_name?: string;
	rejected_by_email?: string;
	soft_deleted_by_name?: string;
	soft_deleted_by_email?: string;
	// Seller info (PENDING / REJECTED — legacy fallbacks)
	seller_id?: string;
	seller_name?: string;
	email?: string;
	storeName?: string;
	businessName?: string;
	seller_status?: string;
	// Recycle bin extras (legacy fallbacks)
	softDeletedAt?: string;
	deleted_by_name?: string;
	deleted_by_email?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CategoryDetailSkeleton() {
	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<Skeleton className="h-8 w-36" />
			<div className="grid md:grid-cols-2 gap-8">
				<div className="space-y-4">
					<Skeleton className="h-10 w-3/4" />
					<Skeleton className="h-5 w-1/2" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-5 w-1/3" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-3/4" />
				</div>
			</div>
		</div>
	);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CategoryStatus | string }) {
	switch (status) {
		case "APPROVED": return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700">Approved</Badge>;
		case "PENDING":  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-700">Pending</Badge>;
		case "REJECTED": return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700">Rejected</Badge>;
		case "DELETED":  return <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700">In Recycle Bin</Badge>;
		default:         return <Badge variant="secondary">{status}</Badge>;
	}
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminCategoryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [category, setCategory]           = useState<CategoryDetail | null>(null);
	const [loading, setLoading]             = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	// Modals
	const [rejectOpen, setRejectOpen]           = useState(false);
	const [rejectMessage, setRejectMessage]     = useState("");
	const [rejectLoading, setRejectLoading]     = useState(false);
	const [editOpen, setEditOpen]               = useState(false);
	const [editName, setEditName]               = useState("");
	const [editDesc, setEditDesc]               = useState("");
	const [softDeleteOpen, setSoftDeleteOpen]   = useState(false);
	const [softDeleteReason, setSoftDeleteReason] = useState("");
	const [hardDeleteOpen, setHardDeleteOpen]   = useState(false);
	const [hardDeleteConfirm, setHardDeleteConfirm] = useState("");

	// ── Fetch ──────────────────────────────────────────────────────────────────
	const load = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
				headers: { Authorization: `Bearer ${token ?? ""}` },
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message ?? "Failed to load category");
			const data = json.data;
			setCategory({
				...data,
				status: data.softDeletedAt ? "DELETED" : data.status,
			});
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to load category");
			setCategory(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => { load(); }, [load]);

	// ── Approve ────────────────────────────────────────────────────────────────
	const handleApprove = async (message?: string) => {
		setActionLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/approve/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ approvalMessage: message }),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category approved!");
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to approve");
		} finally {
			setActionLoading(false);
		}
	};

	// ── Reject ─────────────────────────────────────────────────────────────────
	const handleReject = async () => {
		if (!rejectMessage.trim()) { toast.error("Rejection message is required"); return; }
		setRejectLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/reject/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ rejectionMessage: rejectMessage.trim() }),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category rejected.");
			setRejectOpen(false);
			setRejectMessage("");
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to reject");
		} finally {
			setRejectLoading(false);
		}
	};

	// ── Edit ───────────────────────────────────────────────────────────────────
	const openEdit = () => {
		if (!category) return;
		setEditName(category.categoryName);
		setEditDesc(category.description ?? "");
		setEditOpen(true);
	};

	const handleEdit = async () => {
		if (!editName.trim()) { toast.error("Category name is required"); return; }
		setActionLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const body: Record<string, string> = { categoryName: editName.trim() };
			if (editDesc.trim())   body.description  = editDesc.trim();

			const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category updated.");
			setEditOpen(false);
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to update");
		} finally {
			setActionLoading(false);
		}
	};

	// ── Soft Delete ────────────────────────────────────────────────────────────
	const handleSoftDelete = async () => {
		setActionLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ reason: softDeleteReason.trim() || undefined }),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category moved to recycle bin.");
			setSoftDeleteOpen(false);
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to delete");
		} finally {
			setActionLoading(false);
		}
	};

	// ── Restore ────────────────────────────────────────────────────────────────
	const handleRestore = async () => {
		setActionLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/restore/${id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category restored.");
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to restore");
		} finally {
			setActionLoading(false);
		}
	};

	// ── Hard Delete ────────────────────────────────────────────────────────────
	const handleHardDelete = async () => {
		setActionLoading(true);
		const token = localStorage.getItem("alpa_token");
		try {
			const res = await fetch(`${BASE_URL}/api/categories/hard-delete/${id}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.message);
			toast.success("Category permanently deleted.");
			setHardDeleteOpen(false);
			router.push("/admindashboard/categories");
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to delete permanently");
		} finally {
			setActionLoading(false);
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────────
	if (loading) return <CategoryDetailSkeleton />;

	if (!category) {
		return (
			<div className="flex flex-col items-center justify-center h-96 gap-4">
				<Tag className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-muted-foreground">Category not found.</p>
				<Button variant="outline" onClick={() => router.push("/admindashboard/categories")}>
					<ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories
				</Button>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">

			{/* ── Back + Actions ──────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/admindashboard/categories")}>
					<ArrowLeft className="h-4 w-4" /> Back to Categories
				</Button>

				<div className="flex flex-wrap gap-2">
					{/* PENDING actions */}
					{category.status === "PENDING" && (<>
						<Button
							variant="outline"
							className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-800 dark:hover:bg-green-900/20"
							disabled={actionLoading}
							onClick={() => handleApprove()}
						>
							{actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
							Approve
						</Button>
						<Button
							variant="outline"
							className="gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
							disabled={actionLoading}
							onClick={() => { setRejectMessage(""); setRejectOpen(true); }}
						>
							<XCircle className="h-4 w-4" /> Reject
						</Button>
					</>)}

					{/* APPROVED actions */}
					{category.status === "APPROVED" && (<>
						<Button variant="outline" className="gap-1.5" disabled={actionLoading} onClick={openEdit}>
							<Pencil className="h-4 w-4" /> Edit
						</Button>
						<Button
							variant="outline"
							className="gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:border-orange-800 dark:hover:bg-orange-900/20"
							disabled={actionLoading}
							onClick={() => { setSoftDeleteReason(""); setSoftDeleteOpen(true); }}
						>
							<Trash2 className="h-4 w-4" /> Move to Bin
						</Button>
					</>)}

					{/* DELETED actions */}
					{category.status === "DELETED" && (<>
						<Button
							variant="outline"
							className="gap-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200 dark:border-teal-800 dark:hover:bg-teal-900/20"
							disabled={actionLoading}
							onClick={handleRestore}
						>
							{actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
							Restore
						</Button>
						<Button
							variant="outline"
							className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-800 dark:hover:bg-rose-900/20"
							disabled={actionLoading}
							onClick={() => { setHardDeleteConfirm(""); setHardDeleteOpen(true); }}
						>
							<Skull className="h-4 w-4" /> Delete Permanently
						</Button>
					</>)}
				</div>
			</div>

			{/* ── Main Info Card ───────────────────────────────────────────────────── */}
			<Card>
				<CardContent className="p-6">
					<div className="grid md:grid-cols-2 gap-8">

						{/* Left — icon + metadata chips */}
						<div className="space-y-5">
							{/* Category icon placeholder */}
							<div className="flex items-center justify-center rounded-xl border bg-muted/40 aspect-[4/3] w-full max-w-xs">
								<Tag className="h-16 w-16 text-muted-foreground/30" />
							</div>

							{/* Metadata chips */}
							<div className="flex flex-wrap gap-2">
								<StatusBadge status={category.status} />
								{category.isRequestedCategory && (
									<Badge variant="outline" className="text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700">
										Seller-Requested
									</Badge>
								)}
								{category.totalProductCount !== undefined && (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
										<Package className="h-3 w-3" />{category.totalProductCount} products
									</span>
								)}
							</div>

							{/* Dates */}
							{category.requestedAt && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar className="h-4 w-4 shrink-0" />
									<span>Requested {new Date(category.requestedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
							{category.approvedAt && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
									<span>Approved {new Date(category.approvedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
							{category.softDeletedAt && (
								<div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
									<Trash2 className="h-4 w-4 shrink-0" />
									<span>Deleted {new Date(category.softDeletedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
						</div>

						{/* Right — text info */}
						<div className="space-y-5">
							<div>
								<h1 className="text-2xl font-bold">{category.categoryName}</h1>
								{category.description && (
									<p className="text-muted-foreground mt-1">{category.description}</p>
								)}
							</div>

							{category.sampleProduct && (
								<div>
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Sample Product</p>
									<span className="text-sm bg-muted px-2 py-1 rounded italic">{category.sampleProduct}</span>
								</div>
							)}

							{/* Seller info (PENDING / REJECTED) */}
							{(category.requested_by_name || category.seller_name || category.storeName) && (
								<div className="rounded-xl border bg-muted/40 p-4 space-y-3">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requesting Seller</p>
									<div className="grid grid-cols-2 gap-3 text-sm">
										{(category.requested_by_name || category.seller_name) && (
											<div className="flex items-start gap-2">
												<User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div>
													<p className="text-[10px] text-muted-foreground uppercase">Name</p>
													<p className="font-medium">{category.requested_by_name ?? category.seller_name}</p>
													{category.requested_by_email && <p className="text-[10px] text-muted-foreground">{category.requested_by_email}</p>}
												</div>
											</div>
										)}
										{category.storeName && (
											<div className="flex items-start gap-2">
												<Store className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div>
													<p className="text-[10px] text-muted-foreground uppercase">Store</p>
													<p className="font-medium">{category.storeName}</p>
												</div>
											</div>
										)}
										{category.businessName && (
											<div className="col-span-2 flex items-start gap-2">
												<Store className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div>
													<p className="text-[10px] text-muted-foreground uppercase">Business</p>
													<p className="font-medium">{category.businessName}</p>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Approval message */}
							{category.approvalMessage && (
								<div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4">
									<p className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">
										<MessageSquare className="h-3.5 w-3.5" />Approval Note
									</p>
									<p className="text-sm text-green-800 dark:text-green-300">{category.approvalMessage}</p>
								{category.approved_by_name && (
									<p className="text-xs text-green-600/80 dark:text-green-400/70 mt-1">Approved by {category.approved_by_name}{category.approved_by_email ? ` (${category.approved_by_email})` : ""}</p>
								)}
								</div>
							)}
						{!category.approvalMessage && category.approved_by_name && (
							<div className="rounded-xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 p-3 flex items-start gap-2">
								<CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
								<div className="text-sm">
									<p className="font-medium text-green-700 dark:text-green-400">Approved by {category.approved_by_name}</p>
									{category.approved_by_email && <p className="text-green-600/70 dark:text-green-500/70 text-xs">{category.approved_by_email}</p>}
								</div>
							</div>
						)}

							{/* Deleted by */}
							{(category.soft_deleted_by_name || category.deleted_by_name) && (
								<div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3 flex items-start gap-2">
									<Trash2 className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
									<div className="text-sm">
									<p className="font-medium text-orange-700 dark:text-orange-400">Moved to bin by {category.soft_deleted_by_name ?? category.deleted_by_name}</p>
									{(category.soft_deleted_by_email || category.deleted_by_email) && <p className="text-orange-600/70 dark:text-orange-500/70 text-xs">{category.soft_deleted_by_email ?? category.deleted_by_email}</p>}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* ── Audit History ───────────────────────────────────────────────── */}
					<div className="mt-8 pt-6 border-t">
						<CategoryAuditHistory categoryId={id} categoryName={category.categoryName} />
					</div>
				</CardContent>
			</Card>

			{/* ── Reject Dialog ────────────────────────────────────────────────────── */}
			<Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectMessage(""); }}>
				<DialogContent className="max-w-sm">
					<DialogHeader><DialogTitle>Reject Category Request</DialogTitle></DialogHeader>
					<div className="space-y-4 py-2">
						<p className="text-sm text-muted-foreground">
							Rejecting <strong className="text-foreground">&ldquo;{category.categoryName}&rdquo;</strong>. The seller will be notified.
						</p>
						<div className="space-y-2">
							<Label htmlFor="reject-message">Rejection Message <span className="text-destructive">*</span></Label>
							<Textarea id="reject-message" value={rejectMessage} onChange={(e) => setRejectMessage(e.target.value)} placeholder="Explain why this category was rejected…" className="resize-none h-24" />
						</div>
						<div className="flex gap-3">
							<Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>Cancel</Button>
							<Button variant="destructive" className="flex-1" disabled={rejectLoading || !rejectMessage.trim()} onClick={handleReject}>
								{rejectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" />Reject</>}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
			<Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); }}>
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
						<Button className="w-full" disabled={actionLoading || !editName.trim()} onClick={handleEdit}>
							{actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
							Save Changes
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Soft Delete Dialog ───────────────────────────────────────────────── */}
			<Dialog open={softDeleteOpen} onOpenChange={(o) => { setSoftDeleteOpen(o); if (!o) setSoftDeleteReason(""); }}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Trash2 className="w-4 h-4 text-orange-500" />Move to Recycle Bin
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<p className="text-sm text-muted-foreground">
							<strong className="text-foreground">&ldquo;{category.categoryName}&rdquo;</strong> will be moved to the recycle bin. It can be restored later.
						</p>
						<div className="space-y-2">
							<Label htmlFor="soft-delete-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
							<Textarea id="soft-delete-reason" value={softDeleteReason} onChange={(e) => setSoftDeleteReason(e.target.value)} placeholder="Reason for deletion..." className="resize-none h-20" />
						</div>
						<div className="flex gap-3">
							<Button variant="outline" className="flex-1" onClick={() => setSoftDeleteOpen(false)}>Cancel</Button>
							<Button variant="destructive" className="flex-1" disabled={actionLoading} onClick={handleSoftDelete}>
								{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Move to Bin</>}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Hard Delete Dialog ───────────────────────────────────────────────── */}
			<Dialog open={hardDeleteOpen} onOpenChange={(o) => { setHardDeleteOpen(o); if (!o) setHardDeleteConfirm(""); }}>
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
							Type <strong className="text-foreground font-mono">{category.categoryName}</strong> to confirm:
						</p>
						<Input value={hardDeleteConfirm} onChange={(e) => setHardDeleteConfirm(e.target.value)} placeholder="Type category name to confirm" />
						<div className="flex gap-3">
							<Button variant="outline" className="flex-1" onClick={() => setHardDeleteOpen(false)}>Cancel</Button>
							<Button
								variant="destructive" className="flex-1 bg-rose-600 hover:bg-rose-700"
								disabled={actionLoading || hardDeleteConfirm !== category.categoryName}
								onClick={handleHardDelete}
							>
								{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Skull className="w-4 h-4 mr-2" />Delete Forever</>}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

		</div>
	);
}
