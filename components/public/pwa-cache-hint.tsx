"use client";

import { useEffect } from "react";

type PwaCacheHintProps = {
  urls: string[];
};

export function PwaCacheHint({ urls }: PwaCacheHintProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !urls.length) {
      return;
    }

    const normalizedUrls = [...new Set(urls)]
      .map((url) => {
        try {
          return new URL(url, window.location.origin).toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => Boolean(url));

    if (!normalizedUrls.length) {
      return;
    }

    void navigator.serviceWorker.ready
      .then((registration) => {
        const worker = navigator.serviceWorker.controller ?? registration.active;
        worker?.postMessage({
          type: "warm-cache",
          urls: normalizedUrls,
        });
      })
      .catch(() => undefined);
  }, [urls]);

  return null;
}
