-- Additive only: the value is deployed before any row can carry it, so the
-- previous release never has to parse a status it does not know. Reclassifying
-- existing tickets is an audited admin mutation, never part of this migration.
ALTER TYPE "QaTicketStatus" ADD VALUE 'needsClarification';
