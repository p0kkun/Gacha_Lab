"use client";

import { useParams } from "next/navigation";
import { GachaTypeEditor } from "@/components/admin/gacha/GachaTypeEditor";

export default function EditGachaTypePage() {
  const params = useParams<{ code: string }>();
  return <GachaTypeEditor mode="edit" initialCode={String(params?.code ?? "")} />;
}
