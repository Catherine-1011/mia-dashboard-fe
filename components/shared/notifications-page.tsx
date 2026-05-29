"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api, apiClient } from "@/lib/api";
import { decodeJWT } from "@/lib/jwt";
import { getNotificationDeepLink } from "@/lib/notification-deeplink";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Loader2, Bell, Package, ShoppingCart, UserCheck,
	AlertCircle, CheckCircle2, Clock, AlertTriangle,
	XCircle, Trash2, Star, Pencil, Banknote,
	ClipboardList,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
	id: string;
	title: string;
	message: string;
	type: string;
	relatedId?: string | null;
	relatedType?: string | null;
	isRead: boolean;
	metadata?: Record<string, unknown>;
	createdAt: string;
};

type NotificationsResponse = {
	notifications: Notification[];
	unreadCount: number;
	pagination: { page: number; limit: number; total: number };
};

const getIcon = (n: Pick<Notification, "type" | "metadata" | "relatedType">) => {
	const status = typeof n.metadata?.status === "string" ? n.metadata.status : null;
	if (n.type === "GENERAL" && n.relatedType === "product")
		return <Pencil className="h-5 w-5 text-blue-600" />;
	switch (n.type) {
		case "NEW_ORDER":
			return <ShoppingCart className="h-5 w-5 text-blue-600" />;
		case "ORDER_STATUS_CHANGED":
			return <Package className="h-5 w-5 text-blue-600" />;
		case "ORDER_CANCELLED":
			return <XCircle className="h-5 w-5 text-red-600" />;
		case "CATEGORY_REQUEST":
		case "CATEGORY_REQUEST_RESUBMITTED":
			return <ClipboardList className="h-5 w-5 text-purple-600" />;
		case "SELLER_APPLICATION":
			return <UserCheck className="h-5 w-5 text-indigo-600" />;
		case "PRODUCT_STATUS_CHANGED":
			if (status === "ACTIVE") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
			if (status === "REJECTED") return <XCircle className="h-5 w-5 text-red-600" />;
			return <AlertCircle className="h-5 w-5 text-gray-500" />; // INACTIVE
		case "LOW_STOCK_ALERT":
			return <AlertTriangle className="h-5 w-5 text-orange-600" />;
		case "NEW_PRODUCT_SUBMITTED":
			return <Bell className="h-5 w-5 text-amber-600" />;
		case "PRODUCT_LOW_STOCK_DEACTIVATED":
			return <AlertTriangle className="h-5 w-5 text-orange-600" />;
		case "SELLER_APPROVED":
			return <CheckCircle2 className="h-5 w-5 text-green-600" />;
		case "SELLER_REJECTED":
			return <XCircle className="h-5 w-5 text-red-600" />;
		case "CULTURAL_APPROVAL":
			return <UserCheck className="h-5 w-5 text-green-600" />;
		case "PRODUCT_RECOMMENDATION":
			return <Star className="h-5 w-5 text-indigo-600" />;
		case "BANK_CHANGE_REQUESTED":
			return <Banknote className="h-5 w-5 text-orange-600" />;
		case "BANK_CHANGE_APPROVED":
			return <Banknote className="h-5 w-5 text-green-600" />;
		case "BANK_CHANGE_REJECTED":
			return <Banknote className="h-5 w-5 text-red-600" />;
		default:
			return <Bell className="h-5 w-5 text-muted-foreground" />;
	}
};

