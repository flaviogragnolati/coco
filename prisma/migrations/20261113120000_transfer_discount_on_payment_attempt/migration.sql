-- Additive only, no backfill: existing attempts had no transfer discount.
ALTER TABLE "user_transaction"
ADD COLUMN "subtotalAmount" DECIMAL(18,2),
ADD COLUMN "transferDiscountPercent" DECIMAL(5,2),
ADD COLUMN "transferDiscountAmount" DECIMAL(18,2);

-- The breakdown is all or nothing: an attempt either carries the discount
-- (ADR 0013) or none of its three columns.
ALTER TABLE "user_transaction"
ADD CONSTRAINT "user_transaction_transfer_discount_all_or_none" CHECK (
    ("subtotalAmount" IS NULL) = ("transferDiscountPercent" IS NULL)
    AND ("subtotalAmount" IS NULL) = ("transferDiscountAmount" IS NULL)
);

-- When present, the breakdown adds up to what the attempt charges.
ALTER TABLE "user_transaction"
ADD CONSTRAINT "user_transaction_transfer_discount_breakdown" CHECK (
    "subtotalAmount" IS NULL
    OR (
        "subtotalAmount" - "transferDiscountAmount" = "amount"
        AND "transferDiscountPercent" > 0
        AND "transferDiscountPercent" <= 50
    )
);
