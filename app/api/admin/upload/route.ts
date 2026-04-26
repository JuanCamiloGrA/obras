import path from "node:path";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { sanitizeFilename } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const playId = String(formData.get("playId") || "general");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "Solo se aceptan imágenes o audios." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || (file.type.startsWith("image/") ? ".png" : ".mp3");
  const safeName = sanitizeFilename(path.basename(file.name, extension));
  const fileName = `plays/${playId}/${Date.now()}-${safeName}${extension}`;

  try {
    const uploaded = await uploadToR2({
      key: fileName,
      body: buffer,
      contentType: file.type || undefined,
      cacheControl: file.type.startsWith("image/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=604800",
    });

    return NextResponse.json({
      url: uploaded.url,
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
