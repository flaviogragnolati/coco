ALTER TABLE "supplier_application" ADD COLUMN "ipHash" TEXT;

CREATE INDEX "supplier_application_ipHash_createdAt_idx"
ON "supplier_application"("ipHash", "createdAt");
