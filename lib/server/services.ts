/**
 * Camada de serviços: CRUD do modelo plano do frontend (people/incomes/
 * expenses/settings/subcategories) traduzido para o schema normalizado.
 *
 * Os IDs do banco são BigInt (autoincrement). Na borda, convertemos:
 * banco -> frontend usa `.toString()`; frontend -> banco usa `BigInt(...)`.
 * Quando o frontend não envia id (criação), o banco gera via autoincrement.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  PersonDTO,
  IncomeDTO,
  ExpenseDTO,
  SubcategoryDTO,
  genderToSexo,
  sexoToGender,
  parentescoToRelationship,
  toDateString,
  parseDate,
} from "./dtos.js";
import {
  ensureProjetoDefault,
  getProjetoDefault,
  ensureProjetoPessoa,
  resolveFormaPagamentoId,
  resolveSubcategoriaId,
  resolveSubcategoriaByName,
  ensureProjetoSubcategoria,
} from "./context.js";

/**
 * Converte id string (frontend) -> bigint. Retorna undefined para ids vazios
 * ou não-numéricos (ex.: uuids legados), o que faz o registro ser criado
 * (autoincrement) em vez de atualizado.
 */
function toBig(id?: string | null): bigint | undefined {
  if (!id || !/^\d+$/.test(id)) return undefined;
  return BigInt(id);
}

// ============================================================
// PESSOAS  (Person)
// ============================================================

const pessoaInclude = {
  projeto_pessoas: { include: { parentesco: true }, take: 1 },
} satisfies Prisma.pessoasInclude;

function rowToPerson(p: Prisma.pessoasGetPayload<{ include: typeof pessoaInclude }>): PersonDTO {
  const pp = p.projeto_pessoas[0];
  return {
    id: p.id_pessoa.toString(),
    name: p.nome,
    avatar: pp?.avatar || p.avatar || "",
    gender: sexoToGender(p.sexo),
    relationship: parentescoToRelationship(pp?.parentesco?.descricao),
    email: p.email || "",
    whatsapp: p.celular || "",
    birthDate: p.dt_nascimento ? toDateString(p.dt_nascimento) : undefined,
    color: pp?.cor || "#3B82F6",
    active: p.ativo,
  };
}

export async function listPeople(id_usuario: bigint): Promise<PersonDTO[]> {
  const rows = await prisma.pessoas.findMany({
    where: { id_usuario },
    include: pessoaInclude,
    orderBy: { dt_create: "asc" },
  });
  return rows.map(rowToPerson);
}

export async function savePerson(
  id_usuario: bigint,
  person: PersonDTO,
  plano?: string,
): Promise<PersonDTO> {
  const id = toBig(person.id);
  // Update se o id existe e pertence ao usuário; caso contrário, cria (autoincrement).
  const existing = id
    ? await prisma.pessoas.findFirst({ where: { id_pessoa: id, id_usuario } })
    : null;

  // Limite de plano: ao CRIAR uma pessoa nova, o plano Básico permite só 1.
  // Editar pessoa existente nunca bloqueia.
  if (!existing && plano === "basico") {
    const count = await prisma.pessoas.count({ where: { id_usuario } });
    if (count >= 1) {
      throw Object.assign(
        new Error(
          "O plano Básico permite apenas 1 familiar. Faça upgrade para o Premium para adicionar mais.",
        ),
        { status: 403 },
      );
    }
  }

  const data = {
    id_usuario,
    nome: person.name,
    email: person.email || null,
    dt_nascimento: person.birthDate ? parseDate(person.birthDate) : null,
    sexo: genderToSexo(person.gender),
    celular: person.whatsapp || null,
    avatar: person.avatar || null,
    ativo: person.active,
  };

  const pessoa = existing
    ? await prisma.pessoas.update({ where: { id_pessoa: existing.id_pessoa }, data })
    : await prisma.pessoas.create({ data });

  // Garante o projeto default (a primeira pessoa vira responsável) e o vínculo
  // projeto_pessoas com parentesco/cor/avatar.
  const projeto = await ensureProjetoDefault(id_usuario, pessoa.id_pessoa);
  await ensureProjetoPessoa(projeto.id_projeto, pessoa.id_pessoa, {
    relationship: person.relationship,
    cor: person.color,
    avatar: person.avatar || null,
  });

  const fresh = await prisma.pessoas.findUniqueOrThrow({
    where: { id_pessoa: pessoa.id_pessoa },
    include: pessoaInclude,
  });
  return rowToPerson(fresh);
}

