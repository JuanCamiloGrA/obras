import { NextResponse } from "next/server";

import { decodeMediaRouteKey } from "@/lib/media";
import { getR2Object } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MediaRouteProps = {
  params: Promise<{
    key: string[];
  }>;
};

type R2ReadableBody = {
  transformToWebStream?: () => ReadableStream<Uint8Array>;
  transformToByteArray?: () => Promise<Uint8Array>;
};

function createMediaHeaders(object: Awaited<ReturnType<typeof getR2Object>>) {
  const headers = new Headers();

  headers.set("Cache-Control", object.CacheControl || "public, max-age=31536000, immutable");
  headers.set("Content-Type", object.ContentType || "application/octet-stream");
  headers.set("Content-Disposition", "inline");

  if (typeof object.ContentLength === "number" && object.ContentLength > 0) {
    headers.set("Content-Length", String(object.ContentLength));
  }

  if (object.ETag) {
    headers.set("ETag", object.ETag);
  }

  if (object.LastModified) {
    headers.set("Last-Modified", object.LastModified.toUTCString());
  }

  return headers;
}

export async function GET(_: Request, { params }: MediaRouteProps) {
  const { key } = await params;
  const objectKey = decodeMediaRouteKey(key);

  if (!objectKey) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }

  try {
    const object = await getR2Object(objectKey);
    const body = object.Body as R2ReadableBody | undefined;
    const headers = createMediaHeaders(object);

    if (body?.transformToWebStream) {
      return new Response(body.transformToWebStream(), {
        headers,
      });
    }

    if (body?.transformToByteArray) {
      const bytes = Uint8Array.from(await body.transformToByteArray());

      return new Response(new Blob([bytes]), {
        headers,
      });
    }

    return NextResponse.json({ error: "Archivo sin contenido." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer el archivo.";
    const status = /NoSuchKey|not found|not exist/i.test(message) ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
