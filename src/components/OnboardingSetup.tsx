import React, { useState, useEffect, useMemo } from "react";
import {
  PiggyBank, Check, Plus, ArrowRight, ArrowLeft, Sparkles, Loader,
  TrendingUp, TrendingDown, Folder, X,
} from "lucide-react";
import { loadCatalog } from "../lib/api";
import { DEFAULT_SUBCATEGORIES, type SubcategoryItem } from "./TransactionsManager";

export interface OnboardingData {
  projectName: string;
  projectDescription?: string;
  subcategories: { type: "income" | "expense"; category: string; name: string }[];
}

interface OnboardingSetupProps {
  sessionEmail: string;
  displayName?: string;
  onComplete: (data: OnboardingData) => Promise<void>;
}

const PROJECT_SUGGESTIONS = ["Família", "Casa", "Pessoal", "Meu Orçamento"];

const keyOf = (s: { type: string; category: string; name: string }) =>
  `${s.type}::${s.category}::${s.name}`;

type Phase = 1 | 2 | 3;

export default function OnboardingSetup({ sessionEmail, displayName, onComplete }: OnboardingSetupProps) {
  const [phase, setPhase] = useState<Phase>(1);

  // Fase 1
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Fase 2
  const [catalog, setCatalog] = useState<SubcategoryItem[]>([]);
  const [customSubs, setCustomSubs] = useState<SubcategoryItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activeType, setActiveType] = useState<"expense" | "income">("expense");

  // Fase 3 / submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Carrega o catálogo de subcategorias default (todas pré-selecionadas)
  useEffect(() => {
    (async () => {
      try {
        const cat = await loadCatalog("");
        const list = cat.length > 0 ? cat : DEFAULT_SUBCATEGORIES;
        setCatalog(list);
        setSelected(new Set(list.map(keyOf)));
      } catch {
        setCatalog(DEFAULT_SUBCATEGORIES);
        setSelected(new Set(DEFAULT_SUBCATEGORIES.map(keyOf)));
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const allSubs = useMemo(() => [...catalog, ...customSubs], [catalog, customSubs]);

  // Agrupa subcategorias por categoria, para o tipo ativo
  const grouped = useMemo<{ category: string; items: SubcategoryItem[] }[]>(() => {
    const map = new Map<string, SubcategoryItem[]>();
    for (const s of allSubs) {
      if (s.type !== activeType) continue;
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [allSubs, activeType]);

  const selectedCount = selected.size;
  const selectedIncome = allSubs.filter(s => s.type === "income" && selected.has(keyOf(s))).length;
  const selectedExpense = allSubs.filter(s => s.type === "expense" && selected.has(keyOf(s))).length;

  const toggleSub = (s: SubcategoryItem) => {
    const k = keyOf(s);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const toggleCategory = (items: SubcategoryItem[]) => {
    const keys = items.map(keyOf);
    const allOn = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const addSubcategory = (category: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const item: SubcategoryItem = { id: `new-${Date.now()}`, type: activeType, category, name: clean, active: true };
    if (allSubs.some(s => s.type === item.type && s.category === category && s.name.toLowerCase() === clean.toLowerCase())) {
      // já existe — só garante selecionada
      setSelected(prev => new Set(prev).add(keyOf(item)));
      return;
    }
    setCustomSubs(prev => [...prev, item]);
    setSelected(prev => new Set(prev).add(keyOf(item)));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError("");
    try {
      const subcategories = allSubs
        .filter(s => selected.has(keyOf(s)))
        .map(s => ({ type: s.type, category: s.category, name: s.name }));
      await onComplete({
        projectName: projectName.trim(),
        projectDescription: projectDescription.trim() || undefined,
        subcategories,
      });
      // Em caso de sucesso, o App troca de tela; nada mais a fazer aqui.
    } catch (e: any) {
      setError(e?.message || "Não foi possível concluir. Tente novamente.");
      setSubmitting(false);
    }
  };

  // ─────────────────────────── Stepper ───────────────────────────
  const steps = [
    { n: 1, label: "Projeto" },
    { n: 2, label: "Categorias" },
    { n: 3, label: "Pronto" },
  ];

  const Stepper = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => {
        const done = phase > s.n;
        const current = phase === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  done ? "bg-emerald-500 text-white"
                  : current ? "bg-zinc-900 text-white ring-4 ring-zinc-900/10"
                  : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${current ? "text-zinc-900" : "text-zinc-400"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 sm:w-10 rounded-full transition-all ${phase > s.n ? "bg-emerald-400" : "bg-zinc-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ─────────────────────────── Render ───────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500 text-zinc-950 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-2">
            <PiggyBank className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Monetrik · Configuração inicial</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <Stepper />

          {/* ─── FASE 1: Projeto ─── */}
          {phase === 1 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Vamos criar seu projeto</h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Um projeto agrupa as finanças que você acompanha em conjunto — sua família, sua casa ou só você.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Nome do projeto</label>
                <input
                  autoFocus
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && projectName.trim()) setPhase(2); }}
                  placeholder="Ex: Família Silva"
                  className="w-full text-sm border border-zinc-200 bg-white rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROJECT_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setProjectName(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        projectName === s
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">
                  Descrição <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Ex: Controle de gastos da casa e da família"
                  rows={2}
                  className="w-full text-sm border border-zinc-200 bg-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                />
              </div>

              <button
                type="button"
                disabled={!projectName.trim()}
                onClick={() => setPhase(2)}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── FASE 2: Categorias & Subcategorias ─── */}
          {phase === 2 && (
            <div className="animate-fade-in space-y-5">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">O que você quer acompanhar?</h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Escolha as subcategorias do seu dia a dia. Desmarque o que não usa e adicione as suas. Dá para ajustar depois.
                </p>
              </div>

              {/* Tabs Receitas / Despesas */}
              <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveType("expense")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeType === "expense" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  <TrendingDown className="h-4 w-4 text-red-500" /> Despesas
                  <span className="ml-1 text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded-full">{selectedExpense}</span>
                </button>
                <button
                  onClick={() => setActiveType("income")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeType === "income" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Receitas
                  <span className="ml-1 text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded-full">{selectedIncome}</span>
                </button>
              </div>

              {/* Lista de categorias */}
              <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1 -mr-1">
                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-12 text-zinc-400 gap-2 text-sm">
                    <Loader className="h-4 w-4 animate-spin" /> Carregando categorias…
                  </div>
                ) : grouped.length === 0 ? (
                  <p className="text-center text-sm text-zinc-400 py-8">Nenhuma categoria disponível.</p>
                ) : (
                  grouped.map(({ category, items }: { category: string; items: SubcategoryItem[] }) => {
                    const keys = items.map(keyOf);
                    const onCount = keys.filter(k => selected.has(k)).length;
                    const allOn = onCount === items.length;
                    return (
                      <CategorySection
                        key={category}
                        category={category}
                        items={items}
                        selected={selected}
                        onCount={onCount}
                        allOn={allOn}
                        onToggleCategory={() => toggleCategory(items)}
                        onToggleSub={toggleSub}
                        onAdd={name => addSubcategory(category, name)}
                      />
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-3">
                <span><strong className="text-zinc-900">{selectedCount}</strong> subcategorias selecionadas</span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPhase(1)}
                  className="px-4 py-3 border border-zinc-200 hover:border-zinc-400 text-zinc-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setPhase(3)}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Revisar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── FASE 3: Conclusão ─── */}
          {phase === 3 && (
            <div className="animate-fade-in space-y-6 text-center">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Tudo pronto{displayName ? `, ${displayName.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Confira o resumo abaixo. Você pode editar tudo depois dentro do Monetrik.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-700">
                    <Folder className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Projeto</p>
                    <p className="text-sm font-semibold text-zinc-900">{projectName.trim() || "Família"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white border border-zinc-100 rounded-xl px-3 py-2.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{selectedIncome}</p>
                      <p className="text-[11px] text-zinc-400">subcat. de receita</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-zinc-100 rounded-xl px-3 py-2.5">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{selectedExpense}</p>
                      <p className="text-[11px] text-zinc-400">subcat. de despesa</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPhase(2)}
                  className="px-4 py-3 border border-zinc-200 hover:border-zinc-400 disabled:opacity-50 text-zinc-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinish}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Preparando…" : "Começar a usar o Monetrik"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-4">Conectado como {sessionEmail}</p>
      </div>
    </div>
  );
}

// ─────────────────────── Seção de categoria ───────────────────────
interface CategorySectionProps {
  category: string;
  items: SubcategoryItem[];
  selected: Set<string>;
  onCount: number;
  allOn: boolean;
  onToggleCategory: () => void;
  onToggleSub: (s: SubcategoryItem) => void;
  onAdd: (name: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category, items, selected, onCount, allOn, onToggleCategory, onToggleSub, onAdd,
}) => {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const submit = () => {
    if (value.trim()) { onAdd(value); setValue(""); }
    setAdding(false);
  };

  return (
    <div className="border border-zinc-150 rounded-2xl p-3.5 bg-white" style={{ borderColor: "#e7e7ea" }}>
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={onToggleCategory} className="flex items-center gap-2 group">
          <span
            className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
              allOn ? "bg-zinc-900 border-zinc-900" : onCount > 0 ? "bg-zinc-300 border-zinc-300" : "border-zinc-300"
            }`}
          >
            {(allOn || onCount > 0) && <Check className="h-3 w-3 text-white" />}
          </span>
          <span className="text-sm font-semibold text-zinc-900">{category}</span>
        </button>
        <span className="text-[11px] text-zinc-400 font-medium">{onCount}/{items.length}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map(s => {
          const on = selected.has(keyOf(s));
          return (
            <button
              key={keyOf(s)}
              onClick={() => onToggleSub(s)}
              className={`text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1 transition-all ${
                on
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {on && <Check className="h-3 w-3" />} {s.name}
            </button>
          );
        })}

        {adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setValue(""); } }}
              onBlur={submit}
              placeholder="Nova subcategoria"
              className="text-xs px-2.5 py-1.5 rounded-full border border-zinc-300 focus:outline-none focus:border-zinc-500 w-36"
            />
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 inline-flex items-center gap-1 transition-all"
          >
            <Plus className="h-3 w-3" /> Nova
          </button>
        )}
      </div>
    </div>
  );
}
