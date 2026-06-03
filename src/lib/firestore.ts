import { getAuth } from "firebase/auth";
import type { Person, Income, Expense, AlertSettings } from "../types";

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// -------------------------------------------------------
// REST API helpers
// -------------------------------------------------------
async function getToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  return user.getIdToken();
}

function baseUrl(uid: string, col: string) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/${col}`;
}

async function restFetch(method: string, url: string, body?: unknown) {
  const token = await getToken();
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Firestore ${method} ${res.status}: ${text}`);
  }
  return res.status === 204 || res.status === 404 ? null : res.json();
}

// -------------------------------------------------------
// Conversão JS ↔ Firestore wire format
// -------------------------------------------------------
function toFS(val: unknown): unknown {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFS) } };
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFS(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFSVal(v: any): unknown {
  if ("stringValue"  in v) return v.stringValue;
  if ("doubleValue"  in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue"    in v) return null;
  if ("arrayValue"   in v) return (v.arrayValue?.values ?? []).map(fromFSVal);
  if ("mapValue"     in v) return fromFSFields(v.mapValue?.fields ?? {});
  return null;
}

function fromFSFields(fields: Record<string, any>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) obj[k] = fromFSVal(v);
  return obj;
}

function toFSFields(data: object): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFS(v);
  }
  return fields;
}

// -------------------------------------------------------
// CRUD genérico
// -------------------------------------------------------
async function saveDoc(uid: string, col: string, id: string, data: object) {
  const url = `${baseUrl(uid, col)}/${id}`;
  await restFetch("PATCH", url, { fields: toFSFields(data) });
}

async function removeDoc(uid: string, col: string, id: string) {
  await restFetch("DELETE", `${baseUrl(uid, col)}/${id}`);
}

async function loadCol<T>(uid: string, col: string): Promise<T[]> {
  const res = await restFetch("GET", baseUrl(uid, col));
  if (!res?.documents) return [];
  return res.documents.map((d: any) => fromFSFields(d.fields ?? {}) as T);
}

// -------------------------------------------------------
// Settings
// -------------------------------------------------------
export async function saveSettings(uid: string, settings: AlertSettings) {
  await saveDoc(uid, "meta", "settings", settings);
}

export async function loadSettings(uid: string): Promise<AlertSettings | null> {
  const res = await restFetch("GET", `${baseUrl(uid, "meta")}/settings`);
  if (!res?.fields) return null;
  return fromFSFields(res.fields) as AlertSettings;
}

// -------------------------------------------------------
// People
// -------------------------------------------------------
export async function savePerson(uid: string, person: Person) {
  await saveDoc(uid, "people", person.id, person);
}

export async function deletePerson(uid: string, personId: string) {
  await removeDoc(uid, "people", personId);
}

export async function loadPeople(uid: string): Promise<Person[]> {
  return loadCol<Person>(uid, "people");
}

// -------------------------------------------------------
// Incomes
// -------------------------------------------------------
export async function saveIncome(uid: string, income: Income) {
  await saveDoc(uid, "incomes", income.id, income);
}

export async function deleteIncome(uid: string, incomeId: string) {
  await removeDoc(uid, "incomes", incomeId);
}

export async function loadIncomes(uid: string): Promise<Income[]> {
  return loadCol<Income>(uid, "incomes");
}

// -------------------------------------------------------
// Expenses
// -------------------------------------------------------
export async function saveExpense(uid: string, expense: Expense) {
  await saveDoc(uid, "expenses", expense.id, expense);
}

export async function deleteExpense(uid: string, expenseId: string) {
  await removeDoc(uid, "expenses", expenseId);
}

export async function loadExpenses(uid: string): Promise<Expense[]> {
  return loadCol<Expense>(uid, "expenses");
}

// -------------------------------------------------------
// Bulk save
// -------------------------------------------------------
export async function batchSaveItems<T extends { id: string }>(
  uid: string,
  collectionName: string,
  items: T[]
) {
  await Promise.all(items.map(item => saveDoc(uid, collectionName, item.id, item)));
}

// -------------------------------------------------------
// Migração localStorage → Firestore
// -------------------------------------------------------
export async function migrateFromLocalStorage(uid: string) {
  const keys: Record<string, string> = {
    kashfam_people: "people",
    kashfam_incomes: "incomes",
    kashfam_expenses: "expenses",
  };
  for (const [lsKey, colName] of Object.entries(keys)) {
    const raw = localStorage.getItem(lsKey);
    if (!raw) continue;
    try {
      const items: Array<{ id: string }> = JSON.parse(raw);
      if (items.length > 0) {
        await batchSaveItems(uid, colName, items);
        localStorage.removeItem(lsKey);
      }
    } catch { /* ignora */ }
  }
  const rawSettings = localStorage.getItem("kashfam_settings");
  if (rawSettings) {
    try {
      await saveSettings(uid, JSON.parse(rawSettings));
      localStorage.removeItem("kashfam_settings");
    } catch { /* */ }
  }
}

// Compatibilidade (não usada com REST)
export type Unsubscribe = () => void;
export function subscribeToCollection<T>(
  _uid: string, _name: string, _onData: (items: T[]) => void
): Unsubscribe { return () => {}; }
