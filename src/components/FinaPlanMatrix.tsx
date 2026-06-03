/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Person, Income, Expense, IncomeCategory, ExpenseCategory } from "../types";
import { 
  FileSpreadsheet, Download, RefreshCw, Calendar, 
  ChevronRight, Sparkles, TrendingUp, TrendingDown, HelpCircle, Info
} from "lucide-react";

interface FinaPlanMatrixProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function FinaPlanMatrix({ people, incomes, expenses }: FinaPlanMatrixProps) {
  // Calcula anos disponíveis nos dados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    incomes.forEach(i => years.add(new Date(i.date).getFullYear()));
    expenses.forEach(e => years.add(new Date(e.date).getFullYear()));
    const sorted = Array.from(years).sort();
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [incomes, expenses]);

  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0]);
  const [groupBy, setGroupBy] = useState<"category" | "name">("category");

  // Sincroniza selectedYear quando availableYears muda
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Income aggregates for FinaPlan style
  const receiptsData = useMemo(() => {
    return people.map(person => {
      // Find unique income labels for this person
      const personIncomes = incomes.filter(i => i.personId === person.id);
      
      const labels = new Set<string>();
      personIncomes.forEach(i => {
        labels.add(groupBy === "category" ? i.category : (i.notes || i.category));
      });
      
      const rowItems = Array.from(labels).map(label => {
        const monthlyValues = Array(12).fill(0);
        let totalSum = 0;
        
        personIncomes.forEach(i => {
          const itemLabel = groupBy === "category" ? i.category : (i.notes || i.category);
          if (itemLabel === label) {
            const dateObj = new Date(i.date);
            if (dateObj.getFullYear() === selectedYear) {
              const month = dateObj.getMonth();
              monthlyValues[month] += Number(i.amount) || 0;
              totalSum += Number(i.amount) || 0;
            }
          }
        });

        return {
          label,
          monthlyValues,
          total: totalSum
        };
      });

      // Calculate person total row
      const personMonthlyTotals = Array(12).fill(0);
      let personGrandTotal = 0;
      rowItems.forEach(item => {
        item.monthlyValues.forEach((val, mIdx) => {
          personMonthlyTotals[mIdx] += val;
        });
        personGrandTotal += item.total;
      });

      return {
        person,
        rowItems,
        monthlyTotals: personMonthlyTotals,
        grandTotal: personGrandTotal
      };
    }).filter(group => group.rowItems.length > 0 || group.person.active);
  }, [people, incomes, selectedYear, groupBy]);

  // Total Income per month matching selected year (Grand Total)
  const receiptsGrandTotalRow = useMemo(() => {
    const monthlyTotals = Array(12).fill(0);
    let totalAll = 0;
    receiptsData.forEach(pData => {
      pData.monthlyTotals.forEach((val, mIdx) => {
        monthlyTotals[mIdx] += val;
      });
      totalAll += pData.grandTotal;
    });
    return { monthlyTotals, totalAll };
  }, [receiptsData]);

  // Expenses aggregates (Fixed & Variable groups)
  const expensesData = useMemo(() => {
    const groups = [
      { id: "fixed", title: "Fixa", isFixed: true },
      { id: "variable", title: "Variável", isFixed: false }
    ];

    return groups.map(grp => {
      const filteredExps = expenses.filter(e => e.isFixed === grp.isFixed);
      
      // Find unique category or name labels
      const labels = new Set<string>();
      filteredExps.forEach(e => {
        labels.add(groupBy === "category" ? e.category : e.name);
      });

      const rowItems = Array.from(labels).map(label => {
        const monthlyValues = Array(12).fill(0);
        let totalSum = 0;

        filteredExps.forEach(e => {
          const itemLabel = groupBy === "category" ? e.category : e.name;
          if (itemLabel === label) {
            const dateObj = new Date(e.date);
            if (dateObj.getFullYear() === selectedYear) {
              const month = dateObj.getMonth();
              monthlyValues[month] += Number(e.amount) || 0;
              totalSum += Number(e.amount) || 0;
            }
          }
        });

        return {
          label,
          monthlyValues,
          total: totalSum
        };
      }).filter(item => item.total > 0 || groupBy === "category"); // only keep if has entries

      const groupMonthlyTotals = Array(12).fill(0);
      let groupGrandTotal = 0;
      rowItems.forEach(item => {
        item.monthlyValues.forEach((val, mIdx) => {
          groupMonthlyTotals[mIdx] += val;
        });
        groupGrandTotal += item.total;
      });

      return {
        groupId: grp.id,
        groupTitle: grp.title,
        rowItems,
        monthlyTotals: groupMonthlyTotals,
        grandTotal: groupGrandTotal
      };
    });
  }, [expenses, selectedYear, groupBy]);

  // Total Expenses per month matching selected year (Grand Total)
  const expensesGrandTotalRow = useMemo(() => {
    const monthlyTotals = Array(12).fill(0);
    let totalAll = 0;
    expensesData.forEach(gData => {
      gData.monthlyTotals.forEach((val, mIdx) => {
        monthlyTotals[mIdx] += val;
      });
      totalAll += gData.grandTotal;
    });
    return { monthlyTotals, totalAll };
  }, [expensesData]);

  // Neto balance per month (Receita - Despesa)
  const netMonthlyEvolution = useMemo(() => {
    const netMonthly = Array(12).fill(0);
    let netTotal = 0;
    for (let i = 0; i < 12; i++) {
      netMonthly[i] = receiptsGrandTotalRow.monthlyTotals[i] - expensesGrandTotalRow.monthlyTotals[i];
    }
    netTotal = receiptsGrandTotalRow.totalAll - expensesGrandTotalRow.totalAll;
    return { netMonthly, netTotal };
  }, [receiptsGrandTotalRow, expensesGrandTotalRow]);

  // Helper formatter to mimic exact FinaPlan Excel style: - or formatted value (removed R$ to prevent line-wrapping)
  const formatCell = (val: number) => {
    if (val === 0) {
      return <span className="text-zinc-300">-</span>;
    }
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Excel Style Frame Wrapper */}
      <div className="border border-zinc-200 bg-white rounded-3xl overflow-hidden shadow-xs">
        
        {/* Spreadsheet Filter Bar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xs font-sans">
              <span className="text-zinc-500 mr-2 font-medium">Agrupar por:</span>
              <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100">
                <button 
                  onClick={() => setGroupBy("category")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupBy === "category" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950"}`}
                >
                  Categorias
                </button>
                <button 
                  onClick={() => setGroupBy("name")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupBy === "name" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950"}`}
                >
                  Nomes Individuais
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium font-sans">Ano:</span>
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-1.5 py-1 text-[11px] font-mono font-bold rounded-md transition-all ${
                    selectedYear === year 
                      ? "bg-white text-zinc-950 shadow-xs px-2.5" 
                      : "text-zinc-500 hover:text-zinc-950"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Outer Layout containing tables */}
        <div className="p-4 sm:p-6">
          
          {/* Main big Matrix Tables shifted to full width layout */}
          <div className="space-y-8 overflow-x-auto">
            
            {/* 1. SEÇÃO RECEITAS */}
            <div className="space-y-4 min-w-[890px]">
              
              {/* Header block with FinaPlan Green Style */}
              <div className="bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-xs">
                <span className="text-[11px] font-bold font-sans uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  RECEITAS ({selectedYear})
                </span>
                <span className="text-[9px] font-mono opacity-80">Rendimento Familiar Consolidado</span>
              </div>

              {/* SpreadSheet Matrix Table for Incomes */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full border-collapse text-left text-[10.5px] font-mono whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-650 border-b border-zinc-200 font-semibold text-[9px] uppercase">
                      <th className="p-1.5 border-r border-zinc-200 w-[100px] min-w-[100px] max-w-[100px] truncate">Nome</th>
                      <th className="p-1.5 border-r border-zinc-200 w-[110px] min-w-[110px] max-w-[110px] truncate">Receitas</th>
                      {MONTHS_SHORT.map((m, idx) => (
                        <th key={idx} className="p-1.5 border-r border-zinc-200 text-right w-11 min-w-[44px]">{m}</th>
                      ))}
                      <th className="p-1.5 text-right bg-emerald-50 text-emerald-800 font-bold w-20 min-w-[80px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    
                    {receiptsData.map((pData, pIdx) => (
                      <React.Fragment key={pData.person.id}>
                        {/* Person general aggregate header row - Light Green highlight */}
                        <tr className="bg-emerald-50 text-emerald-950 font-bold border-t border-zinc-250">
                          <td className="p-1.5 border-r border-zinc-200 text-zinc-900 font-sans font-bold w-[100px] min-w-[100px] max-w-[100px] truncate">
                            {pData.person.name}
                          </td>
                          <td className="p-1.5 border-r border-zinc-200 text-emerald-800 font-sans italic text-[9.5px] w-[110px] min-w-[110px] max-w-[110px] truncate">
                            Subtotal
                          </td>
                          {pData.monthlyTotals.map((total, mIdx) => (
                            <td key={mIdx} className="p-1.5 border-r border-zinc-200 text-right text-emerald-800">
                              {formatCell(total)}
                            </td>
                          ))}
                          <td className="p-1.5 text-right bg-emerald-100/60 font-bold text-emerald-900 w-20 min-w-[80px]">
                            {formatCell(pData.grandTotal)}
                          </td>
                        </tr>

                        {/* Person individual details rows (categories) */}
                        {pData.rowItems.map((item, itemIdx) => (
                          <tr key={itemIdx} className="hover:bg-zinc-50/50">
                            <td className="p-1.5 border-r border-zinc-150 text-zinc-400 font-sans italic text-[10px] pl-3 w-[100px] min-w-[100px] max-w-[100px] truncate">
                              {pData.person.name.split(" ")[0]}
                            </td>
                            <td className="p-1.5 border-r border-zinc-150 text-zinc-700 font-sans w-[110px] min-w-[110px] max-w-[110px] truncate">
                              {item.label}
                            </td>
                            {item.monthlyValues.map((val, mIdx) => (
                              <td key={mIdx} className="p-1.5 border-r border-zinc-150 text-right text-zinc-600">
                                {formatCell(val)}
                              </td>
                            ))}
                            <td className="p-1.5 text-right bg-zinc-50 text-zinc-700 font-semibold border-l border-zinc-200 w-20 min-w-[80px]">
                              {formatCell(item.total)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Empty State */}
                    {receiptsData.length === 0 && (
                      <tr>
                        <td colSpan={15} className="p-8 text-center text-zinc-400 font-sans text-xs italic">
                          Nenhum lançamento de receita encontrado para o ano {selectedYear}. Navegue na aba de lançamentos para carregar dados.
                        </td>
                      </tr>
                    )}

                    {/* Grand Total Row representing the green bottom subtotal */}
                    <tr className="bg-emerald-700 text-white font-bold text-[11px] border-t-2 border-emerald-900">
                      <td className="p-1.5 font-sans uppercase text-[9px] tracking-wider w-[100px] min-w-[100px] max-w-[100px] truncate border-r border-emerald-600">
                        Total Geral
                      </td>
                      <td className="p-1.5 font-sans uppercase text-[9px] tracking-wider w-[110px] min-w-[110px] max-w-[110px] truncate border-r border-emerald-600">
                        Subtotal
                      </td>
                      {receiptsGrandTotalRow.monthlyTotals.map((totalVal, mIdx) => (
                        <td key={mIdx} className="p-1.5 text-right border-r border-emerald-600">
                          {totalVal === 0 ? "-" : totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      ))}
                      <td className="p-1.5 text-right bg-emerald-900 text-yellow-300 w-20 min-w-[80px]">
                        {receiptsGrandTotalRow.totalAll === 0 ? "-" : receiptsGrandTotalRow.totalAll.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. SEÇÃO DESPESAS */}
            <div className="space-y-4 min-w-[890px] pt-4">
              
              {/* Header block with FinaPlan Rouge Style */}
              <div className="bg-rose-900 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-xs">
                <span className="text-[11px] font-bold font-sans uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  DESPESAS ({selectedYear})
                </span>
                <span className="text-[9px] font-mono opacity-80">Quitação de Contas, Fixas & Variáveis</span>
              </div>

              {/* SpreadSheet Matrix Table for Expenses */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full border-collapse text-left text-[10.5px] font-mono whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-650 border-b border-zinc-200 font-semibold text-[9px] uppercase">
                      <th className="p-1.5 border-r border-zinc-200 w-[100px] min-w-[100px] max-w-[100px] truncate">Tipo</th>
                      <th className="p-1.5 border-r border-zinc-200 w-[110px] min-w-[110px] max-w-[110px] truncate">Despesas</th>
                      {MONTHS_SHORT.map((m, idx) => (
                        <th key={idx} className="p-1.5 border-r border-zinc-200 text-right w-11 min-w-[44px]">{m}</th>
                      ))}
                      <th className="p-1.5 text-right bg-rose-50 text-rose-800 font-bold w-20 min-w-[80px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    
                    {expensesData.map((gData) => (
                      <React.Fragment key={gData.groupId}>
                        {/* Fixed vs Variable group parent totals - Red Highlight */}
                        <tr className="bg-rose-50 text-rose-950 font-bold border-t border-zinc-250">
                          <td className="p-1.5 border-r border-zinc-200 text-rose-900 font-sans font-extrabold uppercase tracking-wide text-[9px] w-[100px] min-w-[100px] max-w-[100px] truncate">
                            {gData.groupTitle}
                          </td>
                          <td className="p-1.5 border-r border-zinc-200 text-rose-800 font-sans italic text-[9.5px] w-[110px] min-w-[110px] max-w-[110px] truncate">
                            Subtotal
                          </td>
                          {gData.monthlyTotals.map((tot, mIdx) => (
                            <td key={mIdx} className="p-1.5 border-r border-zinc-200 text-right text-rose-800">
                              {formatCell(tot)}
                            </td>
                          ))}
                          <td className="p-1.5 text-right bg-rose-100/60 font-bold text-rose-900 w-20 min-w-[80px]">
                            {formatCell(gData.grandTotal)}
                          </td>
                        </tr>

                        {/* Child Rows mapping to unique categories */}
                        {gData.rowItems.map((item, itemIdx) => (
                          <tr key={itemIdx} className="hover:bg-zinc-50/50 text-[10px]">
                            <td className="p-1.5 border-r border-zinc-150 text-zinc-400 font-sans italic pl-3 w-[100px] min-w-[100px] max-w-[100px] truncate">
                              {gData.groupTitle}
                            </td>
                            <td className="p-1.5 border-r border-zinc-150 text-zinc-700 font-sans w-[110px] min-w-[110px] max-w-[110px] truncate">
                              {item.label}
                            </td>
                            {item.monthlyValues.map((val, mIdx) => (
                              <td key={mIdx} className="p-1.5 border-r border-zinc-150 text-right text-zinc-605">
                                {formatCell(val)}
                              </td>
                            ))}
                            <td className="p-1.5 text-right bg-zinc-50/70 text-zinc-700 font-semibold border-l border-zinc-200 w-20 min-w-[80px]">
                              {formatCell(item.total)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Empty State */}
                    {expensesData.reduce((acc, g) => acc + g.rowItems.length, 0) === 0 && (
                      <tr>
                        <td colSpan={15} className="p-8 text-center text-zinc-400 font-sans text-xs italic">
                          Nenhum lançamento de despesa encontrado para o ano {selectedYear}. Use o gerenciador para inserir novos débitos.
                        </td>
                      </tr>
                    )}

                    {/* Grand Total Row representing red bottom subtotal */}
                    <tr className="bg-rose-800 text-white font-bold text-[11px] border-t-2 border-rose-950">
                      <td className="p-1.5 font-sans uppercase text-[9px] tracking-wider w-[100px] min-w-[100px] max-w-[100px] truncate border-r border-rose-700">
                        Total Geral
                      </td>
                      <td className="p-1.5 font-sans uppercase text-[9px] tracking-wider w-[110px] min-w-[110px] max-w-[110px] truncate border-r border-rose-700">
                        Subtotal
                      </td>
                      {expensesGrandTotalRow.monthlyTotals.map((totalVal, mIdx) => (
                        <td key={mIdx} className="p-1.5 text-right border-r border-rose-700">
                          {totalVal === 0 ? "-" : totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      ))}
                      <td className="p-1.5 text-right bg-red-950 text-yellow-250 w-20 min-w-[80px]">
                        {expensesGrandTotalRow.totalAll === 0 ? "-" : expensesGrandTotalRow.totalAll.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. EVOLUÇÃO DO SALDO LÍQUIDO MENSAL (Finanças Net Balance) */}
            <div className="space-y-4 min-w-[890px] pt-4">
              <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-xs">
                <span className="text-[11px] font-bold font-sans uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-400" />
                  Evolução do Saldo Líquido do Caixa ({selectedYear})
                </span>
                <span className="text-[9px] font-mono opacity-80">Líquido Livre Residual</span>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full border-collapse text-left text-[10.5px] font-mono whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-650 border-b border-zinc-200 font-semibold text-[9px] uppercase">
                      <th className="p-1.5 border-r border-zinc-200 w-[100px] min-w-[100px] max-w-[100px] truncate">Indicador</th>
                      <th className="p-1.5 border-r border-zinc-200 w-[110px] min-w-[110px] max-w-[110px] truncate">Descrição</th>
                      {MONTHS_SHORT.map((m, idx) => (
                        <th key={idx} className="p-1.5 border-r border-zinc-200 text-right w-11 min-w-[44px]">{m}</th>
                      ))}
                      <th className="p-1.5 text-right bg-zinc-900 text-white font-bold w-20 min-w-[80px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-zinc-50 font-bold text-[11px]">
                      <td className="p-1.5 font-sans text-zinc-950 uppercase text-[9px] tracking-wider w-[100px] min-w-[100px] max-w-[100px] truncate border-r border-zinc-200">
                        SALDO LÍQUIDO
                      </td>
                      <td className="p-1.5 font-sans text-emerald-800 italic text-[9.5px] w-[110px] min-w-[110px] max-w-[110px] truncate border-r border-zinc-200 font-normal">
                        Subtotal
                      </td>
                      {netMonthlyEvolution.netMonthly.map((mVal, mIdx) => (
                        <td 
                          key={mIdx} 
                          className={`p-1.5 text-right border-r border-zinc-200 ${mVal >= 0 ? "text-emerald-700 bg-emerald-50/20" : "text-rose-700 bg-rose-50/20"}`}
                        >
                          {mVal === 0 ? "-" : mVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      ))}
                      <td className={`p-1.5 text-right font-black w-20 min-w-[80px] ${netMonthlyEvolution.netTotal >= 0 ? "bg-emerald-900 text-white" : "bg-rose-950 text-white"}`}>
                        {netMonthlyEvolution.netTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
