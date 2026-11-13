-- Additive only and no row: while the singleton does not exist, the storefront
-- answers with the code defaults (Wednesday 12:00, 7 to 10 days) and the admin
-- screen creates it through its upsert.
CREATE TABLE "weekly_closing_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "closingWeekday" INTEGER NOT NULL DEFAULT 3,
    "closingHour" INTEGER NOT NULL DEFAULT 12,
    "closingMinute" INTEGER NOT NULL DEFAULT 0,
    "deliveryDaysMin" INTEGER NOT NULL DEFAULT 7,
    "deliveryDaysMax" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_closing_settings_pkey" PRIMARY KEY ("id")
);

-- Same ranges as weeklyClosingScheduleSchema; the weekday follows Date#getDay
-- (0 = Sunday).
ALTER TABLE "weekly_closing_settings" ADD CONSTRAINT "weekly_closing_settings_values_check" CHECK (
    "closingWeekday" BETWEEN 0 AND 6 AND "closingHour" BETWEEN 0 AND 23 AND "closingMinute" BETWEEN 0 AND 59
    AND "deliveryDaysMin" BETWEEN 1 AND 60 AND "deliveryDaysMax" BETWEEN "deliveryDaysMin" AND 60
);
