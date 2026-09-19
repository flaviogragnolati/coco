-- Additive and nullable, no backfill: rows written before this column stay null
-- and keep being charged through the per-demand budget, as before.
ALTER TABLE "package_allocation" ADD COLUMN "sourcePackageId" INTEGER;

CREATE INDEX "package_allocation_sourcePackageId_idx" ON "package_allocation"("sourcePackageId");

ALTER TABLE "package_allocation" ADD CONSTRAINT "package_allocation_sourcePackageId_fkey" FOREIGN KEY ("sourcePackageId") REFERENCES "package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
