"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp, Download, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

// Add to window for timeout management
declare global {
	interface Window {
		dateChangeTimeout?: NodeJS.Timeout;
	}
}

interface AnalyticsData {
	totalRevenue: string;
	totalOrders: number;
	totalItemsSold: number;
	averageOrderValue: string;
	statusBreakdown: Record<string, number>;
	topProducts: Array<{
		productId: string;
		title: string;
		quantity: number;
		revenue: number;
	}>;
	period: {
		startDate: string;
		endDate: string;
	};
}

interface DayData {
	date: string;
	revenue: number;
	orders: number;
}

const AnalyticsPage = () => {
	const router = useRouter();
	const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [dayData, setDayData] = useState<DayData[]>([]);
	const [customDateRange, setCustomDateRange] = useState({
		startDate: "",
		endDate: ""
	});
	const [defaultDateRange, setDefaultDateRange] = useState({
		startDate: "",
		endDate: ""
	});
	const [chartLoading, setChartLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [exporting, setExporting] = useState(false);

	// Function to calculate default date range (last 30 days)
	const getDefaultDateRange = useCallback(() => {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - 30);
		
		return {
			startDate: startDate.toISOString().split('T')[0],
			endDate: endDate.toISOString().split('T')[0]
		};
	}, []);

	// Function to fetch analytics data with date range
	const fetchAnalytics = async (startDate?: string, endDate?: string) => {
		setRefreshing(true);
		try {
			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");

			if (!token) {
				throw new Error("No authentication token found");
			}

			// Build URL with optional date parameters
			let url = `${process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au"}/api/admin/sales/analytics`;
			const params = new URLSearchParams();
			
			if (startDate) params.append('startDate', startDate);
			if (endDate) params.append('endDate', endDate);
			
			if (params.toString()) {
				url += `?${params.toString()}`;
			}

			console.log("🔍 Fetching analytics with URL:", url);

			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					...(token && { Authorization: `Bearer ${token}` }),
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
					// Validate analytics data
					if (typeof data.analytics.totalRevenue !== 'string' && typeof data.analytics.totalRevenue !== 'number') {
						console.warn('⚠️ Total revenue format unexpected:', data.analytics.totalRevenue);
					}
					
					setAnalytics(data.analytics);
					console.log('✅ Analytics data processed:', {
						totalRevenue: data.analytics.totalRevenue,
						totalOrders: data.analytics.totalOrders,
						aveOrderValue: data.analytics.averageOrderValue,
						dateRange: `${startDate || 'default'} to ${endDate || 'default'}`
					});
					toast.success("Analytics data loaded successfully");
			} else {
				throw new Error("Invalid analytics response structure");
			}
		} catch (error: any) {
			console.error("❌ Error fetching analytics:", error);
			toast.error(error?.message || "Failed to fetch analytics");
			setAnalytics(null);
		} finally {
			setRefreshing(false);
		}
	};

	// Fetch chart data with date range
	const fetchChartData = useCallback(async (startDate?: string, endDate?: string) => {
		setChartLoading(true);
		try {
			// Build URL with optional date parameters  
			let endpoint = `/api/admin/analytics/revenue-chart`;
			const params = new URLSearchParams();
			
			if (startDate) params.append('startDate', startDate);
			if (endDate) params.append('endDate', endDate);
			
			if (params.toString()) {
				endpoint += `?${params.toString()}`;
			}
			
			console.log("📊 Fetching chart data:", `${process.env.NEXT_PUBLIC_API_URL || "backend.madeinarnhemland.com.au"}${endpoint}`);

			const json = await api.get(endpoint);

			if (json?.success && Array.isArray(json.data)) {
				const rawData = json.data;
				
				// Validate chart data
				if (rawData.length === 0) {
					console.warn('⚠️ No chart data returned for date range');
					setDayData([]);
					return;
				}
				
				// Format chart data for display
				const formatted: DayData[] = rawData.map((entry: { date: string; revenue: number; orders: number }) => {
					// Validate entry data
					const revenue = typeof entry.revenue === 'number' ? entry.revenue : parseFloat(entry.revenue || '0');
					const orders = typeof entry.orders === 'number' ? entry.orders : parseInt(entry.orders || '0');
					
					return {
						date: new Date(entry.date + "T00:00:00").toLocaleDateString(
							"en-US",
							{ month: "short", day: "numeric" }
						),
						revenue,
						orders,
					};
				});
				
				setDayData(formatted);
				
				// Log chart data summary for debugging
				const totalChartRevenue = formatted.reduce((sum, day) => sum + day.revenue, 0);
				console.log(`✅ Loaded ${rawData.length} days of chart data. Total revenue: $${totalChartRevenue.toFixed(2)}`, formatted);
			} else {
				throw new Error("Invalid chart response structure");
			}
		} catch (error) {
			console.error("Failed to fetch chart data:", error);
			toast.error("Failed to load chart data");
		} finally {
			setChartLoading(false);
		}
	}, []);

	// Clear filters function
	const clearFilters = useCallback(async () => {
		setCustomDateRange({ startDate: "", endDate: "" });
		
		// Clear any existing timeouts
		if (window.dateChangeTimeout) {
			clearTimeout(window.dateChangeTimeout);
		}
		
		console.log('🗎️ Clearing filters and fetching default data (last 30 days)');
		try {
			await Promise.all([
				fetchAnalytics(),
				fetchChartData()
			]);
			toast.success("Filters cleared, showing default data");
		} catch (error) {
			console.error('❌ Error fetching default data:', error);
			toast.error("Failed to clear filters");
		}
	}, []);
	const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
		setCustomDateRange(prev => {
			const newRange = {
				...prev,
				[field]: value
			};
			
			// Clear any existing timeouts to prevent race conditions
			if (window.dateChangeTimeout) {
				clearTimeout(window.dateChangeTimeout);
			}
			
			// If both dates are set, fetch data immediately
			if (newRange.startDate && newRange.endDate) {
				// Validate date range
				const startDate = new Date(newRange.startDate);
				const endDate = new Date(newRange.endDate);
				
				if (startDate <= endDate) {
					// Debounce API calls to prevent rapid requests
					window.dateChangeTimeout = setTimeout(() => {
						console.log(`📅 Fetching data for range: ${newRange.startDate} to ${newRange.endDate}`);
						Promise.all([
							fetchAnalytics(newRange.startDate, newRange.endDate),
							fetchChartData(newRange.startDate, newRange.endDate)
						]).catch(error => {
							console.error('❌ Error fetching filtered data:', error);
						});
					}, 500);
				} else {
					toast.error("End date must be after start date");
				}
			} else if (!newRange.startDate && !newRange.endDate) {
				// If both dates are cleared, fetch default data
				window.dateChangeTimeout = setTimeout(() => {
					console.log('📅 Fetching default data (last 30 days)');
					Promise.all([
						fetchAnalytics(),
						fetchChartData()
					]).catch(error => {
						console.error('❌ Error fetching default data:', error);
					});
				}, 500);
			}
			
			return newRange;
		});
	}, []);

	// Frontend CSV generation and download function
	const generateAndDownloadCSV = useCallback(() => {
		if (!analytics || !dayData.length) {
			toast.error("No data available to export");
			return;
		}

		setExporting(true);

		try {
			// Create CSV content
			let csvContent = "data:text/csv;charset=utf-8,";

			// Add summary section
			csvContent += "ANALYTICS SUMMARY\n";
			const reportPeriod = customDateRange.startDate && customDateRange.endDate 
				? `${customDateRange.startDate} to ${customDateRange.endDate}`
				: "Last 30 Days (Default)";
			csvContent += `Report Period,${reportPeriod}\n`;
			csvContent += `Generated On,${new Date().toLocaleString('en-GB')}\n`;
			csvContent += `Total Revenue,$${parseFloat(analytics.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
			csvContent += `Total Orders,${analytics.totalOrders}\n`;
			csvContent += `Items Sold,${analytics.totalItemsSold}\n`;
			csvContent += `Average Order Value,$${parseFloat(analytics.averageOrderValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
			csvContent += "\n";

			// Add daily data section
			csvContent += "DAILY REVENUE & ORDERS\n";
			csvContent += "Date,Revenue,Orders\n";
			dayData.forEach(day => {
				csvContent += `${day.date},$${day.revenue.toFixed(2)},${day.orders}\n`;
			});
			csvContent += "\n";

			// Add order status breakdown if available
			if (analytics.statusBreakdown && Object.keys(analytics.statusBreakdown).length > 0) {
				csvContent += "ORDER STATUS BREAKDOWN\n";
				csvContent += "Status,Count,Percentage\n";
				Object.entries(analytics.statusBreakdown).forEach(([status, count]: [string, any]) => {
					const percentage = analytics.totalOrders > 0 ? ((count / analytics.totalOrders) * 100).toFixed(1) : "0.0";
					csvContent += `${status.replace('_', ' ')},${count},${percentage}%\n`;
				});
				csvContent += "\n";
			}

			// Add top products if available
			if (analytics.topProducts && analytics.topProducts.length > 0) {
				csvContent += "TOP PRODUCTS\n";
				csvContent += "Rank,Product Name,Quantity Sold,Revenue\n";
				analytics.topProducts.slice(0, 10).forEach((product: any, index: number) => {
					csvContent += `${index + 1},"${product.title.replace(/"/g, '""')}",${product.quantity},$${parseFloat(product.revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
				});
				csvContent += "\n";
			}

			// Create and trigger download
			const encodedUri = encodeURI(csvContent);
			const link = document.createElement("a");
			link.setAttribute("href", encodedUri);
			
			const periodLabel = customDateRange.startDate && customDateRange.endDate
				? `${customDateRange.startDate}_to_${customDateRange.endDate}`.replace(/[^\w]/g, '_')
				: "last_30_days";
			const filename = `analytics_report_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`;
			
			link.setAttribute("download", filename);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			toast.success(`Analytics report downloaded: ${filename}`);
		} catch (error) {
			console.error("Error generating CSV:", error);
			toast.error("Failed to generate CSV report");
		} finally {
			setExporting(false);
		}
	}, [analytics, dayData, customDateRange]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (window.dateChangeTimeout) {
				clearTimeout(window.dateChangeTimeout);
			}
		};
	}, []);

	// Initial fetch
	useEffect(() => {
		const checkAuth = async () => {
			if (typeof window === "undefined") {
				setLoading(false);
				return;
			}

			// Set default date range on component mount
			const defaultRange = getDefaultDateRange();
			setDefaultDateRange(defaultRange);

			const token = localStorage.getItem("alpa_token") || localStorage.getItem("auth_token");

			if (!token) {
				console.log("No token found, redirecting to login");
				toast.error("Please login to continue");
				setLoading(false);
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
				const userRole = payload.role?.toLowerCase()?.trim();

				const isAdmin = userRole?.includes("admin");

				if (!isAdmin) {
					console.error(`Access denied: user role is "${userRole}", admin required`);
					toast.error(`Unauthorized - Admin access required`);
					setLoading(false);
					setTimeout(() => router.push("/sellerdashboard"), 300);
					return;
				}

				// Fetch default analytics data and chart data once
				await fetchAnalytics(); // Get default analytics (last 30 days)
				await fetchChartData(); // Get default chart data (last 30 days)  
				setLoading(false);
			} catch (e) {
				console.error("Token validation error:", e);
				localStorage.removeItem("alpa_token");
				localStorage.removeItem("auth_token");
				toast.error("Invalid session. Please login again.");
				setLoading(false);
				setTimeout(() => router.push("/login"), 300);
			}
		};

		checkAuth();
	}, [router, getDefaultDateRange]);

	// CSV generation function remains the same...

	// Validate data consistency between analytics and chart
	const validateDataConsistency = useCallback(() => {
		if (!analytics || !dayData || dayData.length === 0) {
			return;
		}

		const chartTotalRevenue = dayData.reduce((sum, day) => sum + (day.revenue || 0), 0);
		const analyticsRevenue = parseFloat(analytics.totalRevenue || '0');
		
		const difference = Math.abs(chartTotalRevenue - analyticsRevenue);
		const tolerance = 0.01; // Allow 1 cent difference for floating point precision
		
		if (difference > tolerance) {
			console.warn(`⚠️ Data inconsistency detected:`, {
				analyticsRevenue: `$${analyticsRevenue.toFixed(2)}`,
				chartTotalRevenue: `$${chartTotalRevenue.toFixed(2)}`,
				difference: `$${difference.toFixed(2)}`
			});
			// Removed the toast.error to prevent annoying the user with backend data mismatch details
		} else {
			console.log(`✅ Data consistency validated: $${analyticsRevenue.toFixed(2)}`);
		}
	}, [analytics, dayData]);

	// Run validation when both analytics and chart data are loaded
	useEffect(() => {
		if (analytics && dayData && dayData.length > 0) {
			// Delay validation slightly to ensure all data is processed
			setTimeout(() => {
				validateDataConsistency();
			}, 100);
		}
	}, [analytics, dayData, validateDataConsistency]);

	// Skeleton loader
	const renderSkeleton = () => (
		<div className="space-y-6 md:space-y-8 animate-pulse">
			<div className="h-8 md:h-10 w-1/2 md:w-1/4 bg-gray-200 rounded" />
			<div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="p-4 rounded-lg border bg-white h-24 md:h-32" />
				))}
			</div>
			<div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
				{[...Array(2)].map((_, i) => (
					<div key={i} className="p-6 rounded-lg border bg-white h-60 md:h-80" />
				))}
			</div>
		</div>
	);

	if (loading) {
		return renderSkeleton();
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Analytics</h1>
					<p className="text-muted-foreground text-sm sm:text-base lg:text-lg mt-2">
						Real-time sales analytics and performance metrics
					</p>
				</div>
				
				<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
					<button
						onClick={generateAndDownloadCSV}
						disabled={exporting || !analytics}
						className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
					>
						<Download className="h-4 w-4" />
						<span className="hidden sm:inline">{exporting ? "Generating..." : "Download CSV"}</span>
						<span className="sm:hidden">{exporting ? "Generating..." : "Download"}</span>
					</button>
					<button
						onClick={async () => {
							if (customDateRange.startDate && customDateRange.endDate) {
								await Promise.all([
									fetchAnalytics(customDateRange.startDate, customDateRange.endDate),
									fetchChartData(customDateRange.startDate, customDateRange.endDate)
								]);
							} else {
								// Refresh with default data
								await Promise.all([
									fetchAnalytics(),
									fetchChartData()
								]);
							}
						}}
						disabled={refreshing || chartLoading}
						className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
					>
						{refreshing || chartLoading ? "Refreshing..." : "Refresh"}
					</button>
				</div>
			</div>

			{/* Date Range Filter */}
			<div className="bg-white p-4 rounded-lg border space-y-4">
				<div>
					<h2 className="text-base sm:text-lg font-semibold">Analytics Overview</h2>
					<p className="text-xs sm:text-sm text-muted-foreground mt-1">
						Select date range to view analytics data
					</p>
				</div>

				{/* Date Range Picker */}
				<div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg border items-end">
					<div className="flex flex-col gap-2 min-w-fit">
						<label className="text-sm font-medium text-gray-700">From Date</label>
						<input
							type="date"
							value={customDateRange.startDate}
							onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary"
							max={customDateRange.endDate || new Date().toISOString().split('T')[0]}
						/>
					</div>
					<div className="flex flex-col gap-2 min-w-fit">
						<label className="text-sm font-medium text-gray-700">To Date</label>
						<input
							type="date"
							value={customDateRange.endDate}
							onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary"
							min={customDateRange.startDate}
							max={new Date().toISOString().split('T')[0]}
						/>
					</div>
					{customDateRange.startDate && customDateRange.endDate && (
						<div className="flex items-center gap-2 flex-1">
							<div className="px-4 py-2 bg-primary/10 text-primary text-sm rounded-lg whitespace-nowrap">
								📅 {new Date(customDateRange.startDate).toLocaleDateString('en-GB')} - {new Date(customDateRange.endDate).toLocaleDateString('en-GB')}
							</div>
							<button
								onClick={clearFilters}
								disabled={refreshing || chartLoading}
								className="px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
							>
								Clear
							</button>
						</div>
					)}
					{!customDateRange.startDate && !customDateRange.endDate && (
						<div className="flex items-end">
							<div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
								📅 Default: {defaultDateRange.startDate && defaultDateRange.endDate 
									? `${new Date(defaultDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(defaultDateRange.endDate).toLocaleDateString('en-GB')}`
									: "Last 30 days"}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Key Metrics Cards */}
			{analytics && (
				<div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
							<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
							<DollarSign className="h-5 w-5 text-emerald-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${parseFloat(analytics.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{customDateRange.startDate && customDateRange.endDate 
									? `${new Date(customDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(customDateRange.endDate).toLocaleDateString('en-GB')} revenue`
									: `${defaultDateRange.startDate && defaultDateRange.endDate 
										? `${new Date(defaultDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(defaultDateRange.endDate).toLocaleDateString('en-GB')} revenue`
										: "Last 30 days revenue"}`}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
							<CardTitle className="text-sm font-medium">Total Orders</CardTitle>
							<TrendingUp className="h-5 w-5 text-blue-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{analytics.totalOrders.toLocaleString('en-US')}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{customDateRange.startDate && customDateRange.endDate 
									? `${new Date(customDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(customDateRange.endDate).toLocaleDateString('en-GB')} orders`
									: `${defaultDateRange.startDate && defaultDateRange.endDate 
										? `${new Date(defaultDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(defaultDateRange.endDate).toLocaleDateString('en-GB')} orders`
										: "Last 30 days orders"}`}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
							<CardTitle className="text-sm font-medium">Items Sold</CardTitle>
							<TrendingUp className="h-5 w-5 text-purple-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{analytics.totalItemsSold.toLocaleString('en-US')}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{customDateRange.startDate && customDateRange.endDate 
									? `${new Date(customDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(customDateRange.endDate).toLocaleDateString('en-GB')} units`
									: `${defaultDateRange.startDate && defaultDateRange.endDate 
										? `${new Date(defaultDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(defaultDateRange.endDate).toLocaleDateString('en-GB')} units`
										: "Last 30 days units sold"}`}
							</p>
						</CardContent>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
							<CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
							<DollarSign className="h-5 w-5 text-orange-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${parseFloat(analytics.averageOrderValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{customDateRange.startDate && customDateRange.endDate 
									? `${new Date(customDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(customDateRange.endDate).toLocaleDateString('en-GB')} average`
									: `${defaultDateRange.startDate && defaultDateRange.endDate 
										? `${new Date(defaultDateRange.startDate).toLocaleDateString('en-GB')} - ${new Date(defaultDateRange.endDate).toLocaleDateString('en-GB')} average`
										: "Last 30 days average"}`}
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Charts Section */}
			<div className="w-full">
				{/* Sales Revenue and Orders Chart */}
				<Card>
					<CardHeader className="px-4 md:px-6">
						<div>
							<CardTitle className="text-lg md:text-xl font-semibold">
								Revenue & Orders Overview
							</CardTitle>
							<p className="text-muted-foreground text-xs md:text-sm mt-1">
								{customDateRange.startDate && customDateRange.endDate
									? `Daily sales data from ${new Date(customDateRange.startDate).toLocaleDateString('en-GB')} to ${new Date(customDateRange.endDate).toLocaleDateString('en-GB')}`
									: "Daily sales revenue and order count for the last 30 days (default)"
								}
							</p>
						</div>
					</CardHeader>
					<CardContent className="px-2 md:px-6">
					{chartLoading ? (
						<div className="flex items-center justify-center h-60 md:h-80 text-gray-500 gap-2">
							<RefreshCw className="h-5 w-5 animate-spin" />
							<p className="text-sm md:text-base">Fetching real-time chart data...</p>
						</div>
					) : dayData.length > 0 ? (
						<div className="w-full overflow-x-auto">
							<div className="min-w-[400px]">
								<ResponsiveContainer width="100%" height={450}>
									<LineChart
										data={dayData}
										margin={{ 
											top: 5, 
											right: 30, 
											left: 20, 
											bottom: 100
										}}
									>
								<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
								<XAxis
									dataKey="date"
									angle={-45}
									textAnchor="end"
									height={100}
									tick={{ fontSize: 9 }}
									interval={dayData.length > 10 ? Math.ceil(dayData.length / 5) - 1 : 0}
									label={{ value: "Date", position: "insideBottomRight", offset: -10 }}
								/>
								<YAxis
									yAxisId="left"
									tick={{ fontSize: 10 }}
									label={{ value: "Revenue ($)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									tick={{ fontSize: 10 }}
									label={{ value: "Orders", angle: 90, position: "insideRight", style: { textAnchor: "middle" } }}
								/>
								<Tooltip
									formatter={(value: number | undefined, name?: string) => {
										if (name === 'Revenue ($)') {
											return [`$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
										} else {
											return [value ?? 0, name || 'Unknown'];
										}
									}}
									labelFormatter={(label) => `Date: ${label}`}
									contentStyle={{ 
										backgroundColor: "#f3f4f6", 
										border: "1px solid #d1d5db", 
										borderRadius: "8px",
										fontSize: "12px",
										padding: "12px"
									}}
								/>
								<Legend wrapperStyle={{ fontSize: "12px" }} />
								<Line
									yAxisId="left"
									type="monotone"
									dataKey="revenue"
									stroke="#3b82f6"
									dot={false}
									name="Revenue ($)"
									strokeWidth={2}
								/>
								<Line
									yAxisId="right"
									type="monotone"
									dataKey="orders"
									stroke="#10b981"
									dot={false}
									name="Orders"
									strokeWidth={2}
								/>
							</LineChart>
						</ResponsiveContainer>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center h-60 md:h-80 text-gray-500">
							<p className="text-sm md:text-base">No chart data available for this period</p>
						</div>
					)}
					</CardContent>
				</Card>
			</div>

			{/* Order Status and Top Products */}
			<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
				{/* Order Status Breakdown */}
				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-lg md:text-xl font-semibold">
							Order Status Breakdown
						</CardTitle>
						<p className="text-muted-foreground text-xs md:text-sm mt-1">
							Distribution of orders by status
						</p>
					</CardHeader>
					<CardContent className="px-4 md:px-6">
						{analytics?.statusBreakdown ? (
							<div className="space-y-4">
								{Object.entries(analytics.statusBreakdown).map(([status, count]: [string, any]) => (
									<div key={status} className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs md:text-sm font-medium text-gray-700 uppercase tracking-wide">
												{status.replace('_', ' ')}
											</span>
											<span className="text-sm md:text-base font-bold text-gray-800 min-w-[2rem] text-right">
												{count}
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full transition-all duration-300"
												style={{
													width: `${
														analytics.totalOrders > 0
															? (count / analytics.totalOrders) * 100
															: 0
													}%`,
												}}
											/>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p className="text-sm">No order data available</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Top Products */}
				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-lg md:text-xl font-semibold">
							Top Products
						</CardTitle>
						<p className="text-muted-foreground text-xs md:text-sm mt-1">
							Best performing products by revenue
						</p>
					</CardHeader>
					<CardContent className="px-4 md:px-6">
						{analytics?.topProducts && analytics.topProducts.length > 0 ? (
							<div className="space-y-4">
								{analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
									<div
										key={product.productId}
										className="flex items-start gap-3 pb-4 border-b last:border-b-0"
									>
										<div className="text-base md:text-lg font-bold text-gray-400 w-6 flex-shrink-0 mt-1">
											{index + 1}
										</div>
										<div className="flex-1 min-w-0 space-y-1">
											<p className="font-medium text-gray-800 text-sm md:text-base leading-tight">
												{product.title}
											</p>
											<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs md:text-sm text-gray-600">
												<div className="flex items-center gap-2">
													<span className="whitespace-nowrap">Qty: {product.quantity}</span>
													<span className="hidden sm:inline">•</span>
												</div>
												<span className="text-green-600 font-semibold text-sm md:text-base">
													${parseFloat(product.revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<p className="text-sm">No product data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
// analytics page
export default AnalyticsPage;
