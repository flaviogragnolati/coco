-- Additive only, no backfill on purpose: a null answer means the invitation is
-- still due, so existing users get the tutorial invitation once too.
ALTER TABLE "user" ADD COLUMN "tutorialInvitationAnsweredAt" TIMESTAMP(3);
