"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { markdownContentComponents } from "@/components/shared/markdown-content";
import { parsePlayContent, type VoteBlockDefinition } from "@/lib/markdown-votes";
import { remarkHighlightActor } from "@/lib/markdown-highlights";
import { STORAGE_KEY_PREFIX } from "@/lib/constants";
import type { ActorSummary, AssignmentSummary } from "@/lib/types";

type HighlightRange = {
  startOffset: number;
  endOffset: number;
  selectedText?: string;
};

type LocalVoteState = {
  selections: Record<string, string>;
  submittedAt: Record<string, number>;
  pending: string[];
};

type MarkdownArticleProps = {
  markdown: string;
  assignments: AssignmentSummary[];
  activeActorId?: string;
  playId?: string;
  actors?: ActorSummary[];
  enableVoting?: boolean;
};

function createEmptyVoteState(): LocalVoteState {
  return {
    selections: {},
    submittedAt: {},
    pending: [],
  };
}

function readVoteState(storageKey: string) {
  if (typeof window === "undefined") {
    return createEmptyVoteState();
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return createEmptyVoteState();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<LocalVoteState>;

    return {
      selections: typeof parsed.selections === "object" && parsed.selections ? parsed.selections : {},
      submittedAt:
        typeof parsed.submittedAt === "object" && parsed.submittedAt ? parsed.submittedAt : {},
      pending: Array.isArray(parsed.pending) ? parsed.pending.filter((value) => typeof value === "string") : [],
    };
  } catch {
    return createEmptyVoteState();
  }
}

function makeVoteStorageKey(playId: string, actorId: string) {
  return `${STORAGE_KEY_PREFIX}:votes:${playId}:${actorId}`;
}

function getSegmentRanges(segmentStart: number, segmentEnd: number, ranges: HighlightRange[]) {
  return ranges.flatMap((range) => {
    const startOffset = Math.max(segmentStart, range.startOffset);
    const endOffset = Math.min(segmentEnd, range.endOffset);

    if (endOffset <= startOffset) {
      return [];
    }

    return [
      {
        startOffset: startOffset - segmentStart,
        endOffset: endOffset - segmentStart,
      },
    ];
  });
}

function resolveHighlightRange(markdown: string, assignment: AssignmentSummary): HighlightRange | null {
  const startOffset = Math.max(0, Math.min(assignment.startOffset, markdown.length));
  const endOffset = Math.max(startOffset, Math.min(assignment.endOffset, markdown.length));
  const selectedText = assignment.selectedText;

  if (!selectedText.trim()) {
    return null;
  }

  const storedSlice = markdown.slice(startOffset, endOffset);

  if (storedSlice === selectedText) {
    return { startOffset, endOffset, selectedText };
  }

  if (storedSlice.trim() === selectedText) {
    const leadingWhitespace = storedSlice.match(/^\s*/)?.[0].length ?? 0;
    const trailingWhitespace = storedSlice.match(/\s*$/)?.[0].length ?? 0;

    return {
      startOffset: startOffset + leadingWhitespace,
      endOffset: endOffset - trailingWhitespace,
      selectedText,
    };
  }

  const firstMatch = markdown.indexOf(selectedText);

  if (firstMatch >= 0 && firstMatch === markdown.lastIndexOf(selectedText)) {
    return {
      startOffset: firstMatch,
      endOffset: firstMatch + selectedText.length,
      selectedText,
    };
  }

  if (endOffset > startOffset) {
    return { startOffset, endOffset, selectedText };
  }

  return null;
}

function renderVoteStatus(
  vote: VoteBlockDefinition,
  selectedOptionId: string,
  isPending: boolean,
  interactiveVoting: boolean,
  activeActorName: string,
  isOnline: boolean,
) {
  if (!interactiveVoting) {
    return "Bloque privado. Solo el administrador ve los nombres de cada voto.";
  }

  if (!activeActorName) {
    return "Elige tu nombre arriba para habilitar esta votacion privada.";
  }

  const selectedOption = vote.options.find((option) => option.id === selectedOptionId);
  const selectedOptionSummary = selectedOption?.label
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (isPending) {
    return isOnline
      ? `Guardando el voto de ${activeActorName}...`
      : `Voto guardado en este dispositivo para ${activeActorName}. Se sincronizara al volver la conexion.`;
  }

  if (selectedOption) {
    return selectedOptionSummary
      ? `Voto actual de ${activeActorName}: ${selectedOptionSummary}`
      : `Voto actual de ${activeActorName}: opcion seleccionada.`;
  }

  return `Selecciona una opcion como ${activeActorName}. Puedes cambiarla despues y solo quedara tu ultimo voto.`;
}

