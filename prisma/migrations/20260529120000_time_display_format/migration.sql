-- CreateEnum
CREATE TYPE "TimeDisplayFormat" AS ENUM ('TWELVE_HOUR', 'TWENTY_FOUR_HOUR');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "timeDisplayFormat" "TimeDisplayFormat" NOT NULL DEFAULT 'TWELVE_HOUR';
