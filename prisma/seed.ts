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
// `fixa`: a categoria representa um gasto/renda tipicamente fixo (mensal recorrente).
const CATALOGO: { tipo: "R" | "D"; categoria: string; fixa: boolean; subs: string[] }[] = [
  { tipo: "R", categoria: "Salário", fixa: true, subs: ["Salário Principal", "Salário Extra"] },
  { tipo: "R", categoria: "Freelance", fixa: false, subs: ["Projetos", "Consultoria"] },
  { tipo: "R", categoria: "Investimentos", fixa: false, subs: ["Dividendos", "Juros", "Aluguel"] },
  { tipo: "R", categoria: "Outras", fixa: false, subs: ["Presente", "Reembolso"] },
  { tipo: "D", categoria: "Alimentação", fixa: false, subs: ["Supermercado", "Restaurante", "Delivery"] },
  { tipo: "D", categoria: "Transporte", fixa: false, subs: ["Combustível", "Uber/Taxi", "Transporte Público", "Estacionamento"] },
  { tipo: "D", categoria: "Moradia", fixa: true, subs: ["Aluguel", "Condomínio", "Luz", "Água", "Internet", "Telefone"] },
  { tipo: "D", categoria: "Saúde", fixa: true, subs: ["Farmácia", "Médico", "Dentista", "Plano Saúde"] },
  { tipo: "D", categoria: "Educação", fixa: true, subs: ["Mensalidade", "Cursos", "Livros"] },
  { tipo: "D", categoria: "Lazer", fixa: false, subs: ["Cinema", "Streaming", "Esportes", "Viagem"] },
  { tipo: "D", categoria: "Outras", fixa: false, subs: ["Roupas", "Beleza", "Diversos"] },
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
  for (const { tipo, categoria, fixa, subs } of CATALOGO) {
    const cat = await prisma.categorias.upsert({
      where: { tipo_descricao: { tipo, descricao: categoria } },
      update: { fixa },
      create: { tipo, descricao: categoria, fixa },
    });
    for (const descSub of subs) {
      // Subcategorias default = template global (id_projeto NULL). Como o UNIQUE
      // inclui id_projeto, NULL não casa em upsert; usamos findFirst + create.
      const exists = await prisma.subcategorias.findFirst({
        where: { id_projeto: null, id_categoria: cat.id_categoria, descricao: descSub },
      });
      if (!exists) {
        await prisma.subcategorias.create({
          data: { id_categoria: cat.id_categoria, descricao: descSub },
        });
      }
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
