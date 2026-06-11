import React, { useState, useEffect, useMemo } from "react";
import {
  PiggyBank, Check, Plus, ArrowRight, ArrowLeft, Sparkles, Loader,
  TrendingUp, TrendingDown, Folder, User, Phone, Mail, Calendar,
} from "lucide-react";
import { loadCatalog } from "../lib/api";
import { DEFAULT_SUBCATEGORIES, type SubcategoryItem } from "./TransactionsManager";

export interface OnboardingData {
  projectName: string;
  projectDescription?: string;
  titular: {
    name: string;
    email?: string;
    whatsapp?: string;
    gender?: "masculino" | "feminino" | "outro";
    birthDate?: string;
    avatar?: string;
    color?: string;
  };
  subcategories: { type: "income" | "expense"; category: string; name: string }[];
}

interface OnboardingSetupProps {
  sessionEmail: string;
  displayName?: string;
  onComplete: (data: OnboardingData) => Promise<void>;
}

const PROJECT_SUGGESTIONS = ["Família", "Casa", "Pessoal", "Meu Orçamento"];
const AVATARS = ["👨‍💼", "👩‍💼", "👨‍💻", "👩‍💻", "👨", "👩", "🧑", "👴", "👵", "🧔", "👱", "👱‍♀️"];
const COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const keyOf = (s: { type: string; category: string; name: string }) =>
  `${s.type}::${s.category}::${s.name}`;

// Máscara de telefone BR: (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo)
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Phase = 1 | 2 | 3 | 4;

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
    <div className="border rounded-2xl p-3.5 bg-white" style={{ borderColor: "#e7e7ea" }}>
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
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setValue(""); } }}
            onBlur={submit}
            placeholder="Nova subcategoria"
            className="text-xs px-2.5 py-1.5 rounded-full border border-zinc-300 focus:outline-none focus:border-zinc-500 w-36"
          />
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
};

export default function OnboardingSetup({ sessionEmail, displayName, onComplete }: OnboardingSetupProps) {
  const [phase, setPhase] = useState<Phase>(1);

  // Fase 1 — Titular
  const [name, setName] = useState(displayName || "");
  const [email, setEmail] = useState(sessionEmail || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "outro">("masculino");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);

  // Fase 2 — Projeto
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // Fase 3 — Categorias
  const [catalog, setCatalog] = useState<SubcategoryItem[]>([]);
  const [customSubs, setCustomSubs] = useState<SubcategoryItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activeType, setActiveType] = useState<"expense" | "income">("expense");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const addSubcategory = (category: string, subName: string) => {
    const clean = subName.trim();
    if (!clean) return;
    const item: SubcategoryItem = { id: `new-${Date.now()}`, type: activeType, category, name: clean, active: true };
    if (allSubs.some(s => s.type === item.type && s.category === category && s.name.toLowerCase() === clean.toLowerCase())) {
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
        titular: {
          name: name.trim(),
          email: email.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          gender,
          birthDate: birthDate || undefined,
          avatar,
          color,
        },
        subcategories,
      });
    } catch (e: any) {
      setError(e?.message || "Não foi possível concluir. Tente novamente.");
      setSubmitting(false);
    }
  };

  // ─────────────────────────── Stepper ───────────────────────────
  const steps = [
    { n: 1, label: "Você" },
    { n: 2, label: "Projeto" },
    { n: 3, label: "Categorias" },
    { n: 4, label: "Pronto" },
  ];

  const Stepper = () => (
    <div className="flex items-center justify-center gap-1.5 mb-8">
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
              <div className={`h-0.5 w-4 sm:w-7 rounded-full transition-all ${phase > s.n ? "bg-emerald-400" : "bg-zinc-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const genderOptions: { v: "masculino" | "feminino" | "outro"; label: string }[] = [
    { v: "masculino", label: "Masculino" },
    { v: "feminino", label: "Feminino" },
    { v: "outro", label: "Outro" },
  ];

  // ─────────────────────────── Render ───────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500 text-zinc-950 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-2">
            <PiggyBank className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Monetrik · Configuração inicial</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <Stepper />

          {/* ─── FASE 1: Titular ─── */}
          {phase === 1 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Vamos te conhecer</h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Você é o titular do projeto. Esses dados criam seu perfil de familiar — dá pra editar depois.
                </p>
              </div>

              {/* Avatar preview + seleção */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                  style={{ backgroundColor: color + "22", border: `2px solid ${color}` }}
                >
                  {avatar}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        avatar === a ? "bg-zinc-900 ring-2 ring-zinc-900/20 scale-105" : "bg-zinc-50 hover:bg-zinc-100"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-zinc-400 scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Campos */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Ricardo Gomes Matos"
                      className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="voce@email.com"
                        className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Celular / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <input
                        value={whatsapp}
                        onChange={e => setWhatsapp(formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        inputMode="numeric"
                        maxLength={16}
                        className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Sexo</label>
                    <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
                      {genderOptions.map(g => (
                        <button
                          key={g.v}
                          onClick={() => setGender(g.v)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                            gender === g.v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">
                      Nascimento <span className="text-zinc-400 font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="w-full text-sm border border-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => setPhase(2)}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── FASE 2: Projeto ─── */}
          {phase === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Crie seu projeto</h2>
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
                  onKeyDown={e => { if (e.key === "Enter" && projectName.trim()) setPhase(3); }}
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
                  disabled={!projectName.trim()}
                  onClick={() => setPhase(3)}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── FASE 3: Categorias & Subcategorias ─── */}
          {phase === 3 && (
            <div className="animate-fade-in space-y-5">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">O que você quer acompanhar?</h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Escolha as subcategorias do seu dia a dia. Desmarque o que não usa e adicione as suas. Dá para ajustar depois.
                </p>
              </div>

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

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 -mr-1">
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
                        onAdd={subName => addSubcategory(category, subName)}
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
                  onClick={() => setPhase(2)}
                  className="px-4 py-3 border border-zinc-200 hover:border-zinc-400 text-zinc-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setPhase(4)}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Revisar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── FASE 4: Conclusão ─── */}
          {phase === 4 && (
            <div className="animate-fade-in space-y-6 text-center">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Tudo pronto{name ? `, ${name.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Confira o resumo abaixo. Você pode editar tudo depois dentro do Monetrik.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: color + "22", border: `1.5px solid ${color}` }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Titular</p>
                    <p className="text-sm font-semibold text-zinc-900">{name.trim() || "—"}</p>
                  </div>
                </div>
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
                  onClick={() => setPhase(3)}
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
