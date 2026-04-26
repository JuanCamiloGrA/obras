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
