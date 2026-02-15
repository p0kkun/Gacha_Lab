const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 678;

function getBaseUrl(): string {
  // Prefer explicit public app URL. NEXT_PUBLIC_BASE_URL may point to LIFF URL in some envs.
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ].filter((v): v is string => Boolean(v && v.trim()));

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      const host = url.hostname.toLowerCase();
      // LIFF / MINIAPP domains cannot host this app's API routes.
      if (host.endsWith("miniapp.line.me") || host.endsWith("liff.line.me")) {
        continue;
      }
      return url.origin;
    } catch {
      // ignore invalid candidate
    }
  }
  return "";
}

export function buildLineThumbnailUrl(
  originalImageUrl: string | null | undefined,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): string | null {
  if (!originalImageUrl || originalImageUrl.trim() === "") return null;

  const baseUrl = getBaseUrl();
  if (!baseUrl) return originalImageUrl;

  const params = new URLSearchParams({
    src: originalImageUrl,
    w: String(width),
    h: String(height),
  });
  return `${baseUrl}/api/line/thumbnail?${params.toString()}`;
}
