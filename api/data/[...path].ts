/**
 * Vercel Function catch-all para a API de dados (Postgres via Prisma).
 * Atende /api/data/<resource>[/<id>] reutilizando o mesmo dispatcher do
 * servidor Express (lib/server/apiCore).
 *
 * Requer as variáveis de ambiente DATABASE_URL e FIREBASE_PROJECT_ID
 * configuradas no projeto Vercel.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApi } from "../../lib/server/apiCore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const result = await handleApi(
    req.method || "GET",
    segments,
    req.body,
    req.headers.authorization,
  );
  res.status(result.status).json(result.body);
}
