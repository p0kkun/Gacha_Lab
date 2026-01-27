import { Suspense } from "react";
import PointsPageClient from "./points-page-client";

export default function PointsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg">読み込み中...</div>
          </div>
        </div>
      }
    >
      <PointsPageClient />
    </Suspense>
  );
}
