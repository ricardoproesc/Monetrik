/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Person, Income, Expense, PaymentMethod } from "../types";
import { 
  TrendingUp, TrendingDown, HelpCircle, DollarSign, Filter, 
  Calendar, Layers, User, Tag, ShoppingBag, PieChart as PieIcon, BarChart2, CheckCircle
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from "recharts";

interface PanoramaGeralProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Preset distinct colors for charting
const CHART_COLORS = ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#ec4899"];

export default function PanoramaGeral({ people, incomes, expenses }: PanoramaGeralProps) {
  
  // Calcula anos disponíveis nos dados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    incomes.forEach(i => years.add(new Date(i.date).getFullYear()));
    expenses.forEach(e => years.add(new Date(e.date).getFullYear()));
    const sorted = Array.from(years).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [incomes, expenses]);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>(() => String(availableYears[0]));
  const [filterPersonId, setFilterPersonId] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All"); // All | Fixed | Variable
  const [filterPeriod, setFilterPeriod] = useState<string>("All"); // All | Specific Month index (0-11)

  // Sincroniza filterYear quando availableYears muda
  useEffect(() => {
    const currentYear = parseInt(filterYear);
    if (!isNaN(currentYear) && !availableYears.includes(currentYear)) {
      setFilterYear(String(availableYears[0]));
    }
  }, [availableYears, filterYear]);

  // Get list of unique categories from both income and expense for filters
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    incomes.forEach(i => cats.add(i.category));
    expenses.forEach(e => cats.add(e.category));
    return Array.from(cats);
  }, [incomes, expenses]);

  // Apply filters to calculate active Incomes & Expenses
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      // 1. Filter Year
      const itemYear = new Date(inc.date).getFullYear().toString();
      if (filterYear !== "All" && itemYear !== filterYear) return false;

      // 2. Filter Person
      if (filterPersonId !== "All" && inc.personId !== filterPersonId) return false;

      // 3. Filter Category
      if (filterCategory !== "All" && inc.category !== filterCategory) return false;

      // 4. Filter Period (Month)
      if (filterPeriod !== "All") {
        const itemMonthIdx = new Date(inc.date).getMonth().toString();
        if (itemMonthIdx !== filterPeriod) return false;
      }

      // 5. Filter Type (Fixed vs Variable)
      if (filterType === "Fixed" && !inc.isFixed) return false;
      if (filterType === "Variable" && inc.isFixed) return false;

      return true;
    });
  }, [incomes, filterYear, filterPersonId, filterCategory, filterType, filterPeriod]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Filter Year
      const itemYear = new Date(exp.date).getFullYear().toString();
      if (filterYear !== "All" && itemYear !== filterYear) return false;

      // 2. Filter Person
      if (filterPersonId !== "All" && exp.personId !== filterPersonId) return false;

      // 3. Filter Category
      if (filterCategory !== "All" && exp.category !== filterCategory) return false;

      // 4. Filter Period (Month)
      if (filterPeriod !== "All") {
        const itemMonthIdx = new Date(exp.date).getMonth().toString();
        if (itemMonthIdx !== filterPeriod) return false;
      }

      // 5. Filter Type (Fixed vs Variable)
      if (filterType === "Fixed" && !exp.isFixed) return false;
      if (filterType === "Variable" && exp.isFixed) return false;

      return true;
    });
  }, [expenses, filterYear, filterPersonId, filterCategory, filterType, filterPeriod]);

  // Math aggregates
  const totalIncomeValue = useMemo(() => {
    return filteredIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredIncomes]);

  const totalExpenseValue = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredExpenses]);

  const netBalance = totalIncomeValue - totalExpenseValue;

  // Monthly breakdown for standard list/annual aggregation tables
  const monthlyDataList = useMemo(() => {
    return MONTHS_PT.map((mName, index) => {
      // Incomes in this month
      const monthlyIn = incomes.filter(inc => {
        const d = new Date(inc.date);
        const y = d.getFullYear().toString();
        const m = d.getMonth();
        return (filterYear === "All" || y === filterYear) && m === index;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      // Expenses in this month
      const monthlyOut = expenses.filter(exp => {
        const d = new Date(exp.date);
        const y = d.getFullYear().toString();
        const m = d.getMonth();
        return (filterYear === "All" || y === filterYear) && m === index;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      return {
        monthName: mName,
        receita: monthlyIn,
        despesa: monthlyOut,
        saldo: monthlyIn - monthlyOut,
      };
    });
  }, [incomes, expenses, filterYear]);

  // Aggregate values by category for Expense Pie Chart
  const expenseCategoryAggregation = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(categoryMap).map(([cat, val]) => ({
      name: cat,
      value: parseFloat(val.toFixed(2))
    })).sort((a,b) => b.value - a.value);
  }, [filteredExpenses]);

  // Aggregate values by fixed vs variable for secondary pie chart
  const fixedVsVariableAggregation = useMemo(() => {
    let fixedTotal = 0;
    let variableTotal = 0;
    filteredExpenses.forEach(exp => {
      if (exp.isFixed) {
        fixedTotal += Number(exp.amount);
      } else {
        variableTotal += Number(exp.amount);
      }
    });
    return [
      { name: 'Fixas (Essencial)', value: parseFloat(fixedTotal.toFixed(2)), color: '#3b82f6' },
      { name: 'Variáveis (Lazer)', value: parseFloat(variableTotal.toFixed(2)), color: '#f59e0b' }
    ].filter(i => i.value > 0);
  }, [filteredExpenses]);

  const getPersonName = (id: string) => {
    const p = people.find(person => person.id === id);
    return p ? p.name : "Todos";
  };

  const clearAllFilters = () => {
    setFilterYear(String(availableYears[0]));
    setFilterPersonId("All");
    setFilterCategory("All");
    setFilterType("All");
    setFilterPeriod("All");
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Filtering Control Bar */}
      <div className="border border-zinc-200 rounded-2xl bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-zinc-600" id="icon-general-filter" />
            Filtros Consolidados do Panorama
          </h3>
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-950 flex items-center gap-1 cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Ano Base</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
              <option value="All">Todos os Anos</option>
            </select>
          </div>

          {/* Member/Person Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Membro Responsável</label>
            <select
              value={filterPersonId}
              onChange={e => setFilterPersonId(e.target.value)}
              className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none"
            >
              <option value="All">Apenas da Família Completa</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.relationship})</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Por Categoria</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none"
            >
              <option value="All">Todas as Categorias</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Type Fixed vs Variable Filter */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tipo de Gasto</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none"
            >
              <option value="All">Gasto Fixo & Variável</option>
              <option value="Fixed">Apenas Fixas</option>
              <option value="Variable">Apenas Variáveis (Lazer)</option>
            </select>
          </div>

          {/* Period (Month) Filter */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mês Base</label>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2 focus:outline-none"
            >
              <option value="All">Ano Completo</option>
              {MONTHS_PT.map((m, idx) => (
                <option key={idx} value={idx.toString()}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Dynamic Banner */}
      <div className="border border-zinc-250 bg-gradient-to-br from-zinc-500/10 to-transparent rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Métricas em Tempo Real</span>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 font-sans">Seu Dashboard Consolidado</h2>
          <p className="text-xs text-zinc-500 mt-1">Comparativos anuais e mensais calculados com base em boas práticas (50/30/20).</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-500 font-sans">Mês Ativo de Referência:</span>
          <span className="px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-semibold font-mono shadow-xs">
            {filterPeriod !== "All" ? MONTHS_PT[Number(filterPeriod)] : "Ano Todo"} {filterYear !== "All" ? filterYear : ""}
          </span>
        </div>
      </div>

      {/* Aggregated Performance Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Receita Card */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-2 hover:shadow-2xs transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Fluxos de Receita</span>
            <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div>
            <span className="block text-2xl font-semibold font-mono text-zinc-950">
              R$ {totalIncomeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-1">Créditos de renda recebidos</span>
          </div>
        </div>

        {/* Despesas Card */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-2 hover:shadow-2xs transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Lançamento de Despesa</span>
            <span className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </span>
          </div>
          <div>
            <span className="block text-2xl font-semibold font-mono text-zinc-950">
              R$ {totalExpenseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-1">Débitos de gastos incorridos</span>
          </div>
        </div>

        {/* Saldo Líquido Card */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-2 hover:shadow-2xs transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Saldo Disponível no Bolso</span>
            <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${netBalance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div>
            <span className={`block text-2xl font-semibold font-mono ${netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-1">Discrepância livre de saldo residual</span>
          </div>
        </div>

      </div>

      {/* Charts Grid Row (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Month Evolution Line Chart (Credits vs Debits) */}
        <div className="lg:col-span-8 border border-zinc-200 rounded-2xl bg-white p-5 space-y-4 shadow-xs">
          <div>
            <h4 className="text-sm font-semibold text-zinc-950">Evolução Mensal Comparativa (Rendimento vs Gastos)</h4>
            <p className="text-xs text-zinc-400 mt-1">Curva de captação financeira e quitação de dívidas ao longo dos meses.</p>
          </div>

          <div className="h-[280px] w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDataList} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                <XAxis dataKey="monthName" tick={{ fill: '#71717A' }} axisLine={false} />
                <YAxis tick={{ fill: '#71717A' }} axisLine={false} />
                <Tooltip formatter={(value: any) => [`R$ ${value.toFixed(2)}`, '']} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />
                <Line type="monotone" dataKey="receita" name="Rendimento Total" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="despesa" name="Despesa Total" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Pie Category Distribution */}
        <div className="lg:col-span-4 border border-zinc-200 rounded-2xl bg-white p-5 space-y-4 shadow-xs">
          <div>
            <h4 className="text-sm font-semibold text-zinc-950">Repartição de Despesas</h4>
            <p className="text-xs text-zinc-400 mt-1">Fatia das despesas familiares por categoria ativa.</p>
          </div>

          {expenseCategoryAggregation.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-xs text-zinc-400 text-center p-4">
              Sem dados suficientes de gastos para exibir representação percentual.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[200px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryAggregation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseCategoryAggregation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with percent representation */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-600 max-h-[100px] overflow-y-auto pr-1">
                {expenseCategoryAggregation.slice(0, 6).map((item, index) => {
                  const pct = totalExpenseValue > 0 ? (item.value / totalExpenseValue) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                      <span className="truncate font-medium">{item.name}:</span>
                      <span className="font-semibold text-zinc-950 font-mono shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Grid view of general ledger summaries (Fixed vs Variable and Category stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Proporção Fixo x Variável Card */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-4 shadow-xs">
          <h4 className="text-sm font-semibold text-zinc-950">Estrutura de Custo Mensal (Fixas vs Variáveis)</h4>
          
          <div className="space-y-3">
            {fixedVsVariableAggregation.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">Adicione despesas para comparar fixos vs variáveis.</p>
            ) : (
              <>
                <div className="h-[120px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fixedVsVariableAggregation}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        dataKey="value"
                      >
                        {fixedVsVariableAggregation.map((entry, index) => (
                          <Cell key={`cell-fv-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `R$ ${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-around text-xs pt-2">
                  {fixedVsVariableAggregation.map(item => {
                    const ratio = totalExpenseValue > 0 ? (item.value / totalExpenseValue) * 100 : 0;
                    return (
                      <div key={item.name} className="text-center">
                        <span className="text-[10px] text-zinc-400 block">{item.name}</span>
                        <strong className="text-zinc-950 font-mono text-base block mt-0.5">R$ {item.value.toFixed(2)}</strong>
                        <span className="text-[10px] font-bold text-zinc-700 bg-zinc-50 border border-zinc-100 rounded px-1.5 py-0.5 mt-1 block w-fit mx-auto">{ratio.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custo Familiar Medio & Previsões */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-zinc-950">Previsões & Estatísticas de Crescimento</h4>
            <p className="text-xs text-zinc-400 mt-1">Cálculo de média móvel e projeção matemática simples baseada em dados reais cadastrados.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <div>
                <span className="font-semibold text-zinc-950 block">Média Geral de Gastos por Mês</span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block leading-none">Média aritmética anual do ano atual</span>
              </div>
              <span className="font-mono font-bold text-zinc-900">
                R$ {((expenses.reduce((acc,curr) => acc + curr.amount, 0)) / Math.max(new Set(expenses.map(e => new Date(e.date).getMonth())).size, 1)).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <div>
                <span className="font-semibold text-zinc-950 block">Projeção Próximos 6 Meses</span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block leading-none">Projeção agregada de reserva com saldo livre residual</span>
              </div>
              <span className={`font-mono font-bold ${(incomes.reduce((acc,curr)=>acc+curr.amount, 0) - expenses.reduce((acc,curr)=>acc+curr.amount, 0)) >= 0 ? "text-emerald-600" : "text-rose-650"}`}>
                R$ {((incomes.reduce((acc,curr)=>acc+curr.amount, 0) - expenses.reduce((acc,curr)=>acc+curr.amount, 0)) * 6).toFixed(2)}
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 italic text-center pt-2">
              ⚠️ Nota: Projeções iniciais lineares. Ative a IA do assistente FinancIA para previsões mais precisas de propensão de gastos futuros.
            </p>
          </div>
        </div>

      </div>

      {/* Tabela do Panorama Geral (Anual) */}
      <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden shadow-xs pt-1">
        <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-zinc-950"></span>
            Tabela Analítica Mensal do Ano {filterYear}
          </h4>
          <span className="text-[10px] font-mono text-zinc-400">Totalizadores consolidados</span>
        </div>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left divide-y divide-zinc-200">
            <thead className="bg-zinc-50 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-4">Período Mensal</th>
                <th className="p-4 text-right">Crédito (Soma Receita)</th>
                <th className="p-4 text-right">Débito (Soma Despesa)</th>
                <th className="p-4 text-right">Disponível (Saldo)</th>
                <th className="p-4 text-center">Status de Saúde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {monthlyDataList.map((mRow) => (
                <tr key={mRow.monthName} className="hover:bg-zinc-50">
                  <td className="p-4 font-semibold text-zinc-900">{mRow.monthName}</td>
                  <td className="p-4 text-right text-emerald-600 font-mono">+ R$ {mRow.receita.toFixed(2)}</td>
                  <td className="p-4 text-right text-rose-600 font-mono">- R$ {mRow.despesa.toFixed(2)}</td>
                  <td className={`p-4 text-right font-semibold font-mono ${mRow.saldo >= 0 ? "text-emerald-700" : "text-rose-700"}`} id={`saldo-mensal-${mRow.monthName}`}>
                    R$ {mRow.saldo.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    {mRow.receita === 0 && mRow.despesa === 0 ? (
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded text-[9px] font-bold">Sem Registro</span>
                    ) : mRow.saldo >= 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold">Equilibrado</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[9px] font-bold">Deficitário</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* Grand Totals Footer row */}
              <tr className="bg-zinc-50/70 font-bold border-t border-zinc-200">
                <td className="p-4 text-zinc-950">TOTAL DO ANO</td>
                <td className="p-4 text-right text-emerald-700">+ R$ {monthlyDataList.reduce((acc,curr) => acc + curr.receita, 0).toFixed(2)}</td>
                <td className="p-4 text-right text-rose-700">- R$ {monthlyDataList.reduce((acc,curr) => acc + curr.despesa, 0).toFixed(2)}</td>
                <td className={`p-4 text-right ${netBalance >= 0 ? "text-emerald-800" : "text-rose-800"}`}>R$ {netBalance.toFixed(2)}</td>
                <td className="p-4 text-center">
                  {netBalance >= 0 ? (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] flex items-center gap-1 justify-center w-fit mx-auto font-sans font-bold shadow-xs">
                      <CheckCircle className="h-3 w-3" /> Metas OK
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-sans font-bold shadow-xs">Déficit</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
