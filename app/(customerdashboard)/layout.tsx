"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/shared/sidebar";
import Topbar from "@/components/shared/topbar";
import { WelcomeBanner } from "@/components/shared/welcome-banner";


const LoadingDashboard = dynamic(() => import("@/components/shared/loading-dashboard").then(m => m.LoadingDashboard), { ssr: false });


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const [checking, setChecking] = useState(true);
	const [globalLoading, setGlobalLoading] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	useEffect(() => {
		// Only run on client to verify token exists
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("alpa_token");
			console.log("[CustomerDashboard] Auth check:", {
				hasToken: !!token,
				pathname: pathname,
				tokenLength: token?.length || 0
			});
			
			if (!token) {
				console.log("[CustomerDashboard] No token found, redirecting to login");
				// Preserve current path for redirect after login
				const currentPath = encodeURIComponent(pathname);
				router.replace(`/login?redirectTo=${currentPath}`);
				return;
			}
			
			console.log("[CustomerDashboard] Token found, allowing access");
		}
		setChecking(false);
	}, [router, pathname]);

	// Listen for route changes to show skeleton loader
	useEffect(() => {
		const handleStart = () => setGlobalLoading(true);
		const handleStop = () => setGlobalLoading(false);

		// next/navigation does not provide router events, so fallback to window events
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
			{/* Sidebar */}
			<Sidebar isCollapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

			{/* Main Content */}
			<div className="flex-1 overflow-auto relative min-w-0">
				<Topbar />
				<WelcomeBanner />
				<main className="p-8">
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
