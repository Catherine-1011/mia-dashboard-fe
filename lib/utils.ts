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
