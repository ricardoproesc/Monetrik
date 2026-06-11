/**
 * Gera o modelo XLSX estático de migração (aba "Instruções" + "Lançamentos").
 * Compartilhado entre o servidor Express e a Vercel Function.
 */
import * as XLSX from "xlsx";

export function buildMigrationTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Aba: Instruções ─────────────────────────────────────────────────────────
  const instr = [
    ["INSTRUÇÕES DE MIGRAÇÃO - Monetrik"],
    [""],
    ["Preencha a aba \"Lançamentos\" com suas receitas e despesas históricas."],
    ["Cada linha é um lançamento. Todas as colunas (exceto observacao) são obrigatórias."],
    [""],
    ["Coluna", "Descrição"],
    ["Nome pessoa", "Nome do familiar responsável pelo lançamento (ex.: Maria)."],
    ["tipo (R/D)", "R = Receita, D = Despesa. Também aceita \"Receita\"/\"Despesa\"."],
    ["categoria", "Categoria do lançamento (ex.: Moradia, Salário)."],
    ["fixa (S/N)", "S = fixo/recorrente, N = variável. Define se a categoria é fixa."],
    ["subcategoria", "Detalhe dentro da categoria (ex.: Aluguel, Salário mensal)."],
    ["data", "Data do lançamento. Formatos: DD/MM/AAAA, AAAA-MM-DD, DD-MM-AAAA."],
    ["valor", "Valor em reais, maior que zero. Aceita vírgula decimal (ex.: 1200,50)."],
    ["observacao", "Texto livre opcional."],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instr);
  instrSheet["!cols"] = [{ wch: 16 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, "Instruções");

  // ── Aba: Lançamentos ────────────────────────────────────────────────────────
  const header = [
    "Nome pessoa",
    "tipo (R/D)",
    "categoria",
    "fixa (S/N)",
    "subcategoria",
    "data",
    "valor",
    "observacao",
  ];
  const lancamentos: (string | number)[][] = [header];
  // Linhas de exemplo
  lancamentos.push(["Maria", "R", "Salário", "S", "Salário mensal", "15/01/2024", 3500, "Pagamento principal"]);
  lancamentos.push(["João", "D", "Moradia", "S", "Aluguel", "05/01/2024", 1200, "Apto 302"]);
  // ~50 linhas vazias para preenchimento
  for (let i = 0; i < 50; i++) lancamentos.push(["", "", "", "", "", "", "", ""]);

  const lancSheet = XLSX.utils.aoa_to_sheet(lancamentos);
  lancSheet["!cols"] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, lancSheet, "Lançamentos");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return Buffer.from(buf as ArrayBuffer);
}
