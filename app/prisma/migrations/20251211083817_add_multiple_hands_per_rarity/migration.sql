-- 既存データを保持しながら、単一の役を配列に移行
-- 1. 新しい配列カラムを追加（一時的にNULLを許可）
ALTER TABLE "gacha_types" 
ADD COLUMN "firstPrizeHands" "HandRank"[],
ADD COLUMN "secondPrizeHands" "HandRank"[],
ADD COLUMN "thirdPrizeHands" "HandRank"[],
ADD COLUMN "fourthPrizeHands" "HandRank"[],
ADD COLUMN "fifthPrizeHands" "HandRank"[];

-- 2. 既存の単一の役を配列に移行
UPDATE "gacha_types" 
SET 
  "firstPrizeHands" = CASE 
    WHEN "firstPrizeHand" IS NOT NULL THEN ARRAY["firstPrizeHand"]::"HandRank"[]
    ELSE ARRAY[]::"HandRank"[]
  END,
  "secondPrizeHands" = CASE 
    WHEN "secondPrizeHand" IS NOT NULL THEN ARRAY["secondPrizeHand"]::"HandRank"[]
    ELSE ARRAY[]::"HandRank"[]
  END,
  "thirdPrizeHands" = CASE 
    WHEN "thirdPrizeHand" IS NOT NULL THEN ARRAY["thirdPrizeHand"]::"HandRank"[]
    ELSE ARRAY[]::"HandRank"[]
  END,
  "fourthPrizeHands" = CASE 
    WHEN "fourthPrizeHand" IS NOT NULL THEN ARRAY["fourthPrizeHand"]::"HandRank"[]
    ELSE ARRAY[]::"HandRank"[]
  END,
  "fifthPrizeHands" = CASE 
    WHEN "fifthPrizeHand" IS NOT NULL THEN ARRAY["fifthPrizeHand"]::"HandRank"[]
    ELSE ARRAY[]::"HandRank"[]
  END;

-- 3. デフォルト値を設定
ALTER TABLE "gacha_types" 
ALTER COLUMN "firstPrizeHands" SET DEFAULT ARRAY[]::"HandRank"[],
ALTER COLUMN "secondPrizeHands" SET DEFAULT ARRAY[]::"HandRank"[],
ALTER COLUMN "thirdPrizeHands" SET DEFAULT ARRAY[]::"HandRank"[],
ALTER COLUMN "fourthPrizeHands" SET DEFAULT ARRAY[]::"HandRank"[],
ALTER COLUMN "fifthPrizeHands" SET DEFAULT ARRAY[]::"HandRank"[];

-- 4. NULLを許可しないように変更
ALTER TABLE "gacha_types" 
ALTER COLUMN "firstPrizeHands" SET NOT NULL,
ALTER COLUMN "secondPrizeHands" SET NOT NULL,
ALTER COLUMN "thirdPrizeHands" SET NOT NULL,
ALTER COLUMN "fourthPrizeHands" SET NOT NULL,
ALTER COLUMN "fifthPrizeHands" SET NOT NULL;

-- 5. 古いカラムを削除
ALTER TABLE "gacha_types" 
DROP COLUMN "firstPrizeHand",
DROP COLUMN "secondPrizeHand",
DROP COLUMN "thirdPrizeHand",
DROP COLUMN "fourthPrizeHand",
DROP COLUMN "fifthPrizeHand",
DROP COLUMN "loserHand";
