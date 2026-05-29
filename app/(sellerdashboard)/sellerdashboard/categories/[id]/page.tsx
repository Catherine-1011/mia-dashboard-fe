"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ArrowLeft, Loader2, Tag, Clock, XCircle,
	MessageSquare, Calendar, RefreshCcw, Pencil, CheckCircle2, Trash2,
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
import { apiClient } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CategoryDetail {
	id: string;
	categoryName: string;
	status: "PENDING" | "REJECTED" | "APPROVED" | "DELETED";
	description?: string;
	sampleProduct?: string;
	requestedAt?: string;
	approvedAt?: string;
	rejectedAt?: string;
	rejectionMessage?: string;
	approvalMessage?: string;
	softDeletedAt?: string;
	isRequestedCategory?: boolean;
	totalProductCount?: number;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function CategoryDetailSkeleton() {
	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			<Skeleton className="h-8 w-36" />
			<div className="grid md:grid-cols-2 gap-8">
				<div className="space-y-4">
					<Skeleton className="h-8 w-3/4" />
					<Skeleton className="h-5 w-1/2" />
					<Skeleton className="h-16 w-full" />
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

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SellerCategoryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [category, setCategory]   = useState<CategoryDetail | null>(null);
	const [loading, setLoading]     = useState(true);

	// Resubmit modal
	const [resubmitOpen, setResubmitOpen]   = useState(false);
	const [editName, setEditName]           = useState("");
	const [editDesc, setEditDesc]           = useState("");
	const [submitting, setSubmitting]       = useState(false);

	// ── Fetch ───────────────────────────────────────────────────────────────────
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await apiClient(`/api/categories/${id}`);
			if (!response.success) throw new Error(response.message ?? "Failed to load");
			const data = response.data;
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

	// ── Open resubmit with prefilled values ─────────────────────────────────────
	const openResubmit = () => {
		if (!category) return;
		setEditName(category.categoryName);
		setEditDesc(category.description ?? "");
		setResubmitOpen(true);
	};

	// ── Resubmit ────────────────────────────────────────────────────────────────
	const handleResubmit = async () => {
		if (!editName.trim()) { toast.error("Category name is required"); return; }
		setSubmitting(true);
		try {
			const body: Record<string, string> = { categoryName: editName.trim() };
			if (editDesc.trim())   body.description   = editDesc.trim();


			const response = await apiClient(`/api/categories/resubmit/${id}`, {
				method: "POST",
				body: JSON.stringify(body),
			});
			if (!response.success) throw new Error(response.message ?? "Failed to resubmit");
			toast.success("Category request resubmitted for review!");
			setResubmitOpen(false);
			await load();
		} catch (err: any) {
			toast.error(err?.message ?? "Failed to resubmit");
		} finally {
			setSubmitting(false);
		}
	};

	// ── Render ──────────────────────────────────────────────────────────────────
	if (loading) return <CategoryDetailSkeleton />;

	if (!category) {
		return (
			<div className="flex flex-col items-center justify-center h-96 gap-4">
				<Tag className="h-12 w-12 text-muted-foreground/30" />
				<p className="text-muted-foreground">Category not found.</p>
				<Button variant="outline" onClick={() => router.push("/sellerdashboard/categories")}>
					<ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories
				</Button>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">

			{/* ── Back + Actions ────────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push("/sellerdashboard/categories")}>
					<ArrowLeft className="h-4 w-4" /> Back to Categories
				</Button>

				{category.status === "REJECTED" && (
					<Button className="gap-2" onClick={openResubmit}>
						<RefreshCcw className="h-4 w-4" /> Fix &amp; Resubmit
					</Button>
				)}
			</div>

			{/* ── Main Info Card ─────────────────────────────────────────────────────── */}
			<Card>
				<CardContent className="p-6">
					<div className="grid md:grid-cols-2 gap-8">

						{/* Left ── icon + chips */}
						<div className="space-y-5">
							<div className="flex items-center justify-center rounded-xl border bg-muted/40 aspect-[4/3] w-full max-w-xs">
								<Tag className="h-16 w-16 text-muted-foreground/30" />
							</div>

							<div className="flex flex-wrap gap-2">
								{category.status === "PENDING" && (
									<Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-700">
										Pending Review
									</Badge>
								)}
								{category.status === "REJECTED" && (
									<Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700">
										Rejected
									</Badge>
								)}
								{category.status === "APPROVED" && (
									<Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700">
										Approved
									</Badge>
								)}
								{category.status === "DELETED" && (
									<Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700">
										In Recycle Bin
									</Badge>
								)}
							</div>

							{category.requestedAt && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar className="h-4 w-4 shrink-0" />
									<span>Requested {new Date(category.requestedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
							{category.approvedAt && (
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<CheckCircle2 className="h-4 w-4 shrink-0" />
									<span>Approved {new Date(category.approvedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
							{category.rejectedAt && (
								<div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
									<XCircle className="h-4 w-4 shrink-0" />
									<span>Rejected {new Date(category.rejectedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}
							{category.softDeletedAt && (
								<div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
									<Trash2 className="h-4 w-4 shrink-0" />
									<span>Moved to bin {new Date(category.softDeletedAt).toLocaleDateString('en-GB')}</span>
								</div>
							)}

							{category.status === "PENDING" && (
								<div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-3 text-sm text-yellow-800 dark:text-yellow-400">
									<Clock className="h-4 w-4 shrink-0 mt-0.5" />
									<p>Your request is under review. You&#39;ll be notified once an admin has responded.</p>
								</div>
							)}
							{category.status === "APPROVED" && (
								<div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3 text-sm text-green-800 dark:text-green-400">
									<CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
									<p>This category is approved and active.</p>
								</div>
							)}
							{category.status === "DELETED" && (
								<div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3 text-sm text-orange-800 dark:text-orange-400">
									<Trash2 className="h-4 w-4 shrink-0 mt-0.5" />
									<p>This category has been moved to the recycle bin and is no longer active.</p>
								</div>
							)}
						</div>

						{/* * Right ── text content */}
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

							{category.approvalMessage && (
								<div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4">
									<p className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">
										<MessageSquare className="h-3.5 w-3.5" />Approval Note
									</p>
									<p className="text-sm text-green-800 dark:text-green-300 italic">&ldquo;{category.approvalMessage}&rdquo;</p>
								</div>
							)}

							{category.rejectionMessage && (
								<div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
									<p className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">
										<MessageSquare className="h-3.5 w-3.5" />Admin Feedback
									</p>
									<p className="text-sm text-red-800 dark:text-red-300 italic">&ldquo;{category.rejectionMessage}&rdquo;</p>
									<Button variant="outline" className="mt-3 gap-1.5 text-xs border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30" onClick={openResubmit}>
										<RefreshCcw className="h-3.5 w-3.5" /> Fix &amp; Resubmit
									</Button>
								</div>
							)}
						</div>
					</div>

					{/* ── Audit History ────────────────────────────────────────────────── */}
					<div className="mt-8 pt-6 border-t">
						<CategoryAuditHistory categoryId={id} categoryName={category.categoryName} />
					</div>
				</CardContent>
			</Card>

			{/* ── Resubmit Dialog ────────────────────────────────────────────────────── */}
			<Dialog open={resubmitOpen} onOpenChange={(o) => { setResubmitOpen(o); }}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<RefreshCcw className="h-4 w-4" /> Fix &amp; Resubmit Category
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="resub-name">Category Name <span className="text-destructive">*</span></Label>
							<Input id="resub-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Category name" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="resub-desc">Description</Label>
							<Textarea id="resub-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Leave blank to keep existing" className="resize-none h-20" />
						</div>
						<Button className="w-full" disabled={submitting || !editName.trim()} onClick={handleResubmit}>
							{submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
							Resubmit for Review
						</Button>
					</div>
				</DialogContent>
			</Dialog>

		</div>
	);
}