export async function deletePerson(id_usuario: bigint, id: string): Promise<void> {
  const big = toBig(id);
  if (!big) return;
  const p = await prisma.pessoas.findFirst({ where: { id_pessoa: big, id_usuario } });
  if (!p) return;

  // A pessoa é responsável por algum projeto? (FK onDelete: Restrict)
  const projetoResp = await prisma.projetos.findFirst({ where: { id_pessoa_resp: big } });
  if (projetoResp) {
    throw Object.assign(new Error("Não é possível excluir o titular responsável pelo projeto."), {
      status: 409,
    });
  }

  // A pessoa tem lançamentos (receitas ou despesas)? (FK onDelete: Restrict)
  const [receita, despesa] = await Promise.all([
    prisma.receitas.findFirst({ where: { id_pessoa: big } }),
    prisma.despesas.findFirst({ where: { id_pessoa: big } }),
  ]);
  if (receita || despesa) {
    throw Object.assign(new Error("Esta pessoa possui lançamentos e não pode ser excluída."), {
      status: 409,
    });
  }

  await prisma.pessoas.delete({ where: { id_pessoa: big } });
}

// ============================================================
// Helpers de transação (comum a receitas e despesas)
// ============================================================

/**
 * `is_fixed` da transação é DERIVADO de `categorias.fixa` (categoria-pai da
 * subcategoria). Centraliza a busca para receitas e despesas.
 */
async function isFixedFromSubcategoria(id_subcategoria: bigint): Promise<boolean> {
  const sub = await prisma.subcategorias.findUnique({
    where: { id_subcategoria },
    include: { categoria: true },
  });
  return sub?.categoria.fixa ?? false;
}

async function requireProjeto(id_usuario: bigint) {
  const projeto = await getProjetoDefault(id_usuario);
  if (!projeto) {
    throw Object.assign(
      new Error("Nenhum projeto encontrado. Cadastre ao menos uma pessoa antes de lançar transações."),
      { status: 400 },
    );
  }
  return projeto;
}

// ============================================================
// RECEITAS  (Income)
// ============================================================

const receitaInclude = {
  subcategoria: { include: { categoria: true } },
} satisfies Prisma.receitasInclude;

function rowToIncome(r: Prisma.receitasGetPayload<{ include: typeof receitaInclude }>): IncomeDTO {
  return {
    id: r.id_receita.toString(),
    personId: r.id_pessoa.toString(),
    category: r.subcategoria.categoria.descricao,
    subcategory: r.subcategoria.descricao,
    amount: Number(r.valor),
    date: toDateString(r.dt_lancamento),
    notes: r.observacao || undefined,
    isFixed: r.is_fixed,
    isRecurring: r.is_recurring,
    recurrence: r.recorrencia as IncomeDTO["recurrence"],
  };
}

export async function listIncomes(id_usuario: bigint): Promise<IncomeDTO[]> {
  const rows = await prisma.receitas.findMany({
    where: { projeto: { id_usuario } },
    include: receitaInclude,
    orderBy: { dt_lancamento: "desc" },
  });
  return rows.map(rowToIncome);
}

