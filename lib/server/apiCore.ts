/**
 * Dispatcher REST compartilhado entre o Express (dev) e a Vercel Function
 * (produção). Recebe método + segmentos de caminho + body + header de
 * autorização e devolve { status, body }. Nenhum acoplamento com req/res.
 *
 * Rotas (prefixo montado pelo chamador, ex.: /api/data):
 *   GET    /<resource>           -> lista
 *   GET    /<resource>/<id>      -> um registro
 *   POST   /<resource>           -> cria/salva (ou { items: [...] } em lote)
 *   PUT    /<resource>/<id>      -> atualiza
 *   DELETE /<resource>/<id>      -> remove
 *
 * IDs do banco são BigInt; aqui convertemos string<->BigInt na borda e a
 * serialização BigInt->string é feita pelo toJSON global (ver prisma.ts).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { verifyToken, AuthError } from "./auth";
import { getOrCreateUsuario } from "./context";
import * as svc from "./services";

export interface ApiResponse {
  status: number;
  body: unknown;
}

const json = (status: number, body: unknown): ApiResponse => ({ status, body });

// ---- Configuração do CRUD genérico (recursos normalizados) ----
type Scope = "usuario" | "projeto" | "none";
interface CrudCfg {
  delegate: () => any; // prisma[model]
  id: string;
  scope: Scope;
}

const CRUD: Record<string, CrudCfg> = {
  pessoas: { delegate: () => prisma.pessoas, id: "id_pessoa", scope: "usuario" },
  projetos: { delegate: () => prisma.projetos, id: "id_projeto", scope: "usuario" },
  preferencias: { delegate: () => prisma.preferencias, id: "id_preferencia", scope: "usuario" },
  parentescos: { delegate: () => prisma.parentescos, id: "id_parentesco", scope: "none" },
  forma_pagamento: { delegate: () => prisma.forma_pagamento, id: "id_forma_pagamento", scope: "none" },
  categorias: { delegate: () => prisma.categorias, id: "id_categoria", scope: "none" },
  subcategorias: { delegate: () => prisma.subcategorias, id: "id_subcategoria", scope: "none" },
  projeto_pessoas: { delegate: () => prisma.projeto_pessoas, id: "id_projeto_pessoa", scope: "projeto" },
  projetos_subcategorias: {
    delegate: () => prisma.projetos_subcategorias,
    id: "id_projetos_subcategorias",
    scope: "projeto",
  },
  receitas: { delegate: () => prisma.receitas, id: "id_receita", scope: "projeto" },
  despesas: { delegate: () => prisma.despesas, id: "id_despesa", scope: "projeto" },
};

const DATE_FIELDS = new Set(["dt_lancamento", "dt_nascimento"]);

/** Coage tipos vindos de JSON: datas em texto, valor->Decimal, id_*->BigInt. */
function coerce(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const [k, v] of Object.entries(out)) {
    if (DATE_FIELDS.has(k) && typeof v === "string") {
      out[k] = new Date(v);
    } else if (k === "valor" && (typeof v === "number" || typeof v === "string")) {
      out[k] = new Prisma.Decimal(v);
    } else if (k.startsWith("id_") && typeof v === "string" && /^\d+$/.test(v)) {
      out[k] = BigInt(v);
    } else if (k.startsWith("id_") && typeof v === "number" && Number.isInteger(v)) {
      out[k] = BigInt(v);
    }
  }
  return out;
}

// ---- CRUD genérico ----
function whereScoped(cfg: CrudCfg, id_usuario: bigint, idValue?: string) {
  const base: Record<string, unknown> = idValue ? { [cfg.id]: BigInt(idValue) } : {};
  if (cfg.scope === "usuario") base.id_usuario = id_usuario;
  if (cfg.scope === "projeto") base.projeto = { id_usuario };
  return base;
}

async function assertCreateAllowed(cfg: CrudCfg, id_usuario: bigint, body: Record<string, unknown>) {
  if (cfg.scope === "usuario") body.id_usuario = id_usuario;
  if (cfg.scope === "projeto") {
    const id_projeto = body.id_projeto as bigint | undefined;
    const owned = id_projeto
      ? await prisma.projetos.findFirst({ where: { id_projeto, id_usuario } })
      : null;
    if (!owned) {
      throw Object.assign(new Error("id_projeto inválido ou não pertence ao usuário"), { status: 403 });
    }
  }
}

