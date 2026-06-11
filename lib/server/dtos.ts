/**
 * DTOs no formato usado pelo frontend (modelo plano) e conversões puras
 * (sem acesso ao banco) entre esses DTOs e as linhas do Postgres.
 *
 * As conversões que precisam resolver lookups (subcategoria, forma de
 * pagamento, parentesco) ficam em `services.ts`, pois dependem do banco.
 */

// ---- Formato do frontend (espelha src/types.ts) ----
export interface PersonDTO {
  id: string;
  name: string;
  avatar: string;
  gender: "masculino" | "feminino" | "outro";
  relationship: "principal" | "conjuge" | "filho(a)" | "pai/mae" | "outro";
  email: string;
  whatsapp: string;
  birthDate?: string;
  color: string;
  active: boolean;
}

export interface IncomeDTO {
  id: string;
  personId: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  isFixed: boolean;
  isRecurring: boolean;
  recurrence: "mensal" | "anual" | "eventual";
}

export interface ExpenseDTO {
  id: string;
  name: string;
  category: string;
  isFixed: boolean;
  amount: number;
  date: string;
  personId: string;
  notes?: string;
  isRecurring: boolean;
  recurrence: "mensal" | "anual" | "eventual";
  paymentMethod: string;
}

export interface SubcategoryDTO {
  id: string;
  type: "income" | "expense";
  category: string;
  name: string;
  active?: boolean;
}

// ---- Conversões de enum/escalares ----
export function genderToSexo(g?: string): string | null {
  if (g === "masculino") return "M";
  if (g === "feminino") return "F";
  return null;
}

export function sexoToGender(s?: string | null): PersonDTO["gender"] {
  if (s === "M") return "masculino";
  if (s === "F") return "feminino";
  return "outro";
}

const PARENTESCO_TO_REL: Record<string, PersonDTO["relationship"]> = {
  Titular: "principal",
  Cônjuge: "conjuge",
  "Filho(a)": "filho(a)",
  "Pai/Mãe": "pai/mae",
  Outro: "outro",
};

export function parentescoToRelationship(descricao?: string | null): PersonDTO["relationship"] {
  return (descricao && PARENTESCO_TO_REL[descricao]) || "outro";
}

/** Converte Date -> "YYYY-MM-DD" (formato usado pelo frontend). */
export function toDateString(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** Converte "YYYY-MM-DD" (ou ISO) -> Date. Lança se inválido. */
export function parseDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Data inválida: "${s}"`);
  return d;
}
