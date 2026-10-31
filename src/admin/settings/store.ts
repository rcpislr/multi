import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings, type Settings } from "@/db/schema";

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  const [created] = await db.select().from(settings).where(eq(settings.id, 1));
  return created!;
}

export async function updateSettings(patch: Partial<Omit<Settings, "id">>): Promise<Settings> {
  await getSettings();
  const [row] = await db.update(settings).set(patch).where(eq(settings.id, 1)).returning();
  return row!;
}
