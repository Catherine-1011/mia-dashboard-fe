import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Returns "Suburb" for AU/NZ/ZA, "City" for all other countries. */
export function getCityLabel(country?: string): string {
	const suburbCountries = ["australia", "au", "new zealand", "nz", "south africa", "za"];
	return suburbCountries.includes((country ?? "").toLowerCase().trim()) ? "Suburb" : "City";
}

/**
 * Allowed image MIME types for product uploads.
 * AVIF and other exotic formats are rejected by the API.
 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/**
 * Validates an array of image files against allowed formats.
 * Returns an error string if any file is invalid, or null if all are fine.
 */
export function validateImageFiles(files: File[]): string | null {
	for (const file of files) {
		const ext = "." + file.name.split(".").pop()?.toLowerCase();
		const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(file.type);
		const isExtAllowed = ALLOWED_IMAGE_EXTENSIONS.includes(ext);
		if (!isTypeAllowed || !isExtAllowed) {
			const format = file.type || ext || "unknown";
			return `"${file.name}" has an unsupported format (${format}). Please use JPG, PNG, or WebP images only.`;
		}
	}
	return null;
}
