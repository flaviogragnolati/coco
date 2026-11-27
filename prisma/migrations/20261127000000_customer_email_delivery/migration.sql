-- CreateEnum
CREATE TYPE "CustomerEmailStatus" AS ENUM ('pending', 'processing', 'accepted', 'skipped', 'review');

-- CreateTable
CREATE TABLE "customer_email_delivery" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "environment" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "notice" JSONB NOT NULL,
    "status" "CustomerEmailStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "request" JSONB,
    "providerId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_email_delivery_environment_status_nextAttemptAt_idx" ON "customer_email_delivery"("environment", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "customer_email_delivery_orderId_idx" ON "customer_email_delivery"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_delivery_environment_eventKey_key" ON "customer_email_delivery"("environment", "eventKey");

-- AddForeignKey
ALTER TABLE "customer_email_delivery" ADD CONSTRAINT "customer_email_delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "user_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
