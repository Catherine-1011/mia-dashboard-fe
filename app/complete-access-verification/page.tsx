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
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "https://backend.madeinarnhemland.com.au";

const ACCESS_DENIED =
	"You are not authorized to access this dashboard.\nPlease contact your administrator.";

function CompleteAccessVerificationContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const session = searchParams.get("session") || "";
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const normalizedEmail = email.trim().toLowerCase();
	const canSubmit = normalizedEmail.endsWith("@alpa.asn.au") && !!session && !loading;

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError("");

		if (!canSubmit) {
			setError(ACCESS_DENIED);
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/saml/access-email`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ session, email: normalizedEmail }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.message || ACCESS_DENIED);
			}

			toast.success("Verification code sent");
			router.replace(
				`/verify-saml-otp?session=${encodeURIComponent(session)}&email=${encodeURIComponent(normalizedEmail)}`
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : ACCESS_DENIED;
			setError(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<ShieldCheck className="mx-auto h-12 w-12 text-gray-500" />
					<CardTitle className="mt-4 text-2xl">Complete Access Verification</CardTitle>
					<CardDescription>
						Confirm your official ALPA email to continue.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
							</Alert>
						)}
						<div className="space-y-2">
							<Label htmlFor="official-email">Official ALPA Email</Label>
							<Input
								id="official-email"
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value.toLowerCase())}
								onBlur={() => setEmail((value) => value.trim().toLowerCase())}
								placeholder="name@alpa.asn.au"
								disabled={loading}
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<MailCheck className="h-4 w-4" />
							)}
							Continue
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}

export default function CompleteAccessVerificationPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
					<Loader2 className="h-10 w-10 animate-spin text-primary" />
				</div>
			}
		>
			<CompleteAccessVerificationContent />
		</Suspense>
	);
}
