/**
 * Seed idempotente das tabelas de lookup (parentescos, forma_pagamento,
 * categorias, subcategorias). Seguro para rodar várias vezes — usa upsert.
 *
 * Rodar com: npm run db:seed
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARENTESCOS = ["Titular", "Cônjuge", "Filho(a)", "Pai/Mãe", "Outro"];
const FORMAS_PAGAMENTO = ["Dinheiro", "Débito", "Crédito", "Pix", "Transferência", "Boleto"];

// Catálogo default. `tipo`: 'R' receita, 'D' despesa. ("Outras" existe nos dois.)
const CATALOGO: { tipo: "R" | "D"; categoria: string; subs: string[] }[] = [
  { tipo: "R", categoria: "Salário", subs: ["Salário Principal", "Salário Extra"] },
  { tipo: "R", categoria: "Freelance", subs: ["Projetos", "Consultoria"] },
  { tipo: "R", categoria: "Investimentos", subs: ["Dividendos", "Juros", "Aluguel"] },
  { tipo: "R", categoria: "Outras", subs: ["Presente", "Reembolso"] },
  { tipo: "D", categoria: "Alimentação", subs: ["Supermercado", "Restaurante", "Delivery"] },
  { tipo: "D", categoria: "Transporte", subs: ["Combustível", "Uber/Taxi", "Transporte Público", "Estacionamento"] },
  { tipo: "D", categoria: "Moradia", subs: ["Aluguel", "Condomínio", "Luz", "Água", "Internet", "Telefone"] },
  { tipo: "D", categoria: "Saúde", subs: ["Farmácia", "Médico", "Dentista", "Plano Saúde"] },
  { tipo: "D", categoria: "Educação", subs: ["Mensalidade", "Cursos", "Livros"] },
  { tipo: "D", categoria: "Lazer", subs: ["Cinema", "Streaming", "Esportes", "Viagem"] },
  { tipo: "D", categoria: "Outras", subs: ["Roupas", "Beleza", "Diversos"] },
];

async function main() {
  // Remove categoria criada por engano em uma versão anterior do seed
  // (e suas subcategorias órfãs, por causa do RESTRICT).
  const bad = await prisma.categorias.findFirst({ where: { descricao: "Outras (D)" } });
  if (bad) {
    const subsBad = await prisma.subcategorias.findMany({ where: { id_categoria: bad.id_categoria } });
    for (const s of subsBad) {
      await prisma.projetos_subcategorias.deleteMany({ where: { id_subcategoria: s.id_subcategoria } });
    }
    await prisma.subcategorias.deleteMany({ where: { id_categoria: bad.id_categoria } });
    await prisma.categorias.delete({ where: { id_categoria: bad.id_categoria } });
  }

  for (const descricao of PARENTESCOS) {
    await prisma.parentescos.upsert({ where: { descricao }, update: {}, create: { descricao } });
  }
  for (const descricao of FORMAS_PAGAMENTO) {
    await prisma.forma_pagamento.upsert({ where: { descricao }, update: {}, create: { descricao } });
  }
  for (const { tipo, categoria, subs } of CATALOGO) {
    const cat = await prisma.categorias.upsert({
      where: { tipo_descricao: { tipo, descricao: categoria } },
      update: {},
      create: { tipo, descricao: categoria },
    });
    for (const descSub of subs) {
      await prisma.subcategorias.upsert({
        where: { id_categoria_descricao: { id_categoria: cat.id_categoria, descricao: descSub } },
        update: {},
        create: { id_categoria: cat.id_categoria, descricao: descSub },
      });
    }
  }
  console.log("Seed concluído (lookups garantidos).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
