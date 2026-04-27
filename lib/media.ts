function encodeMediaSegment(segment: string) {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

function decodeMediaSegments(segments: string[]) {
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function buildMediaPath(key: string) {
  const trimmedKey = key.replace(/^\/+|\/+$/g, "");

  if (!trimmedKey) {
    return "/media";
  }

  return `/media/${trimmedKey.split("/").map(encodeMediaSegment).join("/")}`;
}

export function decodeMediaRouteKey(segments: string[]) {
  return decodeMediaSegments(segments).replace(/^\/+|\/+$/g, "");
}

export function normalizeMediaSrc(src: string) {
  const trimmedSrc = src.trim();

  if (!trimmedSrc) {
    return trimmedSrc;
  }

  if (trimmedSrc.startsWith("/media/")) {
    return trimmedSrc;
  }

  if (trimmedSrc.startsWith("/plays/")) {
    return buildMediaPath(trimmedSrc);
  }

  try {
    const url = new URL(trimmedSrc);

    if (url.hostname.endsWith(".r2.cloudflarestorage.com") || url.hostname.endsWith(".r2.dev")) {
      return buildMediaPath(url.pathname);
    }

    return trimmedSrc;
  } catch {
    return trimmedSrc;
  }
}
