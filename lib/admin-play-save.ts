import "server-only";

import { revalidatePath } from "next/cache";

import { ADMIN_PANEL_PATH } from "@/lib/constants";
import { getPlaySlugById, isSlugTaken, updatePlay } from "@/lib/plays";
import { slugify } from "@/lib/utils";

type SavePlayDraftInput = {
  id: string;
  title: string;
  slugSource: string;
  markdown: string;
  revalidate?: boolean;
};

export type SavePlayDraftResult = {
  ok: boolean;
  error?: string;
  slug?: string;
  savedAt?: string;
};

export async function ensureUniqueSlug(baseValue: string, excludeId?: string) {
  const base = slugify(baseValue) || "obra";
  let candidate = base;
  let index = 2;

  while (true) {
    if (!(await isSlugTaken(candidate, excludeId))) {
      return candidate;
    }

    candidate = `${base}-${index}`;
    index += 1;
  }
}

export async function revalidatePlayPaths(playId: string) {
  const slug = await getPlaySlugById(playId);

  revalidatePath("/");
  revalidatePath("/obras");
  revalidatePath(ADMIN_PANEL_PATH);

  if (slug) {
    revalidatePath(`/obras/${slug}`);
    revalidatePath(`${ADMIN_PANEL_PATH.replace(/\/panel$/, "")}/obras/${playId}`);
  }
}

export async function savePlayDraft({
  id,
  title,
  slugSource,
  markdown,
  revalidate = false,
}: SavePlayDraftInput): Promise<SavePlayDraftResult> {
  const normalizedTitle = title.trim();

  if (!id || !normalizedTitle) {
    return { ok: false, error: "La obra necesita título." };
  }

  const slug = await ensureUniqueSlug(slugSource || normalizedTitle, id);

  await updatePlay(id, normalizedTitle, slug, markdown);

  if (revalidate) {
    await revalidatePlayPaths(id);
  }

  return {
    ok: true,
    slug,
    savedAt: new Date().toISOString(),
  };
}
