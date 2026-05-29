"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(1, { message: "New password is required." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your new password." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match. Please ensure both password fields are identical.",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from your current password.",
  path: ["newPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const defaultValues: PasswordFormValues = {
	currentPassword: "",
	newPassword: "",
	confirmPassword: "",
};

export default function SettingsAccountPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const form = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordFormSchema),
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: PasswordFormValues) {
		setIsLoading(true);
		
		try {
			console.log("Changing password with payload:", {
				currentPassword: "***hidden***",
				newPassword: "***hidden***"
			});
			
			await api.put('/api/change-password', {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			});
			
			toast.success("Password changed successfully!", {
				description: "Your password has been updated.",
			});
			
			// Reset form after successful password change
			form.reset();
			
		} catch (error: any) {
			console.error("Password change error:", error);
			
			let errorMessage = "Failed to change password";
			let errorDescription = "Please try again later.";
			
			if (error.message?.includes("current password") || error.message?.includes("incorrect")) {
				errorMessage = "Incorrect current password";
				errorDescription = "Please check your current password and try again.";
			} else if (error.message?.includes("validation") || error.message?.includes("invalid")) {
				errorMessage = "Invalid password";
				errorDescription = "Please ensure your new password meets the requirements.";
			} else if (error.message?.includes("Authentication") || error.message?.includes("401")) {
				errorMessage = "Authentication required";
				errorDescription = "Please log in again and try.";
			}
			
			toast.error(errorMessage, {
				description: errorDescription,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Account</h3>
				<p className="text-sm text-muted-foreground">
					Manage your account settings and security.
				</p>
			</div>
			<Separator />
			
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Lock className="h-5 w-5" />
						<CardTitle>Change Password</CardTitle>
					</div>
					<CardDescription>
						Update your password to keep your account secure. Make sure your new password is strong and unique.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Current Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input 
													type={showCurrentPassword ? "text" : "password"}
													placeholder="Enter your current password" 
													{...field} 
													className="pr-10"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowCurrentPassword(!showCurrentPassword)}
												>
													{showCurrentPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
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
											<div className="relative">
												<Input 
													type={showNewPassword ? "text" : "password"}
													placeholder="Enter your new password" 
													{...field} 
													className="pr-10"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowNewPassword(!showNewPassword)}
												>
													{showNewPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormDescription>
											Enter your new password.
										</FormDescription>
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
											<div className="relative">
												<Input 
													type={showConfirmPassword ? "text" : "password"}
													placeholder="Re-enter your new password" 
													{...field} 
													className="pr-10"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												>
													{showConfirmPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							
							<div className="flex gap-4">
								<Button type="submit" disabled={isLoading}>
									{isLoading ? "Changing Password..." : "Change Password"}
								</Button>
								<Button 
									type="button" 
									variant="outline" 
									onClick={() => form.reset()}
									disabled={isLoading}
								>
									Cancel
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