async function handleCrud(
  cfg: CrudCfg,
  method: string,
  id: string | undefined,
  body: any,
  id_usuario: bigint,
): Promise<ApiResponse> {
  const delegate = cfg.delegate();

  if (method === "GET" && !id) {
    return json(200, await delegate.findMany({ where: whereScoped(cfg, id_usuario) }));
  }
  if (method === "GET" && id) {
    const row = await delegate.findFirst({ where: whereScoped(cfg, id_usuario, id) });
    return row ? json(200, row) : json(404, { error: "Não encontrado" });
  }
  if (method === "POST") {
    const data = coerce(body || {});
    await assertCreateAllowed(cfg, id_usuario, data);
    const created = await delegate.create({ data });
    return json(201, created);
  }
  if (method === "PUT" && id) {
    const existing = await delegate.findFirst({ where: whereScoped(cfg, id_usuario, id) });
    if (!existing) return json(404, { error: "Não encontrado" });
    const data = coerce(body || {});
    delete (data as any)[cfg.id];
    delete (data as any).id_usuario;
    const updated = await delegate.update({ where: { [cfg.id]: BigInt(id) }, data });
    return json(200, updated);
  }
  if (method === "DELETE" && id) {
    const existing = await delegate.findFirst({ where: whereScoped(cfg, id_usuario, id) });
    if (!existing) return json(404, { error: "Não encontrado" });
    await delegate.delete({ where: { [cfg.id]: BigInt(id) } });
    return json(200, { success: true });
  }
  return json(405, { error: "Método não permitido" });
}

// ---- Recursos adaptados (modelo do frontend) ----
async function handleAdapted(
  resource: string,
  method: string,
  id: string | undefined,
  body: any,
  id_usuario: bigint,
): Promise<ApiResponse> {
  switch (resource) {
    case "people":
      if (method === "GET") return json(200, await svc.listPeople(id_usuario));
      if (method === "POST" || method === "PUT") return json(200, await svc.savePerson(id_usuario, body));
      if (method === "DELETE" && id) return json(200, (await svc.deletePerson(id_usuario, id), { success: true }));
      break;

    case "incomes":
      if (method === "GET") return json(200, await svc.listIncomes(id_usuario));
      if (method === "POST" && body?.items) return json(200, await svc.saveIncomesBatch(id_usuario, body.items));
      if (method === "POST" || method === "PUT") return json(200, await svc.saveIncome(id_usuario, body));
      if (method === "DELETE" && id) return json(200, (await svc.deleteIncome(id_usuario, id), { success: true }));
      break;

    case "expenses":
      if (method === "GET") return json(200, await svc.listExpenses(id_usuario));
      if (method === "POST" && body?.items) return json(200, await svc.saveExpensesBatch(id_usuario, body.items));
      if (method === "POST" || method === "PUT") return json(200, await svc.saveExpense(id_usuario, body));
      if (method === "DELETE" && id) return json(200, (await svc.deleteExpense(id_usuario, id), { success: true }));
      break;

    case "settings":
      if (method === "GET") return json(200, await svc.loadSettings(id_usuario));
      if (method === "POST" || method === "PUT") return json(200, (await svc.saveSettings(id_usuario, body), { success: true }));
      break;

    case "subcategories":
      if (method === "GET") return json(200, await svc.listSubcategories(id_usuario));
      if (method === "POST" || method === "PUT") {
        const items = Array.isArray(body) ? body : body?.items;
        return json(200, (await svc.saveSubcategories(id_usuario, items || []), { success: true }));
      }
      break;

    case "catalog":
      if (method === "GET") return json(200, await svc.listCatalog());
      break;

    case "setup":
      if (method === "POST") return json(200, await svc.setupOnboarding(id_usuario, body));
      break;
  }
  return json(405, { error: "Método não permitido para este recurso" });
}

const ADAPTED = new Set([
  "people",
  "incomes",
  "expenses",
  "settings",
  "subcategories",
  "catalog",
  "setup",
]);

/** Ponto de entrada único. */
export async function handleApi(
  method: string,
  segments: string[],
  body: any,
  authorization?: string | null,
): Promise<ApiResponse> {
  const [resource, id] = segments;
  if (!resource) return json(404, { error: "Recurso não especificado" });

  // Autenticação
  let id_usuario: bigint;
  try {
    const authUser = await verifyToken(authorization);
    const ctx = await getOrCreateUsuario(authUser);
    id_usuario = ctx.id_usuario;
  } catch (err) {
    if (err instanceof AuthError) return json(401, { error: err.message });
    return json(500, { error: "Falha na autenticação" });
  }

  try {
    if (ADAPTED.has(resource)) return await handleAdapted(resource, method, id, body, id_usuario);
    const cfg = CRUD[resource];
    if (cfg) return await handleCrud(cfg, method, id, body, id_usuario);
    return json(404, { error: `Recurso desconhecido: ${resource}` });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    console.error(`[api] ${method} /${segments.join("/")} ->`, err?.message || err);
    return json(status, { error: err?.message || "Erro interno" });
  }
}
