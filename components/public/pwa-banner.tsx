"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { ADMIN_BASE_PATH, APP_NAME } from "@/lib/constants";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PublicPwaBanner() {
  const pathname = usePathname();
  const isPublicRoute = !pathname?.startsWith(ADMIN_BASE_PATH);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registrationReady, setRegistrationReady] = useState(false);

  useEffect(() => {
    if (!isPublicRoute || !("serviceWorker" in navigator)) {
      return;
    }

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const syncState = () => {
      setIsStandalone(isStandaloneMode());
      setIsOnline(window.navigator.onLine);
    };

    syncState();

    void navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then(() => setRegistrationReady(true))
      .catch(() => setRegistrationReady(false));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("online", syncState);
    window.addEventListener("offline", syncState);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    standaloneMedia.addEventListener("change", syncState);

    return () => {
      window.removeEventListener("online", syncState);
      window.removeEventListener("offline", syncState);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneMedia.removeEventListener("change", syncState);
    };
  }, [isPublicRoute]);

  if (!isPublicRoute || !registrationReady) {
    return null;
  }

  const bannerText = isStandalone
    ? isOnline
      ? "Modo app activo. Las obras que abras quedan guardadas para ensayar sin conexión."
      : "Sin conexión. Estás usando la versión guardada en este dispositivo."
    : "Abre la obra que vayas a ensayar y luego instálala para usarla como app y mantenerla disponible offline en Android.";

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  return (
    <aside className="pwaBanner">
      <div className="stackXs grow">
        <p className="eyebrow">App para actores</p>
        <p className="pwaBannerTitle">{isStandalone ? APP_NAME : "Instala esta PWA"}</p>
        <p className="mutedText pwaBannerText">{bannerText}</p>
        {!isStandalone && !installPrompt ? (
          <p className="pwaInstallHint">Si no aparece el boton, usa el menu de Chrome y toca Instalar app.</p>
        ) : null}
      </div>

      <div className="pwaBannerActions">
        <span className={`badge ${isOnline ? "success" : "warning"}`}>
          {isOnline ? "En línea" : "Sin conexión"}
        </span>

        {isStandalone ? <span className="badge accent">Instalada</span> : null}

        {installPrompt ? (
          <button type="button" className="button primary" onClick={handleInstall}>
            Instalar app
          </button>
        ) : null}
      </div>
    </aside>
  );
}
