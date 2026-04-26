import { notFound } from "next/navigation";

import { PublicPlayView } from "@/components/public/public-play-view";
import { getPublicPlayBySlug } from "@/lib/plays";

export const dynamic = "force-dynamic";

type PlayPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { slug } = await params;
  const play = await getPublicPlayBySlug(slug);

  if (!play) {
    notFound();
  }

  return <PublicPlayView play={play} />;
}
