/**
 * Migração de dados via planilha XLSX (modelo único "Lançamentos").
 *
 * Fluxo:
 *   parseTemplate  -> lê/valida a aba de lançamentos (linhas + erros)
 *   previewMigration -> agrupa pessoas/categorias/subcategorias e checa plano
 *   executeMigration -> cria pessoas/categorias/subcategorias e lança transações
 *
 * Comportamento ADITIVO: nada é apagado. `is_fixed` das transações é derivado
 * da categoria (via saveIncome/saveExpense), não da planilha — a coluna `fixa`
 * da planilha define o `categorias.fixa` da categoria criada/atualizada.
 */
import * as XLSX from "xlsx";
import { prisma } from "./prisma.js";
import { parseFlexibleDate } from "./dateUtil.js";
import {
  ensureProjetoDefault,
  ensureProjetoPessoa,
  resolveSubcategoriaByName,
  ensureProjetoSubcategoria,
} from "./context.js";
import { saveIncome, saveExpense } from "./services.js";

export interface ParsedRow {
  linha: number; // nº da linha na planilha (1-based, com cabeçalho = 1)
  pessoa: string;
  tipo: "R" | "D";
  categoria: string;
  fixa: boolean;
  subcategoria: string;
  data: string; // "YYYY-MM-DD"
  valor: number;
  observacao: string;
}

export interface ParseError {
  linha: number;
  campo: string;
  erro: string;
}

interface MigrationCtx {
  id_usuario: bigint;
  plano: string;
}

// ── helpers de coluna (case-insensitive + variações) ──────────────────────────

function normalizeKey(k: string): string {
  return String(k)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove diacríticos (acentos)
}

