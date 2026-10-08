CREATE TABLE "supplier_application" (
    "id" SERIAL NOT NULL,
    "contactName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "offering" TEXT NOT NULL,
    "contactedAt" TIMESTAMP(3),
    "contactedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_application_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplier_application_contact_check" CHECK (NULLIF(btrim("email"), '') IS NOT NULL OR NULLIF(btrim("phone"), '') IS NOT NULL)
);

CREATE INDEX "supplier_application_contactedAt_idx"
ON "supplier_application"("contactedAt");

ALTER TABLE "supplier_application"
ADD CONSTRAINT "supplier_application_contactedById_fkey"
FOREIGN KEY ("contactedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
