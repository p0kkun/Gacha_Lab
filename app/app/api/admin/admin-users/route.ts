import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { createPasswordHash, verifyPasswordHash } from '@/lib/admin-crypto';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_HISTORY_LIMIT = 5;

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

  const users = await prisma.adminUser.findMany({
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const name = body?.name?.toString().trim();
  const roleId = Number(body?.roleId);
  const password = body?.password?.toString() ?? '';
  const isActive = body?.isActive !== false;

  if (!email || !name || !Number.isFinite(roleId)) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上である必要があります` },
      { status: 400 }
    );
  }

  const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: '指定されたロールが存在しません' }, { status: 400 });
  }

  const passwordHash = createPasswordHash(password);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.adminUser.create({
        data: {
          email,
          name,
          roleId,
          passwordHash,
          isActive,
          lastPasswordChangedAt: new Date(),
        },
      });

      await tx.adminPasswordHistory.create({
        data: {
          adminUserId: adminUser.id,
          passwordHash,
        },
      });

      return adminUser;
    });

    await recordAdminAction({
      actionType: AdminActionType.CREATE_ADMIN,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `管理者を作成: ${created.email}`,
      metadata: {
        targetAdminUserId: created.id,
        email: created.email,
        roleId,
        roleName: role.name,
        isActive,
      },
    });

    return NextResponse.json({ adminUser: created });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: '同じメールアドレスが既に存在します' }, { status: 400 });
    }
    console.error('管理者作成エラー:', error);
    return NextResponse.json({ error: '管理者の作成に失敗しました' }, { status: 500 });
  }
}
