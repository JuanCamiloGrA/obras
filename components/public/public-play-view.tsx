"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PlayDownloadButton } from "@/components/public/play-download-button";
import { PwaCacheHint } from "@/components/public/pwa-cache-hint";
import { MarkdownArticle } from "@/components/shared/markdown-article";
import { STORAGE_KEY_PREFIX } from "@/lib/constants";
import { extractPlayMediaUrls } from "@/lib/play-offline-assets";
import type { PublicPlayDetail } from "@/lib/types";

type PublicPlayViewProps = {
  play: PublicPlayDetail;
  showListLink?: boolean;
};

export function PublicPlayView({ play, showListLink = false }: PublicPlayViewProps) {
  const [query, setQuery] = useState("");
  const storageKey = `${STORAGE_KEY_PREFIX}:actor:${play.id}`;
  const [selectedActorId, setSelectedActorId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const saved = window.localStorage.getItem(storageKey);
    return saved && play.actors.some((actor) => actor.id === saved) ? saved : "";
  });

  useEffect(() => {
    if (!selectedActorId) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, selectedActorId);
  }, [selectedActorId, storageKey]);

  const filteredActors = play.actors.filter((actor) =>
    actor.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedActor = play.actors.find((actor) => actor.id === selectedActorId) ?? null;
  const mediaUrls = useMemo(() => extractPlayMediaUrls(play.markdown), [play.markdown]);
  const cacheUrls = useMemo(
    () => ["/", "/obras", `/obras/${play.slug}`, ...mediaUrls],
    [mediaUrls, play.slug],
  );

  return (
    <main className="pageShell stackLg">
      <PwaCacheHint urls={cacheUrls} />

      <section className="heroBlock stackMd">
        <div className="spaceBetween wrapGap startAligned">
          <div className="stackXs grow">
            <p className="eyebrow">Guion</p>
            <h1>{play.title}</h1>
            <p className="leadText">
              Busca tu nombre, selecciónalo una vez y el guion resaltará solo tus partes.
            </p>
          </div>

          {showListLink ? (
            <Link className="button ghost" href="/obras">
              Ver todas las obras
            </Link>
          ) : null}
        </div>

        <section className="panel stackMd actorPickerPanel">
          <div className="stackXs">
            <p className="pickerTitle">¿Quién eres?</p>
            <p className="mutedText">
              {selectedActor ? `Resaltando: ${selectedActor.name}` : "Elige tu nombre para ver tus parlamentos."}
            </p>
          </div>

          <label className="field">
            <span>Buscar actor</span>
            <input
              placeholder="Escribe tu nombre"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="actorGrid">
            {filteredActors.map((actor) => (
              <button
                key={actor.id}
                type="button"
                className={`actorButton ${selectedActorId === actor.id ? "selected" : ""}`}
                onClick={() => setSelectedActorId(actor.id)}
              >
                {actor.name}
              </button>
            ))}
          </div>

          {selectedActorId ? (
            <button type="button" className="button ghost" onClick={() => setSelectedActorId("")}>
              Limpiar selección
            </button>
          ) : null}

          <PlayDownloadButton urls={cacheUrls} selectedActorName={selectedActor?.name} />
        </section>
      </section>

      <MarkdownArticle
        key={selectedActorId || "public-play"}
        markdown={play.markdown}
        assignments={play.assignments}
        activeActorId={selectedActorId}
        playId={play.id}
        actors={play.actors}
      />
    </main>
  );
}
