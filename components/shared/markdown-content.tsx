"use client";

import { useRef, useState, type AudioHTMLAttributes } from "react";
import type { Components } from "react-markdown";

import { normalizeMediaSrc } from "@/lib/media";

type AudioPlayerProps = {
  src: string;
  className?: string;
  audioProps?: Omit<AudioHTMLAttributes<HTMLAudioElement>, "src">;
};

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clampAudioTime(value: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, value);
  }

  return Math.min(Math.max(0, value), duration);
}

export function AudioPlayer({ src, className = "", audioProps }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

  const syncCurrentTime = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrentTime(audio.currentTime);
  };

  const syncDuration = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;

    setDuration(nextDuration);
    setCurrentTime((value) => clampAudioTime(value, nextDuration));
  };

  const seekBy = (offset: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const boundedValue = clampAudioTime(audio.currentTime + offset, safeDuration);
    audio.currentTime = boundedValue;
    setCurrentTime(boundedValue);
  };

  return (
    <div className={`customAudioPlayer ${className}`.trim()}>
      <div className="audioPlayerHeader">
        <span className="audioPlayerEyebrow">Audio</span>
        <span className="audioPlayerTime">
          {formatAudioTime(currentTime)} / {safeDuration ? formatAudioTime(safeDuration) : "--:--"}
        </span>
      </div>

      <audio
        {...audioProps}
        ref={audioRef}
        className="audioPlayerNative"
        controls
        preload="metadata"
        src={src}
        onTimeUpdate={syncCurrentTime}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onSeeked={syncCurrentTime}
      />

      <div className="audioPlayerControls">
        <button type="button" className="audioPlayerButton" onClick={() => seekBy(-10)} disabled={!safeDuration}>
          -10s
        </button>

        <button type="button" className="audioPlayerButton" onClick={() => seekBy(10)} disabled={!safeDuration}>
          +10s
        </button>
      </div>
    </div>
  );
}

export const markdownContentComponents: Components = {
  a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  img: ({ alt, src }) => {
    if (typeof src !== "string" || !src) {
      return null;
    }

    const resolvedSrc = normalizeMediaSrc(String(src));

    // eslint-disable-next-line @next/next/no-img-element
    return <img className="articleImage" src={resolvedSrc} alt={alt || "Imagen de la obra"} />;
  },
  audio: ({ src, ...props }) => {
    if (typeof src !== "string" || !src) {
      return null;
    }

    const resolvedSrc = normalizeMediaSrc(String(src));

    return <AudioPlayer className="articleAudio" src={resolvedSrc} audioProps={props} />;
  },
  table: ({ children }) => (
    <section className="markdownTableWrap" aria-label="Tabla del contenido">
      <table className="markdownTable">{children}</table>
    </section>
  ),
  thead: ({ children }) => <thead className="markdownTableHead">{children}</thead>,
  tbody: ({ children }) => <tbody className="markdownTableBody">{children}</tbody>,
  tr: ({ children }) => <tr className="markdownTableRow">{children}</tr>,
  th: ({ children }) => <th className="markdownTableHeaderCell">{children}</th>,
  td: ({ children }) => <td className="markdownTableCell">{children}</td>,
};
