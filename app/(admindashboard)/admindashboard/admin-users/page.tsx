"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	Search,
	ShieldCheck,
	ShieldX,
	Clock,
	CheckCircle,
	XCircle,
	Ban,
	Unlock,
	Users,
	ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { decodeJWT } from "@/lib/jwt";

// --- Types ---
type SamlUser = {
	id: string;
	userId: string;
	status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
	approvedBy: string | null;
	approvedAt: string | null;
	rejectedBy: string | null;
	rejectedAt: string | null;
	rejectionReason: string | null;
	blockedBy: string | null;
	blockedAt: string | null;
	blockReason: string | null;
	createdAt: string;
	user: {
		id: string;
		email: string;
		name: string;
		role: string;
		createdAt: string;
	};
};

// --- Helpers ---
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
		hour: "2-digit",
		minute: "2-digit",
	});
}

function statusBadge(status: string) {
	switch (status) {
		case "PENDING":
			return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
		case "APPROVED":
			return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
		case "REJECTED":
			return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
		case "BLOCKED":
			return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-400"><Ban className="h-3 w-3 mr-1" />Blocked</Badge>;
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

// --- Component ---
export default function AdminUsersPage() {
	const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
	const [samlUsers, setSamlUsers] = useState<SamlUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState("all");
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	// Dialog state
	const [rejectDialog, setRejectDialog] = useState<SamlUser | null>(null);
	const [blockDialog, setBlockDialog] = useState<SamlUser | null>(null);
	const [approveDialog, setApproveDialog] = useState<SamlUser | null>(null);
	const [unblockDialog, setUnblockDialog] = useState<SamlUser | null>(null);
	const [reason, setReason] = useState("");

	// Check if current user is SUPER_ADMIN
	useEffect(() => {
		const token = localStorage.getItem("alpa_token");
		if (token) {
			const decoded = decodeJWT(token);
			setIsSuperAdmin(decoded?.role === "SUPER_ADMIN");
		} else {
			setIsSuperAdmin(false);
		}
	}, []);

	const fetchSamlUsers = useCallback(async () => {
		try {
			const res = await apiClient("/api/admin/saml-users");
			if (res.success) {
				setSamlUsers(res.data ?? []);
			}
		} catch {
			toast.error("Failed to load admin users");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isSuperAdmin) fetchSamlUsers();
		else if (isSuperAdmin === false) setLoading(false);
	}, [isSuperAdmin, fetchSamlUsers]);

	// --- Actions ---
	const handleApprove = async () => {
		if (!approveDialog) return;
		setActionLoading(approveDialog.userId);
		try {
			await apiClient(`/api/admin/saml-users/${approveDialog.userId}/approve`, {
				method: "PUT",
				body: JSON.stringify({ role: "ADMIN" }),
			});
			toast.success(`${approveDialog.user.name} approved successfully`);
			setApproveDialog(null);
			fetchSamlUsers();
		} catch {
			toast.error("Failed to approve user");
		} finally {
			setActionLoading(null);
		}
	};

	const handleReject = async () => {
		if (!rejectDialog) return;
		setActionLoading(rejectDialog.userId);
		try {
			await apiClient(`/api/admin/saml-users/${rejectDialog.userId}/reject`, {
				method: "PUT",
				body: JSON.stringify({ reason }),
			});
			toast.success(`${rejectDialog.user.name} rejected`);
			setRejectDialog(null);
			setReason("");
			fetchSamlUsers();
		} catch {
			toast.error("Failed to reject user");
		} finally {
			setActionLoading(null);
		}
	};

	const handleBlock = async () => {
		if (!blockDialog) return;
		setActionLoading(blockDialog.userId);
		try {
			await apiClient(`/api/admin/saml-users/${blockDialog.userId}/block`, {
				method: "PUT",
				body: JSON.stringify({ reason }),
			});
			toast.success(`${blockDialog.user.name} blocked`);
			setBlockDialog(null);
			setReason("");
			fetchSamlUsers();
		} catch {
			toast.error("Failed to block user");
		} finally {
			setActionLoading(null);
		}
	};

	const handleUnblock = async () => {
		if (!unblockDialog) return;
		setActionLoading(unblockDialog.userId);
		try {
			await apiClient(`/api/admin/saml-users/${unblockDialog.userId}/unblock`, {
				method: "PUT",
			});
			toast.success(`${unblockDialog.user.name} unblocked and approved`);
			setUnblockDialog(null);
			fetchSamlUsers();
		} catch {
			toast.error("Failed to unblock user");
		} finally {
			setActionLoading(null);
		}
	};

	// --- Filtering ---
	const filteredUsers = samlUsers.filter((u) => {
		const matchesSearch =
			u.user.name.toLowerCase().includes(search.toLowerCase()) ||
			u.user.email.toLowerCase().includes(search.toLowerCase());
		if (activeTab === "all") return matchesSearch;
		return matchesSearch && u.status === activeTab.toUpperCase();
	});

	const counts = {
		all: samlUsers.length,
		pending: samlUsers.filter((u) => u.status === "PENDING").length,
		approved: samlUsers.filter((u) => u.status === "APPROVED").length,
		rejected: samlUsers.filter((u) => u.status === "REJECTED").length,
		blocked: samlUsers.filter((u) => u.status === "BLOCKED").length,
	};

	// --- Not Super Admin ---
	if (isSuperAdmin === false) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Card className="w-full max-w-md text-center border-amber-200 shadow-lg">
					<CardHeader>
						<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-4 border-amber-200">
							<ShieldOff className="h-10 w-10 text-amber-500" />
						</div>
						<CardTitle className="text-xl text-amber-800">Super Admin Access Required</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-amber-700 text-sm">
							This page is only accessible to Super Admin only.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// --- Loading ---
	if (loading || isSuperAdmin === null) {
		return (
			<div className="space-y-6 p-6">
				<Skeleton className="h-8 w-64" />
				<div className="grid grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
				</div>
				<Skeleton className="h-96" />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Admin User Management</h1>
				<p className="text-muted-foreground">Manage SAML/AuthPoint admin users — approve, reject, or block access to the dashboard.</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="border-blue-200">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
							<div><p className="text-2xl font-bold">{counts.all}</p><p className="text-xs text-muted-foreground">Total</p></div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-yellow-200">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-yellow-50 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
							<div><p className="text-2xl font-bold">{counts.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-green-200">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-green-50 rounded-lg"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
							<div><p className="text-2xl font-bold">{counts.approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-red-200">
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-red-50 rounded-lg"><ShieldX className="h-5 w-5 text-red-600" /></div>
							<div><p className="text-2xl font-bold">{counts.rejected + counts.blocked}</p><p className="text-xs text-muted-foreground">Rejected / Blocked</p></div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs + Search */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<TabsList>
						<TabsTrigger value="all">All ({counts.all})</TabsTrigger>
						<TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
						<TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
						<TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
						<TabsTrigger value="blocked">Blocked ({counts.blocked})</TabsTrigger>
					</TabsList>
					<div className="relative w-full sm:w-72">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or email..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
				</div>

				{/* Table Content — same for all tabs */}
				{["all", "pending", "approved", "rejected", "blocked"].map((tab) => (
					<TabsContent key={tab} value={tab}>
						<Card>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Registered</TableHead>
											<TableHead>Details</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredUsers.length === 0 ? (
											<TableRow>
												<TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
													No users found
												</TableCell>
											</TableRow>
										) : (
											filteredUsers.map((saml) => (
												<TableRow key={saml.id}>
													<TableCell>
														<div className="flex items-center gap-3">
															<Avatar className="h-8 w-8">
																<AvatarFallback className="text-xs bg-blue-100 text-blue-700">
																	{initials(saml.user.name)}
																</AvatarFallback>
															</Avatar>
															<span className="font-medium">{saml.user.name}</span>
														</div>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">{saml.user.email}</TableCell>
													<TableCell>{statusBadge(saml.status)}</TableCell>
													<TableCell>
														<Badge variant="secondary" className="text-xs">
															{saml.user.role}
														</Badge>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">{formatDate(saml.createdAt)}</TableCell>
													<TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
														{saml.status === "REJECTED" && saml.rejectionReason && (
															<span title={saml.rejectionReason}>Reason: {saml.rejectionReason}</span>
														)}
														{saml.status === "BLOCKED" && saml.blockReason && (
															<span title={saml.blockReason}>Reason: {saml.blockReason}</span>
														)}
														{saml.status === "APPROVED" && saml.approvedAt && (
															<span>Approved: {formatDate(saml.approvedAt)}</span>
														)}
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-2">
															{saml.user.role === "SUPER_ADMIN" ? (
																<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
																	<ShieldCheck className="h-3 w-3 mr-1" />Protected
																</Badge>
															) : (
																<>
																	{saml.status === "PENDING" && (
																		<>
																			<Button
																				size="sm"
																				className="bg-green-600 hover:bg-green-700 text-white"
																				onClick={() => setApproveDialog(saml)}
																				disabled={actionLoading === saml.userId}
																			>
																				<CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
																			</Button>
																			<Button
																				size="sm"
																				variant="destructive"
																				onClick={() => { setRejectDialog(saml); setReason(""); }}
																				disabled={actionLoading === saml.userId}
																			>
																				<XCircle className="h-3.5 w-3.5 mr-1" />Reject
																			</Button>
																		</>
																	)}
																	{saml.status === "APPROVED" && (
																		<Button
																			size="sm"
																			variant="outline"
																			className="border-red-300 text-red-700 hover:bg-red-50"
																			onClick={() => { setBlockDialog(saml); setReason(""); }}
																			disabled={actionLoading === saml.userId}
																		>
																			<Ban className="h-3.5 w-3.5 mr-1" />Block
																		</Button>
																	)}
																	{(saml.status === "BLOCKED" || saml.status === "REJECTED") && (
																		<Button
																			size="sm"
																			variant="outline"
																			className="border-green-300 text-green-700 hover:bg-green-50"
																			onClick={() => setUnblockDialog(saml)}
																			disabled={actionLoading === saml.userId}
																		>
																			<Unlock className="h-3.5 w-3.5 mr-1" />Unblock
																		</Button>
																	)}
																</>
															)}
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>

			{/* Approve Dialog */}
			<Dialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Approve Admin User</DialogTitle>
						<DialogDescription>
							This will grant <strong>{approveDialog?.user.name}</strong> ({approveDialog?.user.email}) access to the admin dashboard.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
						<Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={!!actionLoading}>
							<CheckCircle className="h-4 w-4 mr-1" />Approve
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject Dialog */}
			<Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Admin User</DialogTitle>
						<DialogDescription>
							This will deny <strong>{rejectDialog?.user.name}</strong> ({rejectDialog?.user.email}) access to the dashboard.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Reason for rejection (optional)"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className="mt-2"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
						<Button variant="destructive" onClick={handleReject} disabled={!!actionLoading}>
							<XCircle className="h-4 w-4 mr-1" />Reject
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Block Dialog */}
			<Dialog open={!!blockDialog} onOpenChange={(open) => !open && setBlockDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Block Admin User</DialogTitle>
						<DialogDescription>
							This will revoke <strong>{blockDialog?.user.name}</strong>&apos;s access to the dashboard. They will not be able to login.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Reason for blocking (optional)"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className="mt-2"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBlockDialog(null)}>Cancel</Button>
						<Button variant="destructive" onClick={handleBlock} disabled={!!actionLoading}>
							<Ban className="h-4 w-4 mr-1" />Block
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Unblock Dialog */}
			<Dialog open={!!unblockDialog} onOpenChange={(open) => !open && setUnblockDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Unblock Admin User</DialogTitle>
						<DialogDescription>
							This will restore <strong>{unblockDialog?.user.name}</strong>&apos;s access. They will be able to login to the dashboard again.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setUnblockDialog(null)}>Cancel</Button>
						<Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleUnblock} disabled={!!actionLoading}>
							<Unlock className="h-4 w-4 mr-1" />Unblock & Approve
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
