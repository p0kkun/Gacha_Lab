import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

type CreateBody = {
  code?: string;
  template?: string;
  description?: string | null;
  isActive?: boolean;
};

/**
 * 結果メッセージテンプレート一覧（管理者用）
 * GET /api/admin/result-message-templates
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.resultMessageTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("管理者: テンプレート一覧取得エラー:", error);
    return NextResponse.json(
      { error: "テンプレート一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 結果メッセージテンプレート作成（管理者用）
 * POST /api/admin/result-message-templates
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateBody;
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const template = typeof body.template === "string" ? body.template : "";
    const description =
      typeof body.description === "string" ? body.description : null;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    if (!code) {
      return NextResponse.json({ error: "code は必須です" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: "code は英数字/ハイフン/アンダースコアのみ使用できます" },
        { status: 400 }
      );
    }
    if (!template.trim()) {
      return NextResponse.json(
        { error: "template は必須です" },
        { status: 400 }
      );
    }

    const created = await prisma.resultMessageTemplate.create({
      data: {
        code,
        template,
        description,
        isActive,
      },
    });

    return NextResponse.json({ template: created });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json(
        { error: "同じcodeが既に存在します" },
        { status: 400 }
      );
    }
    console.error("管理者: テンプレート作成エラー:", error);
    return NextResponse.json(
      { error: "テンプレートの作成に失敗しました" },
      { status: 500 }
    );
  }
}






