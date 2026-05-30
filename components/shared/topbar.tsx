"use client";
import Link from "next/link";
import { Bell, ShoppingCart, Package, UserCheck, AlertCircle, User, Settings, LogOut, CheckCircle2, AlertTriangle, XCircle, Star, Pencil, Banknote } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeJWT } from "@/lib/jwt";
import { getNotificationDeepLink } from "@/lib/notification-deeplink";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppSwitcher } from "./app-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

type Notification = {
	id: string;
	title: string;
	message: string;
	type: string;
	relatedId?: string | null;
	relatedType?: string | null;
	isRead: boolean;
	createdAt: string;
	metadata?: Record<string, any>;
};

const getNotificationIcon = (n: Pick<Notification, "type" | "metadata" | "relatedType">) => {
	const status = typeof n.metadata?.status === "string" ? n.metadata.status : null;
	if (n.type === "GENERAL" && n.relatedType === "product")
		return <Pencil className="h-4 w-4 text-blue-600" />;
	switch (n.type) {
		case "NEW_ORDER":
			return <ShoppingCart className="h-4 w-4 text-blue-600" />;
		case "ORDER_STATUS_CHANGED":
			return <Package className="h-4 w-4 text-blue-600" />;
		case "ORDER_CANCELLED":
			return <XCircle className="h-4 w-4 text-red-600" />;
		case "PRODUCT_STATUS_CHANGED":
			if (status === "ACTIVE") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
			if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-600" />;
			return <AlertCircle className="h-4 w-4 text-gray-500" />;
		case "LOW_STOCK_ALERT":
			return <AlertTriangle className="h-4 w-4 text-orange-600" />;
		case "NEW_PRODUCT_SUBMITTED":
			return <Bell className="h-4 w-4 text-amber-600" />;
		case "PRODUCT_LOW_STOCK_DEACTIVATED":
			return <AlertTriangle className="h-4 w-4 text-orange-600" />;
		case "SELLER_APPROVED":
			return <CheckCircle2 className="h-4 w-4 text-green-600" />;
		case "SELLER_REJECTED":
			return <XCircle className="h-4 w-4 text-red-600" />;
		case "CULTURAL_APPROVAL":
			return <UserCheck className="h-4 w-4 text-green-600" />;
		case "PRODUCT_RECOMMENDATION":
			return <Star className="h-4 w-4 text-indigo-600" />;
		case "BANK_CHANGE_REQUESTED":
			return <Banknote className="h-4 w-4 text-orange-600" />;
		case "BANK_CHANGE_APPROVED":
			return <Banknote className="h-4 w-4 text-green-600" />;
		case "BANK_CHANGE_REJECTED":
			return <Banknote className="h-4 w-4 text-red-600" />;
		default:
			return <Bell className="h-4 w-4 text-gray-600" />;
	}
};

	export default function Topbar() {
		const [user, setUser] = useState<{ name: string; email: string; profileImage?: string } | null>(null);
		const [isLoading, setIsLoading] = useState(true);
		const [notifications, setNotifications] = useState<Notification[]>([]);
		const [unreadCount, setUnreadCount] = useState(0);
		const [notificationsLoading, setNotificationsLoading] = useState(false);
		const [role, setRole] = useState<string | null>(null);
		const router = useRouter();
		const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
		const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : null;

		// Derive role-aware dashboard paths
		const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";
		const settingsHref =
			isAdmin ? "/admindashboard/settings" :
			normalizedRole === "CUSTOMER" ? "/customerdashboard/settings" :
			"/sellerdashboard/settings";
		const profileHref =
			isAdmin ? "/admindashboard/profile" :
			normalizedRole === "CUSTOMER" ? "/customerdashboard/profile" :
			"/sellerdashboard/profile";
		const notificationsHref =
			isAdmin ? "/admindashboard/notifications" :
			normalizedRole === "CUSTOMER" ? "/customerdashboard/notifications" :
			"/sellerdashboard/notifications";

		const handleNotificationClick = async (notification: Notification) => {
			try {
				if (!notification.isRead) {
					await api.put(`/api/notifications/read/${notification.id}`);
					setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
					setUnreadCount(prev => Math.max(0, prev - 1));
				}
			} catch {
				// non-critical, proceed with navigation
			}
			const link = getNotificationDeepLink(notification, role);
			if (link) router.push(link);
		};

		// Poll badge count every 30 seconds (spec: unreadOnly=true for efficiency)
		const fetchBadgeCount = useCallback(async () => {
			try {
				const response = await api.get('/api/notifications?unreadOnly=true&limit=1');
				setUnreadCount(response?.unreadCount ?? 0);
			} catch {
				// non-critical — silent failure for background poll
			}
		}, []);

		// Fetch notifications for the dropdown (called on open)
		const fetchNotifications = async () => {
			try {
				setNotificationsLoading(true);
				const response = await api.get('/api/notifications?page=1&limit=10');
				setNotifications(response?.notifications || []);
				setUnreadCount(response?.unreadCount ?? 0);
			} catch (error) {
				console.error('Failed to fetch notifications:', error);
				setNotifications([]);
			} finally {
				setNotificationsLoading(false);
			}
		};

		// Fetch profile data from API
		const fetchProfileData = async () => {
			try {
				setIsLoading(true);
				// Set role from JWT early so navigation links are immediately correct
				const tokenForRole = localStorage.getItem("alpa_token");
				const decodedForRole = tokenForRole ? decodeJWT(tokenForRole) : null;
				type WithRole = { role?: string };
				const wr = (decodedForRole && typeof decodedForRole === 'object') ? decodedForRole as WithRole : {};
				if (typeof wr.role === 'string') setRole(wr.role);

				const data = await api.get('/api/profile');
				console.log('Profile API Response:', data); // Debug log
				
				const profile = data.profile || data;
				
				// Try different common field names for profile image
				const profileImageUrl = profile.profileImage || profile.profile_image || profile.avatar || profile.picture || profile.image || '';
				
				setUser({
					name: profile.name || 'Unknown User',
					email: profile.email || '',
					profileImage: profileImageUrl,
				});
			} catch (error) {
				console.error('Failed to fetch profile:', error);
				
				// Fallback to JWT data if API fails
				const token = localStorage.getItem("alpa_token");
				const decoded = token ? decodeJWT(token) : null;
				type WithRole = { role?: string };
				const wr = (decoded && typeof decoded === 'object') ? decoded as WithRole : {};
				if (typeof wr.role === 'string') setRole(wr.role);
				let name = "Unknown";
				let email = "";
				
				type Decoded = { name?: string; email?: string };
				const safeDecoded: Decoded = (decoded && typeof decoded === 'object') ? decoded as Decoded : {};
				
				if (typeof safeDecoded.name === 'string' && safeDecoded.name.trim() !== "") {
					name = safeDecoded.name;
				} else if (typeof safeDecoded.email === 'string') {
					name = safeDecoded.email;
				}
				
				if (typeof safeDecoded.email === 'string') {
					email = safeDecoded.email;
				}
				
				setUser({ name, email });
			} finally {
				setIsLoading(false);
			}
		};

		useEffect(() => {
			if (typeof window !== "undefined") {
				fetchProfileData();
				// Initial badge count fetch
				fetchBadgeCount();
				// Poll unread count every 30 seconds
				pollingIntervalRef.current = setInterval(fetchBadgeCount, 30_000);
			}
			return () => {
				if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
			};
		}, [fetchBadgeCount]);

		const handleLogout = () => {
			if (typeof window !== "undefined") {
				const token =
					localStorage.getItem("alpa_token") ||
					localStorage.getItem("auth_token");

				// 1. Clear Dashboard localStorage & sessionStorage immediately —
				//    do this BEFORE the backend call so a cold Render server
				//    (which can hang for 30 s+) never blocks the logout flow.
				localStorage.removeItem("alpa_token");
				localStorage.removeItem("auth_token");
				localStorage.removeItem("user_data");
				localStorage.removeItem("user");
				try { sessionStorage.clear(); } catch (_) { /* ignore */ }

				// 2. Clear Dashboard cookies
				document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
				document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
				document.cookie = "alpa_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

				// 3. Fire-and-forget backend token invalidation — no await so it
				//    never blocks the redirect regardless of server response time.
				fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://134.199.161.119:5000"}/api/auth/logout`,
					{
						method: "POST",
						credentials: "include",
						headers: {
							"Content-Type": "application/json",
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
					}
				).catch(() => { /* best-effort */ });

				// 4. Redirect to Webapp's logout-callback so it also clears its session.
				window.location.replace(
					"https://apla-fe.vercel.app/logout-callback?redirect=" +
					encodeURIComponent("https://apla-fe.vercel.app")
				);
			}
		};

		return (
			<div className="flex h-16 items-center justify-end border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">

				{/* Right Section */}
				<div className="flex items-center gap-3">
					{/* App Switcher */}
					{/* <AppSwitcher /> */}

					{/* Theme Toggle */}
					<ThemeToggle />

					{/* Notifications Dropdown */}
				<DropdownMenu onOpenChange={(open) => { if (open) fetchNotifications(); }}>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="relative h-9 w-9 hover:bg-muted transition-colors"
								aria-label="Notifications"
							>
								<Bell className="h-4 w-4" />
								{unreadCount > 0 && (
									<span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium leading-none">
										{unreadCount > 99 ? '99+' : unreadCount}
									</span>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-80 p-2" align="end" forceMount>
							<DropdownMenuLabel className="font-semibold p-3 flex items-center justify-between">
								<span>Notifications</span>
								{unreadCount > 0 && (
									<span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
										{unreadCount} new
									</span>
								)}
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							
							{notificationsLoading ? (
								<div className="p-4 text-center text-sm text-muted-foreground">
									Loading notifications...
								</div>
							) : notifications.length === 0 ? (
								<div className="p-4 text-center text-sm text-muted-foreground">
									<Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
									No new notifications
								</div>
							) : (
								<>
									{notifications.slice(0, 4).map((notification) => (
										<DropdownMenuItem 
											key={notification.id} 
											className="p-3 cursor-pointer hover:bg-muted rounded-md transition-colors"
											onClick={() => handleNotificationClick(notification)}
										>
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 mt-0.5">
													{getNotificationIcon(notification)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="font-medium text-sm line-clamp-1">
															{notification.title}
														</span>
														{!notification.isRead && (
															<span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
														)}
													</div>
													<p className="text-xs text-muted-foreground line-clamp-2 mt-1">
														{notification.message}
													</p>
													<div className="flex items-center justify-between mt-2">
														<span className="text-xs text-muted-foreground">
															{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
														</span>
														{notification.metadata?.totalAmount && (
															<span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
																${notification.metadata.totalAmount}
															</span>
														)}
													</div>
												</div>
											</div>
										</DropdownMenuItem>
									))}
								</>
							)}
							
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer text-primary hover:bg-muted rounded-md transition-colors p-0">
                                                                <Link href={notificationsHref} className="flex items-center w-full p-3 gap-2 justify-center font-medium">View all notifications</Link>
                                                        </DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Profile */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="relative h-9 w-9 rounded-full hover:bg-muted transition-colors"
								disabled={isLoading}
							>
								<Avatar className="h-8 w-8 ring-2 ring-background">
									<AvatarImage src={user?.profileImage || "/avatar.png"} alt={user?.name || "User"} />
									<AvatarFallback className="bg-primary text-primary-foreground font-semibold">
										{isLoading ? "..." : (user?.name ? user.name.split(" ").map(n => n[0]).join("") : "UN")}
									</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-64 p-2" align="end" forceMount>
							<DropdownMenuLabel className="font-normal p-3">
								<div className="flex items-center gap-3">
									<Avatar className="h-10 w-10">
										<AvatarImage src={user?.profileImage || "/avatar.png"} alt={user?.name || "User"} />
										<AvatarFallback className="bg-primary text-primary-foreground">
											{isLoading ? "..." : (user?.name ? user.name.split(" ").map(n => n[0]).join("") : "UN")}
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium leading-none">
											{isLoading ? "Loading..." : (user?.name || "Unknown")}
										</p>
										<p className="text-xs leading-none text-muted-foreground">
											{isLoading ? "..." : (user?.email || "")}
										</p>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator className="my-2" />
							<DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-md transition-colors">
							<Link href={profileHref} className="flex items-center gap-2 w-full">
								<User className="h-4 w-4" /> Profile
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-md transition-colors">
							<Link href={settingsHref} className="flex items-center gap-2 w-full">
									<Settings className="h-4 w-4" /> Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator className="my-2" />
							<DropdownMenuItem
								className="p-3 cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors"
								onClick={handleLogout}
							>
								<span className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Log out</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		);
	}
// ...existing code ends here

// (Removed duplicate Topbar function declaration)



