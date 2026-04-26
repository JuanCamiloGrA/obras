import Link from "next/link";

import type { PublicPlaySummary } from "@/lib/types";

type PlayListProps = {
  plays: PublicPlaySummary[];
  title: string;
  description: string;
};

export function PlayList({ plays, title, description }: PlayListProps) {
  return (
    <main className="pageShell stackLg">
      <section className="heroBlock stackSm">
        <p className="eyebrow">Guiones disponibles</p>
        <h1>{title}</h1>
        <p className="leadText">{description}</p>
      </section>

      <section className="stackMd">
        {plays.length ? null : (
          <div className="panel emptyState">
            <p>No hay obras visibles en este momento.</p>
          </div>
        )}

        {plays.map((play) => (
          <article key={play.id} className="panel stackSm">
            <div className="spaceBetween wrapGap startAligned">
              <div className="stackXs grow">
                <h2>{play.title}</h2>
                <p className="mutedText">{play.actorCount} actores cargados</p>
                <p className="leadText smallLead">{play.excerpt || "Sin resumen todavía."}</p>
              </div>

              <Link className="button primary" href={`/obras/${play.slug}`}>
                Abrir obra
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
