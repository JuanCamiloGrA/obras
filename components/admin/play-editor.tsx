"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createActorAction,
  deleteActorAction,
  deleteAssignmentAction,
  saveAssignmentAction,
  setPlayActiveAction,
  setPlayHiddenAction,
  setPlayPublishedAction,
} from "@/app/tramoya/actions";
import { FileUploadControl } from "@/components/admin/file-upload-control";
import { SelectionContextMenu } from "@/components/admin/selection-context-menu";
import { MarkdownArticle } from "@/components/shared/markdown-article";
import { ADMIN_PANEL_PATH } from "@/lib/constants";
import type { AdminPlayDetail } from "@/lib/types";
import { insertAtSelection } from "@/lib/utils";

type PlayEditorProps = {
  play: AdminPlayDetail;
};

type SelectionState = {
  startOffset: number;
  endOffset: number;
  selectedText: string;
};

type SelectionMenuState = SelectionState & {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

const mirrorProperties = [
  "boxSizing",
  "width",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] as const;

function getTextareaSelectionAnchor(
  textarea: HTMLTextAreaElement,
  offset: number,
): Pick<SelectionMenuState, "left" | "top" | "placement"> {
  const textareaRect = textarea.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const marker = document.createElement("span");

  for (const property of mirrorProperties) {
    mirror.style[property] = computedStyle[property];
  }

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.wordBreak = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.top = `${textareaRect.top + window.scrollY - textarea.scrollTop}px`;
  mirror.style.left = `${textareaRect.left + window.scrollX - textarea.scrollLeft}px`;
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.slice(0, offset);
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);

  const markerRect = marker.getBoundingClientRect();
  mirror.remove();
  const placement: SelectionMenuState["placement"] = markerRect.top < 220 ? "bottom" : "top";

  return {
    left: Math.min(Math.max(markerRect.left, 18), window.innerWidth - 18),
    top: placement === "top" ? markerRect.top - 10 : markerRect.bottom + 10,
    placement,
  };
}

type DraftSnapshot = {
  title: string;
  slug: string;
  markdown: string;
};

type SaveState = "saved" | "dirty" | "saving" | "error";

type SaveResponse = {
  ok: boolean;
  error?: string;
  slug?: string;
  savedAt?: string;
};

const AUTOSAVE_DEBOUNCE_MS = 1500;
const AUTOSAVE_MIN_INTERVAL_MS = 5000;

function makeDraftSnapshot(title: string, slug: string, markdown: string): DraftSnapshot {
  return { title, slug, markdown };
}

function serializeDraft(snapshot: DraftSnapshot) {
  return [snapshot.title, snapshot.slug, snapshot.markdown].join("\u0000");
}

