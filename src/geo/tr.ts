import data from "../../data/tr-il-ilce.json";

const DATA = data as Record<string, string[]>;
const CITIES = Object.keys(DATA);

export function trUpper(s: string): string {
  return s.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
}

/** Folds Turkish letters to ASCII so "Istanbul", "istanbul", "İSTANBUL", "Kadikoy" all compare equal. */
const ASCII: Record<string, string> = { "İ": "I", "Ş": "S", "Ğ": "G", "Ü": "U", "Ö": "O", "Ç": "C" };
function fold(s: string): string {
  return trUpper(s).replace(/[İŞĞÜÖÇ]/g, (c) => ASCII[c]!);
}

const CITY_BY_FOLD = new Map(CITIES.map((c) => [fold(c), c]));
const DISTRICT_BY_FOLD = new Map(CITIES.map((c) => [c, new Map(DATA[c]!.map((d) => [fold(d), d]))]));

export function listCities(): string[] {
  return CITIES;
}

/** Canonical (data) spelling of a city, or null when unknown. */
export function canonicalCity(city: string): string | null {
  return CITY_BY_FOLD.get(fold(city)) ?? null;
}

/** Canonical spelling of a district inside a city, or null when it does not belong to it. */
export function canonicalDistrict(city: string, district: string): string | null {
  const c = canonicalCity(city);
  return c ? DISTRICT_BY_FOLD.get(c)!.get(fold(district)) ?? null : null;
}

export function listDistricts(city: string): string[] | null {
  const c = canonicalCity(city);
  return c ? DATA[c]! : null;
}

export function isValidCityDistrict(city: string, district: string): boolean {
  return canonicalDistrict(city, district) !== null;
}
