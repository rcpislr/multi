/** Formats kuruş for a TL text input ("49,90"); empty for null. */
export function minorToInput(minor: number | null | undefined): string {
  if (minor == null) return "";
  const lira = Math.floor(minor / 100);
  const kurus = minor % 100;
  return kurus ? `${lira},${String(kurus).padStart(2, "0")}` : String(lira);
}
