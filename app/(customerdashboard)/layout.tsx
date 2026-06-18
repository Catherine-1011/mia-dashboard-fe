"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/shared/sidebar";
import Topbar from "@/components/shared/topbar";
import { WelcomeBanner } from "@/components/shared/welcome-banner";
import { cn } from "@/lib/utils";

const LoadingDashboard = dynamic(() => import("@/components/shared/loading-dashboard").then(m => m.LoadingDashboard), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [checking, setChecking] = useState(true);
	const [globalLoading, setGlobalLoading] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	// Auto-collapse sidebar on small screens
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 768) setSidebarCollapsed(true);
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Close mobile drawer on navigation
	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("alpa_token");
			console.log("[CustomerDashboard] Auth check:", {
				hasToken: !!token,
				pathname: pathname,
				tokenLength: token?.length || 0
			});

			if (!token) {
				console.log("[CustomerDashboard] No token found, redirecting to login");
				const currentPath = encodeURIComponent(pathname);
				router.replace(`/login?redirectTo=${currentPath}`);
				return;
			}

			console.log("[CustomerDashboard] Token found, allowing access");
		}
		setChecking(false);
	}, [router, pathname]);

	useEffect(() => {
		const handleStart = () => setGlobalLoading(true);
		const handleStop = () => setGlobalLoading(false);
		window.addEventListener("dashboard-loading-start", handleStart);
		window.addEventListener("dashboard-loading-stop", handleStop);
		return () => {
			window.removeEventListener("dashboard-loading-start", handleStart);
			window.removeEventListener("dashboard-loading-stop", handleStop);
		};
	}, []);

	if (checking) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="relative flex h-screen overflow-hidden bg-background">
			{/* Mobile backdrop */}
			{mobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 md:hidden"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			{/* Sidebar — drawer on mobile, static on desktop */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 md:flex md:z-auto",
					mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
				)}
			>
				<Sidebar
					isCollapsed={mobileOpen ? false : sidebarCollapsed}
					onCollapsedChange={setSidebarCollapsed}
					onMobileClose={() => setMobileOpen(false)}
				/>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-auto relative min-w-0">
				<Topbar onMenuClick={() => setMobileOpen(true)} />
				<WelcomeBanner />
				<main className="p-4 md:p-8">
					{globalLoading ? (
						<LoadingDashboard />
					) : (
						<div className="min-h-[calc(100vh-8rem)]">{children}</div>
					)}
				</main>
			</div>
		</div>
	);
}
