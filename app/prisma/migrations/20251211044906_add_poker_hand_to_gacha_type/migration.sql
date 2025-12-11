-- CreateEnum
CREATE TYPE "HandRank" AS ENUM ('ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND', 'TWO_PAIR', 'ONE_PAIR', 'HIGH_CARD');

-- AlterTable
ALTER TABLE "gacha_types" ADD COLUMN     "fifthPrizeHand" "HandRank",
ADD COLUMN     "firstPrizeHand" "HandRank",
ADD COLUMN     "fourthPrizeHand" "HandRank",
ADD COLUMN     "loserHand" "HandRank",
ADD COLUMN     "secondPrizeHand" "HandRank",
ADD COLUMN     "thirdPrizeHand" "HandRank";
