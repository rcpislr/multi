import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "operator", input: false },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://panel.localhost:3000"],
  plugins: [nextCookies()],
});
