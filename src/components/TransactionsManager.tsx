/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Income, Expense, Person, IncomeCategory, ExpenseCategory, PaymentMethod } from "../types";
import { Plus, Trash2, Edit2, Search, Filter, ArrowUpRight, ArrowDownRight, Tag, AlertCircle, X, Lock, Eye, EyeOff } from "lucide-react";

interface TransactionsManagerProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  subcategories: SubcategoryItem[];
  onSaveSubcategories: (newSubs: SubcategoryItem[]) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateIncome: (income: Income) => void;
  onUpdateExpense: (expense: Expense) => void;
  onBulkUpdateExpenses: (updatedList: Expense[]) => void;
  onBulkDeleteExpenses: (idsToDelete: string[]) => void;
  onBulkUpdateIncomes: (updatedList: Income[]) => void;
  onBulkDeleteIncomes: (idsToDelete: string[]) => void;
}

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salário', 'Freelance', 'Comissão', 'Renda Extra', 'Investimentos', 'Benefícios', 'Outros'
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Aluguel', 'Energia', 'Água', 'Internet', 'Mercado', 'Cartão de Crédito', 'Transporte', 'Educação', 'Saúde', 'Lazer', 'Outros'
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Pix', 'Débito', 'Dinheiro', 'Boleto', 'Crédito', 'Transferência'
];

export interface SubcategoryItem {
  id: string;
  type: 'income' | 'expense';
  category: string;
  name: string;
  active?: boolean;
}

const DEFAULT_SUBCATEGORIES: SubcategoryItem[] = [
  // Receitas
  { id: "sub-in-1",  type: "income",  category: "Salário",      name: "Salário Mensal" },
  { id: "sub-in-2",  type: "income",  category: "Salário",      name: "13º Salário" },
  { id: "sub-in-3",  type: "income",  category: "Freelance",    name: "Freelance / Consultoria" },
  { id: "sub-in-4",  type: "income",  category: "Renda Extra",  name: "Renda Extra" },
  { id: "sub-in-5",  type: "income",  category: "Investimentos",name: "Rendimento Investimentos" },
  { id: "sub-in-6",  type: "income",  category: "Benefícios",   name: "Benefício / Auxílio" },

  // Despesas — Moradia
  { id: "sub-ex-1",  type: "expense", category: "Aluguel",          name: "Aluguel Residência" },
  { id: "sub-ex-2",  type: "expense", category: "Energia",          name: "Conta Energia Casa" },
  { id: "sub-ex-3",  type: "expense", category: "Água",             name: "Conta Água / Saneamento" },
  { id: "sub-ex-4",  type: "expense", category: "Internet",         name: "Internet Casa" },
  { id: "sub-ex-5",  type: "expense", category: "Internet",         name: "Plano Celular" },

  // Despesas — Alimentação
  { id: "sub-ex-6",  type: "expense", category: "Mercado",          name: "Supermercado" },
  { id: "sub-ex-7",  type: "expense", category: "Mercado",          name: "Feira / Hortifruti" },
  { id: "sub-ex-8",  type: "expense", category: "Mercado",          name: "Padaria / Açougue" },

  // Despesas — Transporte
  { id: "sub-ex-9",  type: "expense", category: "Transporte",       name: "Combustível" },
  { id: "sub-ex-10", type: "expense", category: "Transporte",       name: "Transporte Público" },
  { id: "sub-ex-11", type: "expense", category: "Transporte",       name: "Aplicativo (Uber/99)" },
  { id: "sub-ex-12", type: "expense", category: "Transporte",       name: "Manutenção Veículo" },

  // Despesas — Saúde
  { id: "sub-ex-13", type: "expense", category: "Saúde",            name: "Farmácia" },
  { id: "sub-ex-14", type: "expense", category: "Saúde",            name: "Consulta Médica" },
  { id: "sub-ex-15", type: "expense", category: "Saúde",            name: "Plano de Saúde" },
  { id: "sub-ex-16", type: "expense", category: "Saúde",            name: "Academia / Esportes" },

  // Despesas — Educação
  { id: "sub-ex-17", type: "expense", category: "Educação",         name: "Escola / Colégio" },
  { id: "sub-ex-18", type: "expense", category: "Educação",         name: "Faculdade / Curso" },
  { id: "sub-ex-19", type: "expense", category: "Educação",         name: "Material Escolar" },

  // Despesas — Lazer
  { id: "sub-ex-20", type: "expense", category: "Lazer",            name: "Restaurante / Lanchonete" },
  { id: "sub-ex-21", type: "expense", category: "Lazer",            name: "Cinema / Entretenimento" },
  { id: "sub-ex-22", type: "expense", category: "Lazer",            name: "Assinatura Streaming" },
  { id: "sub-ex-23", type: "expense", category: "Lazer",            name: "Viagem / Passeio" },

  // Despesas — Cartão e Outros
  { id: "sub-ex-24", type: "expense", category: "Cartão de Crédito",name: "Fatura Cartão de Crédito" },
  { id: "sub-ex-25", type: "expense", category: "Outros",           name: "Outros Gastos" },
];

