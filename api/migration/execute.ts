import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as XLSX from "xlsx";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileData, email, password, people: selectedPeople } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    if (!fileData) {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer);

    const incomeSheet = workbook.Sheets["Receitas"];
    const expenseSheet = workbook.Sheets["Despesas"];

    const incomeRows = XLSX.utils.sheet_to_json(incomeSheet, { header: 0 });
    const expenseRows = XLSX.utils.sheet_to_json(expenseSheet, { header: 0 });

    const newIncomes: any[] = [];
    const newExpenses: any[] = [];

    incomeRows.forEach((row: any) => {
      const data = row.data || row.Data || row["Data"];
      if (!data) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const valor = row.valor || row.Valor || row["Valor"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];
      const observacao = row.observação || row.Observação || row["Observação"] || "";

      if (subcategoria && valor && pessoa) {
        newIncomes.push({
          id: globalThis.crypto.randomUUID(),
          personId: selectedPeople.find((p: any) => p.name === pessoa)?.id || "",
          category: subcategoria,
          amount: Number(valor),
          date: String(data),
          notes: String(observacao),
          isFixed: false,
          isRecurring: false,
          recurrence: "eventual",
        });
      }
    });

    expenseRows.forEach((row: any) => {
      const data = row.data || row.Data || row["Data"];
      if (!data) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const valor = row.valor || row.Valor || row["Valor"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];
      const observacao = row.observação || row.Observação || row["Observação"] || "";

      if (subcategoria && valor && pessoa) {
        newExpenses.push({
          id: globalThis.crypto.randomUUID(),
          personId: selectedPeople.find((p: any) => p.name === pessoa)?.id || "",
          name: subcategoria,
          category: subcategoria,
          amount: Number(valor),
          date: String(data),
          notes: String(observacao),
          isFixed: false,
          isRecurring: false,
          recurrence: "eventual",
          paymentMethod: "Pix",
        });
      }
    });

    return res.status(200).json({
      success: true,
      incomesImported: newIncomes.length,
      expensesImported: newExpenses.length,
      newIncomes,
      newExpenses,
      message: "Migração executada com sucesso",
    });
  } catch (error) {
    console.error("Erro na migração:", error);
    return res.status(500).json({
      error: `Erro ao executar migração: ${error instanceof Error ? error.message : "desconhecido"}`,
    });
  }
}
