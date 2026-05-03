"use client";

import { useEffect, useState } from "react";

type PlayDownloadButtonProps = {
  urls: string[];
  selectedActorName?: string;
};

type DownloadState = "idle" | "downloading" | "ready" | "error";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isMobileLikeDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
}

function normalizeUrls(urls: string[]) {
  return [...new Set(urls)]
    .map((url) => {
      try {
        return new URL(url, window.location.origin).toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => Boolean(url));
}

async function downloadUrls(urls: string[]) {
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller ?? registration.active;

  if (!worker) {
    throw new Error("service-worker-not-ready");
  }

  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("cache-timeout"));
    }, 45000);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();

      if (event.data?.ok) {
        resolve();
        return;
      }

      reject(new Error("cache-failed"));
    };

    worker.postMessage(
      {
        type: "warm-cache",
        urls,
      },
      [channel.port2],
    );
  });
}

export function PlayDownloadButton({ urls, selectedActorName = "" }: PlayDownloadButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const syncAvailability = () => {
      setIsAvailable(isStandaloneMode() && isMobileLikeDevice());
    };
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const mobileMedia = window.matchMedia("(max-width: 767px), (pointer: coarse)");

    syncAvailability();
    standaloneMedia.addEventListener("change", syncAvailability);
    mobileMedia.addEventListener("change", syncAvailability);

    return () => {
      standaloneMedia.removeEventListener("change", syncAvailability);
      mobileMedia.removeEventListener("change", syncAvailability);
    };
  }, []);

  if (!isAvailable) {
    return null;
  }

  const statusText = {
    idle: selectedActorName
      ? `Disponible para ${selectedActorName} al quedar sin conexion.`
      : "Elige tu actor y descarga la obra para usarla sin conexion.",
    downloading: "Descargando obra, audios e imagenes...",
    ready: "Obra disponible sin conexion en este dispositivo.",
    error: "No se pudo completar la descarga. Revisa la conexion e intenta de nuevo.",
  }[downloadState];

  return (
    <section className={`offlineDownloadPanel ${downloadState === "ready" ? "ready" : ""}`}>
      <div className="stackXs grow">
        <p className="pickerTitle">Modo sin conexion</p>
        <p className="mutedText">{statusText}</p>
      </div>

      <button
        type="button"
        className="button primary offlineDownloadButton"
        disabled={downloadState === "downloading"}
        onClick={async () => {
          const normalizedUrls = normalizeUrls(urls);

          if (!normalizedUrls.length) {
            return;
          }

          setDownloadState("downloading");

          try {
            await downloadUrls(normalizedUrls);
            setDownloadState("ready");
          } catch {
            setDownloadState("error");
          }
        }}
      >
        {downloadState === "downloading" ? "Descargando..." : "Descargar obra"}
      </button>
    </section>
  );
}
