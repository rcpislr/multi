import { revalidateTag, updateTag } from "next/cache";

/** Cache tags: `settings`, `site:{id}`, `product:{id}`, `domain:{id}`. */
export function invalidateTags(...tags: string[]): void {
  for (const tag of tags) {
    try {
      updateTag(tag); // server action: immediate, read-your-own-writes
    } catch {
      try { revalidateTag(tag, { expire: 0 }); } catch { /* outside a Next request (scripts, tests) */ }
    }
  }
}
