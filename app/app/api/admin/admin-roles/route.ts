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

export async function GET(request: NextRequest) {
  if (!await getAdminAuthContext(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = await prisma.adminRole.findMany({
    include: {
      _count: { select: { users: true, exclusionLinks: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const name = body?.name?.toString().trim();
  if (!name) {
    return NextResponse.json({ error: 'ロール名は必須です' }, { status: 400 });
  }

  try {
    const role = await prisma.adminRole.create({ data: { name } });

    await recordAdminAction({
      actionType: AdminActionType.CREATE_ROLE,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `管理者ロールを作成: ${name}`,
      metadata: { roleId: role.id, roleName: name },
    });

    return NextResponse.json({ role });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '同名のロールが既に存在します' }, { status: 400 });
    }
    console.error('ロール作成エラー:', error);
    return NextResponse.json({ error: 'ロールの作成に失敗しました' }, { status: 500 });
  }
}
