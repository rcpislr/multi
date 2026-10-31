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
