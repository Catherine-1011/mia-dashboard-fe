"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, ArrowLeft } from "lucide-react";

export default function AccessBlockedPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100">
			<Card className="w-full max-w-md text-center border-gray-300 shadow-lg">
				<CardHeader>
					<div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 border-4 border-gray-300">
						<Ban className="h-12 w-12 text-gray-500" />
					</div>
					<CardTitle className="text-2xl text-gray-800">Account Restricted</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-gray-700">
						Your account has been restricted. You are no longer authorized to access the admin dashboard.
					</p>
					<div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
						Please contact your administrator for more information.
					</div>
					<Button
						variant="outline"
						asChild
						className="border-gray-300 text-gray-700 hover:bg-gray-50"
					>
						<Link href="/login">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Login
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
