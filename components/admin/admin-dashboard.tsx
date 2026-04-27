"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createPlayAction,
  logoutAction,
  setPlayActiveAction,
  setPlayHiddenAction,
  setPlayPublishedAction,
} from "@/app/tramoya/actions";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import type { AdminPlaySummary } from "@/lib/types";

type AdminDashboardProps = {
  plays: AdminPlaySummary[];
};

export function AdminDashboard({ plays }: AdminDashboardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const totalVoteBlocks = plays.reduce((count, play) => count + play.voteBlockCount, 0);
  const totalVotes = plays.reduce((count, play) => count + play.voteCount, 0);
  const totalExpectedVotes = plays.reduce((count, play) => count + play.actorCount * play.voteBlockCount, 0);

  function createPlay() {
    const formData = new FormData();
    formData.set("title", title);

    startTransition(async () => {
      setError("");
      const result = await createPlayAction(formData);

      if (!result.ok || !result.id) {
        setError(result.error || "No se pudo crear la obra.");
        return;
      }

      setTitle("");
      router.push(`${ADMIN_BASE_PATH}/obras/${result.id}`);
      router.refresh();
    });
  }

  function togglePlay(id: string, field: "published" | "hidden" | "active", value: boolean) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set(field, String(value));

    startTransition(async () => {
      setError("");

      const result =
        field === "published"
          ? await setPlayPublishedAction(formData)
          : field === "hidden"
            ? await setPlayHiddenAction(formData)
            : await setPlayActiveAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo actualizar la obra.");
        return;
      }

      router.refresh();
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      router.push(ADMIN_BASE_PATH);
      router.refresh();
    });
  }

  return (
    <div className="stackLg">
      <section className="panel stackMd">
        <div className="spaceBetween wrapGap">
          <div>
            <p className="eyebrow">Panel de administrador</p>
            <h1>Obras</h1>
          </div>

          <button className="button ghost" type="button" onClick={handleLogout} disabled={isPending}>
            Cerrar sesión
          </button>
        </div>

        <div className="stackSm">
          <label className="field">
            <span>Nueva obra</span>
            <input
              placeholder="Ej: La casa de Bernarda Alba"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="spaceBetween wrapGap">
            <button
              className="button primary"
              type="button"
              onClick={createPlay}
              disabled={isPending}
            >
              Crear obra
            </button>

            <p className="mutedText">Ruta secreta: `/tramoya`</p>
          </div>

          {error ? <p className="feedback error">{error}</p> : null}
        </div>
      </section>

      <section className="stackMd">
        <section className="panel stackMd subtlePanel">
          <div className="spaceBetween wrapGap startAligned">
            <div className="stackXs grow">
              <p className="eyebrow">Resumen de votaciones</p>
              <h2>Seguimiento rapido</h2>
              <p className="mutedText">
                Vista general para detectar que obras ya tienen bloques activos y cuales siguen pendientes.
              </p>
            </div>

            <span className={`badge ${totalVotes ? "accent" : "muted"}`}>{totalVotes} votos emitidos</span>
          </div>

          <div className="voteDashboardStats">
            <article className="voteDashboardStat stackXs">
              <span className="eyebrow">Bloques</span>
              <strong className="voteDashboardValue">{totalVoteBlocks}</strong>
              <p className="mutedText">Bloques `[vote]` detectados entre todas las obras.</p>
            </article>

            <article className="voteDashboardStat stackXs">
              <span className="eyebrow">Emitidos</span>
              <strong className="voteDashboardValue">{totalVotes}</strong>
              <p className="mutedText">Votos guardados en servidor y listos para revision.</p>
            </article>

            <article className="voteDashboardStat stackXs">
              <span className="eyebrow">Cobertura</span>
              <strong className="voteDashboardValue">
                {totalExpectedVotes ? `${Math.round((totalVotes / totalExpectedVotes) * 100)}%` : "0%"}
              </strong>
              <p className="mutedText">
                {totalExpectedVotes
                  ? `${totalVotes} de ${totalExpectedVotes} votos posibles considerando actores por bloque.`
                  : "Todavia no hay votaciones configuradas en el markdown."}
              </p>
            </article>
          </div>
        </section>

        {plays.length ? null : (
          <div className="panel emptyState">
            <p>Aún no hay obras cargadas.</p>
          </div>
        )}

        {plays.map((play) => (
          <article key={play.id} className="panel stackMd">
            <div className="spaceBetween wrapGap">
              <div className="stackXs">
                <div className="spaceBetween wrapGap startAligned">
                  <h2>{play.title}</h2>
                  <div className="badgeRow">
                    <span className={`badge ${play.published ? "success" : "muted"}`}>
                      {play.published ? "Publicada" : "Borrador"}
                    </span>
                    <span className={`badge ${play.hidden ? "warning" : "muted"}`}>
                      {play.hidden ? "Oculta" : "Visible"}
                    </span>
                    {play.isActive ? <span className="badge accent">Obra activa</span> : null}
                  </div>
                </div>
                <p className="mutedText mono">/obras/{play.slug}</p>
                <p className="mutedText">
                  {play.actorCount} actores · {play.assignmentCount} fragmentos marcados
                </p>
                <div className="voteInlineSummary">
                  <span className={`badge ${play.voteBlockCount ? "accent" : "muted"}`}>
                    {play.voteBlockCount} bloque{play.voteBlockCount === 1 ? "" : "s"} de voto
                  </span>
                  <span className={`badge ${play.voteCount ? "success" : "muted"}`}>
                    {play.voteCount}/{play.actorCount * play.voteBlockCount || 0} votos
                  </span>
                </div>
              </div>

              <Link className="button secondary" href={`${ADMIN_BASE_PATH}/obras/${play.id}`}>
                Editar
              </Link>
            </div>

            <div className="buttonRow">
              <button
                className="button secondary"
                type="button"
                onClick={() => togglePlay(play.id, "published", !play.published)}
                disabled={isPending}
              >
                {play.published ? "Quitar publicación" : "Publicar"}
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={() => togglePlay(play.id, "hidden", !play.hidden)}
                disabled={isPending}
              >
                {play.hidden ? "Mostrar en público" : "Ocultar"}
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={() => togglePlay(play.id, "active", !play.isActive)}
                disabled={isPending}
              >
                {play.isActive ? "Desactivar" : "Marcar activa"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
