"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import Link from "next/link";

// ── Step 1 schema ──────────────────────────────────────────────
const emailSchema = z.object({
	email: z.string().email({ message: "Please enter a valid email address." }),
});

// ── Step 2 schema ──────────────────────────────────────────────
const resetSchema = z
	.object({
		otp: z.string().min(1, { message: "OTP is required." }),
		newPassword: z
			.string()
			.min(6, { message: "Password must be at least 6 characters." }),
		confirmPassword: z
			.string()
			.min(6, { message: "Please confirm your password." }),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

// ── Step 1 – Email form ────────────────────────────────────────
function EmailStep({
	onSuccess,
}: {
	onSuccess: (email: string) => void;
}) {
	const [loading, setLoading] = useState(false);

	const form = useForm<z.infer<typeof emailSchema>>({
		resolver: zodResolver(emailSchema),
		defaultValues: { email: "" },
	});

	async function onSubmit(values: z.infer<typeof emailSchema>) {
		setLoading(true);
		try {
			await api.post("/api/auth/forgot-password", { email: values.email });
			toast.success("OTP sent!", {
				description: "Check your email for the one-time password.",
			});
			onSuccess(values.email);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to send OTP.";
			toast.error("Error", { description: msg });
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Forgot Password</CardTitle>
				<CardDescription>
					Enter your email and we will send you an OTP to reset your password.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input placeholder="m@example.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Send OTP
						</Button>
					</form>
				</Form>
				<div className="mt-4 text-center text-sm">
					Remember your password?{" "}
					<Link href="/login" className="underline">
						Sign in
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

// ── Step 2 – Reset form ────────────────────────────────────────
function ResetStep({ email }: { email: string }) {
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	const form = useForm<z.infer<typeof resetSchema>>({
		resolver: zodResolver(resetSchema),
		defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
	});

	async function onSubmit(values: z.infer<typeof resetSchema>) {
		setLoading(true);
		try {
			await api.post("/api/auth/reset-password", {
				email,
				otp: values.otp,
				newPassword: values.newPassword,
			});
			toast.success("Password reset!", {
				description: "Your password has been updated. You can now sign in.",
			});
			setDone(true);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to reset password.";
			toast.error("Error", { description: msg });
		} finally {
			setLoading(false);
		}
	}

	if (done) {
		return (
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">All done!</CardTitle>
					<CardDescription>
						Your password has been reset successfully.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link href="/login">
						<Button className="w-full">Back to Sign In</Button>
					</Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Reset Password</CardTitle>
				<CardDescription>
					Enter the OTP sent to <span className="font-medium text-foreground">{email}</span> and choose a new password.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="otp"
							render={({ field }) => (
								<FormItem>
									<FormLabel>OTP</FormLabel>
									<FormControl>
										<Input placeholder="Enter OTP" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<Input type="password" placeholder="••••••••" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm New Password</FormLabel>
									<FormControl>
										<Input type="password" placeholder="••••••••" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Reset Password
						</Button>
					</form>
				</Form>
				<div className="mt-4 text-center text-sm">
					Remember your password?{" "}
					<Link href="/login" className="underline">
						Sign in
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

// ── Page ───────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
	const [email, setEmail] = useState<string | null>(null);

	if (email) {
		return <ResetStep email={email} />;
	}

	return <EmailStep onSuccess={setEmail} />;
}
