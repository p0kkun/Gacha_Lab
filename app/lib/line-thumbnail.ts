const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 678;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "";
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

