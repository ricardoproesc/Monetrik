/**
 * Bootstrap e resolvers de lookup.
 *
 * Faz a ponte entre o modelo plano usado pelo frontend (Person/Income/Expense
 * com `category` em texto, `relationship`, `paymentMethod`) e o schema
 * normalizado do Postgres (usuarios, projetos, projeto_pessoas, categorias,
 * subcategorias, forma_pagamento, parentescos).
 *
 * Os IDs do banco são BigInt (autoincrement). Internamente o backend trabalha
 * com bigint; a conversão de/para string (formato do frontend) acontece na
 * borda (services/apiCore).
 */
import { prisma } from "./prisma";
import type { AuthUser } from "./auth";

const PROJETO_DEFAULT_NOME = "Família";

// relationship (frontend) -> descricao do parentesco (banco)
const PARENTESCO_MAP: Record<string, string> = {
  principal: "Titular",
  conjuge: "Cônjuge",
  "filho(a)": "Filho(a)",
  "pai/mae": "Pai/Mãe",
  outro: "Outro",
};

export interface Ctx {
  id_usuario: bigint;
  email: string;
}

/**
 * Garante a existência da linha em `usuarios` (ligada pelo firebase_uid) e
 * de suas `preferencias`. Idempotente.
 */
export async function getOrCreateUsuario(authUser: AuthUser): Promise<Ctx> {
  let usuario = await prisma.usuarios.findFirst({
    where: { OR: [{ firebase_uid: authUser.firebaseUid }, { email: authUser.email }] },
  });

  if (!usuario) {
    usuario = await prisma.usuarios.create({
      data: {
        email: authUser.email,
        firebase_uid: authUser.firebaseUid,
        nome: authUser.nome ?? null,
        preferencias: { create: {} },
      },
    });
  } else if (!usuario.firebase_uid) {
    // Usuário existia (ex.: por e-mail) mas sem uid vinculado — vincula agora.
    usuario = await prisma.usuarios.update({
      where: { id_usuario: usuario.id_usuario },
      data: { firebase_uid: authUser.firebaseUid },
    });
  }

  return { id_usuario: usuario.id_usuario, email: usuario.email };
}

/**
 * Retorna o projeto atual do usuário (o primeiro criado), ou null se ainda não
 * existe. No MVP há 1 projeto por usuário; o nome é definido no onboarding.
 */
export async function getProjetoDefault(id_usuario: bigint) {
  return prisma.projetos.findFirst({
    where: { id_usuario },
    orderBy: { dt_create: "asc" },
  });
}

/**
 * Garante que o usuário tem um projeto. Como `projetos.id_pessoa_resp` é
 * obrigatório, precisa de uma pessoa responsável (em geral o titular).
 */
export async function ensureProjetoDefault(
  id_usuario: bigint,
  id_pessoa_resp: bigint,
  nome: string = PROJETO_DEFAULT_NOME,
) {
  const existente = await getProjetoDefault(id_usuario);
  if (existente) return existente;
  return prisma.projetos.create({
    data: {
      id_usuario,
      id_pessoa_resp,
      nome,
      descricao: "Projeto financeiro principal da família",
    },
  });
}

/**
 * Resolve (ou cria) uma subcategoria específica por (tipo, categoria, nome),
 * criando a categoria-pai se necessário. Usado no onboarding e na gestão de
 * subcategorias, onde temos o nome exato da subcategoria.
 */
export async function resolveSubcategoriaByName(
  tipo: "R" | "D",
  category: string,
  name: string,
): Promise<bigint> {
  const categoria = await prisma.categorias.upsert({
    where: { tipo_descricao: { tipo, descricao: category } },
    update: {},
    create: { tipo, descricao: category, padrao: false },
  });
  const sub = await prisma.subcategorias.upsert({
    where: { id_categoria_descricao: { id_categoria: categoria.id_categoria, descricao: name } },
    update: { ativo: true },
    create: { id_categoria: categoria.id_categoria, descricao: name, padrao: false },
  });
  return sub.id_subcategoria;
}

