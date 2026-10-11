CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

INSERT INTO "category" ("name", "sortOrder") VALUES
    ('Frutos secos', 1),
    ('Mixes y snacks', 2),
    ('Frutas desecadas', 3),
    ('Semillas y granola', 4),
    ('Aceites y despensa', 5),
    ('Suplementos', 6);

-- Nullable until scripts/backfill-categories.ts has run; a later migration sets NOT NULL.
ALTER TABLE "product" ADD COLUMN "categoryId" INTEGER;

CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

ALTER TABLE "product"
ADD CONSTRAINT "product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "category"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
