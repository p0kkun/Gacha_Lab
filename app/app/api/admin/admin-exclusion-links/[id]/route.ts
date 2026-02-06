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

function parseId(request: NextRequest): number | null {
  const id = Number(request.nextUrl.pathname.split('/').pop());
  return Number.isFinite(id) ? id : null;
}

function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`;
  }
  return trimmed;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const linkId = parseId(request);
  if (!linkId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const rawLink = body?.link?.toString();
  if (!rawLink) {
    return NextResponse.json({ error: 'リンクは必須です' }, { status: 400 });
  }

  const link = normalizeLink(rawLink);

  try {
    const updated = await prisma.adminExclusionLink.update({
      where: { id: linkId },
      data: { link },
      include: { role: true },
    });

    await recordAdminAction({
      actionType: AdminActionType.UPDATE_EXCLUSION_LINK,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `非表示リンクを更新: ${link}`,
      metadata: { link, roleId: updated.adminRoleId, roleName: updated.role?.name ?? null },
    });

    return NextResponse.json({ link: updated });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '同じリンクが既に登録されています' }, { status: 400 });
    }
    console.error('非表示リンク更新エラー:', error);
    return NextResponse.json({ error: '非表示リンクの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const linkId = parseId(request);
  if (!linkId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const existing = await prisma.adminExclusionLink.findUnique({
    where: { id: linkId },
    include: { role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: '対象のリンクが存在しません' }, { status: 404 });
  }

  await prisma.adminExclusionLink.delete({ where: { id: linkId } });

  await recordAdminAction({
    actionType: AdminActionType.DELETE_EXCLUSION_LINK,
    adminUserId: String(auth.adminUser.id),
    adminName: auth.adminUser.name ?? auth.adminUser.email,
    description: `非表示リンクを削除: ${existing.link}`,
    metadata: { link: existing.link, roleId: existing.adminRoleId, roleName: existing.role?.name ?? null },
  });

  return NextResponse.json({ ok: true });
}
