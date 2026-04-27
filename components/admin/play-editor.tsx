"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createActorAction,
  deleteActorAction,
  deleteAssignmentAction,
  saveAssignmentAction,
  savePlayAction,
  setPlayActiveAction,
  setPlayHiddenAction,
  setPlayPublishedAction,
} from "@/app/tramoya/actions";
import { FileUploadControl } from "@/components/admin/file-upload-control";
import { MarkdownArticle } from "@/components/shared/markdown-article";
import { ADMIN_PANEL_PATH } from "@/lib/constants";
import type { AdminPlayDetail } from "@/lib/types";
import { insertAtSelection } from "@/lib/utils";

type PlayEditorProps = {
  play: AdminPlayDetail;
};

export function PlayEditor({ play }: PlayEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [title, setTitle] = useState(play.title);
  const [slug, setSlug] = useState(play.slug);
  const [markdown, setMarkdown] = useState(play.markdown);
  const [actorName, setActorName] = useState("");
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>([]);
  const [previewActorId, setPreviewActorId] = useState("");
  const [selection, setSelection] = useState({
    startOffset: 0,
    endOffset: 0,
    selectedText: "",
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function refreshSelection() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    const selectedText = markdown.slice(startOffset, endOffset).trim();

    setSelection({
      startOffset,
      endOffset,
      selectedText,
    });
  }

  function savePlay() {
    const formData = new FormData();
    formData.set("id", play.id);
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("markdown", markdown);

    startTransition(async () => {
      setFeedback("");
      setError("");
      const result = await savePlayAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo guardar la obra.");
        return;
      }

      setFeedback("Cambios guardados.");
      router.refresh();
    });
  }

  function createActor() {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("name", actorName);

    startTransition(async () => {
      setFeedback("");
      setError("");
      const result = await createActorAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo crear el actor.");
        return;
      }

      setActorName("");
      setFeedback("Actor creado.");
      router.refresh();
    });
  }

  function deleteActor(actorId: string) {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("actorId", actorId);

    startTransition(async () => {
      setFeedback("");
      setError("");
      const result = await deleteActorAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo borrar el actor.");
        return;
      }

      setSelectedActorIds((current) => current.filter((id) => id !== actorId));
      if (previewActorId === actorId) {
        setPreviewActorId("");
      }
      setFeedback("Actor eliminado.");
      router.refresh();
    });
  }

  function saveAssignment() {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("startOffset", String(selection.startOffset));
    formData.set("endOffset", String(selection.endOffset));
    formData.set("selectedText", selection.selectedText);
    formData.set("actorIds", selectedActorIds.join(","));

    startTransition(async () => {
      setFeedback("");
      setError("");
      const result = await saveAssignmentAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo guardar el fragmento.");
        return;
      }

      setFeedback("Fragmento asignado.");
      router.refresh();
    });
  }

  function deleteAssignment(assignmentId: string) {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("assignmentId", assignmentId);

    startTransition(async () => {
      setFeedback("");
      setError("");
      const result = await deleteAssignmentAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo borrar el fragmento.");
        return;
      }

      setFeedback("Fragmento eliminado.");
      router.refresh();
    });
  }

  function toggleStatus(field: "published" | "hidden" | "active", value: boolean) {
    const formData = new FormData();
    formData.set("id", play.id);
    formData.set(field, String(value));

    startTransition(async () => {
      setFeedback("");
      setError("");

      const result =
        field === "published"
          ? await setPlayPublishedAction(formData)
          : field === "hidden"
            ? await setPlayHiddenAction(formData)
            : await setPlayActiveAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo actualizar el estado.");
        return;
      }

      setFeedback("Estado actualizado.");
      router.refresh();
    });
  }

  function toggleSelectedActor(actorId: string) {
    setSelectedActorIds((current) =>
      current.includes(actorId)
        ? current.filter((id) => id !== actorId)
        : [...current, actorId],
    );
  }

  function handleInsert(snippet: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? markdown.length;
    const end = textarea?.selectionEnd ?? markdown.length;

    const nextValue = insertAtSelection(markdown, start, end, snippet);
    setMarkdown(nextValue);
    setFeedback("Bloque insertado en el Markdown.");

    requestAnimationFrame(() => {
      textarea?.focus();
      const nextCursor = start + snippet.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
      refreshSelection();
    });
  }

  return (
    <div className="stackLg">
      <div className="spaceBetween wrapGap">
        <div>
          <p className="eyebrow">Editor de obra</p>
          <h1>{play.title}</h1>
        </div>

        <Link className="button ghost" href={ADMIN_PANEL_PATH}>
          Volver al panel
        </Link>
      </div>

      <section className="panel stackMd">
        <div className="statusGrid">
          <div className="statusItem">
            <span className={`badge ${play.published ? "success" : "muted"}`}>
              {play.published ? "Publicada" : "Borrador"}
            </span>
            <button
              className="button secondary"
              type="button"
              onClick={() => toggleStatus("published", !play.published)}
              disabled={isPending}
            >
              {play.published ? "Quitar publicación" : "Publicar"}
            </button>
          </div>

          <div className="statusItem">
            <span className={`badge ${play.hidden ? "warning" : "muted"}`}>
              {play.hidden ? "Oculta" : "Visible"}
            </span>
            <button
              className="button secondary"
              type="button"
              onClick={() => toggleStatus("hidden", !play.hidden)}
              disabled={isPending}
            >
              {play.hidden ? "Mostrar" : "Ocultar"}
            </button>
          </div>

          <div className="statusItem">
            <span className={`badge ${play.isActive ? "accent" : "muted"}`}>
              {play.isActive ? "Obra activa" : "Sin activar"}
            </span>
            <button
              className="button secondary"
              type="button"
              onClick={() => toggleStatus("active", !play.isActive)}
              disabled={isPending}
            >
              {play.isActive ? "Desactivar" : "Marcar activa"}
            </button>
          </div>
        </div>

        {feedback ? <p className="feedback successText">{feedback}</p> : null}
        {error ? <p className="feedback error">{error}</p> : null}
      </section>

      <section className="editorGrid">
        <div className="stackMd">
          <section className="panel stackMd">
            <label className="field">
              <span>Título</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="field">
              <span>Slug público</span>
              <input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </label>

            <label className="field">
              <span>Markdown de la obra</span>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                onSelect={refreshSelection}
                onKeyUp={refreshSelection}
                rows={22}
                placeholder="# Acto 1\n\nEscribe el guion aquí..."
              />
            </label>

            <div className="spaceBetween wrapGap">
              <button className="button primary" type="button" onClick={savePlay} disabled={isPending}>
                Guardar obra
              </button>
              <p className="mutedText">
                Selecciona texto directo dentro del editor para asignarlo a actores.
              </p>
            </div>
          </section>

          <section className="panel stackSm subtlePanel">
            <div className="spaceBetween wrapGap startAligned">
              <div className="stackXs grow">
                <p className="eyebrow">Bloques de votacion</p>
                <h2>Insertar una votacion privada</h2>
                <p className="mutedText">
                  Los actores deben elegir su nombre para votar. Solo el admin vera los nombres en el panel.
                </p>
              </div>

              <button
                className="button secondary"
                type="button"
                onClick={() => handleInsert("[vote]\n---\nOpcion 1\n---\nOpcion 2\n\n")}
              >
                Insertar bloque
              </button>
            </div>

            <div className="selectionBox mono">[vote]{"\n"}---{"\n"}Opcion 1{"\n"}---{"\n"}Opcion 2</div>
          </section>

          <FileUploadControl playId={play.id} onInsert={handleInsert} />

          <section className="panel stackMd">
            <div>
              <p className="eyebrow">Actores</p>
              <h2>Lista de actores</h2>
            </div>

            <div className="spaceBetween wrapGap startAligned">
              <label className="field inlineField grow">
                <span>Nuevo actor</span>
                <input
                  placeholder="Ej: Maria"
                  value={actorName}
                  onChange={(event) => setActorName(event.target.value)}
                />
              </label>

              <button className="button secondary" type="button" onClick={createActor} disabled={isPending}>
                Agregar actor
              </button>
            </div>

            <div className="tokenList">
              {play.actors.length ? null : <p className="mutedText">Aún no hay actores cargados.</p>}
              {play.actors.map((actor) => (
                <div key={actor.id} className="tokenCard">
                  <span>{actor.name}</span>
                  <button type="button" className="miniButton" onClick={() => deleteActor(actor.id)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel stackMd">
            <div>
              <p className="eyebrow">Asignación</p>
              <h2>Fragmento seleccionado</h2>
            </div>

            <div className="selectionBox">
              {selection.selectedText || "Selecciona un tramo del Markdown para asignarlo."}
            </div>

            <p className="mutedText mono">
              {selection.startOffset} - {selection.endOffset}
            </p>

            <div className="checkList">
              {play.actors.map((actor) => (
                <label key={actor.id} className="checkItem">
                  <input
                    type="checkbox"
                    checked={selectedActorIds.includes(actor.id)}
                    onChange={() => toggleSelectedActor(actor.id)}
                  />
                  <span>{actor.name}</span>
                </label>
              ))}
            </div>

            <button className="button primary" type="button" onClick={saveAssignment} disabled={isPending}>
              Guardar fragmento
            </button>

            <div className="stackSm">
              <h3>Fragmentos guardados</h3>
              {play.assignments.length ? null : (
                <p className="mutedText">Todavía no hay fragmentos asignados.</p>
              )}

              {play.assignments.map((assignment) => (
                <div key={assignment.id} className="assignmentCard">
                  <div className="stackXs grow">
                    <p className="assignmentText">“{assignment.selectedText}”</p>
                    <p className="mutedText">{assignment.actorNames.join(", ")}</p>
                  </div>

                  <button
                    className="miniButton"
                    type="button"
                    onClick={() => deleteAssignment(assignment.id)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel stackMd">
            <div className="spaceBetween wrapGap startAligned">
              <div className="stackXs grow">
                <p className="eyebrow">Votaciones</p>
                <h2>Revision del administrador</h2>
                <p className="mutedText">
                  Cada actor conserva un solo voto por bloque. Si vuelve a votar, se reemplaza el anterior.
                </p>
              </div>

              <button className="button ghost" type="button" onClick={() => router.refresh()} disabled={isPending}>
                Actualizar votos
              </button>
            </div>

            {play.votes.length ? null : (
              <p className="mutedText">
                Aun no hay bloques de votacion. Inserta uno en el Markdown con la sintaxis mostrada arriba.
              </p>
            )}

            <div className="stackSm">
              {play.votes.map((vote) => (
                <article key={vote.id} className="voteReviewCard stackSm">
                  <div className="spaceBetween wrapGap startAligned">
                    <div className="stackXs grow">
                      <h3>{vote.title}</h3>
                      <p className="mutedText">
                        {vote.totalVotes} de {play.actors.length} actores han votado en este bloque.
                      </p>
                    </div>

                    <span className={`badge ${vote.totalVotes ? "accent" : "muted"}`}>
                      {vote.totalVotes} voto{vote.totalVotes === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="voteReviewGrid">
                    {vote.options.map((option) => (
                      <section key={option.id} className="voteReviewOption stackXs">
                        <div className="spaceBetween wrapGap">
                          <p className="voteReviewOptionLabel">{option.label}</p>
                          <span className={`badge ${option.voteCount ? "success" : "muted"}`}>
                            {option.voteCount}
                          </span>
                        </div>

                        <p className="mutedText voteReviewNames">
                          {option.actorNames.length
                            ? option.actorNames.join(", ")
                            : "Sin votos registrados en esta opcion todavia."}
                        </p>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel stackMd previewPanel">
          <div className="spaceBetween wrapGap">
            <div>
              <p className="eyebrow">Vista previa</p>
              <h2>Cómo lo verá el actor</h2>
            </div>

            <label className="field compactField">
              <span>Resaltar actor</span>
              <select value={previewActorId} onChange={(event) => setPreviewActorId(event.target.value)}>
                <option value="">Sin resaltar</option>
                {play.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <MarkdownArticle
            key={previewActorId || "preview-play"}
            markdown={markdown}
            assignments={play.assignments}
            activeActorId={previewActorId}
            playId={play.id}
            actors={play.actors}
            enableVoting={false}
          />
        </section>
      </section>
    </div>
  );
}
