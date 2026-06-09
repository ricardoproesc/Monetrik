import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as XLSX from "xlsx";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileData } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer);

    const incomeSheet = workbook.Sheets["Receitas"];
    const expenseSheet = workbook.Sheets["Despesas"];

    if (!incomeSheet || !expenseSheet) {
      return res.status(400).json({ error: "Planilha deve conter abas 'Receitas' e 'Despesas'" });
    }

    const incomeRows = XLSX.utils.sheet_to_json(incomeSheet, { header: 0 });
    const expenseRows = XLSX.utils.sheet_to_json(expenseSheet, { header: 0 });

    const incomesCount = incomeRows.filter((row: any) => {
      const data = row.data || row.Data || row["Data"];
      const valor = row.valor || row.Valor || row["Valor"];
      return data && valor;
    }).length;

    const expensesCount = expenseRows.filter((row: any) => {
      const data = row.data || row.Data || row["Data"];
      const valor = row.valor || row.Valor || row["Valor"];
      return data && valor;
    }).length;

    return res.status(200).json({
      valid: true,
      incomesCount,
      expensesCount,
      totalRecords: incomesCount + expensesCount,
    });
  } catch (error) {
    console.error("Erro na validação:", error);
    return res.status(500).json({
      error: `Erro ao validar: ${error instanceof Error ? error.message : "desconhecido"}`,
    });
  }
}
