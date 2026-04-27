import path from "node:path";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { buildMediaPath } from "@/lib/media";
import { createR2UploadUrl } from "@/lib/r2";
import { sanitizeFilename } from "@/lib/utils";

export const dynamic = "force-dynamic";

type UploadRequest = {
  playId?: unknown;
  fileName?: unknown;
  contentType?: unknown;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as UploadRequest | null;
  const playId = typeof payload?.playId === "string" && payload.playId ? payload.playId : "general";
  const originalName = typeof payload?.fileName === "string" ? payload.fileName : "";
  const contentType = typeof payload?.contentType === "string" ? payload.contentType : "";

  if (!originalName) {
    return NextResponse.json({ error: "Falta el nombre del archivo." }, { status: 400 });
  }

  if (!contentType.startsWith("image/") && !contentType.startsWith("audio/")) {
    return NextResponse.json({ error: "Solo se aceptan imágenes o audios." }, { status: 400 });
  }

  const extension = path.extname(originalName) || (contentType.startsWith("image/") ? ".png" : ".mp3");
  const safeName = sanitizeFilename(path.basename(originalName, extension)) || "archivo";
  const fileName = `plays/${playId}/${Date.now()}-${safeName}${extension}`;
  const cacheControl = contentType.startsWith("image/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=604800";

  try {
    const uploaded = await createR2UploadUrl({
      key: fileName,
      contentType,
      cacheControl,
    });

    return NextResponse.json({
      headers: {
        "Cache-Control": cacheControl,
        "Content-Type": contentType,
      },
      uploadUrl: uploaded.uploadUrl,
      url: buildMediaPath(uploaded.key),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el archivo en R2.",
      },
      { status: 500 },
    );
  }
}
