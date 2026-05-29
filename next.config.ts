import type { NextConfig } from "next";

const WEBAPP_ORIGIN = "https://apla-fe.vercel.app";

const nextConfig: NextConfig = {
	images: {
		domains: ["res.cloudinary.com"],
	},
	async headers() {
		return [
			{
				// Allow the Webapp to load this page in a hidden iframe
				source: "/logout-callback",
				headers: [
					{
						key: "Content-Security-Policy",
						value: `frame-ancestors 'self' ${WEBAPP_ORIGIN}`,
					},
					{
						// Legacy fallback for older browsers
						key: "X-Frame-Options",
						value: `ALLOW-FROM ${WEBAPP_ORIGIN}`,
					},
				],
			},
		];
	},
};

export default nextConfig;
