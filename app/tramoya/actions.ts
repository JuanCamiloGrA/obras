"use server";

import { revalidatePath } from "next/cache";

import { logoutAdmin, loginAdmin, requireAdmin } from "@/lib/auth";
import { ADMIN_PANEL_PATH } from "@/lib/constants";
import {
  createActor,
  createPlay,
  deleteActor,
  deleteAssignment,
  getPlaySlugById,
  getPlayStatusById,
  isSlugTaken,
  saveAssignment,
  setPlayActive,
  updatePlay,
  updatePlayHidden,
  updatePlayPublished,
} from "@/lib/plays";
import { slugify } from "@/lib/utils";

type ActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

function normalizeBoolean(value: FormDataEntryValue | null) {
  return value === "true";
}

async function ensureUniqueSlug(baseValue: string, excludeId?: string) {
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

async function revalidatePlayPaths(playId: string) {
  const slug = await getPlaySlugById(playId);

  revalidatePath("/");
  revalidatePath("/obras");
  revalidatePath(ADMIN_PANEL_PATH);

  if (slug) {
    revalidatePath(`/obras/${slug}`);
    revalidatePath(`${ADMIN_PANEL_PATH.replace(/\/panel$/, "")}/obras/${playId}`);
  }
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  const ok = await loginAdmin(username, password);

  if (!ok) {
    return {
      ok: false,
      error: "Las credenciales no coinciden.",
    };
  }

  return { ok: true };
}

export async function logoutAction() {
  await logoutAdmin();
  return { ok: true };
}

export async function createPlayAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const rawTitle = String(formData.get("title") || "").trim();
  const title = rawTitle || "Nueva obra";
  const slug = await ensureUniqueSlug(String(formData.get("slug") || title));

  const play = await createPlay(title, slug);

  await revalidatePlayPaths(play.id);

  return { ok: true, id: play.id };
}

export async function savePlayAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const markdown = String(formData.get("markdown") || "");

  if (!id || !title) {
    return { ok: false, error: "La obra necesita título." };
  }

  const slugSource = String(formData.get("slug") || title);
  const slug = await ensureUniqueSlug(slugSource, id);

  await updatePlay(id, title, slug, markdown);

  await revalidatePlayPaths(id);
  return { ok: true };
}

export async function setPlayPublishedAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const published = normalizeBoolean(formData.get("published"));

  await updatePlayPublished(id, published);

  await revalidatePlayPaths(id);
  return { ok: true };
}

export async function setPlayHiddenAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const hidden = normalizeBoolean(formData.get("hidden"));

  await updatePlayHidden(id, hidden);

  await revalidatePlayPaths(id);
  return { ok: true };
}

export async function setPlayActiveAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const active = normalizeBoolean(formData.get("active"));

  const play = await getPlayStatusById(id);

  if (!play) {
    return { ok: false, error: "La obra no existe." };
  }

  if (active && (!play.published || play.hidden)) {
    return {
      ok: false,
      error: "Solo una obra publicada y visible puede quedar activa.",
    };
  }

  await setPlayActive(id, active);

  await revalidatePlayPaths(id);
  return { ok: true };
}

export async function createActorAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const playId = String(formData.get("playId") || "");
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { ok: false, error: "Escribe un nombre para el actor." };
  }

  try {
    await createActor(playId, name);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return {
        ok: false,
        error: "Ese actor ya existe en esta obra.",
      };
    }

    return {
      ok: false,
      error: "No se pudo crear el actor.",
    };
  }

  await revalidatePlayPaths(playId);
  return { ok: true };
}

export async function deleteActorAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const playId = String(formData.get("playId") || "");
  const actorId = String(formData.get("actorId") || "");

  await deleteActor(playId, actorId);

  await revalidatePlayPaths(playId);
  return { ok: true };
}

export async function saveAssignmentAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const playId = String(formData.get("playId") || "");
  const startOffset = Number(formData.get("startOffset") || 0);
  const endOffset = Number(formData.get("endOffset") || 0);
  const selectedText = String(formData.get("selectedText") || "");
  const markdown = String(formData.get("markdown") || "");
  const actorIds = String(formData.get("actorIds") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!selectedText.trim() || endOffset <= startOffset) {
    return { ok: false, error: "Selecciona un fragmento válido." };
  }

  if (markdown && markdown.slice(startOffset, endOffset) !== selectedText) {
    return { ok: false, error: "La selección ya no coincide con el Markdown actual." };
  }

  if (!actorIds.length) {
    return { ok: false, error: "Selecciona al menos un actor." };
  }

  await saveAssignment(playId, startOffset, endOffset, selectedText, actorIds);

  await revalidatePlayPaths(playId);
  return { ok: true };
}

export async function deleteAssignmentAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const playId = String(formData.get("playId") || "");
  const assignmentId = String(formData.get("assignmentId") || "");

  await deleteAssignment(playId, assignmentId);

  await revalidatePlayPaths(playId);
  return { ok: true };
}
