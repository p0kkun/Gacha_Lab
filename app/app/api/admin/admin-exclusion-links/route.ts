import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

type SuperAdminAuthResult =
  | { ok: false; response: NextResponse }
  | { ok: true; adminUser: NonNullable<Awaited<ReturnType<typeof prisma.adminUser.findUnique>>> };

async function requireSuperAdmin(request: NextRequest): Promise<SuperAdminAuthResult> {
  const context = await getAdminAuthContext(request);
  if (!context) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: context.adminUserId },
    include: { role: true },
  });

  if (!adminUser || adminUser.role?.name !== 'super_admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, adminUser };
}

function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`;
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  if (!await getAdminAuthContext(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleIdParam = searchParams.get('roleId');
  const roleId = roleIdParam ? Number(roleIdParam) : null;

  const links = await prisma.adminExclusionLink.findMany({
    where: roleId && Number.isFinite(roleId) ? { adminRoleId: roleId } : undefined,
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const roleId = Number(body?.roleId);
  const rawLink = body?.link?.toString();
  if (!Number.isFinite(roleId) || !rawLink) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  const link = normalizeLink(rawLink);
  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: '指定されたロールが存在しません' }, { status: 400 });
  }

  try {
    const created = await prisma.adminExclusionLink.create({
      data: { adminRoleId: roleId, link },
    });

    await recordAdminAction({
      actionType: AdminActionType.CREATE_EXCLUSION_LINK,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `非表示リンクを追加: ${link}`,
      metadata: { link, roleId, roleName: role.name },
    });

    return NextResponse.json({ link: created });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '同じリンクが既に登録されています' }, { status: 400 });
    }
    console.error('非表示リンク作成エラー:', error);
    return NextResponse.json({ error: '非表示リンクの作成に失敗しました' }, { status: 500 });
  }
}