export async function saveIncome(id_usuario: bigint, income: IncomeDTO): Promise<IncomeDTO> {
  const projeto = await requireProjeto(id_usuario);
  const id_pessoa = BigInt(income.personId);
  const id_subcategoria = income.subcategory && income.subcategory.trim()
    ? await resolveSubcategoriaByName(projeto.id_projeto, "R", income.category, income.subcategory)
    : await resolveSubcategoriaId(projeto.id_projeto, "R", income.category);
  const id_projetos_subcategorias = await ensureProjetoSubcategoria(projeto.id_projeto, id_subcategoria);
  const id_projeto_pessoa = await ensureProjetoPessoa(projeto.id_projeto, id_pessoa);
  const id_forma_pagamento = await resolveFormaPagamentoId("Pix");
  const is_fixed = await isFixedFromSubcategoria(id_subcategoria);

  const data = {
    id_projeto: projeto.id_projeto,
    id_subcategoria,
    id_projetos_subcategorias,
    id_projeto_pessoa,
    id_pessoa,
    id_forma_pagamento,
    valor: new Prisma.Decimal(income.amount),
    dt_lancamento: parseDate(income.date),
    observacao: income.notes || null,
    is_fixed,
    is_recurring: income.isRecurring,
    recorrencia: income.recurrence,
  };

  const id = toBig(income.id);
  const existing = id
    ? await prisma.receitas.findFirst({ where: { id_receita: id, projeto: { id_usuario } } })
    : null;
  const saved = existing
    ? await prisma.receitas.update({ where: { id_receita: existing.id_receita }, data })
    : await prisma.receitas.create({ data });

  const fresh = await prisma.receitas.findUniqueOrThrow({
    where: { id_receita: saved.id_receita },
    include: receitaInclude,
  });
  return rowToIncome(fresh);
}

export async function deleteIncome(id_usuario: bigint, id: string): Promise<void> {
  const big = toBig(id);
  if (!big) return;
  const r = await prisma.receitas.findFirst({ where: { id_receita: big, projeto: { id_usuario } } });
  if (!r) return;
  await prisma.receitas.delete({ where: { id_receita: big } });
}

// ============================================================
// DESPESAS  (Expense)
// ============================================================

const despesaInclude = {
  subcategoria: { include: { categoria: true } },
  forma_pagto: true,
} satisfies Prisma.despesasInclude;

function rowToExpense(d: Prisma.despesasGetPayload<{ include: typeof despesaInclude }>): ExpenseDTO {
  return {
    id: d.id_despesa.toString(),
    name: d.nome || d.subcategoria.descricao,
    category: d.subcategoria.categoria.descricao,
    subcategory: d.subcategoria.descricao,
    isFixed: d.is_fixed,
    amount: Number(d.valor),
    date: toDateString(d.dt_lancamento),
    personId: d.id_pessoa.toString(),
    notes: d.observacao || undefined,
    isRecurring: d.is_recurring,
    recurrence: d.recorrencia as ExpenseDTO["recurrence"],
    paymentMethod: d.forma_pagto.descricao,
  };
}

export async function listExpenses(id_usuario: bigint): Promise<ExpenseDTO[]> {
  const rows = await prisma.despesas.findMany({
    where: { projeto: { id_usuario } },
    include: despesaInclude,
    orderBy: { dt_lancamento: "desc" },
  });
  return rows.map(rowToExpense);
}

export async function saveExpense(id_usuario: bigint, expense: ExpenseDTO): Promise<ExpenseDTO> {
  const projeto = await requireProjeto(id_usuario);
  const id_pessoa = BigInt(expense.personId);
  const id_subcategoria = expense.subcategory && expense.subcategory.trim()
    ? await resolveSubcategoriaByName(projeto.id_projeto, "D", expense.category, expense.subcategory)
    : await resolveSubcategoriaId(projeto.id_projeto, "D", expense.category);
  const id_projetos_subcategorias = await ensureProjetoSubcategoria(projeto.id_projeto, id_subcategoria);
  const id_projeto_pessoa = await ensureProjetoPessoa(projeto.id_projeto, id_pessoa);
  const id_forma_pagamento = await resolveFormaPagamentoId(expense.paymentMethod);
  const is_fixed = await isFixedFromSubcategoria(id_subcategoria);

  const data = {
    id_projeto: projeto.id_projeto,
    id_subcategoria,
    id_projetos_subcategorias,
    id_projeto_pessoa,
    id_pessoa,
    id_forma_pagamento,
    nome: expense.name || null,
    valor: new Prisma.Decimal(expense.amount),
    dt_lancamento: parseDate(expense.date),
    observacao: expense.notes || null,
    is_fixed,
    is_recurring: expense.isRecurring,
    recorrencia: expense.recurrence,
  };

  const id = toBig(expense.id);
  const existing = id
    ? await prisma.despesas.findFirst({ where: { id_despesa: id, projeto: { id_usuario } } })
    : null;
  const saved = existing
    ? await prisma.despesas.update({ where: { id_despesa: existing.id_despesa }, data })
    : await prisma.despesas.create({ data });

  const fresh = await prisma.despesas.findUniqueOrThrow({
    where: { id_despesa: saved.id_despesa },
    include: despesaInclude,
  });
  return rowToExpense(fresh);
}

