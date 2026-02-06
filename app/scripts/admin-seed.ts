import path from 'path';
import dotenv from 'dotenv';
import { createPasswordHash } from '@/lib/admin-crypto';
import type { PrismaClient } from '@prisma/client';

// Load env for Prisma adapter initialization (DATABASE_URL)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type SeedAdmin = {
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'viewer';
  password: string;
};

const seedAdmins: SeedAdmin[] = [
  {
    email: 'gdqg0706@yahoo.co.jp',
    name: '佐藤彰洋',
    role: 'super_admin',
    password: 'pokergacha222',
  },
  {
    email: 'ysmsnzk@gmail.com',
    name: '野崎保将',
    role: 'super_admin',
    password: 'ysms0624',
  },
  {
    email: 'nogami.yuya@gmail.com',
    name: '野上雄也',
    role: 'super_admin',
    password: 'shaved_head',
  },
];

const roleExclusions: Record<'admin' | 'viewer', string[]> = {
  admin: [
    '/admin/admin-users',
    '/admin/admin-roles',
    '/admin/admin-exclusion-links',
    '/api/admin/admin-users/*',
    '/api/admin/admin-roles/*',
    '/api/admin/admin-exclusion-links/*',
  ],
  viewer: [
    '/admin/points',
    '/admin/gacha',
    '/admin/items',
    '/admin/videos',
    '/admin/messages',
    '/admin/tags',
    '/admin/users',
    '/api/admin/points/*',
    '/api/admin/gacha/*',
    '/api/admin/items/*',
    '/api/admin/videos/*',
    '/api/admin/messages/*',
    '/api/admin/tags/*',
    '/api/admin/users/*',
    '/api/admin/cache*',
  ],
};

let prismaClient: PrismaClient | null = null;

async function ensureRole(prisma: PrismaClient, name: string) {
  const existing = await prisma.adminRole.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.adminRole.create({ data: { name } });
}

async function seedExclusions(
  prisma: PrismaClient,
  roleId: number,
  links: string[]
) {
  if (links.length === 0) return;
  await prisma.adminExclusionLink.createMany({
    data: links.map((link) => ({ adminRoleId: roleId, link })),
    skipDuplicates: true,
  });
}

async function seedAdmin(prisma: PrismaClient, admin: SeedAdmin) {
  const existingUser = await prisma.adminUser.findUnique({
    where: { email: admin.email },
  });
  if (existingUser) {
    console.log(`Admin user already exists: ${admin.email}`);
    return;
  }

  const role =
    (await prisma.adminRole.findUnique({ where: { name: admin.role } })) ??
    (await prisma.adminRole.create({ data: { name: admin.role } }));

  const passwordHash = createPasswordHash(admin.password);
  const adminUser = await prisma.adminUser.create({
    data: {
      email: admin.email,
      name: admin.name,
      roleId: role.id,
      passwordHash,
      lastPasswordChangedAt: new Date(),
    },
  });

  await prisma.adminPasswordHistory.create({
    data: {
      adminUserId: adminUser.id,
      passwordHash,
    },
  });

  console.log(`Admin user created: ${adminUser.email} (${role.name})`);
}

async function main() {
  const { prisma } = await import('@/lib/prisma');
  prismaClient = prisma;

  console.log('🌱 管理者初期データの投入を開始します...');

  const superAdminRole = await ensureRole(prisma, 'super_admin');
  const adminRole = await ensureRole(prisma, 'admin');
  const viewerRole = await ensureRole(prisma, 'viewer');

  await seedExclusions(prisma, adminRole.id, roleExclusions.admin);
  await seedExclusions(prisma, viewerRole.id, roleExclusions.viewer);

  for (const admin of seedAdmins) {
    await seedAdmin(prisma, admin);
  }

  console.log('✅ 管理者初期データの投入が完了しました');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
