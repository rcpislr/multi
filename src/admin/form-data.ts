import { parseTRYInput } from "@/lib/money";

/** Small helpers for reading typed values out of FormData in server actions. */
export const fdStr = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const fdBool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const fdInt = (fd: FormData, k: string) => {
  const s = fdStr(fd, k);
  return /^-?\d+$/.test(s) ? Number(s) : NaN;
};
/** TL text → kuruş; NaN when invalid so Zod reports it. */
export const fdMoney = (fd: FormData, k: string) => parseTRYInput(fdStr(fd, k)) ?? NaN;
