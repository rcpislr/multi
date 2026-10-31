import { describe, it, expect } from "vitest";
import { canTransition } from "@/orders/status";

describe("canTransition", () => {
  it.each([
    ["yeni", "onaylandi", true], ["yeni", "kargoda", false], ["onaylandi", "kargoda", true],
    ["kargoda", "teslim_edildi", true], ["kargoda", "iade", true], ["teslim_edildi", "iade", true],
    ["teslim_edildi", "iptal", false], ["iptal", "yeni", false], ["iade", "kargoda", false],
    ["dogrulama_bekliyor", "yeni", true], ["dogrulanmadi", "yeni", true], ["yeni", "yeni", false],
  ] as const)("%s -> %s = %s", (from, to, ok) => expect(canTransition(from, to)).toBe(ok));
});
