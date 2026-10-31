/** Normalizes a Turkish mobile number to 905XXXXXXXXX, or null when it is not one. */
export function normalizeTrPhone(raw: string): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // 0090… international prefix
  if (d.length === 13 && d.startsWith("900")) d = `90${d.slice(3)}`; // +90 (0532) …
  if (d.length === 10 && d.startsWith("5")) return `90${d}`;
  if (d.length === 11 && d.startsWith("05")) return `9${d}`;
  if (d.length === 12 && d.startsWith("905")) return d;
  return null;
}

/** 905321234567 → "0532 123 45 67" */
export function formatTrPhone(normalized: string): string {
  const d = normalized.replace(/^90/, "0");
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}
