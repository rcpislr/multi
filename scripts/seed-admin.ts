import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, user } from "@/db/schema";

async function main() {
  const [email, password, role = "admin"] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error("usage: pnpm seed:admin <email> <password(min 8)> [admin|operator]");
    process.exit(2);
  }
  const existing = await db.select().from(user).where(eq(user.email, email.toLowerCase()));
  if (existing.length) { console.log("user exists:", email); process.exit(0); }
  const id = randomUUID();
  await db.insert(user).values({ id, name: email, email: email.toLowerCase(), emailVerified: true, role: role === "operator" ? "operator" : "admin" });
  await db.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
  console.log("created", role, email);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
