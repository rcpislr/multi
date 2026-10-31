import { config } from "dotenv";
config({ path: ".env", quiet: true });
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
