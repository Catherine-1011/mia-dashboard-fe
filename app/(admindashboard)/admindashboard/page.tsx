"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Activity,
	CreditCard,
	DollarSign,
	Users,
	ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UserListCard from "./users/UserListCard";

// Default stats configuration - will be replaced with real analytics data
const defaultStats = [
	{
		title: "Total Revenue",
		value: "$0.00",
		icon: DollarSign,
		description: "Total revenue from all orders",
		trend: "up",
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
	},
	{
		title: "Total Orders",
		value: "0",
		icon: CreditCard,
		description: "Total number of orders",
		trend: "up",
		color: "text-purple-600",
		bgColor: "bg-purple-50",
	},
	{
		title: "Items Sold",
		value: "0",
		icon: Activity,
		description: "Total items sold",
		trend: "up",
		color: "text-orange-600",
		bgColor: "bg-orange-50",
	},
	{
		title: "Avg Order Value",
		value: "$0.00",
		icon: DollarSign,
		description: "Average order value",
		trend: "up",
		color: "text-blue-600",
		bgColor: "bg-blue-50",
	},
];

// Utility to get token from cookie if not in localStorage
function getTokenFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )alpa_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function DashboardPage() {
	const router = useRouter();
	const [checking, setChecking] = useState(true);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [slaData, setSlaData] = useState<any>(null);
	const [loadingSla, setLoadingSla] = useState(false);
	const [sellers, setSellers] = useState<any[]>([]);
	const [selectedSeller, setSelectedSeller] = useState<string>("");
	const [loadingSellers, setLoadingSellers] = useState(false);
	const [analytics, setAnalytics] = useState<any>(null);
	const [loadingAnalytics, setLoadingAnalytics] = useState(false);
	const [stats, setStats] = useState(defaultStats);

	// Function to fetch sellers list for SLA Dashboard
	const fetchSellers = async () => {
		setLoadingSellers(true);
		try {
			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");
			
			console.log("🔍 Fetching sellers with token:", token ? `${token.slice(0, 20)}...` : "NO TOKEN");
			
			const url = `${process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com"}/api/users/all`;
			console.log("📍 API URL:", url);
			
			// Use fetch directly with better error handling
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					...(token && { "Authorization": `Bearer ${token}` }),
				},
				credentials: "include",
			});
			
			console.log("📊 Response Status:", response.status, response.statusText);
			console.log("📊 Response Headers:", {
				contentType: response.headers.get("content-type"),
			});
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ API Error Response:", errorText);
				throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorText}`);
			}
			
			const data = await response.json();
			console.log("✅ API /api/users/all Response:", data);
			console.log("✅ Response type:", typeof data, "Is Array:", Array.isArray(data));
			
			// Handle different response structures
			let allUsers = [];
			
			if (Array.isArray(data)) {
				// Response is directly an array
				console.log("📦 Response is a direct array");
				allUsers = data;
			} else if (data.users && Array.isArray(data.users)) {
				// Response has a 'users' property
				console.log("📦 Response has .users property");
				allUsers = data.users;
			} else if (data.data && Array.isArray(data.data)) {
				// Response has a 'data' property
				console.log("📦 Response has .data property");
				allUsers = data.data;
			} else if (data.result && Array.isArray(data.result)) {
				// Response has a 'result' property
				console.log("📦 Response has .result property");
				allUsers = data.result;
			} else {
				console.warn("⚠️ Unexpected API response structure:", data);
				allUsers = [];
			}
			
			// Filter for sellers only
			const sellersOnly = allUsers.filter((u: any) => 
				u.role === "SELLER" || u.role === "seller" || u.userRole === "SELLER" || u.userRole === "seller"
			);
			
			console.log(`✅ Total users: ${allUsers.length}, Sellers: ${sellersOnly.length}`, sellersOnly);
			setSellers(sellersOnly);
			
			// Auto-select first seller if available
			if (sellersOnly.length > 0) {
				setSelectedSeller(sellersOnly[0].id);
				toast.success(`Loaded ${sellersOnly.length} seller(s)`);
			} else {
				setSelectedSeller("");
				toast.info("No sellers found in the system");
			}
		} catch (err: any) {
			console.error("❌ Error fetching sellers:", err);
			console.error("❌ Error message:", err?.message);
			console.error("❌ Error stack:", err?.stack);
			toast.error(err?.message || "Failed to load sellers");
			setSellers([]);
			setSelectedSeller("");
		} finally {
			setLoadingSellers(false);
		}
	};

	// Function to fetch notifications for selected seller
	const fetchSlaData = async (sellerId: string) => {
		if (!sellerId) {
			setSlaData(null);
			return;
		}
		
		setLoadingSla(true);
		try {
			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");
			
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com"}/api/seller/notifications?sellerId=${sellerId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						...(token && { "Authorization": `Bearer ${token}` }),
					},
					credentials: "include",
				}
			);
			
			if (!response.ok) {
				throw new Error(`Failed to fetch SLA data: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log(`SLA data for seller ${sellerId}:`, data);
			
			setSlaData(data);
			
			// Show success message if notifications exist
			if (data?.notifications?.length > 0) {
				console.log(`Loaded ${data.notifications.length} notifications`);
			}
		} catch (error: any) {
			console.error("Failed to fetch SLA data:", error);
			toast.error(error?.message || "Failed to fetch SLA data");
			
			// Set empty state on error
			setSlaData({
				success: false,
				notifications: [],
				summary: {
					total: 0,
					pending: 0,
					overdue: 0,
					critical: 0
				}
			});
		} finally {
			setLoadingSla(false);
		}
	};

	// Function to fetch analytics data
	const fetchAnalytics = async () => {
		setLoadingAnalytics(true);
		try {
			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");
			
			if (!token) {
				throw new Error("No authentication token found");
			}
			
			console.log("🔍 Fetching analytics with token:", token ? `${token.slice(0, 20)}...` : "NO TOKEN");
			
			const url = `${process.env.NEXT_PUBLIC_API_URL || "https://alpa-be.onrender.com"}/api/admin/sales/analytics`;
			console.log("📍 Analytics API URL:", url);
			
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					...(token && { "Authorization": `Bearer ${token}` }),
				},
				credentials: "include",
			});
			
			console.log("📊 Analytics Response Status:", response.status, response.statusText);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ Analytics API Error:", errorText);
				throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log("✅ Analytics Data:", data);
			
			if (data.success && data.analytics) {
				const analyticsData = data.analytics;
				
				// Update stats with real analytics data
				const updatedStats = [
					{
						...defaultStats[0],
						value: `$${parseFloat(analyticsData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  
						description: "Total revenue from all orders",
					},
					{
						...defaultStats[1],
						value: analyticsData.totalOrders.toLocaleString('en-US'),
						description: "Total number of orders",
					},
					{
						...defaultStats[2],
						value: analyticsData.totalItemsSold.toLocaleString('en-US'),
						description: "Total items sold",
					},
					{
						...defaultStats[3],
						value: `$${parseFloat(analyticsData.averageOrderValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  
						description: "Average order value",
					},
				];
				
				setStats(updatedStats);
				setAnalytics(analyticsData);
				toast.success("Analytics data loaded successfully");
			} else {
				throw new Error("Invalid analytics response structure");
			}
		} catch (error: any) {
			console.error("❌ Error fetching analytics:", error);
			toast.error(error?.message || "Failed to fetch analytics");
			setAnalytics(null);
		} finally {
			setLoadingAnalytics(false);
		}
	};

	// Initial auth check
	useEffect(() => {
		const checkAuth = async () => {
			if (typeof window === "undefined") {
				setChecking(false);
				return;
			}
			
			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");
			
			if (!token) {
				console.log("No token found, redirecting to login");
				toast.error("Please login to continue");
				setChecking(false);
				setTimeout(() => router.push("/login"), 300);
				return;
			}
			
			try {
				// Validate token format (JWT has 3 parts)
				const parts = token.split(".");
				if (parts.length !== 3) {
					throw new Error("Invalid token format");
				}
				
				const payload = JSON.parse(atob(parts[1]));
				console.log("User payload:", payload);
				
				// Check if token is expired
				if (payload.exp && payload.exp * 1000 < Date.now()) {
					console.warn("Token expired");
					localStorage.removeItem("alpa_token");
					localStorage.removeItem("auth_token");
					toast.error("Session expired. Please login again.");
					setChecking(false);
					setTimeout(() => router.push("/login"), 300);
					return;
				}
				
				// Check user role - be flexible with case and whitespace
				const userRole = payload.role?.toLowerCase()?.trim();
				console.log(`User role from token: "${userRole}"`);
				
				setUserRole(payload.role);
				
				// Only allow admin access
				const isAdmin = userRole?.includes("admin");
				
				if (!isAdmin) {
					console.error(`Access denied: user role is "${userRole}", admin required`);
					toast.error(`Unauthorized - Admin access required. Your role: ${payload.role}`);
					setChecking(false);
					setTimeout(() => router.push("/sellerdashboard"), 300);
					return;
				}
				
				console.log("User is admin, fetching sellers");
				// Fetch sellers and analytics
				await fetchSellers();
				await fetchAnalytics();
				setChecking(false);
			} catch (e) {
				console.error("Token validation error:", e);
				localStorage.removeItem("alpa_token");
				localStorage.removeItem("auth_token");
				toast.error("Invalid session. Please login again.");
				setChecking(false);
				setTimeout(() => router.push("/login"), 300);
			}
		};
		
		checkAuth();
	}, [router]);

	// Fetch SLA data when seller is selected
	useEffect(() => {
		if (selectedSeller && userRole?.toLowerCase()?.includes("admin")) {
			console.log(`Selected seller changed to: ${selectedSeller}`);
			fetchSlaData(selectedSeller);
		}
	}, [selectedSeller, userRole]);

	// Handle seller selection change
	const handleSellerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newSellerId = e.target.value;
		console.log(`Seller selection changed to: ${newSellerId}`);
		setSelectedSeller(newSellerId);
	};


	// Skeleton loader for the whole page
	function renderSkeletonPage() {
		return (
			<div className="space-y-8 animate-pulse">
				{/* Header Skeleton */}
				<div className="flex flex-col gap-2">
					<div className="h-10 w-1/3 bg-muted rounded mb-2" />
					<div className="h-6 w-1/2 bg-muted/60 rounded" />
				</div>

				{/* Stats Grid Skeleton */}
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="p-4 rounded-lg border bg-card flex flex-col gap-3">
							<div className="flex flex-row items-center justify-between">
								<div className="h-4 w-20 bg-muted rounded" />
								<div className="h-8 w-8 bg-muted/60 rounded-lg" />
							</div>
							<div className="h-8 w-2/3 bg-muted rounded" />
							<div className="h-4 w-1/2 bg-muted/60 rounded" />
						</div>
					))}
				</div>

				{/* SLA Dashboard and User List Skeletons */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* SLA Dashboard Card Skeleton */}
					<div className="p-6 rounded-lg border bg-card flex flex-col gap-4">
						<div className="h-6 w-1/3 bg-muted rounded mb-2" />
						<div className="h-4 w-1/4 bg-muted/60 rounded mb-4" />
						<div className="flex items-center gap-2 mb-4">
							<div className="h-8 w-32 bg-muted/60 rounded" />
							<div className="h-8 w-40 bg-muted/60 rounded" />
						</div>
						{/* Summary Stats Skeleton */}
						<div className="grid grid-cols-2 gap-4">
							{[...Array(4)].map((_, i) => (
								<div key={i} className="p-4 rounded-lg border bg-muted/40 flex flex-col gap-2">
									<div className="h-4 w-1/2 bg-muted rounded" />
									<div className="h-6 w-1/3 bg-muted/60 rounded" />
								</div>
							))}
						</div>
						{/* Notifications List Skeleton */}
						<div className="space-y-2 mt-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40">
									<div className="w-2 h-2 rounded-full mt-2 bg-muted" />
									<div className="flex-1 min-w-0">
										<div className="h-4 w-2/3 bg-muted rounded mb-2" />
										<div className="h-3 w-1/2 bg-muted/60 rounded mb-1" />
										<div className="flex gap-2 mt-2">
											<div className="h-3 w-12 bg-muted/60 rounded" />
											<div className="h-3 w-10 bg-muted/60 rounded" />
										</div>
									</div>
									<div className="h-3 w-10 bg-muted/60 rounded mt-2" />
								</div>
							))}
						</div>
					</div>
					{/* User List Card Skeleton */}
					<div className="p-6 rounded-lg border bg-card flex flex-col gap-4">
						<div className="h-6 w-1/3 bg-muted rounded mb-2" />
						{[...Array(5)].map((_, i) => (
							<div key={i} className="h-4 w-full bg-muted/60 rounded mb-2" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (checking || loadingSellers || loadingAnalytics) {
		return renderSkeletonPage();
	}

	return (
		<div className="space-y-8">
			{/* Header Section */}
			<div className="flex flex-col gap-2">
				<h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground text-lg">
					Welcome back! Here&apos;s an overview of your data.
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				{stats.map((stat) => {
					const Icon = stat.icon;

					return (
						<Card
							key={stat.title}
							className="group hover:shadow-lg transition-all duration-200"
						>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									{stat.title}
								</CardTitle>
								<div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
									<Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="text-3xl font-bold mb-2">{stat.value}</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{stat.description}
								</p>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Order Status Breakdown and Top Products */}
			{/* <div className="grid gap-6 lg:grid-cols-2">
				
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Order Status Breakdown
						</CardTitle>
						<p className="text-muted-foreground text-sm mt-1">
							Distribution of orders by status
						</p>
					</CardHeader>
					<CardContent>
						{analytics?.statusBreakdown ? (
							<div className="space-y-3">
								{Object.entries(analytics.statusBreakdown).map(([status, count]: [string, any]) => (
									<div key={status} className="flex items-center justify-between">
										<span className="text-sm font-medium text-gray-700">{status}</span>
										<div className="flex items-center gap-3">
											<div className="w-32 bg-gray-200 rounded-full h-2">
												<div 
													className="bg-blue-600 h-2 rounded-full" 
													style={{
														width: `${analytics.totalOrders > 0 ? (count / analytics.totalOrders) * 100 : 0}%`
													}}
												/>
											</div>
											<span className="text-sm font-bold text-gray-800 w-12 text-right">{count}</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p>No order data available</p>
							</div>
						)}
					</CardContent>
				</Card>

				
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Top Products
						</CardTitle>
						<p className="text-muted-foreground text-sm mt-1">
							Best performing products by revenue
						</p>
					</CardHeader>
					<CardContent>
						{analytics?.topProducts && analytics.topProducts.length > 0 ? (
							<div className="space-y-3">
								{analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
									<div key={product.productId} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
										<div className="text-lg font-bold text-gray-400 w-6 flex-shrink-0">
											{index + 1}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-800 text-sm truncate">
												{product.title}
											</p>
											<div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
												<span>Qty: {product.quantity}</span>
												<span>•</span>
												<span className="text-green-600 font-semibold">
													${parseFloat(product.revenue).toFixed(2)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p>No product data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div> */}

			{/* Additional Content Sections */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* SLA Dashboard Card */}
				<Card>
					<CardHeader>
                        <div>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<CardTitle className="text-xl font-semibold">
									SLA Dashboard for Sellers
								</CardTitle>
								{/* <p className="text-muted-foreground mt-1">
									Service Level Agreement monitoring
								</p> */}
							</div>
							<div className="flex items-center gap-2 ml-4">
								<span className="text-sm text-muted-foreground whitespace-nowrap">
									Select Seller:

								</span>
								<div className="relative">
									<select
										value={selectedSeller}
										onChange={handleSellerChange}
										disabled={loadingSellers || sellers.length === 0}
										className="min-w-[200px] px-3 py-2 pr-8 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
									>
										<option value="">
											{loadingSellers 
												? "Loading sellers..." 
												: sellers.length === 0 
													? "No sellers available" 
													: "Choose a seller"}
										</option>
										{sellers.map((seller) => (
											<option key={seller.id} value={seller.id}>
												{seller.name || seller.email || `Seller ${seller.id.slice(0, 8)}`}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-muted-foreground" />
								</div>
								{/* <div className="text-xs text-muted-foreground whitespace-nowrap">
									({sellers.length} {sellers.length === 1 ? 'seller' : 'sellers'})
								</div> */}
							</div>
						</div>
                        
                        </div>
					</CardHeader>
					<CardContent className="space-y-4">
						{loadingSellers ? (
							<div className="flex items-center justify-center p-8">
								<div className="text-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
									<span className="text-muted-foreground">Loading sellers...</span>
								</div>
							</div>
						) : !selectedSeller ? (
							<div className="flex items-center justify-center p-8">
								<div className="text-center">
									<Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
									<span className="text-muted-foreground">
										{sellers.length === 0 
											? "No sellers found. Please add sellers first." 
											: "Please select a seller to view SLA data"}
									</span>
								</div>
							</div>
						) : loadingSla ? (
							<div className="animate-pulse space-y-4">
								{/* Summary Stats Skeleton */}
								<div className="grid grid-cols-2 gap-4">
									{[...Array(4)].map((_, i) => (
										<div key={i} className="p-4 rounded-lg border bg-muted/40 flex flex-col gap-2">
											<div className="h-4 w-1/2 bg-muted rounded" />
											<div className="h-6 w-1/3 bg-muted/60 rounded" />
										</div>
									))}
								</div>
								{/* Notifications List Skeleton */}
								<div className="space-y-2">
									<div className="h-4 w-32 bg-muted rounded" />
									<div className="space-y-2">
										{[...Array(3)].map((_, i) => (
											<div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40">
												<div className="w-2 h-2 rounded-full mt-2 bg-muted" />
												<div className="flex-1 min-w-0">
													<div className="h-4 w-2/3 bg-muted rounded mb-2" />
													<div className="h-3 w-1/2 bg-muted/60 rounded mb-1" />
													<div className="flex gap-2 mt-2">
														<div className="h-3 w-12 bg-muted/60 rounded" />
														<div className="h-3 w-10 bg-muted/60 rounded" />
													</div>
												</div>
												<div className="h-3 w-10 bg-muted/60 rounded mt-2" />
											</div>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{/* Summary Stats */}
								<div className="grid grid-cols-2 gap-4">
								<div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
									<p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Notifications</p>
									<p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
										{slaData?.summary?.total || 0}
									</p>
								</div>
								<div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 dark:border-green-900">
									<p className="text-sm font-medium text-green-600 dark:text-green-400">Pending</p>
									<p className="text-2xl font-bold text-green-700 dark:text-green-300">
											{slaData?.summary?.pending || 0}
										</p>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
								<div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/30 dark:border-red-900">
									<p className="text-sm font-medium text-red-600 dark:text-red-400">Overdue</p>
									<p className="text-2xl font-bold text-red-700 dark:text-red-300">
										{slaData?.summary?.overdue || 0}
									</p>
								</div>
								<div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900">
									<p className="text-sm font-medium text-orange-600 dark:text-orange-400">Critical</p>
									<p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
											{slaData?.summary?.critical || 0}
										</p>
									</div>
								</div>

								{/* Notifications List */}
								<div className="space-y-2">
									<p className="font-medium text-foreground">Recent Notifications</p>
									<div className="max-h-64 overflow-y-auto space-y-2 pr-2 pb-1" style={{ scrollbarGutter: "stable" }}>
										{slaData?.notifications?.length > 0 ? (
											slaData.notifications.map((notification: any) => {
												const isHighPriority = notification.priority === "HIGH";
												const isOverdue = notification.isOverdue;
												const badgeColor = isOverdue ? "bg-red-500" : isHighPriority ? "bg-orange-500" : "bg-blue-500";
												const bgColor = isOverdue
											? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
											: isHighPriority
												? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
												: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30";
												
												return (
													<div 
														key={notification.id} 
														className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
														onClick={() => notification.order?.id && router.push(`/admindashboard/orders?highlight=${notification.order.id}&tab=all`)}
													>
														<div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${badgeColor}`} />
														<div className="flex-1 min-w-0">
															<div className="flex items-start justify-between gap-2">
																<div className="flex-1 min-w-0">
																<p className="font-medium text-foreground text-sm">
																	{notification.message}
																</p>
																{notification.notes && (
																	<p className="text-xs text-muted-foreground mt-1">
																		{notification.notes}
																	</p>
																)}
																<div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
																		{notification.order?.customerName && (
																			<span className="truncate">
																				Order: {notification.order.customerName}
																			</span>
																		)}
																		<span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
																		notification.slaIndicator === 'GREEN'
																			? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
																			: notification.slaIndicator === 'YELLOW'
																				? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
																				: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
																		}`}>
																			{notification.slaIndicator}
																		</span>
																		<span className="whitespace-nowrap">
																			{notification.timeRemaining 
																				? `${notification.timeRemaining.toFixed(1)}h remaining` 
																				: 'Time elapsed'}
																		</span>
																	</div>
																</div>
																<div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
																	{new Date(notification.createdAt).toLocaleDateString('en-GB')}
																</div>
															</div>
														</div>
													</div>
												);
											})
										) : (
										<div className="text-center py-8 text-muted-foreground">
												<Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
												<p>No notifications found for this seller</p>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				   {/* User List Card */}
				   <UserListCard />
			</div>
		</div>
	);
}
