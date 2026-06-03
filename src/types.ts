/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Person {
  id: string;
  name: string;
  avatar: string; // custom avatar template or initial
  gender: 'masculino' | 'feminino' | 'outro';
  relationship: 'principal' | 'conjuge' | 'filho(a)' | 'pai/mae' | 'outro';
  email: string;
  whatsapp: string;
  birthDate?: string;
  color: string; // Tailwind hex color or class name
  active: boolean;
}

export type IncomeCategory =
  | 'Salário'
  | 'Freelance'
  | 'Comissão'
  | 'Renda Extra'
  | 'Investimentos'
  | 'Benefícios'
  | 'Outros';

export interface Income {
  id: string;
  personId: string; // linked to Person
  category: IncomeCategory | string;
  amount: number;
  date: string;
  notes?: string;
  isFixed: boolean; // Fixed or Variable
  isRecurring: boolean;
  recurrence: 'mensal' | 'anual' | 'eventual';
}

export type ExpenseCategory =
  | 'Aluguel'
  | 'Energia'
  | 'Água'
  | 'Internet'
  | 'Mercado'
  | 'Cartão de Crédito'
  | 'Transporte'
  | 'Educação'
  | 'Saúde'
  | 'Lazer'
  | 'Outros';

export type PaymentMethod =
  | 'Pix'
  | 'Débito'
  | 'Dinheiro'
  | 'Boleto'
  | 'Crédito'
  | 'Transferência';

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory | string;
  isFixed: boolean; // Fixed or Variable
  amount: number;
  date: string;
  personId: string; // response person
  notes?: string;
  isRecurring: boolean;
  recurrence: 'mensal' | 'anual' | 'eventual';
  paymentMethod: PaymentMethod;
}

export type AlertLevel = 'conservative' | 'moderate' | 'flexible';

export interface AlertSettings {
  isEnabled: boolean;
  level: AlertLevel;
  customFixedLimit: number; // custom limit % for fixed expenses
  customVariableLimit: number; // custom limit % for variable expenses
  customSavingsTarget: number; // target % for savings
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface FinancialInsight {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  category: string;
  title: string;
  message: string;
}
