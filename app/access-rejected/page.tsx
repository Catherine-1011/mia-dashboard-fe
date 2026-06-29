"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";

export default function AccessRejectedPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
			<Card className="w-full max-w-md text-center border-red-200 shadow-lg">
				<CardHeader>
					<div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 border-4 border-red-200">
						<XCircle className="h-12 w-12 text-red-500" />
					</div>
					<CardTitle className="text-2xl text-red-800">Access Rejected</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-red-700">
						Your access request was rejected. You are not authorized to access the admin dashboard.
					</p>
					<div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
						Please contact your administrator if you believe this is an error.
					</div>
					<Button
						variant="outline"
						asChild
						className="border-red-300 text-red-700 hover:bg-red-50"
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