const getTypeColor = (n: Pick<Notification, "type" | "metadata" | "relatedType">): string => {
	const status = typeof n.metadata?.status === "string" ? n.metadata.status : null;
	if (n.type === "GENERAL" && n.relatedType === "product")
		return "bg-blue-100 text-blue-800 border-blue-200";
	switch (n.type) {
		case "NEW_ORDER":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "ORDER_STATUS_CHANGED":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "ORDER_CANCELLED":
			return "bg-red-100 text-red-800 border-red-200";
		case "CATEGORY_REQUEST":
		case "CATEGORY_REQUEST_RESUBMITTED":
			return "bg-purple-100 text-purple-800 border-purple-200";
		case "SELLER_APPLICATION":
			return "bg-indigo-100 text-indigo-800 border-indigo-200";
		case "PRODUCT_STATUS_CHANGED":
			if (status === "ACTIVE") return "bg-green-100 text-green-800 border-green-200";
			if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
			return "bg-gray-100 text-gray-700 border-gray-200"; // INACTIVE
		case "LOW_STOCK_ALERT":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "NEW_PRODUCT_SUBMITTED":
			return "bg-amber-100 text-amber-800 border-amber-200";
		case "PRODUCT_LOW_STOCK_DEACTIVATED":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "SELLER_APPROVED":
			return "bg-green-100 text-green-800 border-green-200";
		case "SELLER_REJECTED":
			return "bg-red-100 text-red-800 border-red-200";
		case "CULTURAL_APPROVAL":
			return "bg-green-100 text-green-800 border-green-200";
		case "PRODUCT_RECOMMENDATION":
			return "bg-indigo-100 text-indigo-800 border-indigo-200";
		case "BANK_CHANGE_REQUESTED":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "BANK_CHANGE_APPROVED":
			return "bg-green-100 text-green-800 border-green-200";
		case "BANK_CHANGE_REJECTED":
			return "bg-red-100 text-red-800 border-red-200";
		default:
			return "bg-muted text-muted-foreground";
	}
};

