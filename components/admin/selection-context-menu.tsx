"use client";

import type { ActorSummary } from "@/lib/types";

type SelectionContextMenuProps = {
  left: number;
  top: number;
  placement: "top" | "bottom";
  selectedText: string;
  actors: ActorSummary[];
  selectedActorIds: string[];
  disabled: boolean;
  onToggleActor: (actorId: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function SelectionContextMenu({
  left,
  top,
  placement,
  selectedText,
  actors,
  selectedActorIds,
  disabled,
  onToggleActor,
  onSave,
  onClose,
}: SelectionContextMenuProps) {
  const canSave = selectedText.trim().length > 0 && selectedActorIds.length > 0 && !disabled;

  return (
    <div
      className={`selectionContextMenu ${placement === "bottom" ? "below" : "above"}`}
      style={{ left, top }}
      role="dialog"
      aria-label="Asignar fragmento seleccionado"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="selectionContextArrow" />

      <div className="selectionContextHeader">
        <span className="selectionContextEyebrow">Asignar selección</span>
        <button className="selectionContextClose" type="button" onClick={onClose} aria-label="Cerrar">
          x
        </button>
      </div>

      <p className="selectionContextText">&quot;{selectedText.trim()}&quot;</p>

      <div className="selectionContextActors">
        {actors.length ? null : <span className="mutedText">Primero carga actores.</span>}
        {actors.map((actor) => {
          const isSelected = selectedActorIds.includes(actor.id);

          return (
            <button
              key={actor.id}
              className={`selectionContextActor ${isSelected ? "selected" : ""}`}
              type="button"
              onClick={() => onToggleActor(actor.id)}
              aria-pressed={isSelected}
            >
              {actor.name}
            </button>
          );
        })}
      </div>

      <button className="selectionContextSave" type="button" onClick={onSave} disabled={!canSave}>
        Guardar fragmento
      </button>
    </div>
  );
}
