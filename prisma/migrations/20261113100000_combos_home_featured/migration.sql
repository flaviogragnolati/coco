-- Expand only: product."homeOfferRank" stays (deprecated, unread) until a later contract
-- migration, because this runs before the deploy and the code still running reads it.
BEGIN;

-- AlterTable
ALTER TABLE "home_offer_settings" ADD COLUMN     "fillWithRanking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "spotlightComboId" INTEGER;

-- CreateTable
CREATE TABLE "combo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "people" INTEGER,
    "groupName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_item" (
    "id" SERIAL NOT NULL,
    "comboId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "combo_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_featured_item" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" INTEGER,
    "comboId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_featured_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "combo_groupName_idx" ON "combo"("groupName");

-- CreateIndex
CREATE INDEX "combo_item_productId_idx" ON "combo_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "combo_item_comboId_productId_key" ON "combo_item"("comboId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "home_featured_item_productId_key" ON "home_featured_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "home_featured_item_comboId_key" ON "home_featured_item"("comboId");

-- CreateIndex
CREATE INDEX "home_featured_item_position_idx" ON "home_featured_item"("position");

-- CreateIndex
CREATE INDEX "home_offer_settings_spotlightComboId_idx" ON "home_offer_settings"("spotlightComboId");

-- AddForeignKey
ALTER TABLE "home_offer_settings" ADD CONSTRAINT "home_offer_settings_spotlightComboId_fkey" FOREIGN KEY ("spotlightComboId") REFERENCES "combo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_featured_item" ADD CONSTRAINT "home_featured_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_featured_item" ADD CONSTRAINT "home_featured_item_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_item" ADD CONSTRAINT "combo_item_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "combo" ADD CONSTRAINT "combo_people_positive" CHECK ("people" IS NULL OR "people" > 0);
ALTER TABLE "home_featured_item" ADD CONSTRAINT "home_featured_item_one_target"
  CHECK (num_nonnulls("productId", "comboId") = 1);
ALTER TABLE "home_offer_settings" ADD CONSTRAINT "home_offer_settings_one_spotlight"
  CHECK (num_nonnulls("spotlightProductId", "spotlightComboId") <= 1);

-- Carry today's pinned products over to the featured list, keeping their order as 1..n.
INSERT INTO "home_featured_item" ("position", "productId")
SELECT ROW_NUMBER() OVER (ORDER BY "homeOfferRank", "id"), "id"
FROM "product"
WHERE "homeOfferRank" IS NOT NULL AND "deleted" = false;

COMMIT;
