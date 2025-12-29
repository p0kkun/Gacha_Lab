import { prisma } from '@/lib/prisma';
import { AdminActionType } from '@prisma/client';

/**
 * 管理画面操作履歴を記録
 */
export async function recordAdminAction(params: {
  actionType: AdminActionType;
  adminUserId?: string;
  adminName?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.adminActionHistory.create({
      data: {
        actionType: params.actionType,
        adminUserId: params.adminUserId || null,
        adminName: params.adminName || null,
        targetUserId: params.targetUserId || null,
        targetUserIds: params.targetUserIds && params.targetUserIds.length > 0 ? params.targetUserIds : null,
        description: params.description,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    // 履歴記録の失敗はログに記録するが、操作自体は続行
    console.error('管理画面操作履歴の記録に失敗しました:', error);
  }
}

/**
 * ポイント付与の履歴を記録
 */
export async function recordPointGrantAction(params: {
  adminUserId?: string;
  adminName?: string;
  targetUserIds: string[];
  amount: number;
  pointType: 'PAID' | 'FREE';
  description?: string;
}) {
  await recordAdminAction({
    actionType: AdminActionType.POINT_GRANT,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    targetUserIds: params.targetUserIds,
    description: `${params.targetUserIds.length}人のユーザーに${params.amount}ポイント（${params.pointType === 'PAID' ? '有償' : '無償'}）を付与`,
    metadata: {
      amount: params.amount,
      pointType: params.pointType,
      description: params.description,
      targetUserCount: params.targetUserIds.length,
    },
  });
}

/**
 * メッセージ配信の履歴を記録
 */
export async function recordMessageSendAction(params: {
  adminUserId?: string;
  adminName?: string;
  targetUserIds: string[];
  message: string;
  tagIds?: number[];
}) {
  await recordAdminAction({
    actionType: AdminActionType.MESSAGE_SEND,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    targetUserIds: params.targetUserIds,
    description: `${params.targetUserIds.length}人のユーザーにメッセージを配信`,
    metadata: {
      message: params.message,
      tagIds: params.tagIds || [],
      targetUserCount: params.targetUserIds.length,
    },
  });
}

/**
 * タグ付与の履歴を記録
 */
export async function recordTagAssignAction(params: {
  adminUserId?: string;
  adminName?: string;
  targetUserIds: string[];
  tagId: number;
  tagName: string;
  isBulk: boolean;
}) {
  await recordAdminAction({
    actionType: params.isBulk ? AdminActionType.TAG_BULK_ASSIGN : AdminActionType.TAG_ASSIGN,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    targetUserIds: params.targetUserIds,
    description: `${params.targetUserIds.length}人のユーザーにタグ「${params.tagName}」を${params.isBulk ? '一括' : ''}付与`,
    metadata: {
      tagId: params.tagId,
      tagName: params.tagName,
      targetUserCount: params.targetUserIds.length,
      isBulk: params.isBulk,
    },
  });
}

/**
 * ガチャ確率変更の履歴を記録
 */
export async function recordGachaProbabilityUpdateAction(params: {
  adminUserId?: string;
  adminName?: string;
  gachaTypeId: string;
  gachaTypeName: string;
  oldProbabilities?: Record<string, number>;
  newProbabilities: Record<string, number>;
}) {
  await recordAdminAction({
    actionType: AdminActionType.GACHA_PROBABILITY_UPDATE,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    description: `ガチャタイプ「${params.gachaTypeName}」の確率を変更`,
    metadata: {
      gachaTypeId: params.gachaTypeId,
      gachaTypeName: params.gachaTypeName,
      oldProbabilities: params.oldProbabilities,
      newProbabilities: params.newProbabilities,
    },
  });
}

/**
 * 動画アップロードの履歴を記録
 */
export async function recordVideoUploadAction(params: {
  adminUserId?: string;
  adminName?: string;
  videoId: number;
  videoType: string;
  rarity?: string | null;
  fileName: string;
  fileSize: number;
  description?: string | null;
}) {
  const rarityLabel = params.rarity 
    ? `（${params.rarity}）`
    : '';
  await recordAdminAction({
    actionType: AdminActionType.VIDEO_UPLOAD,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    description: `動画をアップロード: ${params.videoType}${rarityLabel} - ${params.fileName}`,
    metadata: {
      videoId: params.videoId,
      videoType: params.videoType,
      rarity: params.rarity,
      fileName: params.fileName,
      fileSize: params.fileSize,
      description: params.description,
    },
  });
}

/**
 * 動画更新の履歴を記録
 */
export async function recordVideoUpdateAction(params: {
  adminUserId?: string;
  adminName?: string;
  videoId: number;
  videoType: string;
  rarity?: string | null;
  fileName: string;
  changes: Record<string, any>;
}) {
  const rarityLabel = params.rarity 
    ? `（${params.rarity}）`
    : '';
  await recordAdminAction({
    actionType: AdminActionType.VIDEO_UPDATE,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    description: `動画を更新: ${params.videoType}${rarityLabel} - ${params.fileName}`,
    metadata: {
      videoId: params.videoId,
      videoType: params.videoType,
      rarity: params.rarity,
      fileName: params.fileName,
      changes: params.changes,
    },
  });
}

/**
 * 動画削除の履歴を記録
 */
export async function recordVideoDeleteAction(params: {
  adminUserId?: string;
  adminName?: string;
  videoId: number;
  videoType: string;
  rarity?: string | null;
  fileName: string;
}) {
  const rarityLabel = params.rarity 
    ? `（${params.rarity}）`
    : '';
  await recordAdminAction({
    actionType: AdminActionType.VIDEO_DELETE,
    adminUserId: params.adminUserId,
    adminName: params.adminName,
    description: `動画を削除: ${params.videoType}${rarityLabel} - ${params.fileName}`,
    metadata: {
      videoId: params.videoId,
      videoType: params.videoType,
      rarity: params.rarity,
      fileName: params.fileName,
    },
  });
}

