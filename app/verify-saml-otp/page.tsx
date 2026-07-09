"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au";

function setCookie(name: string, value: string, days = 1) {
	const expires = new Date();
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
	document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function VerifySamlOtpContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const session = searchParams.get("session") || "";
	const email = searchParams.get("email") || "";
	const [otp, setOtp] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const canSubmit = otp.length === 6 && !!session && !loading;

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError("");

		if (!canSubmit) return;

		setLoading(true);

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/saml/verify-access-otp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ session, otp }),
			});

			const data = await response.json();

			if (!response.ok || !data.token) {
				throw new Error(data.message || "OTP verification failed");
			}

			localStorage.setItem("alpa_token", data.token);
			setCookie("token", data.token, 1);

			if (data.role) {
				setCookie("userRole", data.role, 1);
			}

			if (data.user) {
				localStorage.setItem("user", JSON.stringify(data.user));
			}

			toast.success("Access verified");
			router.replace("/admindashboard");
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "OTP verification failed");
			setOtp("");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<ShieldCheck className="mx-auto h-12 w-12 text-gray-500" />
					<CardTitle className="mt-4 text-2xl">Verify OTP</CardTitle>
					<CardDescription>
						Enter the code sent to {email || "your official ALPA email"}.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<div className="space-y-2">
							<Label htmlFor="otp">One-time code</Label>
							<Input
								id="otp"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={6}
								value={otp}
								onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
								disabled={loading}
								className="text-center text-lg tracking-[0.5em]"
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<CheckCircle className="h-4 w-4" />
							)}
							Verify and continue
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}

export default function VerifySamlOtpPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
					<Loader2 className="h-10 w-10 animate-spin text-primary" />
				</div>
			}
		>
			<VerifySamlOtpContent />
		</Suspense>
	);
}
