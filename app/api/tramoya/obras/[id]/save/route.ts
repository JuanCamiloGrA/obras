import { NextResponse } from "next/server";

import { savePlayDraft } from "@/lib/admin-play-save";
import { isAdminAuthenticated } from "@/lib/auth";

type SaveRequestBody = {
  title?: unknown;
  slug?: unknown;
  markdown?: unknown;
  sync?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as SaveRequestBody;
  const { id } = await params;
  const result = await savePlayDraft({
    id,
    title: String(body.title || ""),
    slugSource: String(body.slug || ""),
    markdown: String(body.markdown || ""),
    revalidate: body.sync === true,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
