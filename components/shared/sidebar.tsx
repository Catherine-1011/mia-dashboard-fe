"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { decodeJWT } from "@/lib/jwt";
import {
	LayoutDashboard,
	Settings,
	Users,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	Heart,
	MessageSquare,
	User,
	Store,
	Package,
	Tag,
	Ticket,
	Truck,
	Percent,
	ShoppingCart,
	ClipboardList,
	Bell,
	Wallet,
	Banknote,
	RotateCcw,
	Coins,
	Headset,
	Calculator,
	FileText,
	Mail,
	ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Admin navigation ────────────────────────────────────────────────────────
const adminSidebarItems = [
	{ title: "Dashboard",   href: "/admindashboard",              icon: LayoutDashboard, badge: null },
	{ title: "Analytics",   href: "/admindashboard/analytics",    icon: BarChart3,       badge: "New" },
	{ title: "Orders",      href: "/admindashboard/orders",       icon: ShoppingCart,    badge: null },
	{ title: "Products",    href: "/admindashboard/products",             icon: Package,  badge: null },
	{ title: "Categories",  href: "/admindashboard/categories",          icon: Tag,      badge: null },
	{ title: "Sellers",     href: "/admindashboard/sellers",                          icon: Store,     badge: null },
	{ title: "Bank Requests", href: "/admindashboard/sellers/bank-change-requests",  icon: Banknote,  badge: null },
	{ title: "Customers",   href: "/admindashboard/customers",                        icon: Users,     badge: null },
	{ title: "Coupons",     href: "/admindashboard/coupon",       icon: Ticket,          badge: null },
	{ title: "Refunds",     href: "/admindashboard/refund",       icon: RotateCcw,       badge: null },
	{ title: "Shipping",    href: "/admindashboard/shipping",     icon: Truck,           badge: null },
	{ title: "GST",         href: "/admindashboard/gst",          icon: Percent,         badge: null },
	{ title: "Commissions", href: "/admindashboard/commissions",  icon: Coins,           badge: null },
	{ title: "Feedback",    href: "/admindashboard/feedback",     icon: MessageSquare,   badge: null },
	{ title: "Sponsored",   href: "/admindashboard/sponsored",    icon: Heart,           badge: null },
	{ title: "Support",     href: "/admindashboard/support",      icon: Headset,         badge: null },
	{ title: "GST Reconciliation", href: "/admindashboard/gst-reconciliation", icon: Calculator, badge: null },
	{ title: "Profile",        href: "/admindashboard/profile",        icon: User,            badge: null },
	{ title: "Blogs",     href: "/admindashboard/blogs",      icon: FileText,        badge: null },
	{ title: "Newsletter", href: "/admindashboard/newsletter", icon: Mail,            badge: null },
	
	{ title: "Admin Users",    href: "/admindashboard/admin-users",   icon: ShieldAlert,     badge: null },
	{ title: "Notifications",  href: "/admindashboard/notifications", icon: Bell,            badge: null },
	{ title: "Settings",       href: "/admindashboard/settings",      icon: Settings,        badge: null },
];

// ─── Seller navigation ────────────────────────────────────────────────────────
const sellerSidebarItems = [
	{ title: "Dashboard",  href: "/sellerdashboard",            icon: LayoutDashboard, badge: null },
	{ title: "Analytics",  href: "/sellerdashboard/analytics",  icon: BarChart3,       badge: "New" },
	{ title: "Orders",     href: "/sellerdashboard/orders",     icon: ShoppingCart,    badge: null },
	{ title: "Products",   href: "/sellerdashboard/products",   icon: Package,         badge: null },
	{ title: "Categories", href: "/sellerdashboard/categories", icon: Tag,             badge: null },
	{ title: "Coupons",     href: "/sellerdashboard/coupons",       icon: Ticket,          badge: null },
	{ title: "Refunds",    href: "/sellerdashboard/refund",     icon: RotateCcw,       badge: null },
	{ title: "Earnings",   href: "/sellerdashboard/earnings",   icon: Wallet,          badge: null },
	{ title: "Profile",       href: "/sellerdashboard/profile",        icon: User,    badge: null },
	{ title: "Notifications", href: "/sellerdashboard/notifications",  icon: Bell,    badge: null },
	{ title: "Settings",      href: "/sellerdashboard/settings",       icon: Settings, badge: null },
];

// ─── Customer navigation ──────────────────────────────────────────────────────
const customerSidebarItems = [
	{ title: "Dashboard",   href: "/customerdashboard",           icon: LayoutDashboard, badge: null },
	{ title: "My Orders",   href: "/customerdashboard/orders",    icon: ClipboardList, badge: null },
	// { title: "My Wishlist", href: "/customerdashboard/wishlist",  icon: Heart,         badge: null },
	{ title: "My Wishlist", href: "/customerdashboard/wishlists",  icon: Heart,         badge: null },
	
	
	{ title: "Profile",        href: "/customerdashboard/profile",        icon: User,         badge: null },
	{ title: "Notifications",  href: "/customerdashboard/notifications",  icon: Bell,         badge: null },
	{ title: "Settings",       href: "/customerdashboard/settings",       icon: Settings,     badge: null },
];

interface SidebarProps {
	onMobileClose?: () => void;
	isCollapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onMobileClose, isCollapsed: controlledCollapsed, onCollapsedChange }: SidebarProps) {
	const pathname = usePathname();
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const [role, setRole] = useState<string | null>(null);

	const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

	const toggleCollapsed = () => {
		const next = !isCollapsed;
		if (onCollapsedChange) onCollapsedChange(next);
		else setInternalCollapsed(next);
	};

	useEffect(() => {
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("alpa_token");
			const decoded = token ? decodeJWT(token) : null;
			const detectedRole = typeof decoded?.role === 'string' ? decoded.role : null;
			
			console.log("[Sidebar] Role detection:", {
				hasToken: !!token,
				decoded: decoded,
				detectedRole: detectedRole,
				pathname: pathname
			});
			
			setRole(detectedRole);
		}
	}, []);

	const handleLinkClick = () => {
		if (onMobileClose) {
			onMobileClose();
		}
	};

	// Select navigation items based on role
	const roleItems =
		(role === "ADMIN" || role === "SUPER_ADMIN") ? adminSidebarItems    :
		role === "SELLER"                            ? sellerSidebarItems   :
		role === "CUSTOMER"                          ? customerSidebarItems :
		[];

	const sidebarGroups: { title?: string; items: typeof roleItems }[] = [{ items: roleItems }];

	return (
		<div
			className={cn(
				"flex h-full flex-col border-r bg-card shadow-sm transition-all duration-300",
				isCollapsed ? "w-16" : "w-72",
			)}
		>
			{/* Logo */}
			<div className={cn("flex h-16 items-center border-b justify-between", isCollapsed ? "px-2 justify-center" : "px-6")}>
				{!isCollapsed && (
					<div className="flex items-center py-4 gap-3 group">
						<img src="/navbarLogo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-primary p-1" />
						<span className="text-xl font-bold group-hover:text-primary transition-colors">
							Dashboard
						</span>
					</div>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 hover:bg-muted flex-shrink-0"
					onClick={toggleCollapsed}
				>
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronLeft className="h-4 w-4" />
					)}
				</Button>
			</div>


			{/* Navigation Groups (Scrollable) */}
		<nav className={cn(
			"flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent",
			isCollapsed ? "px-2 py-4 space-y-1" : "px-4 py-4 space-y-1"
		)}>
{sidebarGroups.map((group, idx) =>
				group.items.length > 0 ? (
					<div key={group.title ?? idx} className="space-y-1">
						{/* Group Title — only rendered when a title exists */}
						{!isCollapsed && group.title && (
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">
									{group.title}
								</h3>
							)}

							{/* Group Items */}
							<div className="space-y-2">
								{group.items.map((item) => {
									const isActive = pathname === item.href;
									const Icon = item.icon;

									return (
										<Link
											key={item.href}
											href={item.href}
											onClick={handleLinkClick}
											className={cn(
												"group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-muted",
												isActive
													? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
													: "text-muted-foreground hover:text-foreground",
												isCollapsed && "justify-center px-3 py-4",
											)}
											title={isCollapsed ? item.title : undefined}
										>
											<Icon
												className={cn(
													"transition-all duration-200",
													isCollapsed ? "h-5 w-5" : "h-4 w-4",
													isActive && !isCollapsed && "text-primary-foreground",
												)}
											/>
											{!isCollapsed && (
												<span className="group-hover:translate-x-0.5 transition-transform duration-200">
													{item.title}
												</span>
											)}
										</Link>
									);
								})}
							</div>
						</div>
					) : null
				)}
			</nav>

			{/* Role Indicator at Bottom */}
			<div className="border-t p-4 mt-auto flex items-center justify-center">
				{!isCollapsed && (
					<span className="text-xs text-muted-foreground">
						{role ? `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}` : "Role: Unknown"}
					</span>
				)}
				{isCollapsed && (
					<span className="text-xs font-bold text-muted-foreground">
						{role ? role.charAt(0).toUpperCase() : "?"}
					</span>
				)}
			</div>
		</div>
	);
}
