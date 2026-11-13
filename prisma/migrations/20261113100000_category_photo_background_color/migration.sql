-- Additive only, no backfill: an admin loads each category's color; null draws the legend in neutral gray.
ALTER TABLE "category" ADD COLUMN "photoBackgroundColor" TEXT;