export function MarkdownArticle({
  markdown,
  assignments,
  activeActorId = "",
  playId = "",
  actors = [],
  enableVoting = true,
}: MarkdownArticleProps) {
  const ranges = useMemo(
    () =>
      activeActorId
        ? assignments
            .filter((assignment) => assignment.actorIds.includes(activeActorId))
            .flatMap((assignment) => {
              const range = resolveHighlightRange(markdown, assignment);

              return range ? [range] : [];
            })
        : [],
    [activeActorId, assignments, markdown],
  );
  const parsedContent = useMemo(() => parsePlayContent(markdown), [markdown]);
  const activeActor = actors.find((actor) => actor.id === activeActorId) ?? null;
  const interactiveVoting = Boolean(enableVoting && playId && actors.length);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.navigator.onLine;
  });
  const storageKey = interactiveVoting && activeActor ? makeVoteStorageKey(playId, activeActor.id) : "";
  const [voteState, setVoteState] = useState<LocalVoteState>(() =>
    storageKey ? readVoteState(storageKey) : createEmptyVoteState(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleConnectionChange = () => setIsOnline(window.navigator.onLine);

    handleConnectionChange();
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(voteState));
  }, [storageKey, voteState]);

  const syncVote = useCallback(
    async (voteId: string, optionId: string, submittedAt: number) => {
      if (!interactiveVoting || !activeActor || !isOnline) {
        return;
      }

      const vote = parsedContent.votes.find((candidate) => candidate.id === voteId);
      const option = vote?.options.find((candidate) => candidate.id === optionId);

      if (!vote || !option) {
        return;
      }

      try {
        const response = await fetch("/api/votes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playId,
            voteId,
            optionId,
            actorId: activeActor.id,
            actorName: activeActor.name,
            optionLabel: option.label,
            submittedAt,
          }),
        });

        if (!response.ok) {
          throw new Error("vote-request-failed");
        }

        setVoteState((current) => {
          if (current.selections[voteId] !== optionId || current.submittedAt[voteId] !== submittedAt) {
            return current;
          }

          return {
            ...current,
            pending: current.pending.filter((pendingVoteId) => pendingVoteId !== voteId),
          };
        });
      } catch {
        // Keep the latest local selection so it can sync later.
      }
    },
    [interactiveVoting, activeActor, isOnline, parsedContent.votes, playId],
  );

  useEffect(() => {
    if (!interactiveVoting || !activeActor || !isOnline || !voteState.pending.length) {
      return;
    }

    void (async () => {
      for (const voteId of voteState.pending) {
        const optionId = voteState.selections[voteId];
        const submittedAt = voteState.submittedAt[voteId] ?? 0;

        if (!optionId || !submittedAt) {
          continue;
        }

        await syncVote(voteId, optionId, submittedAt);
      }
    })();
  }, [interactiveVoting, activeActor, isOnline, syncVote, voteState.pending, voteState.selections, voteState.submittedAt]);

  if (!markdown && !parsedContent.votes.length) {
    return (
      <article className="markdownArticle">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{"_Esta obra todavia no tiene contenido._"}</ReactMarkdown>
      </article>
    );
  }

  return (
    <article className="markdownArticle">
      {parsedContent.segments.map((segment) => {
        if (segment.type === "vote") {
          const selectedOptionId = voteState.selections[segment.vote.id] ?? "";
          const isPending = voteState.pending.includes(segment.vote.id);

          return (
            <section key={segment.vote.id} className="voteBlock panel">
              <div className="stackSm">
                <div className="spaceBetween wrapGap startAligned">
                  <div className="stackXs grow">
                    <p className="eyebrow">{segment.vote.title}</p>
                    <h3 className="voteBlockTitle">Votacion privada</h3>
                    <p className="mutedText voteBlockText">
                      {renderVoteStatus(
                        segment.vote,
                        selectedOptionId,
                        isPending,
                        interactiveVoting,
                        activeActor?.name ?? "",
                        isOnline,
                      )}
                    </p>
                  </div>

                  {interactiveVoting && activeActor ? (
                    <span className={`badge ${isPending ? "warning" : selectedOptionId ? "success" : "muted"}`}>
                      {isPending ? "Pendiente" : selectedOptionId ? "Guardado" : "Sin votar"}
                    </span>
                  ) : null}
                </div>

                <div className="voteOptionGrid">
                  {segment.vote.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                      <section key={option.id} className={`voteOptionCard ${isSelected ? "selected" : ""}`}>
                        <div className="voteOptionBody stackSm">
                          <div className="voteOptionContent">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]} components={markdownContentComponents}>
                              {option.label}
                            </ReactMarkdown>
                          </div>

                          <button
                            type="button"
                            className="voteOptionAction"
                            disabled={!interactiveVoting || !activeActor}
                            onClick={() => {
                              if (!interactiveVoting || !activeActor) {
                                return;
                              }

                              const submittedAt = Date.now();

                              setVoteState((current) => ({
                                selections: {
                                  ...current.selections,
                                  [segment.vote.id]: option.id,
                                },
                                submittedAt: {
                                  ...current.submittedAt,
                                  [segment.vote.id]: submittedAt,
                                },
                                pending: current.pending.includes(segment.vote.id)
                                  ? current.pending
                                  : [...current.pending, segment.vote.id],
                              }));

                              void syncVote(segment.vote.id, option.id, submittedAt);
                            }}
                          >
                            <span className="voteOptionActionLabel">{isSelected ? "Seleccionada" : "Elegir opcion"}</span>
                            <span className="voteOptionMeta">{isSelected ? "Puedes cambiar tu voto cuando quieras" : "Tocar para votar"}</span>
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        const segmentRanges = getSegmentRanges(segment.startOffset, segment.endOffset, ranges);

        return (
          <ReactMarkdown
            key={segment.id}
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm, remarkHighlightActor(segmentRanges)]}
            components={markdownContentComponents}
          >
            {segment.markdown}
          </ReactMarkdown>
        );
      })}
    </article>
  );
}
