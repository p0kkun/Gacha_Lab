"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /admin/analytics は /admin/messages にリダイレクト
export default function AnalyticsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/messages");
  }, [router]);
  return null;
}
