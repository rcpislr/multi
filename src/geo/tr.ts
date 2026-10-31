import data from "../../data/tr-il-ilce.json";

const DATA = data as Record<string, string[]>;
const CITIES = Object.keys(DATA);

export function trUpper(s: string): string {
  return s.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
}

export function listCities(): string[] {
  return CITIES;
}

export function listDistricts(city: string): string[] | null {
  return DATA[trUpper(city)] ?? null;
}

export function isValidCityDistrict(city: string, district: string): boolean {
  return listDistricts(city)?.includes(trUpper(district)) ?? false;
}
