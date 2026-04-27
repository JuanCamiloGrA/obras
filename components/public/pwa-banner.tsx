"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { ADMIN_BASE_PATH } from "@/lib/constants";

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

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    standaloneMedia.addEventListener("change", syncState);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneMedia.removeEventListener("change", syncState);
    };
  }, [isPublicRoute]);

  if (!isPublicRoute || !registrationReady || isStandalone || !installPrompt) {
    return null;
  }

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
      <button type="button" className="button ghost pwaInstallButton" onClick={handleInstall}>
        Instalar app
      </button>
    </aside>
  );
}
