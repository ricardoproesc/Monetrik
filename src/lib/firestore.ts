import {
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Person, Income, Expense, AlertSettings } from "../types";

// -------------------------------------------------------
// Helpers de caminho
// -------------------------------------------------------
const userRef = (uid: string) => doc(db, "users", uid);
const col = (uid: string, name: string) => collection(db, "users", uid, name);

// Remove campos undefined — Firestore não aceita undefined
const clean = <T extends object>(obj: T): T =>
  JSON.parse(JSON.stringify(obj)) as T;

// -------------------------------------------------------
// Settings
// -------------------------------------------------------
export async function saveSettings(uid: string, settings: AlertSettings) {
  await setDoc(doc(db, "users", uid, "meta", "settings"), clean(settings));
}

export async function loadSettings(uid: string): Promise<AlertSettings | null> {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "meta", "settings"));
  return snap.exists() ? (snap.data() as AlertSettings) : null;
}

// -------------------------------------------------------
// People
// -------------------------------------------------------
export async function savePerson(uid: string, person: Person) {
  await setDoc(doc(col(uid, "people"), person.id), clean(person));
}

export async function deletePerson(uid: string, personId: string) {
  await deleteDoc(doc(col(uid, "people"), personId));
}

export async function loadPeople(uid: string): Promise<Person[]> {
  const snap = await getDocs(col(uid, "people"));
  return snap.docs.map((d) => d.data() as Person);
}

// -------------------------------------------------------
// Incomes
// -------------------------------------------------------
export async function saveIncome(uid: string, income: Income) {
  await setDoc(doc(col(uid, "incomes"), income.id), clean(income));
}

export async function deleteIncome(uid: string, incomeId: string) {
  await deleteDoc(doc(col(uid, "incomes"), incomeId));
}

export async function loadIncomes(uid: string): Promise<Income[]> {
  const snap = await getDocs(col(uid, "incomes"));
  return snap.docs.map((d) => d.data() as Income);
}

// -------------------------------------------------------
// Expenses
// -------------------------------------------------------
export async function saveExpense(uid: string, expense: Expense) {
  await setDoc(doc(col(uid, "expenses"), expense.id), clean(expense));
}

export async function deleteExpense(uid: string, expenseId: string) {
  await deleteDoc(doc(col(uid, "expenses"), expenseId));
}

export async function loadExpenses(uid: string): Promise<Expense[]> {
  const snap = await getDocs(col(uid, "expenses"));
  return snap.docs.map((d) => d.data() as Expense);
}

// -------------------------------------------------------
// Listener em tempo real para toda a coleção de um usuário
// -------------------------------------------------------
export function subscribeToCollection<T>(
  uid: string,
  name: string,
  onData: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(col(uid, name), (snap) => {
    onData(snap.docs.map((d) => d.data() as T));
  });
}

// -------------------------------------------------------
// Bulk save (batch)
// -------------------------------------------------------
export async function batchSaveItems<T extends { id: string }>(
  uid: string,
  collectionName: string,
  items: T[]
) {
  const batch = writeBatch(db);
  items.forEach((item) => {
    const ref = doc(col(uid, collectionName), item.id);
    batch.set(ref, clean(item));
  });
  await batch.commit();
}

// -------------------------------------------------------
// Migração localStorage → Firestore (executar uma vez)
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
      await batchSaveItems(uid, colName, items);
      localStorage.removeItem(lsKey);
    } catch {
      // ignora se já migrado ou formato inválido
    }
  }

  const rawSettings = localStorage.getItem("kashfam_settings");
  if (rawSettings) {
    try {
      await saveSettings(uid, JSON.parse(rawSettings));
      localStorage.removeItem("kashfam_settings");
    } catch { /* */ }
  }
}
