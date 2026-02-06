import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const context = await getAdminAuthContext(request);
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: context.adminUserId },
    include: {
      role: { include: { exclusionLinks: true } },
    },
  });

  if (!adminUser || !adminUser.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role?.name ?? null,
    },
    exclusionLinks: adminUser.role?.exclusionLinks?.map((l) => l.link) ?? [],
  });
}
