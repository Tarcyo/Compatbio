-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `empresa_id` INTEGER UNSIGNED NULL;

-- CreateTable
CREATE TABLE `empresa` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(255) NOT NULL,
    `logo` LONGBLOB NULL,
    `cnpj` VARCHAR(14) NOT NULL,
    `cor_tema` VARCHAR(7) NOT NULL,

    UNIQUE INDEX `empresa_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
