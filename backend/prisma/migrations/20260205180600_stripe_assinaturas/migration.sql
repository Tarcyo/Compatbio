/*
  Warnings:

  - A unique constraint covering the columns `[STRIPE_CHECKOUT_SESSION_ID]` on the table `assinatura` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[STRIPE_SUBSCRIPTION_ID]` on the table `assinatura` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[STRIPE_CUSTOMER_ID]` on the table `cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `assinatura` ADD COLUMN `CANCEL_AT_PERIOD_END` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `DATA_CANCELAMENTO` DATETIME(0) NULL,
    ADD COLUMN `PERIODO_ATUAL_FIM` DATETIME(0) NULL,
    ADD COLUMN `PERIODO_ATUAL_INICIO` DATETIME(0) NULL,
    ADD COLUMN `STRIPE_CHECKOUT_SESSION_ID` VARCHAR(255) NULL,
    ADD COLUMN `STRIPE_CUSTOMER_ID` VARCHAR(255) NULL,
    ADD COLUMN `STRIPE_SUBSCRIPTION_ID` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `cliente` ADD COLUMN `STRIPE_CUSTOMER_ID` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `UK_ASSINATURA_STRIPE_CHECKOUT_SESSION` ON `assinatura`(`STRIPE_CHECKOUT_SESSION_ID`);

-- CreateIndex
CREATE UNIQUE INDEX `UK_ASSINATURA_STRIPE_SUBSCRIPTION` ON `assinatura`(`STRIPE_SUBSCRIPTION_ID`);

-- CreateIndex
CREATE INDEX `IX_ASSINATURA_STRIPE_SUBSCRIPTION` ON `assinatura`(`STRIPE_SUBSCRIPTION_ID`);

-- CreateIndex
CREATE INDEX `IX_ASSINATURA_STRIPE_CHECKOUT_SESSION` ON `assinatura`(`STRIPE_CHECKOUT_SESSION_ID`);

-- CreateIndex
CREATE UNIQUE INDEX `UK_CLIENTE_STRIPE_CUSTOMER` ON `cliente`(`STRIPE_CUSTOMER_ID`);

-- CreateIndex
CREATE INDEX `IX_CLIENTE_STRIPE_CUSTOMER` ON `cliente`(`STRIPE_CUSTOMER_ID`);
