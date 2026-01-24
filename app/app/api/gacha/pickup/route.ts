import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

/**
 * 現在のピックアップガチャ情報を取得
 * GET /api/gacha/pickup
 * 
 * 返却値:
 * - { gachaId: string, code: string, name: string } - ピックアップガチャが有効な場合
 * - { gachaId: null, reason: string } - ピックアップ未設定または無効な場合
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // アプリ設定からピックアップガチャIDを取得
    const appSettings = await prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        pickupGacha: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            startAt: true,
            endAt: true,
          },
        },
      },
    });

    // ピックアップが設定されていない場合
    if (!appSettings || !appSettings.pickupGachaId || !appSettings.pickupGacha) {
      await logError(
        new Error('ピックアップガチャが設定されていません'),
        { route: '/api/gacha/pickup' },
        request
      );
      return NextResponse.json({
        gachaId: null,
        reason: 'NOT_SET',
      });
    }

    const pickupGacha = appSettings.pickupGacha;

    // ガチャが無効化されている場合
    if (!pickupGacha.isActive) {
      await logError(
        new Error(`ピックアップガチャが無効化されています: ${pickupGacha.code}`),
        { 
          route: '/api/gacha/pickup',
          customData: { gachaId: pickupGacha.id, code: pickupGacha.code }
        },
        request
      );
      return NextResponse.json({
        gachaId: null,
        reason: 'INACTIVE',
      });
    }

    // ガチャが期間外の場合
    if (pickupGacha.startAt && now < pickupGacha.startAt) {
      await logError(
        new Error(`ピックアップガチャがまだ開始されていません: ${pickupGacha.code}`),
        { 
          route: '/api/gacha/pickup',
          customData: { gachaId: pickupGacha.id, code: pickupGacha.code }
        },
        request
      );
      return NextResponse.json({
        gachaId: null,
        reason: 'NOT_STARTED',
      });
    }

    if (pickupGacha.endAt && now > pickupGacha.endAt) {
      await logError(
        new Error(`ピックアップガチャが終了しています: ${pickupGacha.code}`),
        { 
          route: '/api/gacha/pickup',
          customData: { gachaId: pickupGacha.id, code: pickupGacha.code }
        },
        request
      );
      return NextResponse.json({
        gachaId: null,
        reason: 'ENDED',
      });
    }

    // 有効なピックアップガチャを返す
    return NextResponse.json({
      gachaId: pickupGacha.code, // 外部参照用のcodeを返す（後方互換）
      code: pickupGacha.code,
      name: pickupGacha.name,
    });
  } catch (error) {
    await logError(error, { route: '/api/gacha/pickup' }, request);
    return NextResponse.json(
      { error: 'ピックアップガチャの取得に失敗しました' },
      { status: 500 }
    );
  }
}
