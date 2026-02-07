import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_DAYS,
  setResponseCookie,
} from '@/lib/admin-auth';
import {
  generateSessionToken,
  hashToken,
  verifyPasswordHash,
} from '@/lib/admin-crypto';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase();
  const password = body?.password?.toString() ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { email },
    include: {
      role: { include: { exclusionLinks: true } },
    },
  });

  if (!adminUser || !adminUser.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passwordOk = verifyPasswordHash(password, adminUser.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_DAYS * 86400 * 1000);

  await prisma.adminSession.create({
    data: {
      adminUserId: adminUser.id,
      tokenHash,
      expiresAt,
    },
  });

  await recordAdminAction({
    actionType: AdminActionType.LOGIN,
    adminUserId: String(adminUser.id),
    adminName: adminUser.name ?? adminUser.email,
    description: `管理者ログイン: ${adminUser.email}`,
    metadata: {
      adminUserId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role?.name ?? null,
    },
  });

  const response = NextResponse.json({
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role?.name ?? null,
    },
    exclusionLinks: adminUser.role?.exclusionLinks?.map((l) => l.link) ?? [],
  });

  setResponseCookie(response, ADMIN_SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return response;
}
