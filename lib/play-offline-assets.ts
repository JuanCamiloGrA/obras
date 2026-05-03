import { normalizeMediaSrc } from "@/lib/media";

function addSrcsetUrls(srcset: string, assetUrls: Set<string>) {
  for (const candidate of srcset.split(",")) {
    const url = candidate.trim().split(/\s+/)[0];

    if (url) {
      assetUrls.add(normalizeMediaSrc(url));
    }
  }
}

export function extractPlayMediaUrls(markdown: string) {
  const assetUrls = new Set<string>();
  const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const htmlSrcPattern = /<(?:img|audio|source)\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  const htmlSrcsetPattern = /<img\b[^>]*\ssrcset=["']([^"']+)["'][^>]*>/gi;

  for (const match of markdown.matchAll(markdownImagePattern)) {
    const url = match[1]?.trim();

    if (url) {
      assetUrls.add(normalizeMediaSrc(url));
    }
  }

  for (const match of markdown.matchAll(htmlSrcPattern)) {
    const url = match[1]?.trim();

    if (url) {
      assetUrls.add(normalizeMediaSrc(url));
    }
  }

  for (const match of markdown.matchAll(htmlSrcsetPattern)) {
    const srcset = match[1]?.trim();

    if (srcset) {
      addSrcsetUrls(srcset, assetUrls);
    }
  }

  return [...assetUrls];
}
