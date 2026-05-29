"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
	ArrowLeft,
	User,
	Mail,
	Phone,
	ShieldCheck,
	ShieldX,
	CheckCircle2,
	XCircle,
	Calendar,
	Clock,
	Hash,
} from "lucide-react";
import { apiClient } from "@/lib/api";

// --- Types -------------------------------------------------------------------
type CustomerDetail = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	role: string;
	isVerified: boolean;
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
};

type ApiResponse = {
	success: boolean;
	count?: number;
	user?: CustomerDetail;
	users?: CustomerDetail[];
	message?: string;
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

function formatDateTime(iso: string) {
	return new Date(iso).toLocaleString("en-AU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// --- Info Row ----------------------------------------------------------------
function InfoRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3 py-3">
			<div className="mt-0.5 rounded-md bg-muted p-2">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-xs text-muted-foreground mb-0.5">{label}</p>
				<p className="text-sm font-medium break-all">{value}</p>
			</div>
		</div>
	);
}

// --- Component ---------------------------------------------------------------
export default function CustomerDetailPage() {
	const router = useRouter();
	const params = useParams();
	const customerId = params.id as string;

	const [customer, setCustomer] = useState<CustomerDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!customerId) return;
		const fetchCustomer = async () => {
			try {
				const res: ApiResponse = await apiClient("/api/admin/users");
				if (res.success) {
					const all = res.users ?? (res.user ? [res.user] : []);
					const data = all.find((u) => u.id === customerId) ?? null;
					if (data) {
						setCustomer(data);
					} else {
						setError("Customer not found.");
					}
				} else {
					setError(res.message ?? "Failed to load customer details.");
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Failed to load customer details.";
				setError(msg);
			} finally {
				setLoading(false);
			}
		};
		fetchCustomer();
	}, [customerId]);

	// -- Loading ---------------------------------------------------------------
	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-24 rounded-md" />
					<Skeleton className="h-8 w-48" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-1">
						<Card>
							<CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
								<Skeleton className="h-20 w-20 rounded-full" />
								<Skeleton className="h-6 w-36" />
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-6 w-24 rounded-full" />
							</CardContent>
						</Card>
					</div>
					<div className="md:col-span-2 space-y-4">
						<Card>
							<CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
							<CardContent className="space-y-2">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-12 rounded-md" />
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	// -- Error -----------------------------------------------------------------
	if (error || !customer) {
		return (
			<div className="space-y-6">
				<Button variant="outline" size="sm" onClick={() => router.push("/admindashboard/customers")}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Customers
				</Button>
				<div className="flex flex-col items-center justify-center h-64 gap-4">
					<p className="text-destructive font-medium">{error ?? "Customer not found."}</p>
					<Button variant="outline" onClick={() => router.push("/admindashboard/customers")}>
						Return to Customers
					</Button>
				</div>
			</div>
		);
	}

	// -- Render ----------------------------------------------------------------
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" onClick={() => router.push("/admindashboard/customers")}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back
				</Button>
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Customer Details</h2>
					<p className="text-sm text-muted-foreground">Viewing profile for {customer.name}</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Profile Card */}
				<div className="md:col-span-1">
					<Card>
						<CardContent className="flex flex-col items-center gap-3 pt-8 pb-6">
							<Avatar className="h-20 w-20">
								<AvatarFallback className="text-2xl font-bold">
									{initials(customer.name)}
								</AvatarFallback>
							</Avatar>
							<div className="text-center">
								<p className="text-lg font-semibold">{customer.name}</p>
								<p className="text-sm text-muted-foreground">{customer.email}</p>
							</div>
							<div className="flex flex-wrap gap-2 justify-center pt-1">
								{customer.isVerified ? (
									<Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700">
										<ShieldCheck className="h-3 w-3 mr-1" />
										Verified
									</Badge>
								) : (
									<Badge variant="outline" className="text-muted-foreground">
										<ShieldX className="h-3 w-3 mr-1" />
										Unverified
									</Badge>
								)}
								{customer.emailVerified ? (
									<Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700">
										<CheckCircle2 className="h-3 w-3 mr-1" />
										Email Confirmed
									</Badge>
								) : (
									<Badge variant="outline" className="text-muted-foreground">
										<XCircle className="h-3 w-3 mr-1" />
										Email Unconfirmed
									</Badge>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Details */}
				<div className="md:col-span-2 space-y-4">
					{/* Contact Info */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Contact Information</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<InfoRow icon={User} label="Full Name" value={customer.name} />
							<Separator />
							<InfoRow icon={Mail} label="Email Address" value={customer.email} />
							<Separator />
							<InfoRow
								icon={Phone}
								label="Phone Number"
								value={customer.phone ?? <span className="italic text-muted-foreground">Not provided</span>}
							/>
						</CardContent>
					</Card>

					{/* Account Info */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Account Information</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<InfoRow icon={Hash} label="Customer ID" value={<span className="font-mono text-xs">{customer.id}</span>} />
							<Separator />
							<InfoRow
								icon={ShieldCheck}
								label="Account Verified"
								value={
									customer.isVerified ? (
										<span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
									) : (
										<span className="text-orange-500 font-medium">No</span>
									)
								}
							/>
							<Separator />
							<InfoRow
								icon={Mail}
								label="Email Confirmed"
								value={
									customer.emailVerified ? (
										<span className="text-blue-600 dark:text-blue-400 font-medium">Yes</span>
									) : (
										<span className="text-orange-500 font-medium">No</span>
									)
								}
							/>
							<Separator />
							<InfoRow
								icon={Calendar}
								label="Joined"
								value={formatDateTime(customer.createdAt)}
							/>
							<Separator />
							<InfoRow
								icon={Clock}
								label="Last Updated"
								value={formatDateTime(customer.updatedAt)}
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