/** Resolve o id_parentesco a partir do `relationship` do frontend. */
export async function resolveParentescoId(relationship?: string): Promise<bigint> {
  const descricao = PARENTESCO_MAP[(relationship || "outro").toLowerCase()] || "Outro";
  const p =
    (await prisma.parentescos.findFirst({ where: { descricao } })) ??
    (await prisma.parentescos.findFirst({ where: { descricao: "Outro" } })) ??
    (await prisma.parentescos.create({ data: { descricao } }));
  return p.id_parentesco;
}

/** Resolve (ou cria) o id_forma_pagamento a partir do método do frontend. */
export async function resolveFormaPagamentoId(metodo?: string): Promise<bigint> {
  const descricao = (metodo || "Pix").trim() || "Pix";
  const fp = await prisma.forma_pagamento.upsert({
    where: { descricao },
    update: {},
    create: { descricao },
  });
  return fp.id_forma_pagamento;
}

/**
 * Garante a linha em `projeto_pessoas` ligando pessoa+projeto (com parentesco,
 * cor e avatar). Retorna o id_projeto_pessoa. Idempotente por (projeto, pessoa).
 */
export async function ensureProjetoPessoa(
  id_projeto: bigint,
  id_pessoa: bigint,
  opts: { relationship?: string; cor?: string; avatar?: string | null } = {},
): Promise<bigint> {
  const id_parentesco = await resolveParentescoId(opts.relationship);
  const pp = await prisma.projeto_pessoas.upsert({
    where: { id_projeto_id_pessoa: { id_projeto, id_pessoa } },
    update: {
      id_parentesco,
      ...(opts.cor ? { cor: opts.cor } : {}),
      avatar: opts.avatar ?? undefined,
    },
    create: {
      id_projeto,
      id_pessoa,
      id_parentesco,
      cor: opts.cor || "#3B82F6",
      avatar: opts.avatar ?? null,
    },
  });
  return pp.id_projeto_pessoa;
}

/**
 * Resolve a subcategoria para uma transação a partir do texto `category` do
 * frontend (que costuma ser a categoria-pai, ex.: "Salário", "Mercado").
 * Tenta: (1) subcategoria com essa descrição; (2) categoria com essa descrição
 * e uma subcategoria "Geral" sob ela; (3) cria categoria + subcategoria.
 * Retorna o id_subcategoria.
 */
export async function resolveSubcategoriaId(tipo: "R" | "D", category: string): Promise<bigint> {
  const descricao = (category || "Outros").trim() || "Outros";

  // (1) bate como subcategoria existente (respeitando o tipo da categoria-pai)
  const subDireta = await prisma.subcategorias.findFirst({
    where: { descricao, categoria: { tipo } },
  });
  if (subDireta) return subDireta.id_subcategoria;

  // (2) bate como categoria -> usa/cria subcategoria com a mesma descrição
  let categoria = await prisma.categorias.findFirst({ where: { tipo, descricao } });

  // (3) sem categoria correspondente -> usa "Outros"/"Outras" ou cria
  if (!categoria) {
    categoria =
      (await prisma.categorias.findFirst({ where: { tipo, descricao: "Outros" } })) ??
      (await prisma.categorias.findFirst({ where: { tipo, descricao: "Outras" } })) ??
      (await prisma.categorias.create({ data: { tipo, descricao, padrao: false } }));
  }

  const sub = await prisma.subcategorias.upsert({
    where: {
      id_categoria_descricao: { id_categoria: categoria.id_categoria, descricao },
    },
    update: {},
    create: { id_categoria: categoria.id_categoria, descricao, padrao: false },
  });
  return sub.id_subcategoria;
}

/** Garante o vínculo projeto<->subcategoria. Retorna id_projetos_subcategorias. */
export async function ensureProjetoSubcategoria(
  id_projeto: bigint,
  id_subcategoria: bigint,
): Promise<bigint> {
  const ps = await prisma.projetos_subcategorias.upsert({
    where: { id_projeto_id_subcategoria: { id_projeto, id_subcategoria } },
    update: {},
    create: { id_projeto, id_subcategoria },
  });
  return ps.id_projetos_subcategorias;
}
