import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes safely.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 * 
 * Example: cn("px-4 py-2", isActive && "bg-red-500", "px-6") → "py-2 bg-red-500 px-6"
 * The conflicting px-4 and px-6 gets resolved to px-6 automatically.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price number to USD currency string.
 * 
 * Example: formatPrice(15.95) → "$15.95"
 * Example: formatPrice(7) → "$7.00"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * Format a phone number for display.
 * 
 * Example: formatPhone("7812730111") → "(781) 273-0111"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Capitalize the first letter of a string.
 * 
 * Example: capitalize("butter chicken") → "Butter chicken"
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Join a list of strings with a natural separator.
 * 
 * Example: joinNatural(["Burlington", "Woburn", "Lexington"]) → "Burlington, Woburn & Lexington"
 */
export function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

/**
 * Generate star rating array for display.
 * 
 * Example: getStars(4) → [1, 1, 1, 1, 0]  (4 filled, 1 empty)
 */
export function getStars(rating: number): number[] {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(i <= Math.round(rating) ? 1 : 0);
  }
  return stars;
}

/**
 * Truncate text to a max length with ellipsis.
 * 
 * Example: truncate("This is a very long description...", 30) → "This is a very long des..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}