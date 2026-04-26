import { notFound } from "next/navigation";

import { PlayEditor } from "@/components/admin/play-editor";
import { requireAdmin } from "@/lib/auth";
import { getAdminPlayById } from "@/lib/plays";

export const dynamic = "force-dynamic";

type AdminPlayPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminPlayPage({ params }: AdminPlayPageProps) {
  await requireAdmin();
  const { id } = await params;
  const play = await getAdminPlayById(id);

  if (!play) {
    notFound();
  }

  return (
    <main className="pageShell adminShell">
      <PlayEditor play={play} />
    </main>
  );
}