export default function TransactionsManager({
  people, incomes, expenses,
  subcategories: subcategoriesProp, onSaveSubcategories,
  onAddIncome, onAddExpense, onDeleteIncome, onDeleteExpense, onUpdateIncome, onUpdateExpense,
  onBulkUpdateExpenses, onBulkDeleteExpenses, onBulkUpdateIncomes, onBulkDeleteIncomes
}: TransactionsManagerProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes'>('expenses');
  
  // Deletion confirmation states for incomes/expenses
  const [deleteConfirmType, setDeleteConfirmType] = useState<'income' | 'expense' | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "fixed" | "variable">("all");

  // Edit State for transactions
  const [editingItem, setEditingItem] = useState<Income | Expense | null>(null);
  const [editingType, setEditingType] = useState<'income' | 'expense' | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPersonId, setEditPersonId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsFixed, setEditIsFixed] = useState(true);
  const [editIsRecurring, setEditIsRecurring] = useState(true);
  const [editRecurrence, setEditRecurrence] = useState<'mensal' | 'anual' | 'eventual'>('mensal');
  const [editNotes, setEditNotes] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Pix');
  
  // Subcategories persistent state
  // Subcategorias vêm do App.tsx (por usuário, salvas no Firestore)
  const subcategories = subcategoriesProp.length > 0 ? subcategoriesProp : DEFAULT_SUBCATEGORIES;
  const saveSubcategories = onSaveSubcategories;

  // Subcategories Modal States
  const [showSubcatMgmt, setShowSubcatMgmt] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [newSubcatType, setNewSubcatType] = useState<'income' | 'expense'>('expense');
  const [newSubcatCategory, setNewSubcatCategory] = useState<string>('Mercado');

  // Editing subcategory item states
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editSubType, setEditSubType] = useState<'income' | 'expense'>('expense');

  // Subcategory deletion flow states
  const [subcatToDelete, setSubcatToDelete] = useState<SubcategoryItem | null>(null);
  const [deleteSubcatState, setDeleteSubcatState] = useState<'decision' | 'confirm_delete_all' | 'confirm_migrate'>('decision');
  const [migrationTargetSubId, setMigrationTargetSubId] = useState("");

  const handleTypeChange = (type: 'income' | 'expense') => {
    setNewSubcatType(type);
    setNewSubcatCategory(type === 'income' ? 'Salário' : 'Mercado');
  };

  // Helper to determine if a category is fixed (Fixo vs Variável)
  const getCategoryNature = (catName: string): boolean => {
    const norm = catName.trim().toLowerCase();
    return [
      'aluguel', 'energia', 'água', 'internet', 'educação',
      'salário', 'benefícios'
    ].includes(norm);
  };

  const [selectedExpenseSubcatId, setSelectedExpenseSubcatId] = useState("");
  const [selectedIncomeSubcatId, setSelectedIncomeSubcatId] = useState("");

  // States of Incomes Form
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomePerson, setIncomePerson] = useState(people[0]?.id || "");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Salário');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeIsFixed, setIncomeIsFixed] = useState(true);
  const [incomeIsRecurring, setIncomeIsRecurring] = useState(true);
  const [incomeRecurrence, setIncomeRecurrence] = useState<'mensal' | 'anual' | 'eventual'>('mensal');
  const [incomeNotes, setIncomeNotes] = useState("");

  // States of Expenses Form
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePerson, setExpensePerson] = useState(people[0]?.id || "");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Mercado');
  const [customExpenseCategory, setCustomExpenseCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseIsFixed, setExpenseIsFixed] = useState(false);
  const [expenseIsRecurring, setExpenseIsRecurring] = useState(false);
  const [expenseRecurrence, setExpenseRecurrence] = useState<'mensal' | 'anual' | 'eventual'>('mensal');
  const [expensePayMethod, setExpensePayMethod] = useState<PaymentMethod>('Pix');
  const [expenseNotes, setExpenseNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  const handleAddIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncomeSubcatId) {
      setErrorMsg("Selecione uma subcategoria para a receita. Clique em 'Configurar Subcategorias' para criar novas.");
      return;
    }
    const parsedAmount = parseFloat(incomeAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("O valor da receita precisa ser um número maior que zero.");
      return;
    }
    if (!incomePerson) {
      setErrorMsg("Selecione um integrante familiar responsável.");
      return;
    }

    const categorySelected = incomeCategory;

    onAddIncome({
      personId: incomePerson,
      category: categorySelected,
      amount: parsedAmount,
      date: incomeDate,
      notes: incomeNotes || undefined,
      isFixed: incomeIsFixed,
      isRecurring: incomeIsRecurring,
      recurrence: incomeRecurrence
    });

    // Reset Form
    setIncomeAmount("");
    setIncomeNotes("");
    setIncomeCategory("Salário");
    setIncomeIsFixed(true);
    setSelectedIncomeSubcatId("");
    setErrorMsg("");
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseSubcatId) {
      setErrorMsg("Selecione uma subcategoria para o gasto. Clique em 'Configurar Subcategorias' para criar novas.");
      return;
    }
    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("O valor do gasto precisa ser um número maior que zero.");
      return;
    }
    if (!expensePerson) {
      setErrorMsg("Selecione um integrante familiar responsável.");
      return;
    }

    const categorySelected = expenseCategory === 'Outros' && customExpenseCategory.trim() 
      ? customExpenseCategory.trim() 
      : expenseCategory;

    onAddExpense({
      name: expenseName,
      category: categorySelected,
      isFixed: expenseIsFixed,
      amount: parsedAmount,
      date: expenseDate,
      personId: expensePerson,
      notes: expenseNotes || undefined,
      isRecurring: expenseIsRecurring,
      recurrence: expenseRecurrence,
      paymentMethod: expensePayMethod
    });

    // Reset Form
    setExpenseName("");
    setExpenseAmount("");
    setCustomExpenseCategory("");
    setExpenseCategory("Mercado");
    setExpenseIsFixed(false);
    setSelectedExpenseSubcatId("");
    setExpenseNotes("");
    setErrorMsg("");
  };

  const getPersonName = (id: string) => {
    const p = people.find(person => person.id === id);
    return p ? p.name : "Ninguém";
  };

  const getPersonColor = (id: string) => {
    const p = people.find(person => person.id === id);
    return p ? p.color : "#d4d4d8";
  };

  const startEditExpense = (exp: Expense) => {
    setEditingItem(exp);
    setEditingType('expense');
    setEditName(exp.name);
    setEditAmount(exp.amount.toString());
    setEditPersonId(exp.personId);
    setEditCategory(exp.category);
    setEditDate(exp.date);
    setEditIsFixed(exp.isFixed);
    setEditIsRecurring(exp.isRecurring || false);
    setEditRecurrence(exp.recurrence || 'mensal');
    setEditNotes(exp.notes || "");
    setEditPaymentMethod(exp.paymentMethod || 'Pix');
  };

  const startEditIncome = (inc: Income) => {
    setEditingItem(inc);
    setEditingType('income');
    setEditName("");
    setEditAmount(inc.amount.toString());
    setEditPersonId(inc.personId);
    setEditCategory(inc.category);
    setEditDate(inc.date);
    setEditIsFixed(inc.isFixed || false);
    setEditIsRecurring(inc.isRecurring || false);
    setEditRecurrence(inc.recurrence || 'mensal');
    setEditNotes(inc.notes || "");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingType) return;

    if (editingType === 'expense') {
      const updatedExpense: Expense = {
        ...editingItem,
        name: editName.trim(),
        amount: parseFloat(editAmount) || 0,
        personId: editPersonId,
        category: editCategory,
        date: editDate,
        isFixed: editIsFixed,
        isRecurring: editIsRecurring,
        recurrence: editRecurrence,
        notes: editNotes.trim(),
        paymentMethod: editPaymentMethod,
      } as Expense;
      onUpdateExpense(updatedExpense);
    } else {
      const updatedIncome: Income = {
        ...editingItem,
        amount: parseFloat(editAmount) || 0,
        personId: editPersonId,
        category: editCategory,
        date: editDate,
        isFixed: editIsFixed,
        isRecurring: editIsRecurring,
        recurrence: editRecurrence,
        notes: editNotes.trim(),
      } as Income;
      onUpdateIncome(updatedIncome);
    }

    // Reset edit state
    setEditingItem(null);
    setEditingType(null);
  };

  // Filtered lists
  const filteredIncomes = incomes.filter(inc => {
    const matchesSearch = searchTerm.trim() === "" || [
      inc.category,
      inc.notes || "",
      getPersonName(inc.personId)
    ].some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === "all" || inc.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesPerson = filterPerson === "all" || inc.personId === filterPerson;
    const matchesType = filterType === "all" || 
      (filterType === "fixed" && inc.isFixed) ||
      (filterType === "variable" && !inc.isFixed);

    return matchesSearch && matchesCategory && matchesPerson && matchesType;
  });

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = searchTerm.trim() === "" || [
      exp.name,
      exp.category,
      exp.notes || "",
      getPersonName(exp.personId)
    ].some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === "all" || exp.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesPerson = filterPerson === "all" || exp.personId === filterPerson;
    const matchesType = filterType === "all" || 
      (filterType === "fixed" && exp.isFixed) ||
      (filterType === "variable" && !exp.isFixed);

    return matchesSearch && matchesCategory && matchesPerson && matchesType;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in p-1">
      
      {/* Forms Segment (Left) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Toggle Form Tabs */}
        <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200">
          <button
            onClick={() => { setActiveTab('expenses'); setErrorMsg(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'expenses' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-950'}`}
          >
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
            Nova Despesa
          </button>
          <button
            onClick={() => { setActiveTab('incomes'); setErrorMsg(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'incomes' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-950'}`}
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            Nova Receita (Renda)
          </button>
        </div>

        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${activeTab === 'expenses' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {activeTab === 'expenses' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <h3 className="text-sm font-semibold text-zinc-950">
              {activeTab === 'expenses' ? 'Cadastrar Lançamento de Gastos' : 'Cadastrar Lançamento de Receitas'}
            </h3>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Render Despesas Form */}
          {activeTab === 'expenses' ? (
            <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">Subcategoria do Gasto</label>
                    <button
                      type="button"
                      onClick={() => {
                        handleTypeChange('expense');
                        setNewSubcatCategory(expenseCategory);
                        setShowSubcatMgmt(true);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-950 font-semibold underline flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3 text-rose-500" /> Configurar Subcategorias
                    </button>
                  </div>
                  <select
                    value={selectedExpenseSubcatId}
                    aria-label="Selecionar Subcategoria"
                    onChange={e => {
                      const subId = e.target.value;
                      setSelectedExpenseSubcatId(subId);
                      if (subId) {
                        const selectedSub = subcategories.find(s => s.id === subId);
                        if (selectedSub) {
                          setExpenseName(selectedSub.name);
                          setExpenseCategory(selectedSub.category as any);
                          setExpenseIsFixed(getCategoryNature(selectedSub.category));
                        }
                      } else {
                        setExpenseName("");
                      }
                    }}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans text-zinc-700"
                  >
                    <option value="">Selecione uma subcategoria...</option>
                    {EXPENSE_CATEGORIES.map(cat => {
                      const subsInCat = subcategories.filter(sub => sub.type === 'expense' && sub.category === cat && sub.active !== false);
                      if (subsInCat.length === 0) return null;
                      return (
                        <optgroup key={cat} label={cat}>
                          {subsInCat.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {subcategories.filter(s => s.type === 'expense' && s.active !== false).length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Nenhuma subcategoria cadastrada. Clique em <strong>Configurar Subcategorias</strong> para adicionar.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Categoria</label>
                  <select
                    value={expenseCategory}
                    disabled={!!selectedExpenseSubcatId}
                    onChange={e => {
                      const newCat = e.target.value as any;
                      setExpenseCategory(newCat);
                      setExpenseIsFixed(getCategoryNature(newCat));
                    }}
                    className={`w-full text-xs border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 transition-all ${
                      selectedExpenseSubcatId ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed font-medium' : 'bg-white text-zinc-800'
                    }`}
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {selectedExpenseSubcatId && (
                    <span className="text-[9px] text-zinc-400 mt-1 block font-sans">
                      🔒 Vinculada à subcategoria selecionada.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Responsável</label>
                  <select
                    value={expensePerson}
                    onChange={e => setExpensePerson(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                  >
                    <option value="">Selecione...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Category input if other is selected */}
              {expenseCategory === 'Outros' && (
                <div className="animate-fade-in font-sans">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Nome da Categoria customizada</label>
                  <input
                    type="text"
                    value={customExpenseCategory}
                    onChange={e => setCustomExpenseCategory(e.target.value)}
                    placeholder="Ex: Petshop ou Academia"
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              {/* Form of Payment (Pix, Deb, Credit etc) */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={expensePayMethod}
                    onChange={e => setExpensePayMethod(e.target.value as any)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                  >
                    {PAYMENT_METHODS.map(pay => (
                      <option key={pay} value={pay}>{pay}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Tipo de Despesa</label>
                  <div className="flex items-center gap-2 mt-1">
                    {expenseIsFixed ? (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-extrabold bg-zinc-950 text-white rounded-lg shadow-xs border border-zinc-900 h-[38px] font-sans">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-450 shrink-0"></span>
                        Gasto Fixo (Permanente)
                      </span>
                    ) : (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-extrabold bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200 h-[38px] font-sans">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"></span>
                        Gasto Variável (Permanente)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recurrence parameters */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">Este gasto se repete de forma recorrente?</span>
                  <input
                    type="checkbox"
                    checked={expenseIsRecurring}
                    onChange={e => setExpenseIsRecurring(e.target.checked)}
                    className="h-4 w-4 accent-zinc-950"
                  />
                </div>
                {expenseIsRecurring && (
                  <div className="animate-fade-in grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
                    <select
                      value={expenseRecurrence}
                      onChange={e => setExpenseRecurrence(e.target.value as any)}
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="mensal">Mensalmente</option>
                      <option value="anual">Anualmente</option>
                      <option value="eventual">Eventualmente</option>
                    </select>
                    <span className="text-[10px] text-zinc-400 self-center">O sistema agendará cobranças automáticas.</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Observações / Detalhes (Opcional)</label>
                <textarea
                  value={expenseNotes}
                  onChange={e => setExpenseNotes(e.target.value)}
                  placeholder="Ex: Refere-se às compras da semana de churrasco"
                  rows={2}
                  className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                ></textarea>
              </div>

              <button
                type="submit"
                id="btn-save-expense"
                className="w-full py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors rounded-lg shadow-sm"
              >
                Registrar Despesa
              </button>

            </form>
          ) : (
            // Render Receitas form
            <form onSubmit={handleAddIncomeSubmit} className="space-y-4 font-sans">

              {/* 1. Subcategoria */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">Subcategoria da Receita</label>
                  <button
                    type="button"
                    onClick={() => {
                      handleTypeChange('income');
                      setNewSubcatCategory(incomeCategory);
                      setShowSubcatMgmt(true);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-950 font-semibold underline flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3 text-emerald-500" /> Configurar Subcategorias
                  </button>
                </div>
                <select
                  value={selectedIncomeSubcatId}
                  aria-label="Selecionar Subcategoria de Receita"
                  onChange={e => {
                    const subId = e.target.value;
                    setSelectedIncomeSubcatId(subId);
                    if (subId) {
                      const selectedSub = subcategories.find(s => s.id === subId);
                      if (selectedSub) {
                        setIncomeNotes(selectedSub.name);
                        setIncomeCategory(selectedSub.category as any);
                        setIncomeIsFixed(getCategoryNature(selectedSub.category));
                      }
                    } else {
                      setIncomeNotes("");
                    }
                  }}
                  className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 text-zinc-700"
                >
                  <option value="">Selecione uma subcategoria...</option>
                  {INCOME_CATEGORIES.map(cat => {
                    const subsInCat = subcategories.filter(sub => sub.type === 'income' && sub.category === cat && sub.active !== false);
                    if (subsInCat.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat}>
                        {subsInCat.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                {subcategories.filter(s => s.type === 'income' && s.active !== false).length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Nenhuma subcategoria cadastrada. Clique em <strong>Configurar Subcategorias</strong> para adicionar.
                  </p>
                )}
              </div>

              {/* 2. Valor + Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={incomeAmount}
                    onChange={e => setIncomeAmount(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Data de Entrada</label>
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={e => setIncomeDate(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>
              </div>

              {/* 3. Familiar Beneficiado */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Familiar Beneficiado</label>
                <select
                  value={incomePerson}
                  onChange={e => setIncomePerson(e.target.value)}
                  className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                >
                  <option value="">Selecione...</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
                  ))}
                </select>
              </div>

              {/* 4. Recorrência */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">Este fluxo de renda se repete todo mês?</span>
                  <input
                    type="checkbox"
                    checked={incomeIsRecurring}
                    onChange={e => setIncomeIsRecurring(e.target.checked)}
                    className="h-4 w-4 accent-zinc-950"
                  />
                </div>
                {incomeIsRecurring && (
                  <div className="animate-fade-in grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
                    <select
                      value={incomeRecurrence}
                      onChange={e => setIncomeRecurrence(e.target.value as any)}
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="mensal">Mensalmente</option>
                      <option value="anual">Anualmente</option>
                      <option value="eventual">Eventualmente</option>
                    </select>
                    <span className="text-[10px] text-zinc-400 self-center">Automatiza o lançamento desta renda.</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="btn-save-income"
                className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors rounded-lg shadow-sm"
              >
                Registrar Receita
              </button>

            </form>
          )}

        </div>
      </div>

      {/* Historical Ledgers (Right - 7 Columns) */}
      <div className="lg:col-span-7 space-y-5">
        
        {/* Barra de Filtro e Busca de Lançamentos */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-zinc-500" />
              Filtrar Lançamentos
            </h4>
            {(searchTerm !== "" || filterCategory !== "all" || filterPerson !== "all" || filterType !== "all") && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterPerson("all");
                  setFilterType("all");
                }}
                className="text-[10px] text-zinc-400 hover:text-red-500 font-semibold cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Campo de Busca Livre */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Buscar por descrição, categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-950 rounded-lg bg-zinc-50/50"
              />
            </div>

            {/* Filtro de Integrante */}
            <div>
              <select
                value={filterPerson}
                onChange={e => setFilterPerson(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-950 rounded-lg cursor-pointer"
              >
                <option value="all">Integrantes (Todos)</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Categoria */}
            <div>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-950 rounded-lg cursor-pointer"
              >
                <option value="all">Categoria (Todas)</option>
                <optgroup label="Despesas">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
                <optgroup label="Receitas">
                  {INCOME_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filtro de Tipo (Fixo ou Variável) */}
            <div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-950 rounded-lg cursor-pointer"
              >
                <option value="all">Tipo de Gasto (Todos)</option>
                <option value="fixed">Gasto Fixo / Recorrente</option>
                <option value="variable">Gasto Variável / Eventual</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Despesas Ledger Table */}
        <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              Registro de Despesas ({filteredExpenses.length} de {expenses.length})
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">Totalizadores de débito</span>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[400px] overflow-y-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Nenhuma despesa familiar corresponde aos filtros ativos.
              </div>
            ) : (
              filteredExpenses.map(exp => (
                <div key={exp.id} className="p-3.5 hover:bg-zinc-50 transition-colors flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold text-zinc-700 font-mono shrink-0 bg-rose-50 text-rose-700 h-8 w-8 rounded-full flex items-center justify-center">
                      Ex
                    </span>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-zinc-900 truncate leading-snug">{exp.name}</h5>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                        <span className="px-1.5 py-0.5 bg-zinc-100 font-medium text-zinc-500 rounded">{exp.category}</span>
                        <span>•</span>
                        <span>{new Date(exp.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="px-1 py-0.5 rounded text-[9px] text-white" style={{ backgroundColor: getPersonColor(exp.personId) }}>
                          {getPersonName(exp.personId)}
                        </span>
                        <span>•</span>
                        <span className="text-zinc-500 font-semibold">{exp.paymentMethod}</span>
                        {exp.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-zinc-450 truncate max-w-[120px]" title={exp.notes}>"{exp.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-semibold text-rose-600 font-mono">- R$ {Number(exp.amount).toFixed(2)}</span>
                      <span className="block text-[8px] text-zinc-400 font-medium">{exp.isFixed ? 'Gasto Fixo' : 'Gasto Variável'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditExpense(exp)}
                        className="p-1 px-1.5 text-zinc-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                        title="Editar Despesa"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmType('expense');
                          setDeleteConfirmId(exp.id);
                        }}
                        className="p-1 px-1.5 text-zinc-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Apagar Despesa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {filteredExpenses.length > 0 && (
            <div className="p-4 bg-rose-50 border-t border-rose-100 flex items-center justify-between font-sans">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Geral (Filtrado)</span>
              <span className="text-sm font-black text-rose-700 font-mono">
                R$ {filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Receitas Ledger Table */}
        <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden shadow-xs">
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 flex-row">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Registro de Receitas ({filteredIncomes.length} de {incomes.length})
            </h4>
            <span className="text-[10px] font-mono text-zinc-400">Totalizadores de crédito</span>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto font-sans">
            {filteredIncomes.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Nenhuma receita familiar corresponde aos filtros ativos.
              </div>
            ) : (
              filteredIncomes.map(inc => (
                <div key={inc.id} className="p-3.5 hover:bg-zinc-50 transition-all flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-zinc-700 font-mono shrink-0 bg-emerald-50 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center">
                      Rc
                    </span>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-zinc-900 truncate leading-snug">{inc.category}</h5>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                        <span>Lançamento: {new Date(inc.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="px-1 py-0.5 rounded text-[9px] text-white" style={{ backgroundColor: getPersonColor(inc.personId) }}>
                          {getPersonName(inc.personId)}
                        </span>
                        {inc.isRecurring && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px]">Recorrente</span>
                        )}
                        {inc.notes && (
                          <>
                            <span>•</span>
                            <span className="italic text-zinc-450 truncate max-w-[120px]" title={inc.notes}>"{inc.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-semibold text-emerald-600 font-mono">+ R$ {Number(inc.amount).toFixed(2)}</span>
                      <span className="block text-[8px] text-zinc-400 font-medium">Entrada de Rendimento</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditIncome(inc)}
                        className="p-1 px-1.5 text-zinc-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                        title="Editar Receita"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmType('income');
                          setDeleteConfirmId(inc.id);
                        }}
                        className="p-1 px-1.5 text-zinc-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Apagar Receita"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {filteredIncomes.length > 0 && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between font-sans">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Geral (Filtrado)</span>
              <span className="text-sm font-black text-emerald-700 font-mono">
                R$ {filteredIncomes.reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE GERENCIAMENTO DE SUBCATEGORIAS */}
      {showSubcatMgmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold">Configurar Subcategorias</h3>
                  <p className="text-[10px] text-zinc-400">Padronize nomes e evite duplicados (ex: Proesc vs Proes)</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubcatMgmt(false)}
                className="p-1 px-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Form to Register New Subcategory */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">Cadastrar Novo Registro</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-700 mb-1">Tipo de Fluxo</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTypeChange('expense')}
                        className={`py-1 rounded text-[10px] font-bold border transition-all ${
                          newSubcatType === 'expense' ? 'bg-rose-50 border-rose-200 text-rose-700 font-extrabold' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        Despesa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange('income')}
                        className={`py-1 rounded text-[10px] font-bold border transition-all ${
                          newSubcatType === 'income' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        Receita
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-700 mb-1">Categoria Pai</label>
                    <select
                      value={newSubcatCategory}
                      onChange={e => setNewSubcatCategory(e.target.value)}
                      className="w-full text-xs border border-zinc-200 bg-white rounded p-1.5 focus:outline-none"
                    >
                      {newSubcatType === 'income' ? (
                        INCOME_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      ) : (
                        EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-zinc-700 mb-1">Nome da Subcategoria</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubcatName}
                        onChange={e => setNewSubcatName(e.target.value)}
                        placeholder="Ex: Proesc, Supermercado Assaí, Eletropaulo"
                        className="flex-grow text-xs border border-zinc-200 bg-white rounded p-2 focus:outline-none focus:border-zinc-450 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newSubcatName.trim();
                          if (!trimmed) return;
                          
                          if (subcategories.some(s => s.type === newSubcatType && s.category === newSubcatCategory && s.name.toLowerCase() === trimmed.toLowerCase())) {
                            alert("Esta subcategoria já se encontra cadastrada!");
                            return;
                          }
                          const newItem: SubcategoryItem = {
                            id: "sub-custom-" + Date.now(),
                            type: newSubcatType,
                            category: newSubcatCategory,
                            name: trimmed,
                            active: true
                          };
                          saveSubcategories([...subcategories, newItem]);
                          setNewSubcatName("");
                        }}
                        className="bg-zinc-900 border border-zinc-950 text-white font-bold text-xs px-4 py-2 rounded hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of Registered Subcategories */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">Subcategorias do Lançador ({subcategories.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja realmente restaurar todas as subcategorias para os padrões de fábrica?")) {
                        saveSubcategories(DEFAULT_SUBCATEGORIES);
                      }
                    }}
                    className="text-[9px] text-zinc-400 hover:text-red-500 underline font-medium transition-colors cursor-pointer"
                  >
                    Resetar para o Padrão
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 max-h-[30vh] overflow-y-auto pr-1">
                  {subcategories.map(sub => {
                    if (editingSubId === sub.id) {
                      return (
                        <div key={sub.id} className="py-2.5 flex flex-col gap-2 bg-zinc-50 border border-zinc-200 p-3 rounded-xl my-1 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <select
                              value={editSubType}
                              onChange={e => {
                                const nextType = e.target.value as 'income' | 'expense';
                                setEditSubType(nextType);
                                setEditSubCategory(nextType === 'income' ? 'Salário' : 'Mercado');
                              }}
                              className="text-[10px] font-bold border border-zinc-200 rounded p-1 bg-white text-zinc-700"
                            >
                              <option value="expense">Despesa</option>
                              <option value="income">Receita</option>
                            </select>
                            <select
                              value={editSubCategory}
                              onChange={e => setEditSubCategory(e.target.value)}
                              className="text-[10px] font-semibold border border-zinc-200 rounded p-1 bg-white text-zinc-700 flex-grow"
                            >
                              {editSubType === 'income' ? (
                                INCOME_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))
                              ) : (
                                EXPENSE_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))
                              )}
                            </select>
                          </div>
                          
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text"
                              value={editSubName}
                              onChange={e => setEditSubName(e.target.value)}
                              className="flex-grow text-xs border border-zinc-300 bg-white rounded p-1.5 focus:outline-none focus:border-zinc-500 font-sans font-semibold text-zinc-800"
                              placeholder="Nome da Subcategoria"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = editSubName.trim();
                                if (!trimmed) return;
                                
                                if (subcategories.some(s => s.id !== sub.id && s.type === editSubType && s.category === editSubCategory && s.name.toLowerCase() === trimmed.toLowerCase())) {
                                  alert("Este nome já se encontra cadastrado!");
                                  return;
                                }
                                
                                const oldName = sub.name;
                                const oldCat = sub.category;
                                const oldType = sub.type;

                                const updated = subcategories.map(s => {
                                  if (s.id === sub.id) {
                                    return { ...s, name: trimmed, category: editSubCategory, type: editSubType };
                                  }
                                  return s;
                                });
                                saveSubcategories(updated);

                                // Propagate changes to existing transactions if name matches
                                if (oldType === 'expense' && editSubType === 'expense') {
                                  const toUpdate = expenses
                                    .filter(e => e.name.toLowerCase() === oldName.toLowerCase())
                                    .map(e => ({
                                      ...e,
                                      name: trimmed,
                                      category: editSubCategory,
                                      isFixed: getCategoryNature(editSubCategory)
                                    }));
                                  if (toUpdate.length > 0) {
                                    onBulkUpdateExpenses(toUpdate);
                                  }
                                } else if (oldType === 'income' && editSubType === 'income') {
                                  const toUpdate = incomes
                                    .filter(i => i.notes?.toLowerCase() === oldName.toLowerCase())
                                    .map(i => ({
                                      ...i,
                                      notes: trimmed,
                                      category: editSubCategory,
                                      isFixed: getCategoryNature(editSubCategory)
                                    }));
                                  if (toUpdate.length > 0) {
                                    onBulkUpdateIncomes(toUpdate);
                                  }
                                }

                                setEditingSubId(null);
                              }}
                              className="bg-zinc-950 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubId(null)}
                              className="bg-zinc-150 text-zinc-700 font-medium text-[10px] px-2.5 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={sub.id} className={`py-2 flex items-center justify-between text-xs hover:bg-zinc-50/50 px-1 rounded transition-all ${sub.active === false ? "opacity-55" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 uppercase tracking-wider border ${
                            sub.type === 'income' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
                          }`}>
                            {sub.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                          <span className="text-zinc-400 text-[10px] shrink-0">({sub.category})</span>
                          <span className="text-zinc-800 font-semibold truncate flex items-center gap-1.5">
                            {sub.name}
                            {DEFAULT_SUBCATEGORIES.some(def => def.id === sub.id) && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-300" title="Subcategoria Inicial" />
                            )}
                          </span>
                          {sub.active === false && (
                            <span className="bg-zinc-100 text-zinc-500 text-[8px] font-bold px-1.5 py-0.2 rounded border border-zinc-250 uppercase tracking-wider shrink-0 leading-none py-0.5">
                              Inativa
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = subcategories.map(s => {
                                if (s.id === sub.id) {
                                  return { ...s, active: s.active === false ? true : false };
                                }
                                return s;
                              });
                              saveSubcategories(updated);
                            }}
                            className={`p-1 rounded hover:bg-zinc-100 transition-colors cursor-pointer ${
                              sub.active === false ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-400 hover:text-emerald-600'
                            }`}
                            title={sub.active === false ? "Ativar subcategoria" : "Inativar subcategoria"}
                          >
                            {sub.active === false ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setEditSubName(sub.name);
                              setEditSubCategory(sub.category);
                              setEditSubType(sub.type);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSubcatToDelete(sub);
                              setDeleteSubcatState('decision');
                              setMigrationTargetSubId("");
                            }}
                            className="p-1 text-zinc-300 hover:text-red-500 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {subcategories.length === 0 && (
                    <div className="p-8 text-center text-xs text-zinc-400 italic">
                      Nenhuma subcategoria cadastrada no momento. Adicione novas acima para facilitar os lançamentos.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 text-right flex items-center justify-between text-[10px] text-zinc-400 font-sans">
              <span>* As alterações são memorizadas no navegador.</span>
              <button
                onClick={() => setShowSubcatMgmt(false)}
                className="px-4 py-1.5 bg-zinc-950 text-white font-bold rounded-xl text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Concluir Configuração
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OVERLAY DE SEGURANÇA PARA EXCLUSÃO/MIGRAÇÃO DE SUBCATEGORIA */}
      {subcatToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 bg-zinc-950 text-white flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
              <h3 className="text-sm font-bold">Excluir Subcategoria: {subcatToDelete.name}</h3>
            </div>

            {/* Content based on Affected Lanzamentos */}
            <div className="p-6 space-y-4">
              {(() => {
                const affectedCount = subcatToDelete.type === 'expense'
                  ? expenses.filter(e => e.name.toLowerCase() === subcatToDelete.name.toLowerCase()).length
                  : incomes.filter(i => i.notes?.toLowerCase() === subcatToDelete.name.toLowerCase()).length;
                
                if (affectedCount === 0) {
                  return (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-650 leading-relaxed">
                        Esta subcategoria não possui nenhum lançamento associado atualmente. Você pode excluí-la com segurança.
                      </p>
                      <p className="text-xs font-semibold text-zinc-800">
                        Deseja realmente prosseguir com a exclusão de &quot;{subcatToDelete.name}&quot;?
                      </p>
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubcatToDelete(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = subcategories.filter(s => s.id !== subcatToDelete.id);
                            saveSubcategories(updated);
                            setSubcatToDelete(null);
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-red-650 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Confirmar Exclusão
                        </button>
                      </div>
                    </div>
                  );
                }

                // If transactions exist, we have a decision state
                if (deleteSubcatState === 'decision') {
                  return (
                    <div className="space-y-4">
                      <div className="p-3 bg-rose-50 border border-rose-100 text-rose-950 rounded-xl text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          ⚠️ Existem Lançamentos Vinculados!
                        </p>
                        <p>
                          Esta subcategoria está associada a <strong>{affectedCount} lançamento(s)</strong> na planilha.
                        </p>
                      </div>

                      <p className="text-xs text-zinc-650 leading-relaxed">
                        Escolha uma opção para resolver os lançamentos e poder excluir a subcategoria:
                      </p>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteSubcatState('confirm_migrate');
                            // Pick the first available subcategory of same type as default target, excluding current subcat name
                            const otherSubs = subcategories.filter(s => s.type === subcatToDelete.type && s.id !== subcatToDelete.id);
                            setMigrationTargetSubId(otherSubs[0]?.id || "");
                          }}
                          className="w-full text-left p-3 border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5"
                        >
                          <span className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                            🔄 Migrar lançamentos para outra subcategoria
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Revincula os lançamentos antigos a outra subcategoria ativa.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteSubcatState('confirm_delete_all');
                          }}
                          className="w-full text-left p-3 border border-red-105 hover:border-red-200 bg-red-50/50 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5"
                        >
                          <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                            🗑️ Excluir todos os lançamentos vinculados
                          </span>
                          <span className="text-[10px] text-red-500">
                            Apaga permanentemente os {affectedCount} lançamentos associados de sua planilha.
                          </span>
                        </button>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setSubcatToDelete(null)}
                          className="px-4 py-2 text-xs font-semibold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                }

                if (deleteSubcatState === 'confirm_migrate') {
                  const otherSubs = subcategories.filter(s => s.type === subcatToDelete.type && s.id !== subcatToDelete.id);
                  const selectedTarget = otherSubs.find(s => s.id === migrationTargetSubId);
                  
                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-zinc-700">Selecione o destino de migração:</label>
                        <select
                          value={migrationTargetSubId}
                          onChange={e => setMigrationTargetSubId(e.target.value)}
                          className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                        >
                          <option value="">-- Escolha uma subcategoria --</option>
                          {otherSubs.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-100 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                        Todos os <strong>{affectedCount} lançamento(s)</strong> que hoje apontam para <strong className="text-rose-700">&quot;{subcatToDelete.name}&quot;</strong> serão migrados automaticamente para <strong className="text-emerald-700">&quot;{selectedTarget ? selectedTarget.name : 'subcategoria escolhida'}&quot;</strong>.
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteSubcatState('decision');
                          }}
                          className="px-4 py-2 text-xs font-semibold text-zinc-650 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          disabled={!migrationTargetSubId}
                          onClick={() => {
                            if (!selectedTarget) return;
                            if (confirm(`Deseja realmente migrar os ${affectedCount} lançamentos para "${selectedTarget.name}" e excluir a subcategoria "${subcatToDelete.name}"?`)) {
                              
                              // Migrate real records
                              if (subcatToDelete.type === 'expense') {
                                const toUpdate = expenses
                                  .filter(e => e.name.toLowerCase() === subcatToDelete.name.toLowerCase())
                                  .map(e => ({
                                    ...e,
                                    name: selectedTarget.name,
                                    category: selectedTarget.category,
                                    isFixed: getCategoryNature(selectedTarget.category)
                                  }));
                                if (toUpdate.length > 0) {
                                  onBulkUpdateExpenses(toUpdate);
                                }
                              } else if (subcatToDelete.type === 'income') {
                                const toUpdate = incomes
                                  .filter(i => i.notes?.toLowerCase() === subcatToDelete.name.toLowerCase())
                                  .map(i => ({
                                    ...i,
                                    notes: selectedTarget.name,
                                    category: selectedTarget.category,
                                    isFixed: getCategoryNature(selectedTarget.category)
                                  }));
                                if (toUpdate.length > 0) {
                                  onBulkUpdateIncomes(toUpdate);
                                }
                              }

                              // Remove from Subcat and clean up
                              const updated = subcategories.filter(s => s.id !== subcatToDelete.id);
                              saveSubcategories(updated);
                              setSubcatToDelete(null);
                            }
                          }}
                          className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer ${
                            migrationTargetSubId ? 'bg-zinc-950 hover:bg-zinc-800' : 'bg-zinc-300 cursor-not-allowed'
                          }`}
                        >
                          Confirmar Migração e Exclusão
                        </button>
                      </div>
                    </div>
                  );
                }

                if (deleteSubcatState === 'confirm_delete_all') {
                  return (
                    <div className="space-y-4">
                      <div className="p-3 bg-red-100 border border-red-200 text-red-950 rounded-xl text-xs space-y-1">
                        <p className="font-extrabold flex items-center gap-1 text-red-700 text-xs">
                          ⚠️ AVISO DE EXCLUSÃO DEFINITIVA
                        </p>
                        <p>
                          Esta ação irá deletar <strong>todos os {affectedCount} lançamento(s)</strong> vinculados na sua planilha e excluir a subcategoria &quot;{subcatToDelete.name}&quot;.
                        </p>
                      </div>

                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Os totais gerais, relatórios de despesas e históricos mensais serão recalculados permanentemente.
                      </p>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteSubcatState('decision');
                          }}
                          className="px-4 py-2 text-xs font-semibold text-zinc-650 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`ÚLTIMO AVISO: Deseja realmente APAGAR permanentemente todos os ${affectedCount} lançamentos associados a "${subcatToDelete.name}" e excluir a subcategoria do sistema?`)) {
                              
                              // Delete matching transactions in parent
                              if (subcatToDelete.type === 'expense') {
                                const idsToDelete = expenses
                                  .filter(e => e.name.toLowerCase() === subcatToDelete.name.toLowerCase())
                                  .map(e => e.id);
                                if (idsToDelete.length > 0) {
                                  onBulkDeleteExpenses(idsToDelete);
                                }
                              } else if (subcatToDelete.type === 'income') {
                                const idsToDelete = incomes
                                  .filter(i => i.notes?.toLowerCase() === subcatToDelete.name.toLowerCase())
                                  .map(i => i.id);
                                if (idsToDelete.length > 0) {
                                  onBulkDeleteIncomes(idsToDelete);
                                }
                              }

                              // Remove subcategory
                              const updated = subcategories.filter(s => s.id !== subcatToDelete.id);
                              saveSubcategories(updated);
                              setSubcatToDelete(null);
                            }
                          }}
                          className="px-4 py-2 text-xs font-black text-white bg-red-650 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Sim, Apagar Tudo
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE LANÇAMENTO */}
      {deleteConfirmType && deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">Excluir Lançamento?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Tem certeza de que deseja apagar permanentemente este lançamento do fluxo de caixa? Esta ação removerá o registro dos cálculos e relatórios da planilha.
                </p>
                
                {/* Visual context of the selected transaction */}
                {(() => {
                  const item = deleteConfirmType === 'income' 
                    ? incomes.find(i => i.id === deleteConfirmId) 
                    : expenses.find(e => e.id === deleteConfirmId);
                  
                  if (!item) return null;
                  
                  return (
                    <div className="p-3 bg-zinc-50/80 rounded-xl border border-zinc-150 mt-3 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-sans text-[10px]">Fluxo:</span>
                        <span className={`font-bold ${deleteConfirmType === 'income' ? 'text-emerald-700 font-sans' : 'text-rose-700 font-sans'}`}>
                          {deleteConfirmType === 'income' ? 'Receita (Crédito)' : 'Despesa (Débito)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-sans text-[10px]">Categoria:</span>
                        <span className="text-zinc-700 font-sans font-semibold">{item.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-sans text-[10px]">Valor:</span>
                        <span className="font-bold text-zinc-800">R$ {Number(item.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 font-sans text-[10px]">Data:</span>
                        <span className="text-zinc-600">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmType(null);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmType && deleteConfirmId) {
                    if (deleteConfirmType === 'income') {
                      onDeleteIncome(deleteConfirmId);
                    } else {
                      onDeleteExpense(deleteConfirmId);
                    }
                    setDeleteConfirmType(null);
                    setDeleteConfirmId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE REGISTRO */}
      {editingItem && editingType && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Editar Registro</h3>
                  <p className="text-[10px] text-zinc-400">
                    Alterar as informações do lançamento no fluxo de caixa
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditingType(null);
                }}
                className="p-1 px-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              
              {editingType === 'expense' && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Identificação / Nome do Gasto *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    placeholder="Ex: Supermercado Assaí"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Valor do Lançamento * (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Responsável *</label>
                  <select
                    value={editPersonId}
                    onChange={e => setEditPersonId(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                  >
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Categoria *</label>
                  <select
                    value={editCategory}
                    onChange={e => {
                      const newCat = e.target.value;
                      setEditCategory(newCat);
                      setEditIsFixed(getCategoryNature(newCat));
                    }}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                  >
                    {editingType === 'expense' ? (
                      EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      INCOME_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              {editingType === 'expense' && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Forma de Pagamento *</label>
                  <select
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950 cursor-pointer"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl space-y-3">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">Classificação Avançada</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 select-none opacity-80">
                    <input
                      type="checkbox"
                      checked={editIsFixed}
                      disabled
                      className="rounded border-zinc-300 text-zinc-400 bg-zinc-100 cursor-not-allowed"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-zinc-500 flex items-center gap-1">Recurso Fixo <Lock className="h-2.5 w-2.5 text-zinc-400" /></span>
                      <span className="block text-[9px] text-zinc-400">Estático p/ categoria</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsRecurring}
                      onChange={e => setEditIsRecurring(e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-zinc-800">Agendar Recorrência</span>
                      <span className="block text-[9px] text-zinc-400">Habilitar agendador familiar</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Notas / Observações Adicionais</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Ex: Dividido com cunhado, ou pago à vista"
                  rows={2}
                  className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-zinc-950 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setEditingType(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
