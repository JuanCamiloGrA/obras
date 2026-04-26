import { PlayList } from "@/components/public/play-list";
import { getPublishedPlayList } from "@/lib/plays";

export const dynamic = "force-dynamic";

export default async function PlaysPage() {
  const plays = await getPublishedPlayList();

  return (
    <PlayList
      plays={plays}
      title="Todas las obras"
      description="Aquí se muestran solo las obras publicadas y visibles para los actores."
    />
  );
}
