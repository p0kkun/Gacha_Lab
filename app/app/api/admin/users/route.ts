import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ユーザー一覧を取得
 * GET /api/admin/users?page=1&limit=20&search=xxx
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // 'createdAt' | 'displayName' | 'gachaCount'
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc' | 'desc'

    const skip = (page - 1) * limit;

    // 検索条件
    const where = search
      ? {
          OR: [
            { userId: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // ソート条件を設定
    let orderBy: any = {};
    if (sortBy === 'gachaCount') {
      // ガチャ実行回数でソートする場合は、別のクエリが必要
      // ここでは簡易的にcreatedAtでソートし、フロントエンドでソート
      orderBy = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'displayName') {
      orderBy = { displayName: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else {
      orderBy = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    // ユーザー一覧と総数を取得
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          userId: true,
          displayName: true,
          pictureUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              gachaHistories: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // ガチャ実行回数でソートする場合
    let sortedUsers = users;
    if (sortBy === 'gachaCount') {
      sortedUsers = [...users].sort((a, b) => {
        const countA = a._count.gachaHistories;
        const countB = b._count.gachaHistories;
        return sortOrder === 'asc' ? countA - countB : countB - countA;
      });
    }

    return NextResponse.json({
      users: sortedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}


