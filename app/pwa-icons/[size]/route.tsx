import { NextResponse } from "next/server";

import { createPwaIconResponse } from "@/lib/pwa-icon";

const ALLOWED_SIZES = new Set([192, 512]);

type PwaIconRouteProps = {
  params: Promise<{
    size: string;
  }>;
};

export async function GET(_: Request, { params }: PwaIconRouteProps) {
  const { size } = await params;
  const iconSize = Number(size);

  if (!ALLOWED_SIZES.has(iconSize)) {
    return NextResponse.json({ error: "Tamaño de icono no soportado." }, { status: 404 });
  }

  return createPwaIconResponse({ size: iconSize });
}