export async function deleteExpense(id_usuario: bigint, id: string): Promise<void> {
  const big = toBig(id);
  if (!big) return;
  const d = await prisma.despesas.findFirst({ where: { id_despesa: big, projeto: { id_usuario } } });
  if (!d) return;
  await prisma.despesas.delete({ where: { id_despesa: big } });
}

// ============================================================
// AÇÕES EM LOTE  (batch) — retornam os itens salvos (com IDs gerados)
// ============================================================

export async function saveIncomesBatch(id_usuario: bigint, items: IncomeDTO[]): Promise<IncomeDTO[]> {
  const out: IncomeDTO[] = [];
  for (const item of items) out.push(await saveIncome(id_usuario, item));
  return out;
}

export async function saveExpensesBatch(id_usuario: bigint, items: ExpenseDTO[]): Promise<ExpenseDTO[]> {
  const out: ExpenseDTO[] = [];
  for (const item of items) out.push(await saveExpense(id_usuario, item));
  return out;
}

// ============================================================
// SETTINGS  (AlertSettings -> preferencias.alert_settings)
// ============================================================

export async function loadSettings(id_usuario: bigint): Promise<unknown | null> {
  const pref = await prisma.preferencias.findUnique({ where: { id_usuario } });
  return (pref?.alert_settings as unknown) ?? null;
}

export async function saveSettings(id_usuario: bigint, settings: unknown): Promise<void> {
  await prisma.preferencias.upsert({
    where: { id_usuario },
    update: { alert_settings: settings as Prisma.InputJsonValue },
    create: { id_usuario, alert_settings: settings as Prisma.InputJsonValue },
  });
}

// ============================================================
// SUBCATEGORIAS  (SubcategoryItem)
// ============================================================

/**
 * Catálogo de subcategorias DEFAULT (padrao=true) disponíveis para escolha no
 * onboarding. É global (não depende do usuário).
 */
export async function listCatalog(): Promise<SubcategoryDTO[]> {
  const rows = await prisma.subcategorias.findMany({
    where: { id_projeto: null }, // template global (default)
    include: { categoria: true },
    orderBy: [{ categoria: { tipo: "asc" } }, { descricao: "asc" }],
  });
  return rows.map((s) => ({
    id: s.id_subcategoria.toString(),
    type: s.categoria.tipo === "R" ? "income" : "expense",
    category: s.categoria.descricao,
    name: s.descricao,
    active: s.ativo,
  }));
}

/**
 * Subcategorias que o usuário escolheu para o projeto dele (vínculos em
 * projetos_subcategorias). É o que o app usa para lançar transações.
 */
export async function listSubcategories(id_usuario: bigint): Promise<SubcategoryDTO[]> {
  const projeto = await getProjetoDefault(id_usuario);
  if (!projeto) return [];
  const rows = await prisma.projetos_subcategorias.findMany({
    where: { id_projeto: projeto.id_projeto, ativo: true },
    include: { subcategoria: { include: { categoria: true } } },
    orderBy: { subcategoria: { descricao: "asc" } },
  });
  return rows.map((ps) => ({
    id: ps.subcategoria.id_subcategoria.toString(),
    type: ps.subcategoria.categoria.tipo === "R" ? "income" : "expense",
    category: ps.subcategoria.categoria.descricao,
    name: ps.subcategoria.descricao,
    active: ps.subcategoria.ativo,
  }));
}

/**
 * Cria/garante cada subcategoria informada (com sua categoria-pai) e vincula
 * ao projeto do usuário. Aditivo — não remove vínculos ausentes.
 */
