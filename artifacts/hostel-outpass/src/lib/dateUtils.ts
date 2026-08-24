import { format, parseISO } from "date-fns";

/**
 * Format any date input (string, Date, timestamp) into standard "dd MMM yyyy, hh:mm a" format.
 * Example: "24 Aug 2026, 10:42 AM"
 */
export function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return format(d, "dd MMM yyyy, hh:mm a");
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Format date part only if needed (e.g. "24 Aug 2026").
 */
export function formatDateOnly(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return format(d, "dd MMM yyyy");
  } catch (e) {
    return String(dateInput);
  }
}
