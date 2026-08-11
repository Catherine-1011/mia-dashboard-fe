import type { NextConfig } from "next";

const WEBAPP_ORIGIN = "https://madeinarnhemland.com.au";

const contentSecurityPolicy = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"img-src 'self' data: blob: https: http:",
	"font-src 'self' data: https://fonts.gstatic.com",
	"connect-src 'self' https://backend.madeinarnhemland.com.au https://api.stripe.com https://checkout.stripe.com https://r.stripe.com https://m.stripe.com",
	"frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
	"frame-ancestors 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self' https://checkout.stripe.com",
].join("; ");

const securityHeaders = [
	{
		key: "Content-Security-Policy",
		value: contentSecurityPolicy,
	},
	{
		key: "X-Frame-Options",
		value: "SAMEORIGIN",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
];

const nextConfig: NextConfig = {
	images: {
		domains: ["res.cloudinary.com"],
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
			{
				// Allow the Webapp to load this page in a hidden iframe
				source: "/logout-callback",
				headers: [
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy.replace(
							"frame-ancestors 'self'",
							`frame-ancestors 'self' ${WEBAPP_ORIGIN}`,
						),
					},
					{
						// Legacy fallback for older browsers
						key: "X-Frame-Options",
						value: `ALLOW-FROM ${WEBAPP_ORIGIN}`,
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
				],
			},
		];
	},
};

export default nextConfig;
