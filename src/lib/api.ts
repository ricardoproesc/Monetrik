/**
 * Cliente de dados do frontend — substitui o antigo firestore.ts.
 *
 * Conversa com a API REST em /api/data/* (Express em dev, Vercel Functions em
 * produção), que persiste no Postgres via Prisma. A autenticação continua sendo
 * do Firebase: enviamos o ID token no header Authorization.
 *
 * As assinaturas espelham as do firestore.ts antigo (recebem `uid`) para
 * minimizar mudanças nos componentes — o `uid` é ignorado aqui, pois o backend
 * identifica o usuário pelo token.
 */
import { getAuth } from "firebase/auth";
import type { Person, Income, Expense, AlertSettings } from "../types";
import type { SubcategoryItem } from "../components/TransactionsManager";

const BASE = "/api/data";

async function getToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  return user.getIdToken();
}

async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} /${path} ${res.status}: ${text}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ---- Plano / conta ----
export interface MeInfo {
  plano: string; // 'basico' | 'premium'
  maxPessoas: number | null; // null = ilimitado
  pessoasCount: number;
}
export async function loadMe(): Promise<MeInfo> {
  return apiFetch<MeInfo>("GET", "me");
}

// ---- Projetos ----
export interface ProjectInfo {
  id_projeto: string;
  nome: string;
  [key: string]: unknown;
}
export async function loadProjetos(): Promise<ProjectInfo[]> {
  return apiFetch<ProjectInfo[]>("GET", "projetos");
}
export async function renameProject(id: string, nome: string): Promise<ProjectInfo> {
  return apiFetch<ProjectInfo>("PUT", `projetos/${id}`, { nome });
}

// ---- Migração (novo fluxo) ----
export interface PreviewPerson {
  nomePlanilha: string;        // nome como veio na planilha
  existenteId: string | null;  // bate exatamente com um familiar existente
  sugestaoId: string | null;   // familiar parecido (sugestão para confirmar)
  sugestaoNome: string | null;
}
export interface MigrationPreview {
  pessoas: PreviewPerson[];
  pessoasExistentes: { id: string; nome: string }[];
  plano: string;
  categorias: string[];
  subcategorias: number;
  lancamentos: number;
  erros: { linha: number; campo: string; erro: string }[];
}
export interface MigrationResult {
  pessoasCriadas: number;
  categorias: number;
  subcategorias: number;
  receitas: number;
  despesas: number;
}
export async function migrationPreview(fileData: string): Promise<MigrationPreview> {
  return apiFetch<MigrationPreview>("POST", "migration", { action: "preview", fileData });
}
// personMap: nomePlanilha -> id de familiar existente OU "new".
export async function migrationExecute(
  fileData: string,
  projectName?: string,
  personMap?: Record<string, string>,
): Promise<MigrationResult> {
  return apiFetch<MigrationResult>("POST", "migration", {
    action: "execute",
    fileData,
    projectName,
    personMap,
  });
}
// Baixa o template XLSX (binário) autenticado e dispara o download no browser.
export async function downloadMigrationTemplate(): Promise<void> {
  const token = await getToken();
  const res = await fetch("/api/migration/template", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao baixar modelo (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "monetrik-modelo-migracao.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- People ----
export async function loadPeople(_uid: string): Promise<Person[]> {
  return apiFetch<Person[]>("GET", "people");
}
// Retorna a pessoa salva (com o id gerado pelo banco, em criações).
export async function savePerson(_uid: string, person: Person): Promise<Person> {
  return apiFetch<Person>("POST", "people", person);
}
export async function deletePerson(_uid: string, personId: string): Promise<void> {
  await apiFetch("DELETE", `people/${personId}`);
}

// ---- Incomes ----
export async function loadIncomes(_uid: string): Promise<Income[]> {
  return apiFetch<Income[]>("GET", "incomes");
}
export async function saveIncome(_uid: string, income: Income): Promise<Income> {
  return apiFetch<Income>("POST", "incomes", income);
}
export async function deleteIncome(_uid: string, incomeId: string): Promise<void> {
  await apiFetch("DELETE", `incomes/${incomeId}`);
}

// ---- Expenses ----
export async function loadExpenses(_uid: string): Promise<Expense[]> {
  return apiFetch<Expense[]>("GET", "expenses");
}
export async function saveExpense(_uid: string, expense: Expense): Promise<Expense> {
  return apiFetch<Expense>("POST", "expenses", expense);
}
export async function deleteExpense(_uid: string, expenseId: string): Promise<void> {
  await apiFetch("DELETE", `expenses/${expenseId}`);
}

// ---- Settings (AlertSettings) ----
export async function saveSettings(_uid: string, settings: AlertSettings): Promise<void> {
  await apiFetch("POST", "settings", settings);
}
export async function loadSettings(_uid: string): Promise<AlertSettings | null> {
  return apiFetch<AlertSettings | null>("GET", "settings");
}

// ---- Subcategorias ----
export async function saveSubcategories(_uid: string, items: SubcategoryItem[]): Promise<void> {
  await apiFetch("POST", "subcategories", items);
}
export async function loadSubcategories(_uid: string): Promise<SubcategoryItem[] | null> {
  const items = await apiFetch<SubcategoryItem[]>("GET", "subcategories");
  return items && items.length > 0 ? items : null;
}

// ---- Onboarding ----
// Catálogo de subcategorias default disponíveis para escolha no onboarding.
export async function loadCatalog(_uid: string): Promise<SubcategoryItem[]> {
  return apiFetch<SubcategoryItem[]>("GET", "catalog");
}

export interface OnboardingPayload {
  projectName: string;
  projectDescription?: string;
  titular: {
    name: string;
    email?: string;
    whatsapp?: string;
    gender?: "masculino" | "feminino" | "outro";
    birthDate?: string;
    avatar?: string;
    color?: string;
  };
  subcategories: { type: "income" | "expense"; category: string; name: string }[];
}

// Configura o projeto no primeiro acesso (titular + projeto + subcategorias).
export async function setupProject(
  _uid: string,
  data: OnboardingPayload,
): Promise<{ project: { id: string; nome: string }; titular: Person }> {
  return apiFetch("POST", "setup", data);
}

// ---- Bulk save ----
// Retorna os itens salvos (com os IDs gerados pelo banco).
export async function batchSaveItems<T extends { id: string }>(
  _uid: string,
  collectionName: string,
  items: T[],
): Promise<T[]> {
  if (items.length === 0) return [];
  if (collectionName === "incomes" || collectionName === "expenses") {
    return apiFetch<T[]>("POST", collectionName, { items });
  }
  if (collectionName === "people") {
    return Promise.all(items.map((item) => apiFetch<T>("POST", "people", item)));
  }
  // fallback: salva um a um no recurso informado
  return Promise.all(items.map((item) => apiFetch<T>("POST", collectionName, item)));
}

// ---- Compatibilidade com a API antiga ----
// A migração de localStorage->Firestore não se aplica ao Postgres (os IDs
// antigos não são UUIDs válidos). Mantido como no-op para não quebrar chamadas.
export async function migrateFromLocalStorage(_uid: string): Promise<void> {
  return;
}

export type Unsubscribe = () => void;
export function subscribeToCollection<T>(
  _uid: string,
  _name: string,
  _onData: (items: T[]) => void,
): Unsubscribe {
  return () => {};
}
