/*
  Warnings:

  - A unique constraint covering the columns `[ID_PRODUTO_QUIMICO,ID_PRODUTO_BIOLOGICO]` on the table `resultado_catalogado` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `solicitacao_adicao_produto` ADD COLUMN `DATA_RESPOSTA` DATETIME(0) NULL,
    ADD COLUMN `DESCRICAO_RESPOSTA` TEXT NULL,
    ADD COLUMN `STATUS` VARCHAR(50) NOT NULL DEFAULT 'PENDENTE';

-- CreateIndex
CREATE UNIQUE INDEX `UK_RC_PROD_Q_B` ON `resultado_catalogado`(`ID_PRODUTO_QUIMICO`, `ID_PRODUTO_BIOLOGICO`);

-- CreateIndex
CREATE INDEX `IX_SAP_STATUS` ON `solicitacao_adicao_produto`(`STATUS`);
