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

// Remove campos undefined — Firestore não aceita undefined
const clean = <T extends object>(obj: T): T =>
  JSON.parse(JSON.stringify(obj)) as T;

// -------------------------------------------------------
// Settings
// -------------------------------------------------------
export async function saveSettings(uid: string, settings: AlertSettings) {
  await setDoc(doc(db!, "users", uid, "meta", "settings"), clean(settings));
}

export async function loadSettings(uid: string): Promise<AlertSettings | null> {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db!, "users", uid, "meta", "settings"));
  return snap.exists() ? (snap.data() as AlertSettings) : null;
}

// -------------------------------------------------------
// People
// -------------------------------------------------------
export async function savePerson(uid: string, person: Person) {
  await setDoc(doc(db!, "users", uid, "people", person.id), clean(person));
}

export async function deletePerson(uid: string, personId: string) {
  await deleteDoc(doc(db!, "users", uid, "people", personId));
}

export async function loadPeople(uid: string): Promise<Person[]> {
  const snap = await getDocs(collection(db!, "users", uid, "people"));
  return snap.docs.map((d) => d.data() as Person);
}

// -------------------------------------------------------
// Incomes
// -------------------------------------------------------
export async function saveIncome(uid: string, income: Income) {
  await setDoc(doc(db!, "users", uid, "incomes", income.id), clean(income));
}

export async function deleteIncome(uid: string, incomeId: string) {
  await deleteDoc(doc(db!, "users", uid, "incomes", incomeId));
}

export async function loadIncomes(uid: string): Promise<Income[]> {
  const snap = await getDocs(collection(db!, "users", uid, "incomes"));
  return snap.docs.map((d) => d.data() as Income);
}

// -------------------------------------------------------
// Expenses
// -------------------------------------------------------
export async function saveExpense(uid: string, expense: Expense) {
  const cleaned = clean(expense);
  console.log("[FS] saveExpense →", uid, expense.id);
  await setDoc(doc(db!, "users", uid, "expenses", expense.id), cleaned);
  console.log("[FS] saveExpense OK ✓");
}

export async function deleteExpense(uid: string, expenseId: string) {
  await deleteDoc(doc(db!, "users", uid, "expenses", expenseId));
}

export async function loadExpenses(uid: string): Promise<Expense[]> {
  const snap = await getDocs(collection(db!, "users", uid, "expenses"));
  return snap.docs.map((d) => d.data() as Expense);
}

// -------------------------------------------------------
// Listener em tempo real
// -------------------------------------------------------
export function subscribeToCollection<T>(
  uid: string,
  name: string,
  onData: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(collection(db!, "users", uid, name), (snap) => {
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
  if (items.length === 0) return;
  const batch = writeBatch(db!);
  items.forEach((item) => {
    const ref = doc(db!, "users", uid, collectionName, item.id);
    batch.set(ref, clean(item));
  });
  await batch.commit();
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
