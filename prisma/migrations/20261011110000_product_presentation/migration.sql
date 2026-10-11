CREATE TYPE "ProductPresentationContainer" AS ENUM ('botella', 'bidon', 'frasco', 'bolsa', 'paquete', 'unidad');

ALTER TABLE "product" ADD COLUMN     "presentationContainer" "ProductPresentationContainer",
ADD COLUMN     "presentationSize" TEXT;

ALTER TABLE "product_supplier_terms" ADD COLUMN     "supplierPresentation" TEXT;

