-- Rename `ProductClientTerms.refPrice` to `unitPrice` (plan: home offers & pricing, T1).
--
-- The column always held *our* per-unit price, but the admin label said "Precio
-- de referencia"; `marketPrice` now takes the reference-price meaning, so the
-- old name had to move out of the way. This is a pure rename: every loaded
-- value survives with the same meaning, no transformation.
--
-- Applied by hand BEFORE `pnpm db:push`, because `prisma db push` implements a
-- field rename as drop-and-create and would silently discard the loaded prices.
-- Once this has run, the push sees the column already in place and only adds
-- `marketPrice` and `discountPercent`.
--
-- `ProductSupplierTerms.refPrice` is deliberately left alone (deferred).

ALTER TABLE "product_client_terms"
RENAME COLUMN "refPrice" TO "unitPrice";
