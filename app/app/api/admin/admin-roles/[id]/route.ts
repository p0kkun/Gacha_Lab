import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

async function requireSuperAdmin(request: NextRequest) {
  const context = await getAdminAuthContext(request);
  if (!context) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: context.adminUserId },
    include: { role: true },
  });

  if (!adminUser || adminUser.role?.name !== 'super_admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, adminUser };
}

function parseId(request: NextRequest): number | null {
  const id = Number(request.nextUrl.pathname.split('/').pop());
  return Number.isFinite(id) ? id : null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const roleId = parseId(request);
  if (!roleId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.toString().trim();
  if (!name) {
    return NextResponse.json({ error: 'ロール名は必須です' }, { status: 400 });
  }

  try {
    const role = await prisma.adminRole.update({
      where: { id: roleId },
      data: { name },
    });

    await recordAdminAction({
      actionType: AdminActionType.UPDATE_ROLE,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `管理者ロールを更新: ${name}`,
      metadata: { roleId, roleName: name },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '同名のロールが既に存在します' }, { status: 400 });
    }
    console.error('ロール更新エラー:', error);
    return NextResponse.json({ error: 'ロールの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const roleId = parseId(request);
  if (!roleId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });
  if (!role) {
    return NextResponse.json({ error: '対象のロールが存在しません' }, { status: 404 });
  }

  if (role.name === 'super_admin') {
    return NextResponse.json({ error: 'super_adminロールは削除できません' }, { status: 400 });
  }

  if (role._count.users > 0) {
    return NextResponse.json(
      { error: 'このロールを使用中の管理者がいるため削除できません' },
      { status: 400 }
    );
  }

  await prisma.adminRole.delete({ where: { id: roleId } });

  await recordAdminAction({
    actionType: AdminActionType.DELETE_ROLE,
    adminUserId: String(auth.adminUser.id),
    adminName: auth.adminUser.name ?? auth.adminUser.email,
    description: `管理者ロールを削除: ${role.name}`,
    metadata: { roleId, roleName: role.name },
  });

  return NextResponse.json({ ok: true });
}
