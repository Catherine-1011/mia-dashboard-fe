"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Users, ShieldCheck, Mail, Eye, Trash2, Trash, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

// --- Types -------------------------------------------------------------------
type Customer = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	role: "CUSTOMER";
	isVerified: boolean;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
};

type DeletedUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	role: string;
	deletedAt: string;
	createdAt: string;
};

type ApiResponse = {
	success: boolean;
	count: number;
	users: Customer[];
};

// --- Helpers -----------------------------------------------------------------
function initials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-AU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

// --- Component ---------------------------------------------------------------
export default function CustomersPage() {
	const router = useRouter();
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Delete state
	const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState<Customer | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	// Recycle bin state
	const [recycleBin, setRecycleBin] = useState<DeletedUser[]>([]);
	const [recycleBinLoading, setRecycleBinLoading] = useState(false);
	const [recycleBinError, setRecycleBinError] = useState<string | null>(null);
	const [recycleBinFetched, setRecycleBinFetched] = useState(false);

	// Recycle bin action state
	const [restoringId, setRestoringId] = useState<string | null>(null);
	const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<DeletedUser | null>(null);
	const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);
	const [permanentDeleteReason, setPermanentDeleteReason] = useState("");

	// Filters / sorting / pagination
	const [search, setSearch] = useState("");
	const [verifiedFilter, setVerifiedFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
	const [emailFilter, setEmailFilter] = useState<"ALL" | "CONFIRMED" | "UNCONFIRMED">("ALL");
	const [sortBy, setSortBy] = useState<keyof Customer>("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const fetchCustomers = useCallback(async () => {
		try {
			const res: ApiResponse = await apiClient("/api/admin/users");
			if (res.success) {
				setCustomers(res.users ?? []);
				setTotalCount(res.count ?? res.users?.length ?? 0);
			} else {
				setError("Failed to load customers.");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to load customers.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

	const fetchRecycleBin = useCallback(async () => {
		setRecycleBinLoading(true);
		setRecycleBinError(null);
		try {
			const res = await apiClient("/api/admin/users/recycle-bin");
			const list = res.users ?? res.data ?? (Array.isArray(res) ? res : []);
			setRecycleBin(list);
		} catch (err: unknown) {
			setRecycleBinError(err instanceof Error ? err.message : "Failed to load recycle bin.");
		} finally {
			setRecycleBinLoading(false);
			setRecycleBinFetched(true);
		}
	}, []);

	const handleDeleteConfirm = async () => {
		if (!confirmDeleteCustomer) return;
		setDeletingId(confirmDeleteCustomer.id);
		setConfirmDeleteCustomer(null);
		try {
			await apiClient(`/api/admin/users/${confirmDeleteCustomer.id}`, { method: "DELETE" });
			toast.success(`${confirmDeleteCustomer.name} has been deleted.`);
			setCustomers((prev) => prev.filter((c) => c.id !== confirmDeleteCustomer.id));
			setTotalCount((prev) => prev - 1);
			// Invalidate recycle bin cache so next visit re-fetches
			setRecycleBinFetched(false);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Failed to delete customer.");
		} finally {
			setDeletingId(null);
		}
	};

	const handleRestore = async (user: DeletedUser) => {
		setRestoringId(user.id);
		try {
			await apiClient(`/api/admin/users/${user.id}/restore`, { method: "POST" });
			toast.success(`${user.name} has been restored.`);
			setRecycleBin((prev) => prev.filter((u) => u.id !== user.id));
			// Re-fetch active customers to include restored user
			await fetchCustomers();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Failed to restore customer.");
		} finally {
			setRestoringId(null);
		}
	};

	const handlePermanentDeleteConfirm = async () => {
		if (!confirmPermanentDelete) return;
		const reason = permanentDeleteReason.trim();
		if (!reason) return;
		const target = confirmPermanentDelete;
		setPermanentDeletingId(target.id);
		setConfirmPermanentDelete(null);
		setPermanentDeleteReason("");
		try {
			await apiClient(`/api/admin/users/${target.id}/permanent`, {
				method: "DELETE",
				body: JSON.stringify({ confirmDelete: true, reason }),
			});
			toast.success(`${target.name} has been permanently deleted.`);
			setRecycleBin((prev) => prev.filter((u) => u.id !== target.id));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Failed to permanently delete customer.");
		} finally {
			setPermanentDeletingId(null);
		}
	};

	// -- Loading skeleton ------------------------------------------------------
	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-9 w-40" />
						<Skeleton className="h-4 w-56" />
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<Card>
					<CardContent className="p-6 space-y-3">
						<div className="flex gap-3">
							<Skeleton className="h-10 flex-1 rounded-md" />
							<Skeleton className="h-10 w-36 rounded-md" />
							<Skeleton className="h-10 w-36 rounded-md" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									{["Customer", "Phone", "Verified", "Email Confirmed", "Joined", "Actions"].map((h) => (
										<TableHead key={h}>{h}</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Skeleton className="h-9 w-9 rounded-full" />
												<div className="space-y-1">
													<Skeleton className="h-4 w-28" />
													<Skeleton className="h-3 w-40" />
												</div>
											</div>
										</TableCell>
										<TableCell><Skeleton className="h-4 w-28" /></TableCell>
										<TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
										<TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
										<TableCell><Skeleton className="h-4 w-24" /></TableCell>
										<TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-destructive font-medium">{error}</p>
			</div>
		);
	}

	// -- Filtering -------------------------------------------------------------
	let filtered = customers.filter((c) => {
		if (
			search.trim() !== "" &&
			!c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
			!c.email.toLowerCase().includes(search.trim().toLowerCase())
		) return false;
		if (verifiedFilter === "VERIFIED" && !c.isVerified) return false;
		if (verifiedFilter === "UNVERIFIED" && c.isVerified) return false;
		if (emailFilter === "CONFIRMED" && !c.emailVerified) return false;
		if (emailFilter === "UNCONFIRMED" && c.emailVerified) return false;
		return true;
	});

	// -- Sorting ---------------------------------------------------------------
	filtered = [...filtered].sort((a, b) => {
		let av: string | number = a[sortBy] as string;
		let bv: string | number = b[sortBy] as string;
		if (sortBy === "createdAt" || sortBy === "updatedAt") {
			av = new Date(av as string).getTime();
			bv = new Date(bv as string).getTime();
		} else if (typeof av === "string") {
			av = av.toLowerCase();
			bv = (bv as string).toLowerCase();
		}
		if (av < bv) return sortOrder === "asc" ? -1 : 1;
		if (av > bv) return sortOrder === "asc" ? 1 : -1;
		return 0;
	});

	// -- Pagination ------------------------------------------------------------
	const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
	const safePage = Math.min(currentPage, totalPages);
	const paginated = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
	const handlePageChange = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

	// -- Derived stats ---------------------------------------------------------
	const verifiedCount = customers.filter((c) => c.isVerified).length;
	const emailConfirmedCount = customers.filter((c) => c.emailVerified).length;

	const clearFilters = () => {
		setSearch("");
		setVerifiedFilter("ALL");
		setEmailFilter("ALL");
		setCurrentPage(1);
	};

	return (
		<div className="space-y-6">
			{/* Permanent Delete Confirmation Dialog */}
			<Dialog open={!!confirmPermanentDelete} onOpenChange={(open) => { if (!open) { setConfirmPermanentDelete(null); setPermanentDeleteReason(""); } }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Permanently Delete Customer</DialogTitle>
						<DialogDescription>
							This will <span className="font-semibold text-destructive">permanently</span> delete <span className="font-semibold">{confirmPermanentDelete?.name}</span>. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<Label htmlFor="permanent-delete-reason" className="text-sm font-medium">
							Reason <span className="text-destructive">*</span>
						</Label>
						<Input
							id="permanent-delete-reason"
							className="mt-1.5"
							placeholder="Enter reason for permanent deletion..."
							value={permanentDeleteReason}
							onChange={(e) => setPermanentDeleteReason(e.target.value)}
						/>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => { setConfirmPermanentDelete(null); setPermanentDeleteReason(""); }}>
							Cancel
						</Button>
						<Button variant="destructive" disabled={!permanentDeleteReason.trim()} onClick={handlePermanentDeleteConfirm}>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete Forever
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

		{/* Delete Confirmation Dialog */}
			<Dialog open={!!confirmDeleteCustomer} onOpenChange={(open) => { if (!open) setConfirmDeleteCustomer(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Customer</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <span className="font-semibold">{confirmDeleteCustomer?.name}</span>? This will move them to the recycle bin.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setConfirmDeleteCustomer(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteConfirm}>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Header */}
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Customers</h2>
				<p className="text-muted-foreground">View and manage all registered customer accounts.</p>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-full bg-primary/10 p-3">
							<Users className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Total Customers</p>
							<p className="text-2xl font-bold">{totalCount}</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
							<ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Verified</p>
							<p className="text-2xl font-bold">{verifiedCount}</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-6">
						<div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
							<Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Email Confirmed</p>
							<p className="text-2xl font-bold">{emailConfirmedCount}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="customers" onValueChange={(v) => {
				if (v === "recycle-bin" && !recycleBinFetched) fetchRecycleBin();
			}}>
				<TabsList>
					<TabsTrigger value="customers">
						<Users className="h-4 w-4 mr-2" />
						Customers
					</TabsTrigger>
					<TabsTrigger value="recycle-bin">
						<Trash className="h-4 w-4 mr-2" />
						Recycle Bin
					</TabsTrigger>
				</TabsList>

				{/* ── Customers Tab ── */}
				<TabsContent value="customers" className="space-y-4 mt-4">
					{/* Filters */}
					<Card>
						<CardContent className="p-5">
							<div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
								<div className="relative flex-1 min-w-0">
									<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by name or email..."
										className="pl-8 pr-10"
										value={search}
										onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
										
									/>
								</div>
								<select
									className="border rounded-md px-3 py-2 text-sm bg-background"
									value={verifiedFilter}
									onChange={(e) => { setVerifiedFilter(e.target.value as typeof verifiedFilter); setCurrentPage(1); }}
										
								>
									<option value="ALL">All - Verified Status</option>
									<option value="VERIFIED">Verified</option>
									<option value="UNVERIFIED">Unverified</option>
								</select>
								<select
									className="border rounded-md px-3 py-2 text-sm bg-background"
									value={emailFilter}
									onChange={(e) => { setEmailFilter(e.target.value as typeof emailFilter); setCurrentPage(1); }}
										
								>
									<option value="ALL">All - Email Status</option>
									<option value="CONFIRMED">Email Confirmed</option>
									<option value="UNCONFIRMED">Email Unconfirmed</option>
								</select>
								<select
									className="border rounded-md px-3 py-2 text-sm bg-background"
									value={sortBy}
									onChange={(e) => { setSortBy(e.target.value as keyof Customer); setCurrentPage(1); }}
										
								>
									<option value="createdAt">Sort: Joined</option>
									<option value="name">Sort: Name</option>
									<option value="email">Sort: Email</option>
								</select>
								<select
									className="border rounded-md px-3 py-2 text-sm bg-background"
									value={sortOrder}
									onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setCurrentPage(1); }}
										
								>
									<option value="desc">Descending</option>
									<option value="asc">Ascending</option>
								</select>
								<Button variant="outline" size="sm" onClick={clearFilters} type="button">
									Clear
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Table */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-3">
							<CardTitle>All Customers</CardTitle>
							<span className="text-sm text-muted-foreground">
								{filtered.length} customer{filtered.length !== 1 ? "s" : ""}
							</span>
						</CardHeader>
						<CardContent className="p-0">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="pl-6">Customer</TableHead>
											<TableHead>Phone</TableHead>
											<TableHead>Verified</TableHead>
											<TableHead>Email Confirmed</TableHead>
											<TableHead>Joined</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginated.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
													No customers match your filters.
												</TableCell>
											</TableRow>
										) : (
											paginated.map((customer) => (
												<TableRow key={customer.id}>
													<TableCell className="pl-6">
														<div className="flex items-center gap-3">
															<Avatar className="h-9 w-9">
																<AvatarFallback className="text-xs font-semibold">
																	{initials(customer.name)}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className="font-medium leading-tight">{customer.name}</p>
																<p className="text-xs text-muted-foreground">{customer.email}</p>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{customer.phone ?? <span className="italic">-</span>}
													</TableCell>
													<TableCell>
														{customer.isVerified ? (
															<Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700">
																Verified
															</Badge>
														) : (
															<Badge variant="outline" className="text-muted-foreground">
																Unverified
															</Badge>
														)}
													</TableCell>
													<TableCell>
														{customer.emailVerified ? (
															<Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700">
																Confirmed
															</Badge>
														) : (
															<Badge variant="outline" className="text-muted-foreground">
																Unconfirmed
															</Badge>
														)}
													</TableCell>
													<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
														{formatDate(customer.createdAt)}
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() => router.push(`/admindashboard/customers/${customer.id}`)}
															>
																<Eye className="h-4 w-4 mr-1" />
																View
															</Button>
															<Button
																variant="destructive"
																size="sm"
																disabled={deletingId === customer.id}
																onClick={() => setConfirmDeleteCustomer(customer)}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span>Rows per page:</span>
									<select
										className="border rounded px-2 py-1 text-sm bg-background"
										value={itemsPerPage}
										onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
										
									>
										{[5, 10, 20, 50].map((n) => (
											<option key={n} value={n}>{n}</option>
										))}
									</select>
									<span>
										{filtered.length === 0
											? "0"
											: `${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filtered.length)}`
										} of {filtered.length}
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={safePage === 1}>«</Button>
									<Button variant="outline" size="sm" onClick={() => handlePageChange(safePage - 1)} disabled={safePage === 1}>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									{Array.from({ length: totalPages }, (_, i) => i + 1)
										.filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
										.reduce<(number | "...")[]>((acc, p, idx, arr) => {
											if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
											acc.push(p);
											return acc;
										}, [])
										.map((p, i) =>
											p === "..." ? (
												<span key={`ell-${i}`} className="px-2 text-muted-foreground">...</span>
											) : (
												<Button
													key={p}
													variant={safePage === p ? "default" : "outline"}
													size="sm"
													className="w-8"
													onClick={() => handlePageChange(p as number)}
												>
													{p}
												</Button>
											)
										)}
									<Button variant="outline" size="sm" onClick={() => handlePageChange(safePage + 1)} disabled={safePage === totalPages}>
										<ChevronRight className="h-4 w-4" />
									</Button>
									<Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} disabled={safePage === totalPages}>»</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Recycle Bin Tab ── */}
				<TabsContent value="recycle-bin" className="mt-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-3">
							<CardTitle className="flex items-center gap-2">
								<Trash className="h-5 w-5 text-muted-foreground" />
								Recycle Bin
							</CardTitle>
							<Button variant="outline" size="sm" onClick={fetchRecycleBin} disabled={recycleBinLoading}>
								{recycleBinLoading ? "Loading..." : "Refresh"}
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{recycleBinLoading ? (
								<div className="p-6 space-y-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="flex items-center gap-3">
											<Skeleton className="h-9 w-9 rounded-full" />
											<div className="space-y-1 flex-1">
												<Skeleton className="h-4 w-36" />
												<Skeleton className="h-3 w-48" />
											</div>
											<Skeleton className="h-4 w-24" />
										</div>
									))}
								</div>
							) : recycleBinError ? (
								<div className="py-16 text-center text-destructive font-medium">
									{recycleBinError}
								</div>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="pl-6">Customer</TableHead>
												<TableHead>Phone</TableHead>
												<TableHead>Role</TableHead>
												<TableHead>Joined</TableHead>
												<TableHead>Deleted At</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{recycleBin.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
														Recycle bin is empty.
													</TableCell>
												</TableRow>
											) : (
												recycleBin.map((user) => (
													<TableRow key={user.id}>
														<TableCell className="pl-6">
															<div className="flex items-center gap-3">
																<Avatar className="h-9 w-9">
																	<AvatarFallback className="text-xs font-semibold">
																		{initials(user.name)}
																	</AvatarFallback>
																</Avatar>
																<div>
																	<p className="font-medium leading-tight">{user.name}</p>
																	<p className="text-xs text-muted-foreground">{user.email}</p>
																</div>
															</div>
														</TableCell>
														<TableCell className="text-sm text-muted-foreground">
															{user.phone ?? <span className="italic">-</span>}
														</TableCell>
														<TableCell>
															<Badge variant="outline">{user.role}</Badge>
														</TableCell>
														<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
															{formatDate(user.createdAt)}
														</TableCell>
														<TableCell className="text-sm text-destructive whitespace-nowrap">
															{formatDate(user.deletedAt)}
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<Button
																	variant="outline"
																	size="sm"
																	disabled={restoringId === user.id}
																	onClick={() => handleRestore(user)}
																	title="Restore customer"
																	className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950"
																>
																	<RotateCcw className="h-4 w-4" />
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}