function formatSavedTime(savedAt: string) {
  return new Date(savedAt).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlayEditor({ play }: PlayEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initialDraft = makeDraftSnapshot(play.title, play.slug, play.markdown);
  const autosaveTimerRef = useRef<number | null>(null);
  const draftRef = useRef(initialDraft);
  const lastSavedDraftRef = useRef(initialDraft);
  const inFlightDraftRef = useRef<DraftSnapshot | null>(null);
  const queuedDraftRef = useRef<DraftSnapshot | null>(null);
  const queuedSyncRef = useRef(false);
  const lastAutosaveAtRef = useRef(0);
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
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const persistDraft = useCallback(
    async (
      snapshot: DraftSnapshot,
      options: {
        force?: boolean;
        keepalive?: boolean;
        sync?: boolean;
      } = {},
    ) => {
      const snapshotKey = serializeDraft(snapshot);
      const lastSavedKey = serializeDraft(lastSavedDraftRef.current);

      if (!options.force && snapshotKey === lastSavedKey) {
        return true;
      }

      if (inFlightDraftRef.current) {
        queuedDraftRef.current = snapshot;
        queuedSyncRef.current = queuedSyncRef.current || Boolean(options.sync);
        return true;
      }

      inFlightDraftRef.current = snapshot;
      clearAutosaveTimer();
      setSaveState("saving");
      setSaveError("");

      try {
        const response = await fetch(`/api/tramoya/obras/${play.id}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: snapshot.title,
            slug: snapshot.slug,
            markdown: snapshot.markdown,
            sync: options.sync === true,
          }),
          keepalive: options.keepalive === true,
          credentials: "same-origin",
        });

        const result = (await response.json()) as SaveResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "No se pudo guardar la obra.");
        }

        const savedSnapshot = {
          ...snapshot,
          slug: result.slug || snapshot.slug,
        };

        lastSavedDraftRef.current = savedSnapshot;
        lastAutosaveAtRef.current = Date.now();
        setLastSavedAt(result.savedAt || new Date().toISOString());
        setSaveState("saved");
        setSaveError("");

        if (result.slug && draftRef.current.slug === snapshot.slug && result.slug !== snapshot.slug) {
          setSlug(result.slug);
          draftRef.current = {
            ...draftRef.current,
            slug: result.slug,
          };
        }

        return true;
      } catch (caughtError) {
        setSaveState("error");
        setSaveError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar la obra.");
        return false;
      } finally {
        inFlightDraftRef.current = null;

        if (queuedDraftRef.current) {
          const nextDraft = queuedDraftRef.current;
          const shouldSync = queuedSyncRef.current;

          queuedDraftRef.current = null;
          queuedSyncRef.current = false;
          void persistDraft(nextDraft, { force: true, sync: shouldSync });
        } else if (serializeDraft(draftRef.current) !== serializeDraft(lastSavedDraftRef.current)) {
          setSaveState((current) => (current === "error" ? current : "dirty"));
          const dueAt = Math.max(
            Date.now() + AUTOSAVE_DEBOUNCE_MS,
            lastAutosaveAtRef.current + AUTOSAVE_MIN_INTERVAL_MS,
          );

          autosaveTimerRef.current = window.setTimeout(() => {
            void persistDraft(draftRef.current);
          }, Math.max(0, dueAt - Date.now()));
        }
      }
    },
    [clearAutosaveTimer, play.id],
  );

  const scheduleAutosave = useCallback(() => {
    clearAutosaveTimer();

    if (serializeDraft(draftRef.current) === serializeDraft(lastSavedDraftRef.current)) {
      return;
    }

    const dueAt = Math.max(Date.now() + AUTOSAVE_DEBOUNCE_MS, lastAutosaveAtRef.current + AUTOSAVE_MIN_INTERVAL_MS);

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistDraft(draftRef.current);
    }, Math.max(0, dueAt - Date.now()));
  }, [clearAutosaveTimer, persistDraft]);

  const flushDraft = useCallback(
    async (options: { keepalive?: boolean; sync?: boolean } = {}) => {
      clearAutosaveTimer();

      if (serializeDraft(draftRef.current) === serializeDraft(lastSavedDraftRef.current)) {
        return true;
      }

      return persistDraft(draftRef.current, {
        force: true,
        keepalive: options.keepalive,
        sync: options.sync,
      });
    },
    [clearAutosaveTimer, persistDraft],
  );

  useEffect(() => {
    draftRef.current = makeDraftSnapshot(title, slug, markdown);

    if (serializeDraft(draftRef.current) === serializeDraft(lastSavedDraftRef.current)) {
      clearAutosaveTimer();
      setSaveState((current) => (current === "saving" || current === "error" ? current : "saved"));
      return;
    }

    setSaveState((current) => (current === "saving" || current === "error" ? current : "dirty"));
    scheduleAutosave();
  }, [clearAutosaveTimer, scheduleAutosave, title, slug, markdown]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void flushDraft({ keepalive: true });
      }
    }

    function handlePageHide() {
      void flushDraft({ keepalive: true });
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (
        serializeDraft(draftRef.current) === serializeDraft(lastSavedDraftRef.current) &&
        !inFlightDraftRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearAutosaveTimer();
    };
  }, [clearAutosaveTimer, flushDraft]);

  function refreshSelection() {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    const selectedText = markdown.slice(startOffset, endOffset);
    const nextSelection = {
      startOffset,
      endOffset,
      selectedText,
    };

    setSelection(nextSelection);

    if (endOffset > startOffset && selectedText.trim()) {
      setSelectionMenu({
        ...nextSelection,
        ...getTextareaSelectionAnchor(textarea, endOffset),
      });
      return;
    }

    setSelectionMenu(null);
  }

  useEffect(() => {
    if (!selectionMenu) {
      return;
    }

    const closeMenu = () => setSelectionMenu(null);

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [selectionMenu]);

  function savePlay() {
    void flushDraft({ sync: true });
  }

  function createActor() {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("name", actorName);

    startTransition(async () => {
      if (!(await flushDraft())) {
        return;
      }

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
      if (!(await flushDraft())) {
        return;
      }

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

  function saveAssignment(actorIds = selectedActorIds) {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("startOffset", String(selection.startOffset));
    formData.set("endOffset", String(selection.endOffset));
    formData.set("selectedText", selection.selectedText);
    formData.set("actorIds", actorIds.join(","));
    formData.set("markdown", markdown);

    startTransition(async () => {
      if (!(await flushDraft())) {
        return;
      }

      setFeedback("");
      setError("");
      const result = await saveAssignmentAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo guardar el fragmento.");
        return;
      }

      setFeedback("Fragmento asignado.");
      setSelectionMenu(null);
      router.refresh();
    });
  }

  function deleteAssignment(assignmentId: string) {
    const formData = new FormData();
    formData.set("playId", play.id);
    formData.set("assignmentId", assignmentId);

    startTransition(async () => {
      if (!(await flushDraft())) {
        return;
      }

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
      if (!(await flushDraft())) {
        return;
      }

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

    requestAnimationFrame(() => {
      textarea?.focus();
      const nextCursor = start + snippet.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
      refreshSelection();
    });
  }

  function refreshVotes() {
    startTransition(async () => {
      if (!(await flushDraft())) {
        return;
      }

      router.refresh();
    });
  }

  const saveStatusLabel =
    saveState === "saving"
      ? "Guardando..."
      : saveState === "dirty"
        ? "Cambios pendientes"
        : saveState === "error"
          ? "No se pudo guardar"
          : lastSavedAt
            ? `Guardado a las ${formatSavedTime(lastSavedAt)}`
            : "Sin cambios pendientes";

  return (
    <div className="stackLg">
      <div className="spaceBetween wrapGap startAligned">
        <div>
          <p className="eyebrow">Editor de obra</p>
          <h1>{title}</h1>
        </div>

        <div className="stackXs saveStatusGroup">
          <span className={`saveIndicator ${saveState}`} aria-live="polite">
            <span className="saveIndicatorDot" aria-hidden="true" />
            {saveStatusLabel}
          </span>

          <Link className="button ghost" href={ADMIN_PANEL_PATH}>
            Volver al panel
          </Link>
        </div>
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
              <input
                value={title}
                onBlur={() => void flushDraft()}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Slug público</span>
              <input
                value={slug}
                onBlur={() => void flushDraft()}
                onChange={(event) => setSlug(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Markdown de la obra</span>
              <div className="markdownEditorFrame">
                <textarea
                  ref={textareaRef}
                  value={markdown}
                  onBlur={() => {
                    refreshSelection();
                    void flushDraft();
                  }}
                  onChange={(event) => {
                    setMarkdown(event.target.value);
                    setSelectionMenu(null);
                  }}
                  onKeyUp={refreshSelection}
                  onMouseUp={refreshSelection}
                  onSelect={refreshSelection}
                  rows={22}
                  placeholder="# Acto 1\n\nEscribe el guion aquí..."
                />
              </div>
            </label>

            {selectionMenu ? (
              <SelectionContextMenu
                left={selectionMenu.left}
                top={selectionMenu.top}
                placement={selectionMenu.placement}
                selectedText={selectionMenu.selectedText}
                actors={play.actors}
                selectedActorIds={selectedActorIds}
                disabled={isPending}
                onToggleActor={toggleSelectedActor}
                onSave={() => saveAssignment()}
                onClose={() => setSelectionMenu(null)}
              />
            ) : null}

            <div className="spaceBetween wrapGap startAligned">
              <div className="stackXs">
                <button className="button primary" type="button" onClick={savePlay} disabled={isPending}>
                  Guardar y sincronizar
                </button>
                {saveError ? <p className="feedback error">{saveError}</p> : null}
              </div>
              <p className="mutedText">
                El editor guarda en segundo plano y evita escrituras repetidas mientras sigues escribiendo.
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
              {selection.selectedText.trim() ? selection.selectedText : "Selecciona un tramo del Markdown para asignarlo."}
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

            <button className="button primary" type="button" onClick={() => saveAssignment()} disabled={isPending}>
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

              <button className="button ghost" type="button" onClick={refreshVotes} disabled={isPending}>
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
          <div className="spaceBetween wrapGap startAligned">
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
