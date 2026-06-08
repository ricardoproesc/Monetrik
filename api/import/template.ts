import { VercelRequest, VercelResponse } from "@vercel/node";
import * as XLSX from "xlsx";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Criar workbook com tipo explícito
    const wb = XLSX.utils.book_new();

    // Aba: Instruções
    const instructionsData = [
      ["INSTRUÇÕES DE IMPORTAÇÃO - Monetrik"],
      [""],
      ["Preencha os dados abaixo com suas transações históricas"],
      [""],
      ["Campos obrigatórios: data, descricao, tipo, valor, subcategoria"],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instruções");

    // Aba: Exemplo com dados de amostra
    const exampleData = [
      [
        "data",
        "descricao",
        "tipo",
        "valor",
        "subcategoria",
        "observacoes",
      ],
      [
        "15/01/2024",
        "Salário janeiro",
        "RECEITA",
        3500.0,
        "Salário Mensal",
        "Pagamento principal",
      ],
      [
        "16/01/2024",
        "Aluguel residência",
        "DESPESA",
        1200.0,
        "Aluguel Residência",
        "Apto 302",
      ],
      [
        "17/01/2024",
        "Supermercado",
        "DESPESA",
        250.5,
        "Supermercado",
        "Compras semanais",
      ],
      [
        "18/01/2024",
        "Freelance - Projeto A",
        "RECEITA",
        1500.0,
        "Freelance / Consultoria",
        "Desenvolvimento web",
      ],
      [
        "19/01/2024",
        "Energia elétrica",
        "DESPESA",
        180.0,
        "Conta Energia Casa",
        "Janeiro",
      ],
    ];

    const exampleSheet = XLSX.utils.aoa_to_sheet(exampleData);
    exampleSheet["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, exampleSheet, "Exemplo");

    // Aba: Blank para usuário preencher (50 linhas)
    const blankData = [
      [
        "data",
        "descricao",
        "tipo",
        "valor",
        "subcategoria",
        "observacoes",
      ],
    ];
    for (let i = 0; i < 50; i++) {
      blankData.push(["", "", "", "", "", ""]);
    }

    const blankSheet = XLSX.utils.aoa_to_sheet(blankData);
    blankSheet["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, blankSheet, "Seus Dados");

    // Gerar buffer com opções explícitas
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const bufferData = Buffer.from(buf as ArrayBuffer);

    // Headers para download
    res.setHeader("Content-Disposition", 'attachment; filename="template-monetrik.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", bufferData.length);

    res.send(bufferData);
  } catch (error) {
    console.error("Erro ao gerar template:", error);
    res.status(500).json({ error: "Erro ao gerar template" });
  }
}
