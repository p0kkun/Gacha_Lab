import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { createPasswordHash, verifyPasswordHash } from '@/lib/admin-crypto';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_HISTORY_LIMIT = 5;

type RequireSuperAdminResult =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      adminUser: { id: number; name: string | null; email: string };
      context: { adminUserId: number };
    };

async function requireSuperAdmin(request: NextRequest): Promise<RequireSuperAdminResult> {
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

  return {
    ok: true,
    adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email },
    context: { adminUserId: context.adminUserId },
  };
}

function parseId(request: NextRequest): number | null {
  const id = Number(request.nextUrl.pathname.split('/').pop());
  return Number.isFinite(id) ? id : null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const targetId = parseId(request);
  if (!targetId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.toString().trim();
  const roleIdRaw = body?.roleId;
  const roleId = roleIdRaw === undefined ? undefined : Number(roleIdRaw);
  const isActive =
    body?.isActive === undefined ? undefined : Boolean(body?.isActive);
  const password = body?.password?.toString() ?? '';

  const targetUser = await prisma.adminUser.findUnique({
    where: { id: targetId },
    include: { role: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: '対象の管理者が存在しません' }, { status: 404 });
  }

  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上である必要があります` },
      { status: 400 }
    );
  }

  let newRole = targetUser.role;
  if (roleId !== undefined) {
    if (!Number.isFinite(roleId)) {
      return NextResponse.json({ error: 'ロールIDが不正です' }, { status: 400 });
    }
    newRole = await prisma.adminRole.findUnique({ where: { id: roleId } });
    if (!newRole) {
      return NextResponse.json({ error: '指定されたロールが存在しません' }, { status: 400 });
    }
  }

  let passwordHash: string | undefined;
  if (password) {
    const histories = await prisma.adminPasswordHistory.findMany({
      where: { adminUserId: targetId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_LIMIT,
    });
    const reused = histories.some((h) => verifyPasswordHash(password, h.passwordHash));
    if (reused) {
      return NextResponse.json(
        { error: `直近${PASSWORD_HISTORY_LIMIT}回と同じパスワードは使用できません` },
        { status: 400 }
      );
    }
    passwordHash = createPasswordHash(password);
  }

  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (roleId !== undefined) updates.roleId = roleId;
  if (isActive !== undefined) updates.isActive = isActive;
  if (passwordHash) {
    updates.passwordHash = passwordHash;
    updates.lastPasswordChangedAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '更新内容がありません' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const adminUser = await tx.adminUser.update({
      where: { id: targetId },
      data: updates,
    });

    if (passwordHash) {
      await tx.adminPasswordHistory.create({
        data: {
          adminUserId: targetId,
          passwordHash,
        },
      });
    }

    if (isActive === false) {
      await tx.adminSession.updateMany({
        where: { adminUserId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return adminUser;
  });

  await recordAdminAction({
    actionType: AdminActionType.UPDATE_ADMIN,
    adminUserId: String(auth.adminUser.id),
    adminName: auth.adminUser.name ?? auth.adminUser.email,
    description: `管理者を更新: ${updated.email}`,
    metadata: {
      targetAdminUserId: targetId,
      changes: updates,
      roleName: newRole?.name ?? null,
    },
  });

  if (passwordHash) {
    await recordAdminAction({
      actionType: AdminActionType.RESET_PASSWORD,
      adminUserId: String(auth.adminUser.id),
      adminName: auth.adminUser.name ?? auth.adminUser.email,
      description: `管理者パスワード変更: ${updated.email}`,
      metadata: { targetAdminUserId: targetId },
    });
  }

  return NextResponse.json({ adminUser: updated });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const targetId = parseId(request);
  if (!targetId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  if (targetId === auth.context.adminUserId) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 });
  }

  const targetUser = await prisma.adminUser.findUnique({
    where: { id: targetId },
    include: { role: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: '対象の管理者が存在しません' }, { status: 404 });
  }

  if (targetUser.role?.name === 'super_admin') {
    const superAdminCount = await prisma.adminUser.count({
      where: { role: { name: 'super_admin' }, isActive: true },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: '最後のsuper_adminは削除できません' },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.adminSession.deleteMany({ where: { adminUserId: targetId } });
    await tx.adminPasswordHistory.deleteMany({ where: { adminUserId: targetId } });
    await tx.adminUser.delete({ where: { id: targetId } });
  });

  await recordAdminAction({
    actionType: AdminActionType.DELETE_ADMIN,
    adminUserId: String(auth.adminUser.id),
    adminName: auth.adminUser.name ?? auth.adminUser.email,
    description: `管理者を削除: ${targetUser.email}`,
    metadata: {
      targetAdminUserId: targetId,
      email: targetUser.email,
      roleName: targetUser.role?.name ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
