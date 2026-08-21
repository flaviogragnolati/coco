-- Finding #28: one cart may back at most one live UserOrder.
--
-- Backstop for the code-level control in `confirmAndPay` (checkout.service.ts),
-- which reuses the live order instead of creating a second one. Prisma cannot
-- express partial uniqueness, and `db:push` will not create this, so it is
-- applied manually by the repo owner (same treatment as finding #45's index).
--
-- Precheck — must return 0 rows before applying:
--
--   SELECT "cartId", COUNT(*) FROM "user_order"
--   WHERE status NOT IN ('cancelled', 'failed')
--   GROUP BY "cartId" HAVING COUNT(*) > 1;
--
-- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction: apply this
-- statement standalone, never wrapped in a `prisma migrate` run.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "user_order_cart_live_unique"
ON "user_order" ("cartId")
WHERE status NOT IN ('cancelled', 'failed');
