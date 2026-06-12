/**
 * Vercel Function: GET /api/migration/template
 * Gera o modelo XLSX estático de migração (Instruções + Lançamentos).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildMigrationTemplate } from "../../lib/server/migrationTemplate";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  try {
    const bufferData = buildMigrationTemplate();
    res.setHeader("Content-Disposition", 'attachment; filename="monetrik-migracao.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Length", bufferData.length);
    res.send(bufferData);
  } catch (error) {
    console.error("Erro ao gerar template:", error);
    res.status(500).json({ error: "Erro ao gerar template" });
  }
}
