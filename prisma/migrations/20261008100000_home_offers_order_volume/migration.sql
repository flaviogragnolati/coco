-- Additive only: the column default stays `marketSaving`, so no existing row changes.
ALTER TYPE "HomeOffersCriterion" ADD VALUE 'orderVolume';
