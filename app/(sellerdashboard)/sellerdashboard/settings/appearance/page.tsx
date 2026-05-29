"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Palette, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsAppearancePage() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// useEffect to handle hydration
	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const handleThemeChange = (newTheme: string) => {
		setTheme(newTheme);
		toast.success("Theme updated!", {
			description: `Switched to ${newTheme} theme.`,
		});
	};

	const themes = [
		{
			name: "Light",
			value: "light",
			icon: Sun,
			description: "Clean and bright interface",
		},
		{
			name: "Dark",
			value: "dark", 
			icon: Moon,
			description: "Easy on the eyes in low light",
		},
		{
			name: "System",
			value: "system",
			icon: Monitor,
			description: "Adapts to your system preference",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Appearance</h3>
				<p className="text-sm text-muted-foreground">
					Customize the appearance and theme of the application.
				</p>
			</div>
			<Separator />
			
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Palette className="h-5 w-5" />
						<CardTitle>Theme</CardTitle>
					</div>
					<CardDescription>
						Choose the theme that best suits your preference.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-4">
						<Label className="text-sm font-medium">Select theme</Label>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							{themes.map((themeOption) => {
								const Icon = themeOption.icon;
								const isSelected = theme === themeOption.value;
								
								return (
									<Card
										key={themeOption.value}
										className={`relative cursor-pointer transition-all hover:border-primary/50 ${
											isSelected
												? "border-primary ring-2 ring-primary/20"
												: "border-border"
										}`}
										onClick={() => handleThemeChange(themeOption.value)}
									>
										<CardContent className="flex flex-col items-center justify-center p-6 text-center">
											<div className="mb-3 rounded-full bg-muted p-3">
												<Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
											</div>
											<div className="space-y-1">
												<Label className={`cursor-pointer text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
													{themeOption.name}
												</Label>
												<p className="text-xs text-left text-muted-foreground">
													{themeOption.description}
												</p>
											</div>
											{isSelected && (
												<div className="absolute right-2 top-2">
													<div className="h-2 w-2 rounded-full bg-primary"></div>
												</div>
											)}
										</CardContent>
									</Card>
								);
							})}
						</div>
					</div>

					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="flex items-center gap-3">
							<Eye className="h-5 w-5 text-muted-foreground" />
							<div>
								<Label className="text-sm font-medium">Current theme</Label>
								<p className="text-sm text-muted-foreground">
									Currently using {theme === "system" ? "system" : theme} theme
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							{themes.map((themeOption) => {
								const Icon = themeOption.icon;
								return (
									<Button
										key={themeOption.value}
										variant={theme === themeOption.value ? "default" : "outline"}
										size="sm"
										onClick={() => handleThemeChange(themeOption.value)}
									>
										<Icon className="h-4 w-4 mr-2" />
										{themeOption.name}
									</Button>
								);
							})}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Theme Preview</CardTitle>
					<CardDescription>
						Preview how different elements look in the current theme.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border p-4 space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium">Sample Card</h4>
								<p className="text-sm text-muted-foreground">This is how cards appear in your theme</p>
							</div>
							<Button size="sm">Action</Button>
						</div>
						<Separator />
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Primary text</Label>
								<p className="text-sm">This is primary text color</p>
							</div>
							<div className="space-y-2">
								<Label>Muted text</Label>
								<p className="text-sm text-muted-foreground">This is muted text color</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
