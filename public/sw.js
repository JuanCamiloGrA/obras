const SHELL_CACHE = "ensayo-obras-shell-v2";
const PAGE_CACHE = "ensayo-obras-pages-v2";
const ASSET_CACHE = "ensayo-obras-assets-v2";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = ["/", "/obras", OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, PAGE_CACHE, ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm-cache" || !Array.isArray(event.data.urls)) {
    return;
  }

  event.waitUntil(
    warmCache(event.data.urls)
      .then(() => {
        event.ports[0]?.postMessage({ ok: true });
      })
      .catch(() => {
        event.ports[0]?.postMessage({ ok: false });
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isAdminPath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return;
  }

  if (shouldCacheAsset(request, url)) {
    event.respondWith(request.headers.has("range") ? handleRangeRequest(request) : handleAssetRequest(request));
  }
});

async function warmCache(urls) {
  const pageCache = await caches.open(PAGE_CACHE);
  const assetCache = await caches.open(ASSET_CACHE);

  const results = await Promise.all(
    urls.map(async (input) => {
      try {
        const url = new URL(input, self.location.origin);
        const isSameOrigin = url.origin === self.location.origin;
        const request = new Request(url.toString(), {
          mode: isSameOrigin ? "same-origin" : "no-cors",
          credentials: isSameOrigin ? "include" : "omit",
        });
        const response = await fetch(request);

        if (!isCacheableResponse(response)) {
          return;
        }

        const targetCache = isDocumentLikeUrl(url) ? pageCache : assetCache;
        await targetCache.put(request, response.clone());
        return true;
      } catch {
        return false;
      }
    }),
  );

  if (results.some((ok) => !ok)) {
    throw new Error("cache-warming-failed");
  }
}

async function handleNavigationRequest(request) {
  const pageCache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);

    if (isCacheableResponse(response)) {
      await pageCache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await pageCache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const shellResponse = await caches.match(OFFLINE_URL);
    return shellResponse || Response.error();
  }
}

async function handleAssetRequest(request) {
  const assetCache = await caches.open(ASSET_CACHE);
  const cachedResponse = await assetCache.match(request);

  if (cachedResponse) {
    void fetchAndCache(request, assetCache);
    return cachedResponse;
  }

  try {
    return await fetchAndCache(request, assetCache);
  } catch {
    return cachedResponse || Response.error();
  }
}

async function handleRangeRequest(request) {
  const assetCache = await caches.open(ASSET_CACHE);
  const cachedResponse = await assetCache.match(request.url);

  if (!cachedResponse) {
    return fetch(request);
  }

  const rangeHeader = request.headers.get("range");
  const range = parseRangeHeader(rangeHeader);

  if (!range) {
    return cachedResponse;
  }

  const blob = await cachedResponse.blob();
  const start = range.start ?? Math.max(blob.size - (range.end ?? blob.size), 0);
  const end = range.start === undefined ? blob.size - 1 : Math.min(range.end ?? blob.size - 1, blob.size - 1);

  if (start >= blob.size || end < start) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${blob.size}`,
      },
    });
  }

  const headers = new Headers(cachedResponse.headers);
  const slicedBlob = blob.slice(start, end + 1, headers.get("Content-Type") || undefined);

  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(slicedBlob.size));
  headers.set("Content-Range", `bytes ${start}-${end}/${blob.size}`);

  return new Response(slicedBlob, {
    status: 206,
    statusText: "Partial Content",
    headers,
  });
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);

  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

function shouldCacheAsset(request, url) {
  if (url.origin === self.location.origin) {
    return true;
  }

  return ["image", "audio", "video", "font"].includes(request.destination);
}

function isDocumentLikeUrl(url) {
  return !/\.[a-z0-9]+$/i.test(url.pathname);
}

function isAdminPath(pathname) {
  return pathname.startsWith("/tramoya") || pathname.startsWith("/api/admin");
}

function parseRangeHeader(rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");

  if (!match) {
    return null;
  }

  const start = match[1] ? Number(match[1]) : undefined;
  const end = match[2] ? Number(match[2]) : undefined;

  if (
    (start === undefined && end === undefined) ||
    (start !== undefined && !Number.isSafeInteger(start)) ||
    (end !== undefined && !Number.isSafeInteger(end))
  ) {
    return null;
  }

  return { start, end };
}

function isCacheableResponse(response) {
  return response.ok || response.type === "opaque";
}