export function NotificationsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const currentPage = Number(searchParams.get("page")) || 1;
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [unreadCount, setUnreadCount] = useState(0);
	const [pagination, setPagination] = useState({ limit: 20, total: 0 });
	const [markingId, setMarkingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("alpa_token");
			if (token) {
				const decoded = decodeJWT(token);
				if (decoded && typeof decoded.role === "string") setRole(decoded.role);
			}
		}
	}, []);

	useEffect(() => {
		fetchNotifications(currentPage);
	}, [currentPage]);

	const fetchNotifications = async (page: number = 1) => {
		setLoading(true);
		try {
			const res: NotificationsResponse = await api.get(`/api/notifications?page=${page}&limit=20`);
			setNotifications(res.notifications ?? []);
			setUnreadCount(res.unreadCount ?? 0);
					setPagination({ limit: res.pagination?.limit ?? 20, total: res.pagination?.total ?? 0 });
		} catch {
			toast.error("Failed to load notifications");
		} finally {
			setLoading(false);
		}
	};

	const handleNextPage = () => {
		const nextPage = currentPage + 1;
		const totalPages = Math.ceil(pagination.total / pagination.limit);
		if (nextPage <= totalPages) {
			router.push(`${pathname}?page=${nextPage}`);
		}
	};

	const handlePrevPage = () => {
		const prevPage = currentPage - 1;
		if (prevPage > 0) {
			router.push(`${pathname}?page=${prevPage}`);
		}
	};

	const markAsRead = async (id: string) => {
		setMarkingId(id);
		try {
			await api.put(`/api/notifications/read/${id}`);
			setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
			setUnreadCount(prev => Math.max(0, prev - 1));
		} catch {
			toast.error("Failed to mark as read");
		} finally {
			setMarkingId(null);
		}
	};

	const markAllAsRead = async () => {
		try {
			await api.put("/api/notifications/read-all");
			setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
			setUnreadCount(0);
			toast.success("All notifications marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		}
	};

	const deleteNotification = async (id: string) => {
		setDeletingId(id);
		try {
			const wasUnread = notifications.find(n => n.id === id)?.isRead === false;
			await apiClient(`/api/notifications/${id}`, { method: "DELETE" });
			setNotifications(prev => prev.filter(n => n.id !== id));
			if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
			toast.success("Notification deleted");
		} catch {
			toast.error("Failed to delete notification");
		} finally {
			setDeletingId(null);
		}
	};

	const handleNotificationClick = async (n: Notification) => {
		if (!n.isRead) await markAsRead(n.id);
		const link = getNotificationDeepLink(n, role);
		if (link) router.push(link);
	};

	return (
		<div className="p-6 mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up!"}
					</p>
				</div>
				{unreadCount > 0 && (
					<Button variant="outline" size="sm" onClick={markAllAsRead}>
						Mark all as read
					</Button>
				)}
			</div>
			<Separator />

			{/* Body */}
			{loading ? (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			) : notifications.length === 0 ? (
				<div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
					<Bell className="h-12 w-12 opacity-30" />
					<p className="text-base font-medium">No notifications yet</p>
					<p className="text-sm">We'll let you know when something happens.</p>
				</div>
			) : (
				<div className="space-y-3">
					{notifications.map((n) => (
						<Card
							key={n.id}
							className={`transition-all ${!n.isRead ? "border-primary/25 bg-primary/5" : ""}`}
						>
							<CardContent className="p-4">
								<div className="flex items-start gap-4">
									<div className="mt-0.5 shrink-0 cursor-pointer" onClick={() => handleNotificationClick(n)}>
										{getIcon(n)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 cursor-pointer" onClick={() => handleNotificationClick(n)}>
												<div className="flex items-center gap-2 mb-1">
													<p className="text-sm font-medium">{n.title}</p>
													{!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
												</div>
												<p className="text-sm text-muted-foreground mb-2">{n.message}</p>

												{/* REJECTED reason */}
												{n.type === "PRODUCT_STATUS_CHANGED" &&
													n.metadata?.status === "REJECTED" &&
													typeof n.metadata?.reason === "string" && (
														<p className="text-xs text-red-600 font-medium mb-2">
															Reason: {n.metadata.reason}
														</p>
													)}

												{/* NEW_PRODUCT_SUBMITTED changed fields */}
												{n.type === "NEW_PRODUCT_SUBMITTED" &&
													Array.isArray(n.metadata?.changedFields) &&
													(n.metadata.changedFields as string[]).length > 0 && (
														<div className="flex flex-wrap gap-1 mb-2">
															{(n.metadata.changedFields as string[]).map((field, i) => (
																<span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5">
																	{field}
																</span>
															))}
														</div>
													)}

												{/* ORDER_STATUS_CHANGED updated-by (admin) */}
												{n.type === "ORDER_STATUS_CHANGED" &&
													typeof n.metadata?.updatedBy === "string" && (
														<p className="text-xs text-muted-foreground mb-2">
															Updated by: <span className="font-medium">{n.metadata.updatedBy as string}</span>
														</p>
													)}

												{/* ORDER_CANCELLED cancelled products (seller) */}
												{n.type === "ORDER_CANCELLED" &&
													Array.isArray(n.metadata?.cancelledProducts) &&
													(n.metadata.cancelledProducts as string[]).length > 0 && (
														<p className="text-xs text-muted-foreground mb-2">
															Products: {(n.metadata.cancelledProducts as string[]).join(", ")}
														</p>
													)}

												{/* BANK_CHANGE_REJECTED — admin review note */}
												{n.type === "BANK_CHANGE_REJECTED" &&
													typeof n.metadata?.reviewNote === "string" && (
														<div className="flex gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300 mb-2">
															<XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
															<span>
																<span className="font-medium">Admin note: </span>
																{n.metadata.reviewNote as string}
															</span>
														</div>
													)}

												<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
													<Badge variant="outline" className={`text-xs ${getTypeColor(n)}`}>
														{n.type.replace(/_/g, " ")}
													</Badge>
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
													</div>
												</div>
											</div>
											<div className="shrink-0 flex items-center gap-1">
												{!n.isRead && (
													<Button
														variant="ghost"
														size="sm"
														className="text-xs h-7"
														disabled={markingId === n.id}
														onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
													>
														{markingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark read"}
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-muted-foreground hover:text-destructive"
													disabled={deletingId === n.id}
													onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
												>
													{deletingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
												</Button>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}

					{/* Pagination Controls */}
					{pagination.total > pagination.limit && (
						<div className="flex items-center justify-between pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Showing {(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} notifications
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handlePrevPage}
									disabled={currentPage === 1 || loading}
								>
									Previous
								</Button>
								<div className="flex items-center gap-1 px-3 py-1 bg-muted rounded text-sm">
									<span>Page {currentPage} of {Math.ceil(pagination.total / pagination.limit)}</span>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={handleNextPage}
									disabled={currentPage >= Math.ceil(pagination.total / pagination.limit) || loading}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
