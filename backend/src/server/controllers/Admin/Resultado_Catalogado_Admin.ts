import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { produto_TIPO } from "@prisma/client";

export async function getResultadoCatalogadoByProdutos(req: Request, res: Response) {
  const email = req.adminAuth?.email; // ✅ admin
  if (!email) return res.status(401).json({ error: "Não autenticado (admin)." });

  const biologicoNome = String(req.query.biologico ?? "").trim();
  const quimicoNome = String(req.query.quimico ?? "").trim();

  if (!biologicoNome || !quimicoNome) {
    return res.status(400).json({ error: "Informe os parâmetros: ?biologico=...&quimico=..." });
  }

  try {
    // (opcional) validar admin no banco - é redundante se adminAuthRequired já garante.
    const admin = await prisma.admin.findUnique({
      where: { EMAIL: email },
      select: { ID: true },
    });
    if (!admin) return res.status(403).json({ error: "Acesso negado (apenas admin)." });

    const [bio, quim] = await Promise.all([
      prisma.produto.findFirst({
        where: { NOME: biologicoNome, TIPO: produto_TIPO.BIOL_GICO },
        select: { ID: true, NOME: true, TIPO: true },
      }),
      prisma.produto.findFirst({
        where: { NOME: quimicoNome, TIPO: produto_TIPO.QU_MICO },
        select: { ID: true, NOME: true, TIPO: true },
      }),
    ]);

    if (!bio) return res.status(404).json({ error: `Produto biológico não encontrado: "${biologicoNome}"` });
    if (!quim) return res.status(404).json({ error: `Produto químico não encontrado: "${quimicoNome}"` });

    const resultado = await prisma.resultado_catalogado.findFirst({
      where: {
        ID_PRODUTO_BIOLOGICO: bio.ID,
        ID_PRODUTO_QUIMICO: quim.ID,
      },
      select: {
        ID: true,
        STATUS: true,
        DESCRICAO: true,
        ID_PRODUTO_BIOLOGICO: true,
        ID_PRODUTO_QUIMICO: true,
        produto_resultado_catalogado_ID_PRODUTO_BIOLOGICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true },
        },
        produto_resultado_catalogado_ID_PRODUTO_QUIMICOToproduto: {
          select: { ID: true, NOME: true, TIPO: true },
        },
      },
    });

    if (!resultado) {
      return res.status(404).json({ error: `Nenhum resultado catalogado para: "${bio.NOME}" + "${quim.NOME}"` });
    }

    return res.json({ resultado });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar resultado catalogado." });
  }
}
