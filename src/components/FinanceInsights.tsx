/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AlertSettings, Person, Income, Expense, FinancialInsight } from "../types";
import { Sparkles, Settings, AlertTriangle, ShieldCheck, TrendingUp, RefreshCw, BarChart2 } from "lucide-react";

interface FinanceInsightsProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  alertSettings: AlertSettings;
  onChangeSettings: (settings: AlertSettings) => void;
}

export default function FinanceInsights({
  people, incomes, expenses, alertSettings, onChangeSettings
}: FinanceInsightsProps) {
  
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    fixedPct: 0,
    variablePct: 0,
    savingsPct: 0,
  });

  // Local editable targets for personalized custom configs
  const [isEditMode, setIsEditMode] = useState(false);
  const [fixedLimit, setFixedLimit] = useState(alertSettings.customFixedLimit);
  const [variableLimit, setVariableLimit] = useState(alertSettings.customVariableLimit);
  const [savingsLimit, setSavingsLimit] = useState(alertSettings.customSavingsTarget);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people,
          incomes,
          expenses,
          alertSettings: {
            ...alertSettings,
            customFixedLimit: fixedLimit,
            customVariableLimit: variableLimit,
            customSavingsTarget: savingsLimit
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Merge rule calculated + AI generated suggestions
        const allInsights = [...(data.ruleCalculated || []), ...(data.aiGenerated || [])];
        setInsights(allInsights);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } else {
        console.error("Failed to query insights endpoint");
      }
    } catch (e) {
      console.error("Failed to fetch insights", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [people, incomes, expenses, alertSettings.level, alertSettings.isEnabled]);

  const handleSaveCustomLimits = () => {
    onChangeSettings({
      ...alertSettings,
      customFixedLimit: fixedLimit,
      customVariableLimit: variableLimit,
      customSavingsTarget: savingsLimit
    });
    setIsEditMode(false);
    fetchInsights();
  };

  // Pre-calculated target labels based on severity levels
  const getLimitsByLevel = () => {
    if (alertSettings.level === 'conservative') {
      return { fixed: 45, variable: 25, savings: 30 };
    } else if (alertSettings.level === 'flexible') {
      return { fixed: 60, variable: 35, savings: 5 };
    }
    return { 
      fixed: alertSettings.customFixedLimit, 
      variable: alertSettings.customVariableLimit, 
      savings: alertSettings.customSavingsTarget 
    };
  };

  const currentLevelLimits = getLimitsByLevel();

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Settings Grid Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Form Column */}
        <div className="lg:col-span-4 border border-zinc-200 rounded-2xl bg-white p-5 space-y-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-zinc-600" id="icon-insight-settings" />
            <h3 className="text-sm font-semibold text-zinc-950">Ajustes da IA e Alertas</h3>
          </div>

          {/* Toggle Alert Engine */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div>
              <span className="text-xs font-semibold text-zinc-950 block">Ativar Consultoria</span>
              <span className="text-[10px] text-zinc-500 block">Ativa alertas automáticos de desvios</span>
            </div>
            <input
              type="checkbox"
              checked={alertSettings.isEnabled}
              onChange={e => onChangeSettings({ ...alertSettings, isEnabled: e.target.checked })}
              id="toggle-alert-enabled"
              className="h-4.5 w-4.5 accent-zinc-950"
            />
          </div>

          {/* Severity Levels Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-700">Nível do Perfil da Família</label>
            <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-zinc-100 rounded-lg">
              {(['conservative', 'moderate', 'flexible'] as const).map(lev => (
                <button
                  key={lev}
                  type="button"
                  id={`btn-profile-${lev}`}
                  onClick={() => onChangeSettings({ ...alertSettings, level: lev })}
                  className={`py-1.5 text-[10px] uppercase tracking-wide font-bold rounded-md transition-all ${alertSettings.level === lev ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  {lev === 'conservative' ? 'Conservador' : lev === 'moderate' ? 'Moderado' : 'Flexível'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Rules & Limits Slider/Inputs */}
          <div className="pt-2 border-t border-zinc-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-950">Seus Limites Customizados (V1)</span>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-950"
                id="btn-edit-limits"
              >
                {isEditMode ? 'Cancelar' : 'Personalizar'}
              </button>
            </div>

            {isEditMode ? (
              <div className="space-y-3 text-xs animate-fade-in">
                <div>
                  <div className="flex justify-between font-medium mb-1 text-zinc-700">
                    <span>Máximo Gasto Fixo:</span>
                    <span className="font-semibold">{fixedLimit}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={fixedLimit}
                    onChange={e => setFixedLimit(parseInt(e.target.value))}
                    className="w-full accent-zinc-950"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1 text-zinc-700">
                    <span>Máximo Lazer / Variáveis:</span>
                    <span className="font-semibold">{variableLimit}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={variableLimit}
                    onChange={e => setVariableLimit(parseInt(e.target.value))}
                    className="w-full accent-zinc-950"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1 text-zinc-700">
                    <span>Meta de Economia / Poupar:</span>
                    <span className="font-semibold">{savingsLimit}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={savingsLimit}
                    onChange={e => setSavingsLimit(parseInt(e.target.value))}
                    className="w-full accent-zinc-950"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCustomLimits}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold"
                >
                  Confirmar Metas
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between items-center py-1 bg-zinc-50 px-2 rounded">
                  <span>Meta Bens Fixo / Essencial:</span>
                  <span className="font-mono font-semibold text-zinc-950">{currentLevelLimits.fixed}%</span>
                </div>
                <div className="flex justify-between items-center py-1 bg-zinc-50 px-2 rounded">
                  <span>Meta Variável / Lazer:</span>
                  <span className="font-mono font-semibold text-zinc-950">{currentLevelLimits.variable}%</span>
                </div>
                <div className="flex justify-between items-center py-1 bg-zinc-50 px-2 rounded">
                  <span>Alvo Investir / Reserva:</span>
                  <span className="font-mono font-semibold text-zinc-950">{currentLevelLimits.savings}%</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-2 italic">
                  *Com base no perfil selecionado, as despesas fixas recomendadas flutuam para blindagem familiar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Budget Allocation Status (Real vs Recommended) */}
        <div className="lg:col-span-8 border border-zinc-200 rounded-2xl bg-white p-6 space-y-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-950 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-emerald-600" id="icon-insight-barchart" />
                Alocação Real de Gastos vs Metas do Perfil
              </h3>
              <button 
                onClick={fetchInsights} 
                className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800"
                title="Sincronizar"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
              Veja graficamente como as receitas do seu núcleo familiar estão sendo distribuídas entre contas fixas, lazer variável e o saldo que resta no bolso.
            </p>

            <div className="space-y-5">
              
              {/* Essenciais / Fixos */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-950">Gastos Fixos (Essenciais)</span>
                  <span className="font-mono text-zinc-500">
                    <strong className="text-zinc-950">{metrics.fixedPct ? metrics.fixedPct.toFixed(1) : 0}%</strong> de {currentLevelLimits.fixed}% recomendado
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metrics.fixedPct > currentLevelLimits.fixed ? "bg-rose-500" : "bg-zinc-800"}`}
                    style={{ width: `${Math.min(metrics.fixedPct || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Variáveis */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-950">Gastos Variáveis (Estilo de Vida)</span>
                  <span className="font-mono text-zinc-500">
                    <strong className="text-zinc-950">{metrics.variablePct ? metrics.variablePct.toFixed(1) : 0}%</strong> de {currentLevelLimits.variable}% recomendado
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metrics.variablePct > currentLevelLimits.variable ? "bg-amber-500" : "bg-emerald-600"}`}
                    style={{ width: `${Math.min(metrics.variablePct || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Saldo / Economia */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-950">Saldo Poupança / Capacidade de Economia</span>
                  <span className="font-mono text-zinc-500">
                    <strong className="text-zinc-950">{metrics.savingsPct ? metrics.savingsPct.toFixed(1) : 0}%</strong> de {currentLevelLimits.savings}% esperado
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metrics.savingsPct < currentLevelLimits.savings ? "bg-zinc-400" : "bg-sky-500"}`}
                    style={{ width: `${Math.max(Math.min(metrics.savingsPct || 0, 100), 0)}%` }}
                  ></div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 md:p-4 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600" id="icon-insight-trend" />
              <div className="text-xs">
                <span className="font-semibold text-zinc-900 block leading-tight">Capacidade Financeira Saudável</span>
                <span className="text-zinc-400 block mt-0.5 font-mono">Resíduo Livre Poupança</span>
              </div>
            </div>
            <span className={`text-sm font-semibold font-mono ${metrics.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              R$ {Number(metrics.balance || 0).toFixed(2)}
            </span>
          </div>

        </div>

      </div>

      {/* Actionable Alerts & AI generated recommendations list */}
      <div className="space-y-4 pt-4 border-t border-zinc-100">
        <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
          <Sparkles className="text-amber-500 h-4 w-4" id="icon-insight-ai" />
          Alertas de Anomalias & Sugestões da Consultoria Inteligente
        </h3>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(item => (
              <div key={item} className="animate-pulse border border-zinc-200 bg-white rounded-xl p-5 space-y-3">
                <div className="h-4.5 w-1/4 bg-zinc-100 rounded"></div>
                <div className="h-4 w-2/3 bg-zinc-100 rounded"></div>
                <div className="h-3 w-full bg-zinc-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.length === 0 ? (
              <div className="col-span-2 border border-dashed border-zinc-200 rounded-xl p-8 bg-white text-center text-xs text-zinc-400">
                Seus alertas ambientais estão calmos! Cadastre algumas receitas e despesas para iniciar os diagnósticos inteligentes.
              </div>
            ) : (
              insights.map(item => (
                <div
                  key={item.id}
                  className={`border rounded-xl bg-white p-5 space-y-2 relative overflow-hidden transition-all shadow-xs ${
                    item.type === 'danger' ? 'border-red-200 hover:border-red-300' :
                    item.type === 'warning' ? 'border-amber-200 hover:border-amber-300' :
                    item.type === 'success' ? 'border-emerald-200 hover:border-emerald-300' :
                    'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                      item.type === 'danger' ? 'bg-red-50 text-red-700' :
                      item.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                      item.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>
                      {item.category || "Consultor"}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">FinancIA Premium</span>
                  </div>

                  <h4 className="font-semibold text-sm text-zinc-950 flex items-center gap-1.5 leading-snug">
                    {item.type === 'danger' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                    {item.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                    {item.type === 'success' && <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
