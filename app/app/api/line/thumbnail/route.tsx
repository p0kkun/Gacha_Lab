import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const MIN_SIZE = 200;
const MAX_SIZE = 2000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const src = searchParams.get("src");
    const w = Number(searchParams.get("w") || 1024);
    const h = Number(searchParams.get("h") || 678);

    if (!src) {
      return new Response("src is required", { status: 400 });
    }
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w < MIN_SIZE ||
      h < MIN_SIZE ||
      w > MAX_SIZE ||
      h > MAX_SIZE
    ) {
      return new Response("invalid size", { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(src);
    } catch {
      return new Response("invalid src", { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response("unsupported src protocol", { status: 400 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
          }}
        >
          <img
            src={src}
            alt="line-thumbnail"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      ),
      {
        width: Math.trunc(w),
        height: Math.trunc(h),
      }
    );
  } catch (error) {
    console.error("LINE thumbnail generation error:", error);
    return new Response("failed to generate thumbnail", { status: 500 });
  }
}

