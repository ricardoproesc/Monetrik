/**
 * Parser de datas robusto compartilhado (Express e migração).
 *
 * Aceita: número serial do Excel, timestamp (ms/s), DD/MM/YYYY, YYYY-MM-DD,
 * DD-MM-YYYY, MM/DD/YYYY (americano), DD.MM.YYYY e ISO 8601 nativo.
 * Retorna sempre normalizado em "YYYY-MM-DD".
 */
export function parseFlexibleDate(input: unknown): { valid: boolean; dateStr: string } {
  if (input === null || input === undefined || input === "") {
    return { valid: false, dateStr: "" };
  }

  // Excel armazena datas como número serial (dias desde 1899-12-30). O xlsx
  // costuma devolver Date já parseado, mas tratamos ambos os casos.
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return { valid: false, dateStr: "" };
    return { valid: true, dateStr: toYmd(input) };
  }

  const inputStr = String(input).trim();
  if (!inputStr) return { valid: false, dateStr: "" };

  // Número puro: serial Excel (1..60000) ou timestamp (ms/s).
  if (/^\d+$/.test(inputStr)) {
    const num = Number(inputStr);
    // Serial Excel típico: até ~60000 (ano ~2064). Acima disso é timestamp.
    if (num > 0 && num < 60000) {
      const ms = Math.round((num - 25569) * 86400 * 1000); // 25569 = 1970-01-01
      const date = new Date(ms);
      if (!isNaN(date.getTime())) return { valid: true, dateStr: toYmd(date) };
    }
    const timestamp = num > 9999999999 ? num : num * 1000;
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return { valid: true, dateStr: toYmd(date) };
  }

  // DD/MM/YYYY
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(inputStr);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${month}-${day}` };
  }

  // YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inputStr);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${month}-${day}` };
  }

  // DD-MM-YYYY
  const ddmmyyyy2 = /^(\d{2})-(\d{2})-(\d{4})$/.exec(inputStr);
  if (ddmmyyyy2) {
    const [, day, month, year] = ddmmyyyy2;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${month}-${day}` };
  }

  // MM/DD/YYYY (americano) ou DD/MM com 1-2 dígitos
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(inputStr);
  if (mmddyyyy) {
    const [, a, b, year] = mmddyyyy;
    if (Number(a) > 12) {
      const date = new Date(`${year}-${b}-${a}`); // DD/MM
      if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}` };
    } else if (Number(b) > 12) {
      const date = new Date(`${year}-${a}-${b}`); // MM/DD
      if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}` };
    } else {
      const date = new Date(`${year}-${b}-${a}`); // ambíguo -> DD/MM (BR)
      if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}` };
    }
  }

  // DD.MM.YYYY
  const ddmmyyyy3 = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(inputStr);
  if (ddmmyyyy3) {
    const [, day, month, year] = ddmmyyyy3;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return { valid: true, dateStr: `${year}-${month}-${day}` };
  }

  // ISO 8601 / fallback nativo
  const date = new Date(inputStr);
  if (!isNaN(date.getTime())) return { valid: true, dateStr: toYmd(date) };

  return { valid: false, dateStr: "" };
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
