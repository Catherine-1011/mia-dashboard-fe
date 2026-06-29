"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";

export default function AccessPendingPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50">
			<Card className="w-full max-w-md text-center border-yellow-200 shadow-lg">
				<CardHeader>
					<div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 border-4 border-yellow-200">
						<Clock className="h-12 w-12 text-yellow-600" />
					</div>
					<CardTitle className="text-2xl text-yellow-800">Access Pending</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-yellow-700">
						Your access request has been received and is pending approval by a Super Admin.
						You will be able to log in once your request is approved.
					</p>
					<div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
						Please contact your administrator if you need immediate access.
					</div>
					<Button
						variant="outline"
						asChild
						className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
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
