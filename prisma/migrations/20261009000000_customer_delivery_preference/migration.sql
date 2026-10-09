-- Additive only, no backfill: orders paid before this change keep a null
-- delivery preference and existing shipments a null pickup point. Nothing here
-- uses the new enum value, so adding it inside this transaction is safe.
ALTER TYPE "CartItemTrackingEventType" ADD VALUE 'deliveryPreferenceChanged';

CREATE TABLE "pickup_point" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'AR',
    "googleMapsUrl" TEXT,
    "hours" TEXT NOT NULL,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_point_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_order"
ADD COLUMN "deliveryPreference" "DeliveryMode",
ADD COLUMN "pickupPointId" INTEGER,
ADD COLUMN "pickupPointSnapshot" JSONB;

-- A pickup order names its point, snapshots it and stores no address; a home
-- order always has its address snapshot; a legacy order sets none of the three.
ALTER TABLE "user_order"
ADD CONSTRAINT "user_order_delivery_preference_check" CHECK (
    ("deliveryPreference" IS NULL AND "pickupPointId" IS NULL AND "pickupPointSnapshot" IS NULL)
    OR ("deliveryPreference" = 'pickupPoint' AND "pickupPointId" IS NOT NULL AND "pickupPointSnapshot" IS NOT NULL AND "shippingAddressSnapshot" IS NULL)
    OR ("deliveryPreference" = 'homeDelivery' AND "pickupPointId" IS NULL AND "pickupPointSnapshot" IS NULL AND "shippingAddressSnapshot" IS NOT NULL)
);

CREATE INDEX "user_order_pickupPointId_idx" ON "user_order"("pickupPointId");

ALTER TABLE "user_order"
ADD CONSTRAINT "user_order_pickupPointId_fkey"
FOREIGN KEY ("pickupPointId") REFERENCES "pickup_point"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shipment" ADD COLUMN "pickupPointId" INTEGER;

ALTER TABLE "shipment"
ADD CONSTRAINT "shipment_pickup_point_check" CHECK (
    "pickupPointId" IS NULL
    OR ("type" = 'endUserDelivery' AND "deliveryMode" = 'pickupPoint')
);

CREATE INDEX "shipment_pickupPointId_idx" ON "shipment"("pickupPointId");

ALTER TABLE "shipment"
ADD CONSTRAINT "shipment_pickupPointId_fkey"
FOREIGN KEY ("pickupPointId") REFERENCES "pickup_point"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
