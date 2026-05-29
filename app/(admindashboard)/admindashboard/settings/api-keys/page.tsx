"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Dummy function to get user role; replace with real auth logic
function getUserRole() {
	if (typeof window !== "undefined") {
		// Example: get from localStorage or cookie
		return localStorage.getItem("role") || "USER";
	}
	return "USER";
}

export default function ApiKeysPage() {
	const router = useRouter();
	useEffect(() => {
		const role = getUserRole();
		if (role !== "ADMIN") {
			router.replace("/admindashboard");
		}
	}, [router]);

	return (
		<div className="p-6 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">API Keys</h1>
			<p className="text-muted-foreground">
				This page is only visible to admin users.
			</p>
		</div>
	);
}
