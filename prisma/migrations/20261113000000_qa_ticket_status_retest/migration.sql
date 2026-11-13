-- Additive only. Postgres cannot use a new enum value in the transaction that
-- adds it, so nothing here writes 'retest'; the triage script does, after deploy.
ALTER TYPE "QaTicketStatus" ADD VALUE 'retest';