export async function saveSubcategories(id_usuario: bigint, items: SubcategoryDTO[]): Promise<void> {
  const projeto = await getProjetoDefault(id_usuario);
  if (!projeto) return;
  for (const item of items) {
    const tipo = item.type === "income" ? "R" : "D";
    const id_subcategoria = await resolveSubcategoriaByName(projeto.id_projeto, tipo, item.category, item.name);
    await ensureProjetoSubcategoria(projeto.id_projeto, id_subcategoria);
  }
}

// ============================================================
// ONBOARDING  (setup inicial do projeto)
// ============================================================

export interface OnboardingTitular {
  name: string;
  email?: string;
  whatsapp?: string;
  gender?: "masculino" | "feminino" | "outro";
  birthDate?: string;
  avatar?: string;
  color?: string;
}

export interface OnboardingSetupData {
  projectName: string;
  projectDescription?: string;
  titular: OnboardingTitular;
  subcategories: { type: "income" | "expense"; category: string; name: string }[];
}

/**
 * Configura o projeto no primeiro acesso:
 *  1. cria/atualiza o titular com os dados informados no onboarding;
 *  2. cria/atualiza o projeto com o nome escolhido;
 *  3. vincula o titular ao projeto (parentesco/cor/avatar);
 *  4. vincula as subcategorias selecionadas.
 */
export async function setupOnboarding(
  id_usuario: bigint,
  data: OnboardingSetupData,
): Promise<{ project: { id: string; nome: string }; titular: PersonDTO }> {
  const usuario = await prisma.usuarios.findUniqueOrThrow({ where: { id_usuario } });
  const t = data.titular || ({} as OnboardingTitular);

  // 1. Titular — cria ou atualiza com os dados do onboarding
  const pessoaData = {
    nome: (t.name || usuario.nome || usuario.email.split("@")[0] || "Titular").trim(),
    email: t.email?.trim() || usuario.email,
    celular: t.whatsapp?.trim() || null,
    sexo: genderToSexo(t.gender),
    dt_nascimento: t.birthDate ? parseDate(t.birthDate) : null,
    avatar: t.avatar || null,
  };
  let titular = await prisma.pessoas.findFirst({
    where: { id_usuario },
    orderBy: { dt_create: "asc" },
  });
  titular = titular
    ? await prisma.pessoas.update({ where: { id_pessoa: titular.id_pessoa }, data: pessoaData })
    : await prisma.pessoas.create({ data: { id_usuario, ...pessoaData, ativo: true } });

  // Mantém o nome do usuário (conta) em dia
  if (pessoaData.nome && pessoaData.nome !== usuario.nome) {
    await prisma.usuarios.update({ where: { id_usuario }, data: { nome: pessoaData.nome } });
  }

  // 2. Projeto
  const nome = (data.projectName || "Família").trim() || "Família";
  let projeto = await getProjetoDefault(id_usuario);
  if (!projeto) {
    projeto = await prisma.projetos.create({
      data: {
        id_usuario,
        id_pessoa_resp: titular.id_pessoa,
        nome,
        descricao: data.projectDescription || null,
      },
    });
  } else {
    projeto = await prisma.projetos.update({
      where: { id_projeto: projeto.id_projeto },
      data: { nome, descricao: data.projectDescription ?? projeto.descricao },
    });
  }

  // 3. Vincula o titular ao projeto (parentesco principal, cor e avatar)
  await ensureProjetoPessoa(projeto.id_projeto, titular.id_pessoa, {
    relationship: "principal",
    cor: t.color,
    avatar: t.avatar ?? null,
  });

  // 4. Vincula as subcategorias escolhidas
  for (const s of data.subcategories) {
    const tipo = s.type === "income" ? "R" : "D";
    const id_subcategoria = await resolveSubcategoriaByName(projeto.id_projeto, tipo, s.category, s.name);
    await ensureProjetoSubcategoria(projeto.id_projeto, id_subcategoria);
  }

  const fresh = await prisma.pessoas.findUniqueOrThrow({
    where: { id_pessoa: titular.id_pessoa },
    include: pessoaInclude,
  });
  return { project: { id: projeto.id_projeto.toString(), nome: projeto.nome }, titular: rowToPerson(fresh) };
}
