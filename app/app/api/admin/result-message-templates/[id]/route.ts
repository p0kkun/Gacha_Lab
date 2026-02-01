import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

type UpdateBody = {
  code?: string;
  template?: string;
  description?: string | null;
  isActive?: boolean;
};

/**
 * 結果メッセージテンプレート更新（管理者用）
 * PUT /api/admin/result-message-templates/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateBody;
    const data: any = {};

    if (body.code !== undefined) {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!code) {
        return NextResponse.json({ error: "code は必須です" }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
        return NextResponse.json(
          { error: "code は英数字/ハイフン/アンダースコアのみ使用できます" },
          { status: 400 }
        );
      }
      data.code = code;
    }
    if (body.template !== undefined) {
      const template = typeof body.template === "string" ? body.template : "";
      if (!template.trim()) {
        return NextResponse.json(
          { error: "template は必須です" },
          { status: 400 }
        );
      }
      data.template = template;
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" ? body.description : null;
    }
    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const updated = await prisma.resultMessageTemplate.update({
      where: { id: templateId },
      data,
    });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "同じcodeが既に存在します" },
        { status: 400 }
      );
    }
    console.error("管理者: テンプレート更新エラー:", error);
    return NextResponse.json(
      { error: "テンプレートの更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 結果メッセージテンプレート削除（管理者用）
 * DELETE /api/admin/result-message-templates/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // 参照されている場合は削除できない（分かりやすいエラー）
    const refCount = await prisma.gachaType.count({
      where: { resultMessageTemplateId: templateId },
    });
    if (refCount > 0) {
      return NextResponse.json(
        {
          error:
            "このテンプレートはガチャ設定で使用中のため削除できません（先にガチャ設定側を変更してください）",
        },
        { status: 400 }
      );
    }

    await prisma.resultMessageTemplate.delete({ where: { id: templateId } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2025") {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      );
    }
    console.error("管理者: テンプレート削除エラー:", error);
    return NextResponse.json(
      { error: "テンプレートの削除に失敗しました" },
      { status: 500 }
    );
  }
}






