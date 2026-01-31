import { PrismaClient } from "@prisma/client";

describe("Integração DB: cliente", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cria e busca cliente", async () => {
    const email = `int_${Date.now()}@teste.com`;

    const created = await prisma.cliente.create({
      data: {
        EMAIL: email,
        NOME: "Cliente Integração",
        SALDO: "0.00",
        ID_ASSINATURA: null,
        ID_EMPRESA: null,
        COMPRA_NO_SISTEMA: false,
      },
    });

    const found = await prisma.cliente.findUnique({
      where: { EMAIL: email },
    });

    expect(found?.ID).toBe(created.ID);
    expect(found?.EMAIL).toBe(email);
  });
});
