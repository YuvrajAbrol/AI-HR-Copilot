export function formatCurrency(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
): string {
  if (!iso || iso === "—") return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", opts);
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function hoursToDays(hours: number): string {
  return `${(hours / 8).toFixed(1)} days`;
}

/** Masks a sensitive value when the current role lacks clearance. */
export function maskValue(value: string, canView: boolean): string {
  return canView ? value : "•••• ••••";
}
