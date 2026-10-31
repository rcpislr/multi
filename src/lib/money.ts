/** All money is integer kuruş (1 TL = 100). Prices are VAT-inclusive. */

export function vatFromGross(grossMinor: number, ratePct: number): number {
  return Math.round((grossMinor * ratePct) / (100 + ratePct));
}

export function formatTRY(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const lira = Math.floor(abs / 100);
  const kurus = abs % 100;
  const liraStr = lira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = kurus === 0 ? liraStr : `${liraStr},${kurus.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}${body} ₺`;
}

/** Parses a TL amount typed by a panel user ("49,90", "1.200", "599") into kuruş. */
export function parseTRYInput(raw: string): number | null {
  const s = raw.trim().replace(/\s|₺|TL/gi, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
  const [lira, kurus = ""] = s.replace(/\./g, "").split(",");
  return Number(lira) * 100 + Number(kurus.padEnd(2, "0"));
}
