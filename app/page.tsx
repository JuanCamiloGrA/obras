import { PlayList } from "@/components/public/play-list";
import { PublicPlayView } from "@/components/public/public-play-view";
import { getActivePublicPlay, getPublishedPlayList } from "@/lib/plays";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activePlay = await getActivePublicPlay();

  if (activePlay) {
    return <PublicPlayView play={activePlay} showListLink />;
  }

  const plays = await getPublishedPlayList();

  return (
    <PlayList
      plays={plays}
      title="Obras disponibles"
      description="Si hay una obra activa, aparecerá directo aquí. Si no, verás el listado para elegir la que quieras repasar."
    />
  );
}
