-- CreateTable
CREATE TABLE "point_purchase_plans" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_purchase_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_purchase_plans_isActive_displayOrder_idx" ON "point_purchase_plans"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "point_purchase_plans_displayOrder_idx" ON "point_purchase_plans"("displayOrder");
