"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Edit, X } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100, { message: "Name must not be longer than 100 characters." }),
  email: z.string().email(),
  phone: z.string().optional(),
  profileImage: z.string().optional(), // Removed .url() to allow blob URLs during upload
  role: z.string().optional(),
  isVerified: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;


// Default values will be replaced by API data
const defaultValues: Partial<ProfileFormValues> = {
	name: "",
	email: "",
	phone: "",
	profileImage: "",
	role: "",
	isVerified: false,
	emailVerified: false,
	createdAt: "",
	updatedAt: "",
};

export default function SettingsPage() {
	const [isEditing, setIsEditing] = useState(false);
	const [originalData, setOriginalData] = useState<Partial<ProfileFormValues>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues,
		mode: "onChange",
	});
	
	// Watch for profile image and name changes
	const profileImage = form.watch("profileImage");
	const name = form.watch("name");

	// Fetch profile data function
	const fetchProfileData = async () => {
		setIsLoading(true);
		try {
			const data = await api.get('/api/profile', {
				headers: {
					Authorization: ""
				}
			});
			console.log('Profile API Response:', data); // Debug log
			const p = data.profile || data;
			console.log('Profile data:', p); // Debug log
			
			// Try different common field names for profile image
			const profileImageUrl = p.profileImage || p.profile_image || p.avatar || p.picture || p.image || '';
			console.log('Profile image URL:', profileImageUrl); // Debug log
			
			const profileData = {
			  name: p.name || '',
			  email: p.email || '',
			  phone: p.phone || '',
			  profileImage: profileImageUrl,
			  role: p.role || '',
			  isVerified: !!p.isVerified,
			  emailVerified: !!p.emailVerified,
			  createdAt: p.createdAt || '',
			  updatedAt: p.updatedAt || '',
			};
			
			form.reset(profileData);
			setOriginalData(profileData);
		} catch (err) {
			console.error('Profile fetch error:', err);
			toast.error("Failed to load profile data", {
				description: "Please refresh the page to try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch profile data on mount and set as form values
	useEffect(() => {
		fetchProfileData();
	}, [form]);

	function onSubmit(data: ProfileFormValues) {
		console.log("Submitting profile data:", data); // Debug log
		
		// Validate required fields
		if (!data.name?.trim()) {
			toast.error("Name is required", {
				description: "Please enter your name.",
			});
			return;
		}
		
		setIsLoading(true);
		
		const submitProfile = async () => {
			try {
				console.log("Trying PUT method...");
				
				// If there's a selected file, use FormData
				if (selectedFile) {
					const formData = new FormData();
					formData.append('name', data.name?.trim() || '');
					formData.append('phone', data.phone?.trim() || '');
					formData.append('profileImage', selectedFile);
					
					console.log("Submitting with file:", selectedFile.name);
					
					// Use api.put without Content-Type header for FormData
					return await api.put('/api/profile', formData);
				} else {
					// No file, use regular JSON payload
					const updatePayload = {
						name: data.name?.trim() || '',
						phone: data.phone?.trim() || '',
						profileImage: data.profileImage || '',
					};
					
					console.log("Update payload (no file):", updatePayload);
					return await api.put('/api/profile', updatePayload);
				}
			} catch (error) {
				throw error;
			}
		};
		
		submitProfile()
		.then((response) => {
			console.log("Profile update response:", response); // Debug log
			toast.success("Profile updated successfully!", {
				description: "Your profile has been updated.",
			});
			setIsEditing(false);
			setSelectedFile(null); // Clear selected file
			// Refresh the data to get the latest from server
			fetchProfileData();
		})
		.catch((err) => {
			console.error("Profile update error details:", err);
			console.error("Error message:", err.message);
			console.error("Full error object:", err);
			
			// More specific error handling
			let errorMessage = "Failed to update profile";
			let errorDescription = "Please try again later.";
			
			if (err.message?.includes("Invalid or expired token") || err.message?.includes("Authentication")) {
				errorMessage = "Authentication required";
				errorDescription = "Please log in again.";
			} else if (err.message?.includes("validation")) {
				errorMessage = "Invalid data";
				errorDescription = "Please check your input and try again.";
			} else if (err.message?.includes("Server error") || err.message?.includes("500")) {
				errorMessage = "Server error";
				errorDescription = "The server is having issues processing your request. Please try again in a few moments.";
			} else if (err.message?.includes("404")) {
				errorMessage = "Profile not found";
				errorDescription = "Please refresh the page and try again.";
			}
			
			toast.error(errorMessage, {
				description: errorDescription,
			});
		})
		.finally(() => {
			setIsLoading(false);
		});
	}

	const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type and size
		if (!file.type.startsWith('image/')) {
			toast.error("Invalid file type", {
				description: "Please select an image file.",
			});
			return;
		}

		if (file.size > 5 * 1024 * 1024) { // 5MB limit
			toast.error("File too large", {
				description: "Please select an image smaller than 5MB.",
			});
			return;
		}

		console.log("Image file selected:", file.name, file.type, file.size);
		
		// Store the file for later upload
		setSelectedFile(file);
		
		// Create preview URL for immediate visual feedback
		const previewUrl = URL.createObjectURL(file);
		form.setValue("profileImage", previewUrl);
		
		toast.success("Image selected", {
			description: "Image will be uploaded when you save your profile.",
		});
	};

	const handleEditToggle = async () => {
		if (isEditing) {
			// Cancel editing - reset form to original values and clear file
			form.reset(originalData);
			setSelectedFile(null);
		} else {
			// Entering edit mode - fetch fresh data
			await fetchProfileData();
		}
		setIsEditing(!isEditing);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-medium">Profile</h3>
					<p className="text-sm text-muted-foreground">
						This is how others will see you on the site.
					</p>
				</div>
				<Button
					variant={isEditing ? "outline" : "default"}
					size="sm"
					onClick={handleEditToggle}
					type="button"
					disabled={isLoading}
				>
					{isLoading ? (
						<>Loading...</>
					) : isEditing ? (
						<>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</>
					) : (
						<>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</>
					)}
				</Button>
			</div>
			<Separator />
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<div className="flex items-center gap-6">
						<div className="relative">
							<Avatar className="h-20 w-20">
								<AvatarImage src={profileImage || undefined} alt={name || "Profile"} />
								<AvatarFallback>{(name || "U")[0]}</AvatarFallback>
							</Avatar>
							{isEditing && (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="absolute -bottom-1 -right-1 rounded-full h-8 w-8 p-0"
									onClick={() => fileInputRef.current?.click()}
								>
									<Camera className="h-4 w-4" />
								</Button>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="picture">Profile Picture</Label>
							{isEditing && (
								<p className="text-xs text-muted-foreground">
									{selectedFile ? `Selected: ${selectedFile.name}` : "Click the camera icon to select an image"}
								</p>
							)}
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleImageUpload}
						/>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Your name" {...field} disabled={!isEditing} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Phone</FormLabel>
									<FormControl>
										<Input placeholder="Phone" {...field} disabled={!isEditing} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input placeholder="Your email" {...field} disabled />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid gap-6 md:grid-cols-2">
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<FormControl>
										<Input placeholder="Role" {...field} disabled />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="isVerified"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Verified</FormLabel>
									<FormControl>
										<Input placeholder="Verified" value={field.value ? "Yes" : "No"} disabled />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="emailVerified"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Verified</FormLabel>
									<FormControl>
										<Input placeholder="Email Verified" value={field.value ? "Yes" : "No"} disabled />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="createdAt"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Created At</FormLabel>
									<FormControl>
										<Input placeholder="Created At" value={field.value ? new Date(field.value).toLocaleString('en-GB') : "-"} disabled />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="updatedAt"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Updated At</FormLabel>
									<FormControl>
										<Input placeholder="Updated At" value={field.value ? new Date(field.value).toLocaleString('en-GB') : "-"} disabled />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					{isEditing && (
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Updating..." : "Update profile"}
						</Button>
					)}
				</form>
			</Form>
		</div>
	);
}