/** Normaliza nome de pessoa: trim, lowercase, sem acentos, espaços colapsados. */
function normalizeName(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** Distância de edição (Levenshtein) entre duas strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

/** Similaridade 0..1 entre dois nomes (1 = idênticos após normalização). */
function nameSimilarity(a: string, b: string): number {
  const A = normalizeName(a);
  const B = normalizeName(b);
  if (!A && !B) return 1;
  const maxLen = Math.max(A.length, B.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(A, B) / maxLen;
}

const SUGESTAO_MIN_SCORE = 0.7; // limiar para sugerir vínculo a familiar existente

/** Constrói um getter de campo a partir de uma linha (chaves normalizadas). */
function fieldGetter(row: Record<string, unknown>) {
  const map: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) map[normalizeKey(k)] = v;
  return (...aliases: string[]): string => {
    for (const a of aliases) {
      const v = map[normalizeKey(a)];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
}

function parseTipo(raw: string): "R" | "D" | null {
  const v = raw.trim().toUpperCase();
  if (v === "R" || v.startsWith("RECEITA")) return "R";
  if (v === "D" || v.startsWith("DESPESA")) return "D";
  return null;
}

function parseFixa(raw: string): boolean {
  const v = normalizeKey(raw);
  return ["s", "sim", "true", "1", "verdadeiro", "fixa", "fixo"].includes(v);
}

function parseValor(raw: string): number {
  // Aceita vírgula decimal e separador de milhar em ponto/vírgula.
  let s = raw.trim().replace(/\s/g, "").replace(/R\$/i, "");
  // Se tem vírgula, assume vírgula = decimal; remove pontos de milhar.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

// ── parseTemplate ─────────────────────────────────────────────────────────────

export function parseTemplate(buffer: Buffer): { rows: ParsedRow[]; errors: ParseError[] } {
  const workbook = XLSX.read(buffer);

  // Procura a aba "Lançamentos" (com/sem acento); senão a 1ª com dados.
  let sheetName = workbook.SheetNames.find(
    (n) => normalizeKey(n) === "lancamentos",
  );
  if (!sheetName) {
    sheetName =
      workbook.SheetNames.find((n) => {
        const ws = workbook.Sheets[n];
        const data = XLSX.utils.sheet_to_json(ws, { header: 0 });
        return data.length > 0;
      }) || workbook.SheetNames[0];
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  const ws = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!ws) {
    errors.push({ linha: 0, campo: "arquivo", erro: "Planilha vazia ou sem aba de dados" });
    return { rows, errors };
  }

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 0 });

  raw.forEach((row, idx) => {
    const linha = idx + 2; // +2: header é linha 1, dados começam na 2
    const get = fieldGetter(row);

    const pessoa = get("nome pessoa", "pessoa", "nome");
    const tipoRaw = get("tipo", "tipo (r/d)");
    const categoria = get("categoria");
    const fixaRaw = get("fixa", "fixa (s/n)");
    const subcategoria = get("subcategoria");
    const dataRaw = get("data");
    const valorRaw = get("valor");
    const observacao = get("observacao", "observação", "obs", "notas");

    // Linha totalmente vazia -> ignora silenciosamente.
    if (!pessoa && !tipoRaw && !categoria && !subcategoria && !dataRaw && !valorRaw) {
      return;
    }

    const rowErrors: ParseError[] = [];

    if (!pessoa) rowErrors.push({ linha, campo: "nome pessoa", erro: "Campo obrigatório" });

    const tipo = parseTipo(tipoRaw);
    if (!tipoRaw) rowErrors.push({ linha, campo: "tipo", erro: "Campo obrigatório" });
    else if (!tipo) rowErrors.push({ linha, campo: "tipo", erro: 'Deve ser "R"/"D" ou "Receita"/"Despesa"' });

    if (!categoria) rowErrors.push({ linha, campo: "categoria", erro: "Campo obrigatório" });
    if (!subcategoria) rowErrors.push({ linha, campo: "subcategoria", erro: "Campo obrigatório" });

    const parsedDate = parseFlexibleDate(dataRaw);
    if (!dataRaw) rowErrors.push({ linha, campo: "data", erro: "Campo obrigatório" });
    else if (!parsedDate.valid) rowErrors.push({ linha, campo: "data", erro: "Data inválida" });

    const valor = parseValor(valorRaw);
    if (!valorRaw) rowErrors.push({ linha, campo: "valor", erro: "Campo obrigatório" });
    else if (isNaN(valor)) rowErrors.push({ linha, campo: "valor", erro: "Valor não numérico" });
    else if (valor <= 0) rowErrors.push({ linha, campo: "valor", erro: "Deve ser maior que zero" });

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    rows.push({
      linha,
      pessoa,
      tipo: tipo!,
      categoria,
      fixa: parseFixa(fixaRaw),
      subcategoria,
      data: parsedDate.dateStr,
      valor,
      observacao,
    });
  });

  return { rows, errors };
}

// ── previewMigration ──────────────────────────────────────────────────────────

export interface PreviewPerson {
  nomePlanilha: string; // nome exatamente como veio na planilha
  existenteId: string | null; // id se bate com um familiar existente (match exato normalizado)
  sugestaoId: string | null; // familiar existente PARECIDO (para o usuário confirmar)
  sugestaoNome: string | null;
}

export interface PreviewResult {
  pessoas: PreviewPerson[];
  pessoasExistentes: { id: string; nome: string }[]; // para o seletor de vínculo no front
  plano: string;
  categorias: string[];
  subcategorias: number;
  lancamentos: number;
  erros: ParseError[];
}

export async function previewMigration(
  ctx: MigrationCtx,
  fileData: string,
): Promise<PreviewResult> {
  const buffer = Buffer.from(fileData, "base64");
  const { rows, errors } = parseTemplate(buffer);

  // Pessoas distintas (normalizadas, preservando o 1º nome visto na planilha).
  const distintos = new Map<string, string>(); // normalizado -> nomePlanilha
  for (const r of rows) {
    const k = normalizeName(r.pessoa);
    if (k && !distintos.has(k)) distintos.set(k, r.pessoa);
  }

  const existentesDb = await prisma.pessoas.findMany({
    where: { id_usuario: ctx.id_usuario },
    select: { id_pessoa: true, nome: true },
    orderBy: { dt_create: "asc" },
  });
  const existByNorm = new Map(existentesDb.map((p) => [normalizeName(p.nome), p]));

  const pessoas: PreviewPerson[] = [];
  for (const [norm, nomePlanilha] of distintos) {
    const exata = existByNorm.get(norm);
    if (exata) {
      pessoas.push({
        nomePlanilha,
        existenteId: exata.id_pessoa.toString(),
        sugestaoId: null,
        sugestaoNome: null,
      });
      continue;
    }
    // Sem match exato: procura o familiar existente mais parecido.
    let best: { id: string; nome: string; score: number } | null = null;
    for (const p of existentesDb) {
      const score = nameSimilarity(nomePlanilha, p.nome);
      if (score >= SUGESTAO_MIN_SCORE && (!best || score > best.score)) {
        best = { id: p.id_pessoa.toString(), nome: p.nome, score };
      }
    }
    pessoas.push({
      nomePlanilha,
      existenteId: null,
      sugestaoId: best?.id ?? null,
      sugestaoNome: best?.nome ?? null,
    });
  }

  const categoriasSet = new Set(rows.map((r) => `${r.tipo}::${r.categoria}`));
  const categorias = [...categoriasSet].map((c) => c.split("::")[1]);
  const subcategoriasSet = new Set(rows.map((r) => `${r.tipo}::${r.categoria}::${r.subcategoria}`));

  return {
    pessoas,
    pessoasExistentes: existentesDb.map((p) => ({ id: p.id_pessoa.toString(), nome: p.nome })),
    plano: ctx.plano,
    categorias: [...new Set(categorias)],
    subcategorias: subcategoriasSet.size,
    lancamentos: rows.length,
    erros: errors,
  };
}

// ── executeMigration ──────────────────────────────────────────────────────────

export interface ExecuteResult {
  pessoasCriadas: number;
  categorias: number;
  subcategorias: number;
  receitas: number;
  despesas: number;
}

export async function executeMigration(
  ctx: MigrationCtx,
  fileData: string,
  projectName?: string,
  /** nomePlanilha -> id_pessoa existente OU "new". Sobrescreve o auto-match. */
  personMap?: Record<string, string>,
): Promise<ExecuteResult> {
  const buffer = Buffer.from(fileData, "base64");
  const { rows } = parseTemplate(buffer);

  // Pessoas distintas da planilha (normalizadas).
  const distintos = new Map<string, string>(); // norm -> nomePlanilha
  for (const r of rows) {
    const k = normalizeName(r.pessoa);
    if (k && !distintos.has(k)) distintos.set(k, r.pessoa);
  }

  const existentesDb = await prisma.pessoas.findMany({
    where: { id_usuario: ctx.id_usuario },
    select: { id_pessoa: true, nome: true },
    orderBy: { dt_create: "asc" },
  });
  const existByNorm = new Map(existentesDb.map((p) => [normalizeName(p.nome), p.id_pessoa]));
  const ownedIds = new Set(existentesDb.map((p) => p.id_pessoa.toString()));

  // Decide cada nome distinto: id de familiar existente OU "new".
  // Prioridade: escolha manual (personMap) > match exato normalizado > "new".
  const decisao = new Map<string, bigint | "new">(); // norm -> id|new
  for (const [norm, nomePlanilha] of distintos) {
    const manual = personMap?.[nomePlanilha];
    if (manual && manual !== "new" && /^\d+$/.test(manual) && ownedIds.has(manual)) {
      decisao.set(norm, BigInt(manual));
    } else if (manual === "new") {
      decisao.set(norm, "new");
    } else {
      decisao.set(norm, existByNorm.get(norm) ?? "new");
    }
  }

  // 1. Bloqueio de plano: conta quantas pessoas serão de fato criadas.
  const criarCount = [...decisao.values()].filter((d) => d === "new").length;
  if (criarCount > 0 && ctx.plano === "basico") {
    throw Object.assign(
      new Error(
        "O plano Básico permite apenas 1 familiar. Faça upgrade para o Premium para migrar novos familiares.",
      ),
      { status: 403 },
    );
  }

  // 2. Projeto: precisa de uma pessoa responsável (titular = 1ª existente).
  const titular = existentesDb[0];
  if (!titular) {
    throw Object.assign(
      new Error("Cadastre ao menos uma pessoa (titular) antes de migrar."),
      { status: 400 },
    );
  }
  let projeto = await ensureProjetoDefault(ctx.id_usuario, titular.id_pessoa);
  if (projectName && projectName.trim() && projectName.trim() !== projeto.nome) {
    projeto = await prisma.projetos.update({
      where: { id_projeto: projeto.id_projeto },
      data: { nome: projectName.trim() },
    });
  }

  // 3. Pessoas: cria as "new" e garante o vínculo das existentes ao projeto.
  const personIdByNorm = new Map<string, bigint>();
  let pessoasCriadas = 0;
  for (const [norm, d] of decisao) {
    if (d === "new") {
      const nome = distintos.get(norm)!;
      const novaPessoa = await prisma.pessoas.create({
        data: { id_usuario: ctx.id_usuario, nome, email: null, celular: null, ativo: true },
      });
      await ensureProjetoPessoa(projeto.id_projeto, novaPessoa.id_pessoa, { relationship: "outro" });
      personIdByNorm.set(norm, novaPessoa.id_pessoa);
      pessoasCriadas++;
    } else {
      personIdByNorm.set(norm, d);
      await ensureProjetoPessoa(projeto.id_projeto, d); // garante vínculo (não muda parentesco)
    }
  }

  // 4. Categorias: upsert por (tipo, descricao) com `fixa`.
  //    Se múltiplas linhas divergirem no `fixa`, vence o último valor visto
  //    (OR não é aplicável porque a coluna é única por categoria).
  const categoriaFixa = new Map<string, { tipo: "R" | "D"; descricao: string; fixa: boolean }>();
  for (const r of rows) {
    categoriaFixa.set(`${r.tipo}::${r.categoria}`, { tipo: r.tipo, descricao: r.categoria, fixa: r.fixa });
  }
  for (const { tipo, descricao, fixa } of categoriaFixa.values()) {
    await prisma.categorias.upsert({
      where: { tipo_descricao: { tipo, descricao } },
      update: { fixa },
      create: { tipo, descricao, fixa, padrao: false },
    });
  }

  // 5. Subcategorias: resolve + vincula ao projeto.
  const subcatSeen = new Set<string>();
  for (const r of rows) {
    const k = `${r.tipo}::${r.categoria}::${r.subcategoria}`;
    if (subcatSeen.has(k)) continue;
    subcatSeen.add(k);
    const id_subcategoria = await resolveSubcategoriaByName(
      projeto.id_projeto,
      r.tipo,
      r.categoria,
      r.subcategoria,
    );
    await ensureProjetoSubcategoria(projeto.id_projeto, id_subcategoria);
  }

  // 6. Lançamentos (aditivo). is_fixed é derivado da categoria no backend.
  let receitas = 0;
  let despesas = 0;
  for (const r of rows) {
    const personId = personIdByNorm.get(normalizeName(r.pessoa))!.toString();
    if (r.tipo === "R") {
      await saveIncome(ctx.id_usuario, {
        id: "",
        personId,
        category: r.categoria,
        subcategory: r.subcategoria,
        amount: r.valor,
        date: r.data,
        notes: r.observacao || undefined,
        isFixed: r.fixa,
        isRecurring: false,
        recurrence: "eventual",
      });
      receitas++;
    } else {
      await saveExpense(ctx.id_usuario, {
        id: "",
        name: r.subcategoria,
        personId,
        category: r.categoria,
        subcategory: r.subcategoria,
        amount: r.valor,
        date: r.data,
        notes: r.observacao || undefined,
        isFixed: r.fixa,
        isRecurring: false,
        recurrence: "eventual",
        paymentMethod: "Pix",
      });
      despesas++;
    }
  }

  return {
    pessoasCriadas,
    categorias: categoriaFixa.size,
    subcategorias: subcatSeen.size,
    receitas,
    despesas,
  };
}
