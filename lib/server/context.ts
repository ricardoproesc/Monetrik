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
import { Prisma } from "@prisma/client";
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
  plano: string;
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
    try {
      usuario = await prisma.usuarios.create({
        data: {
          email: authUser.email,
          firebase_uid: authUser.firebaseUid,
          nome: authUser.nome ?? null,
          preferencias: { create: {} },
        },
      });
    } catch (err) {
      // Race no primeiro login: vários requests em paralelo tentam criar o
      // mesmo usuário. Em violação de UNIQUE (email/firebase_uid), re-busca o
      // que outro request já criou em vez de propagar o erro.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        usuario = await prisma.usuarios.findFirst({
          where: { OR: [{ firebase_uid: authUser.firebaseUid }, { email: authUser.email }] },
        });
        if (!usuario) throw err;
      } else {
        throw err;
      }
    }
  }

  if (usuario && !usuario.firebase_uid) {
    // Usuário existia (ex.: por e-mail) mas sem uid vinculado — vincula agora.
    usuario = await prisma.usuarios.update({
      where: { id_usuario: usuario.id_usuario },
      data: { firebase_uid: authUser.firebaseUid },
    });
  }

  return { id_usuario: usuario.id_usuario, email: usuario.email, plano: usuario.plano };
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
 * Resolve (ou cria) a subcategoria por (projeto, tipo, categoria, nome).
 * Se já existe uma subcategoria DEFAULT (id_projeto NULL) com esse nome, ela é
 * reaproveitada (catálogo compartilhado). Caso contrário, cria/atualiza uma
 * subcategoria CUSTOM isolada no projeto. Usado no onboarding e na gestão.
 */
export async function resolveSubcategoriaByName(
  id_projeto: bigint,
  tipo: "R" | "D",
  category: string,
  name: string,
): Promise<bigint> {
  const categoria = await prisma.categorias.upsert({
    where: { tipo_descricao: { tipo, descricao: category } },
    update: {},
    create: { tipo, descricao: category, padrao: false },
  });

  // (1) Reaproveita uma subcategoria default (template global) com esse nome.
  const padrao = await prisma.subcategorias.findFirst({
    where: { id_projeto: null, id_categoria: categoria.id_categoria, descricao: name },
  });
  if (padrao) return padrao.id_subcategoria;

  // (2) Cria/atualiza a subcategoria custom isolada no projeto.
  const sub = await prisma.subcategorias.upsert({
    where: {
      id_projeto_id_categoria_descricao: {
        id_projeto,
        id_categoria: categoria.id_categoria,
        descricao: name,
      },
    },
    update: { ativo: true },
    create: { id_projeto, id_categoria: categoria.id_categoria, descricao: name, padrao: false },
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
  // No UPDATE, só altera o que foi explicitamente informado — assim chamadas
  // sem `relationship` (ex.: ao lançar receita/despesa) NÃO sobrescrevem o
  // parentesco já definido (evita o titular virar "Outro" a cada lançamento).
  const update: Record<string, unknown> = {};
  if (opts.relationship) update.id_parentesco = await resolveParentescoId(opts.relationship);
  if (opts.cor) update.cor = opts.cor;
  if (opts.avatar !== undefined) update.avatar = opts.avatar;

  const pp = await prisma.projeto_pessoas.upsert({
    where: { id_projeto_id_pessoa: { id_projeto, id_pessoa } },
    update,
    create: {
      id_projeto,
      id_pessoa,
      id_parentesco: await resolveParentescoId(opts.relationship), // default "Outro"
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
export async function resolveSubcategoriaId(
  id_projeto: bigint,
  tipo: "R" | "D",
  category: string,
): Promise<bigint> {
  const descricao = (category || "Outros").trim() || "Outros";

  // (1) `category` bate com uma subcategoria existente (default ou do projeto).
  const subDireta = await prisma.subcategorias.findFirst({
    where: {
      descricao,
      categoria: { tipo },
      OR: [{ id_projeto: null }, { id_projeto }],
    },
  });
  if (subDireta) return subDireta.id_subcategoria;

  // (2) Trata `category` como categoria-pai e resolve uma subcategoria homônima
  // (reaproveita default ou cria custom no projeto).
  const categoriaAlvo =
    (await prisma.categorias.findFirst({ where: { tipo, descricao } })) ??
    (await prisma.categorias.findFirst({ where: { tipo, descricao: "Outros" } })) ??
    (await prisma.categorias.findFirst({ where: { tipo, descricao: "Outras" } }));
  const nomeCategoria = categoriaAlvo?.descricao ?? descricao;
  return resolveSubcategoriaByName(id_projeto, tipo, nomeCategoria, descricao);
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
