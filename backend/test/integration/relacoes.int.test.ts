import { PrismaClient, log_transacao_TIPO } from "@prisma/client";

describe("Integração DB: relações (empresa -> cliente -> log_transacao)", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cria empresa, cria cliente ligado à empresa, cria log_transacao e valida includes", async () => {
    const cnpj = `12.345.678/0001-${String(Math.floor(Math.random() * 90) + 10)}`; // <= 18 chars
    const email = `rel_${Date.now()}@teste.com`;

    const empresa = await prisma.empresa.create({
      data: {
        CNPJ: cnpj,
        NOME: "Empresa Integração",
        IMAGEM_DA_LOGO: null,
      },
    });

const cliente = await prisma.cliente.create({
  data: {
    EMAIL: email,
    NOME: "Cliente Integração Relações",
    SALDO: "0.00",
    COMPRA_NO_SISTEMA: false,
    ID_EMPRESA: empresa.ID,      // seta FK direto
    ID_ASSINATURA: null,         // agora aceita
  },
});




    await prisma.log_transacao.create({
      data: {
        TIPO: log_transacao_TIPO.ASSINATURA,
        STATUS: "OK",
        ID_CLIENTE: cliente.ID,
      },
    });

    const found = await prisma.cliente.findUnique({
      where: { EMAIL: email },
      include: {
        empresa: true,
        log_transacao: true,
      },
    });

    expect(found).not.toBeNull();
    expect(found!.EMAIL).toBe(email);

    // valida empresa vinculada
    expect(found!.empresa).not.toBeNull();
    expect(found!.empresa!.ID).toBe(empresa.ID);
    expect(found!.empresa!.CNPJ).toBe(cnpj);

    // valida log vinculado
    expect(found!.log_transacao.length).toBe(1);
    expect(found!.log_transacao[0].ID_CLIENTE).toBe(cliente.ID);
    expect(found!.log_transacao[0].TIPO).toBe(log_transacao_TIPO.ASSINATURA);
    expect(found!.log_transacao[0].STATUS).toBe("OK");
  });

  test("unique EMAIL em cliente deve falhar (P2002)", async () => {
    const email = `unique_${Date.now()}@teste.com`;

    await prisma.cliente.create({
      data: {
        EMAIL: email,
        NOME: "Cliente Unique",
        SALDO: "0.00",
        ID_ASSINATURA: null,
        ID_EMPRESA: null,
        COMPRA_NO_SISTEMA: false,
      },
    });

    let code: string | undefined;

    try {
      await prisma.cliente.create({
        data: {
          EMAIL: email, // duplicado
          NOME: "Cliente Unique 2",
          SALDO: "0.00",
          ID_ASSINATURA: null,
          ID_EMPRESA: null,
          COMPRA_NO_SISTEMA: false,
        },
      });
    } catch (e: any) {
      code = e?.code;
    }

    expect(code).toBe("P2002");
  });
});
