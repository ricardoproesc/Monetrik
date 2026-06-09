import { VercelRequest, VercelResponse } from "@vercel/node";
import * as XLSX from "xlsx";

interface ImportRow {
  data: string;
  descricao: string;
  tipo: string;
  valor: string | number;
  subcategoria: string;
  observacoes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: ValidationError[];
  data?: ImportRow[];
  newSubcategories: string[];
  existingSubcategories: string[];
}

function parseDate(dateStr: string): Date | null {
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`);
      } else {
        const [, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`);
      }
    }
  }

  return null;
}

function validateRow(
  row: Record<string, unknown>,
  rowIndex: number
): { valid: boolean; data?: ImportRow; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data: ImportRow = {
    data: "",
    descricao: "",
    tipo: "",
    valor: 0,
    subcategoria: "",
    observacoes: "",
  };

  // Validar data
  const dataStr = String(row.data || "").trim();
  if (!dataStr) {
    errors.push({
      row: rowIndex,
      field: "data",
      value: dataStr,
      error: "Campo obrigatório",
    });
  } else if (!parseDate(dataStr)) {
    errors.push({
      row: rowIndex,
      field: "data",
      value: dataStr,
      error: "Formato de data inválido (use DD/MM/YYYY ou YYYY-MM-DD)",
    });
  } else {
    data.data = dataStr;
  }

  // Validar descrição
  const descricao = String(row.descricao || "").trim();
  if (!descricao) {
    errors.push({
      row: rowIndex,
      field: "descricao",
      value: descricao,
      error: "Campo obrigatório",
    });
  } else if (descricao.length > 255) {
    errors.push({
      row: rowIndex,
      field: "descricao",
      value: descricao,
      error: "Máximo 255 caracteres",
    });
  } else {
    data.descricao = descricao;
  }

  // Validar tipo
  const tipo = String(row.tipo || "").trim().toUpperCase();
  if (!tipo) {
    errors.push({
      row: rowIndex,
      field: "tipo",
      value: row.tipo,
      error: "Campo obrigatório",
    });
  } else if (!["RECEITA", "DESPESA"].includes(tipo)) {
    errors.push({
      row: rowIndex,
      field: "tipo",
      value: row.tipo,
      error: 'Deve ser "RECEITA" ou "DESPESA"',
    });
  } else {
    data.tipo = tipo;
  }

  // Validar valor
  const valorStr = String(row.valor || "").trim();
  const valor = parseFloat(valorStr.replace(",", "."));
  if (!valorStr) {
    errors.push({
      row: rowIndex,
      field: "valor",
      value: valorStr,
      error: "Campo obrigatório",
    });
  } else if (isNaN(valor)) {
    errors.push({
      row: rowIndex,
      field: "valor",
      value: valorStr,
      error: "Deve ser um número válido",
    });
  } else if (valor <= 0) {
    errors.push({
      row: rowIndex,
      field: "valor",
      value: valorStr,
      error: "Deve ser maior que zero",
    });
  } else {
    data.valor = valor;
  }

  // Validar subcategoria
  const subcategoria = String(row.subcategoria || "").trim();
  if (!subcategoria) {
    errors.push({
      row: rowIndex,
      field: "subcategoria",
      value: subcategoria,
      error: "Campo obrigatório",
    });
  } else {
    data.subcategoria = subcategoria;
  }

  // Observações (opcional)
  data.observacoes = String(row.observacoes || "").trim();

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
  };
}

export async function validateImportFile(
  fileBuffer: Buffer,
  existingSubcategories: string[]
): Promise<ValidationResult> {
  try {
    const workbook = XLSX.read(fileBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      return {
        valid: false,
        totalRows: 0,
        validRows: 0,
        errors: [
          {
            row: 0,
            field: "arquivo",
            value: null,
            error: "Arquivo está vazio",
          },
        ],
        newSubcategories: [],
        existingSubcategories: [],
      };
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: 0,
    });

    // Filtrar linhas vazias
    const nonEmptyRows = rows.filter(
      (row) =>
        Object.values(row).some(
          (val) => val !== null && val !== "" && val !== undefined
        )
    );

    const validatedRows: ImportRow[] = [];
    const allErrors: ValidationError[] = [];
    const newSubcategories: Set<string> = new Set();

    for (let i = 0; i < nonEmptyRows.length; i++) {
      const { valid, data, errors } = validateRow(nonEmptyRows[i], i + 2); // +2: header na linha 1, dados começam em 2

      if (valid && data) {
        validatedRows.push(data);
        if (!existingSubcategories.includes(data.subcategoria)) {
          newSubcategories.add(data.subcategoria);
        }
      } else {
        allErrors.push(...errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      totalRows: nonEmptyRows.length,
      validRows: validatedRows.length,
      errors: allErrors,
      data: validatedRows,
      newSubcategories: Array.from(newSubcategories),
      existingSubcategories: existingSubcategories.filter((sub) =>
        validatedRows.some((row) => row.subcategoria === sub)
      ),
    };
  } catch (error) {
    console.error("Erro ao validar arquivo:", error);
    return {
      valid: false,
      totalRows: 0,
      validRows: 0,
      errors: [
        {
          row: 0,
          field: "arquivo",
          value: null,
          error: `Erro ao processar arquivo: ${error instanceof Error ? error.message : "desconhecido"}`,
        },
      ],
      newSubcategories: [],
      existingSubcategories: [],
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { action, fileData, existingSubcategories } = req.body;

    if (action === "validate") {
      if (!fileData || typeof fileData !== "string") {
        return res.status(400).json({ error: "Arquivo inválido" });
      }

      const buffer = Buffer.from(fileData, "base64");
      const result = await validateImportFile(
        buffer,
        existingSubcategories || []
      );

      return res.status(200).json(result);
    }

    res.status(400).json({ error: "Ação desconhecida" });
  } catch (error) {
    console.error("Erro no processamento:", error);
    res.status(500).json({
      error: `Erro ao processar: ${error instanceof Error ? error.message : "desconhecido"}`,
    });
  }
}
