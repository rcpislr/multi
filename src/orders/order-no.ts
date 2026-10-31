import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newOrderNo(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += CROCKFORD[b % 32];
  return out;
}

export function newPublicToken(): string {
  return randomBytes(16).toString("hex");
}
