import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE_NAME, getAdminAuthContext } from '@/lib/admin-auth';
import { hashToken } from '@/lib/admin-crypto';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

export async function POST(request: NextRequest) {
  const authContext = await getAdminAuthContext(request);
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (cookieValue) {
    const tokenHash = hashToken(cookieValue);
    await prisma.adminSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  if (authContext) {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { name: true, email: true },
    });
    await recordAdminAction({
      actionType: AdminActionType.LOGOUT,
      adminUserId: String(authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? 'admin',
      description: '管理者ログアウト',
      metadata: {
        adminUserId: authContext.adminUserId,
        email: adminUser?.email ?? null,
      },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
