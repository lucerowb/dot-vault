import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET?.trim()) {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

const secret =
  process.env.BETTER_AUTH_SECRET?.trim() ??
  "dev-only-change-better-auth-secret-never-use-in-real-prod-env";

if (secret.length < 16) {
  throw new Error("BETTER_AUTH_SECRET must be at least 16 characters when set.");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL,
  secret,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  plugins: [nextCookies()],
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((x): x is string => !!x?.trim()),
});
