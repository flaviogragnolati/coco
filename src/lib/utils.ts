import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { headers } from "next/headers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Params = Record<string, string | number | undefined>;
type SearchParams =
  | Record<string, string | number | undefined>
  | URLSearchParams;

/**
 * Retrieves the full URL given the headers object, pathname, params, and search params.
 * Works in server-side Next.js components (static, dynamic, catch-all).
 */
export async function getURLfromHeaders(
  heads: typeof headers,
): Promise<string> {
  const headersList = await heads();
  const fullUrl = headersList.get("x-full-url");
  return fullUrl ?? "http://localhost:3000";
}
