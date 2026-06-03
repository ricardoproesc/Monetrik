/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./lib/firebase";
import { Person, Income, Expense, AlertSettings } from "./types";
import PeopleManager from "./components/PeopleManager";
import TransactionsManager from "./components/TransactionsManager";
import FinanceInsights from "./components/FinanceInsights";
import PanoramaGeral from "./components/PanoramaGeral";
import FinaPlanMatrix from "./components/FinaPlanMatrix";
import AIAssistant from "./components/AIAssistant";
import SaasArchitectureDoc from "./components/SaasArchitectureDoc";
import { 
  PiggyBank, ArrowDownRight, ArrowUpRight, Shield, Layers, 
  BookOpen, HelpCircle, LogOut, Mail, Lock, User, Check, AlertCircle, Menu, X
} from "lucide-react";

// Pre-seed some default high-quality metrics to load if localStorage is empty
const DEFAULT_PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Titular da Família",
    avatar: "👨‍💼",
    gender: "masculino",
    relationship: "principal",
    email: "titular@familia.com",
    whatsapp: "",
    birthDate: "1988-05-12",
    color: "#3b82f6", // Cosmic Royal Blue
    active: true
  },
  {
    id: "p2",
    name: "Cônjuge",
    avatar: "👩‍💻",
    gender: "feminino",
    relationship: "conjuge",
    email: "conjuge@familia.com",
    whatsapp: "",
    birthDate: "1990-09-24",
    color: "#10b981", // Emerald Green
    active: true
  },
  {
    id: "p3",
    name: "Filho(a)",
    avatar: "👦",
    gender: "masculino",
    relationship: "filho(a)",
    email: "",
    whatsapp: "",
    birthDate: "2018-02-15",
    color: "#6366f1", // Indigo
    active: true
  }
];

const DEFAULT_INCOMES: Income[] = [
  {
    id: "in-1",
    personId: "p1",
    category: "Salário",
    amount: 7200.00,
    date: "2026-05-01",
    notes: "Rendimento fixo CLT",
    isFixed: true,
    isRecurring: true,
    recurrence: "mensal"
  },
  {
    id: "in-2",
    personId: "p2",
    category: "Freelance",
    amount: 3100.00,
    date: "2026-05-10",
    notes: "Projeto de design UI/UX de SaaS",
    isFixed: false,
    isRecurring: false,
    recurrence: "eventual"
  }
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: "ex-1",
    name: "Aluguel Apartamento",
    category: "Aluguel",
    isFixed: true,
    amount: 3200.00,
    date: "2026-05-05",
    personId: "p1",
    isRecurring: true,
    recurrence: "mensal",
    paymentMethod: "Boleto"
  },
  {
    id: "ex-2",
    name: "Supermercado Carrefour",
    category: "Mercado",
    isFixed: false,
    amount: 1450.00,
    date: "2026-05-12",
    personId: "p2",
    isRecurring: false,
    recurrence: "eventual",
    paymentMethod: "Crédito"
  },
  {
    id: "ex-3",
    name: "Conta de Energia Coelba",
    category: "Energia",
    isFixed: true,
    amount: 320.00,
    date: "2026-05-15",
    personId: "p1",
    isRecurring: true,
    recurrence: "mensal",
    paymentMethod: "Pix"
  },
  {
    id: "ex-4",
    name: "Plano de Internet de Fibra",
    category: "Internet",
    isFixed: true,
    amount: 149.90,
    date: "2026-05-01",
    personId: "p2",
    isRecurring: true,
    recurrence: "mensal",
    paymentMethod: "Débito"
  },
  {
    id: "ex-5",
    name: "Cinemas e Jantar de Lazer",
    category: "Lazer",
    isFixed: false,
    amount: 450.00,
    date: "2026-05-20",
    personId: "p1",
    isRecurring: false,
    recurrence: "eventual",
    paymentMethod: "Pix"
  },
  {
    id: "ex-6",
    name: "Farmácia e Medicamentos",
    category: "Saúde",
    isFixed: false,
    amount: 190.00,
    date: "2026-05-18",
    personId: "p3",
    isRecurring: false,
    recurrence: "eventual",
    paymentMethod: "Dinheiro"
  }
];

const DEFAULT_SETTINGS: AlertSettings = {
  isEnabled: true,
  level: "moderate",
  customFixedLimit: 50,
  customVariableLimit: 30,
  customSavingsTarget: 20
};

export default function App() {
  
  // Program Brand Name: "Monetrik" (Slogan: "Conexão e Controle Financeiro Familiar Inteligente")
  const brandName = "Monetrik";

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("kashfam_auth") === "true";
  });
  const [sessionEmail, setSessionEmail] = useState<string>(() => {
    return localStorage.getItem("kashfam_email") || "";
  });
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Auth Form Fields
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [authStatus, setAuthStatus] = useState<'success' | 'error' | 'info' | ''>('');

  // App core states
  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem("kashfam_people");
    return saved ? JSON.parse(saved) : DEFAULT_PEOPLE;
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem("kashfam_incomes");
    return saved ? JSON.parse(saved) : DEFAULT_INCOMES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("kashfam_expenses");
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSES;
  });

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem("kashfam_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Navigation state
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'planilha' | 'transactions' | 'people' | 'insights' | 'chatbot' | 'docs'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Computes current active user dynamically based on the session email
  const principalPerson = people.find(p => p.email.toLowerCase() === sessionEmail.toLowerCase()) || people.find(p => p.relationship === 'principal') || people[0] || { name: "Ricardo Gomes" };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("kashfam_people", JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem("kashfam_incomes", JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem("kashfam_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("kashfam_settings", JSON.stringify(alertSettings));
  }, [alertSettings]);

  // ─── helpers de sessão local ───────────────────────────────────────────────
  const persistSession = (email: string) => {
    setIsAuthenticated(true);
    setSessionEmail(email);
    localStorage.setItem("kashfam_auth", "true");
    localStorage.setItem("kashfam_email", email);
  };

  const clearSession = () => {
    setIsAuthenticated(false);
    setSessionEmail("");
    localStorage.removeItem("kashfam_auth");
    localStorage.removeItem("kashfam_email");
  };

  // Observa mudanças de auth do Firebase (mantém sessão ao recarregar)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setSessionEmail(user.email || "");
        localStorage.setItem("kashfam_auth", "true");
        localStorage.setItem("kashfam_email", user.email || "");
      } else {
        setIsAuthenticated(false);
        setSessionEmail("");
        localStorage.removeItem("kashfam_auth");
        localStorage.removeItem("kashfam_email");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passInput.trim()) {
      setAuthFeedback("Por favor, preencha todos os campos.");
      setAuthStatus('error');
      return;
    }

    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passInput);
        setAuthFeedback("");
        // onAuthStateChanged cuida de setar isAuthenticated
      } catch (err: any) {
        const msgs: Record<string, string> = {
          "auth/user-not-found": "E-mail não cadastrado.",
          "auth/wrong-password": "Senha incorreta.",
          "auth/invalid-credential": "E-mail ou senha incorretos.",
          "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
        };
        setAuthFeedback(msgs[err.code] || "Erro ao fazer login. Tente novamente.");
        setAuthStatus('error');
      }
    } else {
      // Fallback sem Firebase: aceita qualquer credencial válida
      persistSession(emailInput.trim());
    }
  };

  // ─── Cadastro ────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim() || !passInput.trim()) {
      setAuthFeedback("Por favor, preencha todos os campos do cadastro.");
      setAuthStatus('error');
      return;
    }
    if (passInput.trim().length < 6) {
      setAuthFeedback("A senha precisa ter no mínimo 6 caracteres.");
      setAuthStatus('error');
      return;
    }

    if (isFirebaseConfigured && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passInput);
        await updateProfile(cred.user, { displayName: nameInput.trim() });

        // Atualiza o titular na lista de pessoas
        setPeople(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], name: nameInput.trim(), email: emailInput.trim() };
          return updated;
        });

        setAuthFeedback(`Bem-vindo(a), ${nameInput.trim()}! Conta criada com sucesso.`);
        setAuthStatus('success');
        // onAuthStateChanged vai fazer o redirect automático
      } catch (err: any) {
        const msgs: Record<string, string> = {
          "auth/email-already-in-use": "Este e-mail já possui cadastro. Faça login.",
          "auth/invalid-email": "E-mail inválido.",
          "auth/weak-password": "Senha muito fraca. Use ao menos 6 caracteres.",
        };
        setAuthFeedback(msgs[err.code] || "Erro ao criar conta. Tente novamente.");
        setAuthStatus('error');
      }
    } else {
      // Fallback sem Firebase: cria sessão local
      setPeople(prev => {
        const updated = [...prev];
        updated[0] = { ...updated[0], name: nameInput.trim(), email: emailInput.trim() };
        return updated;
      });
      persistSession(emailInput.trim());
    }
  };

  // ─── Recuperação de Senha ───────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setAuthFeedback("Por favor, insira seu e-mail de cadastro.");
      setAuthStatus('error');
      return;
    }

    if (isFirebaseConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, emailInput.trim());
        setAuthFeedback(`E-mail de redefinição enviado para "${emailInput}". Verifique sua caixa de entrada.`);
        setAuthStatus('success');
      } catch (err: any) {
        setAuthFeedback("Não foi possível enviar o e-mail. Verifique o endereço informado.");
        setAuthStatus('error');
      }
    } else {
      setAuthFeedback("Recuperação de senha requer Firebase configurado.");
      setAuthStatus('info');
    }
  };

  const handleDemoBypass = () => {
    persistSession("demo@monetrik.app");
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    clearSession();
    setAuthFeedback("");
    setAuthStatus('');
  };

  // State modifier wrappers
  const handleAddPerson = (newPerson: Omit<Person, 'id'>) => {
    const person: Person = {
      ...newPerson,
      id: `p-${Date.now()}`
    };
    setPeople(prev => [...prev, person]);
  };

  const handleToggleActivePerson = (id: string) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleDeletePerson = (id: string) => {
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePerson = (updated: Person) => {
    setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddIncome = (newIncome: Omit<Income, 'id'>) => {
    const income: Income = {
      ...newIncome,
      id: `in-${Date.now()}`
    };
    setIncomes(prev => [...prev, income]);
  };

  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      ...newExpense,
      id: `ex-${Date.now()}`
    };
    setExpenses(prev => [...prev, expense]);
  };

  const handleDeleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(inc => inc.id !== id));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const handleUpdateIncome = (updated: Income) => {
    setIncomes(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
  };

  const handleUpdateExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updated.id ? updated : exp));
  };

  const handleBulkUpdateExpenses = (updatedList: Expense[]) => {
    setExpenses(prev => prev.map(exp => {
      const match = updatedList.find(u => u.id === exp.id);
      return match ? match : exp;
    }));
  };

  const handleBulkDeleteExpenses = (idsToDelete: string[]) => {
    setExpenses(prev => prev.filter(exp => !idsToDelete.includes(exp.id)));
  };

  const handleBulkUpdateIncomes = (updatedList: Income[]) => {
    setIncomes(prev => prev.map(inc => {
      const match = updatedList.find(u => u.id === inc.id);
      return match ? match : inc;
    }));
  };

  const handleBulkDeleteIncomes = (idsToDelete: string[]) => {
    setIncomes(prev => prev.filter(inc => !idsToDelete.includes(inc.id)));
  };

  // Aggregated live KPIs for Main Dashboard Grid
  const totalIncomeValue = incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpenseValue = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const mainBalance = totalIncomeValue - totalExpenseValue;

  const currentMonthName = "Maio, 2026"; // Consistent with requested time mock

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-zinc-950 selection:text-white antialiased">
      
      {/* 1. Auth gate if user is not authenticated */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-zinc-50 font-sans">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            
            {/* Header / Brand Logo */}
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-zinc-950 text-white rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
                <PiggyBank className="h-6 w-6" id="logo-icon-auth" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{brandName}</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                SaaS Inteligente de Gestão Financeira Familiar. Design moderno com custos de infraestrutura extremamente calculados.
              </p>
            </div>

            {/* Auth feedbacks */}
            {authFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs flex gap-2 items-start ${
                authStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                authStatus === 'error' ? 'bg-red-50 text-red-800 border-red-100' :
                'bg-zinc-50 text-zinc-500 border-zinc-100'
              }`}>
                {authStatus === 'success' ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-650 shrink-0" />}
                <span className="leading-snug">{authFeedback}</span>
              </div>
            )}

            {/* LOGIN VIEW */}
            {authView === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">E-mail Corporativo / Familiar</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="seu@parceiro.com"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-700">Senha de Acesso</label>
                    <button
                      type="button"
                      onClick={() => { setAuthView('forgot'); setAuthFeedback(""); }}
                      className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-950"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="password"
                      value={passInput}
                      onChange={e => setPassInput(e.target.value)}
                      placeholder="Inserir chave de acesso"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-auth-submit-login"
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  Confirmar Credenciais
                </button>
              </form>
            )}

            {/* REGISTER VIEW */}
            {authView === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Nome do Titular Familiar</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="Ex: Amanda Matos"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">E-mail Familiar de Contato</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="amanda@email.com"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Senha Segura</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="password"
                      value={passInput}
                      onChange={e => setPassInput(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-auth-submit-register"
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Registrar e Enviar E-mail
                </button>
              </form>
            )}

            {/* FORGOT VIEW */}
            {authView === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-zinc-500 leading-relaxed text-center">
                  Dono do SaaS, configurou seu SMTP Zoho? Insira seu e-mail para receber as instruções imediatas de redefinição gratuitas.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">E-mail do Cadastro</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="amanda@email.com"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-auth-submit-forgot"
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Disparar Recuperação
                </button>
              </form>
            )}

            {/* View Switchers */}
            <div className="text-center pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
              {authView === 'login' ? (
                <>
                  <span className="text-zinc-500 font-sans">Não possui uma conta?</span>
                  <button
                    onClick={() => { setAuthView('register'); setAuthFeedback(""); }}
                    className="font-bold text-zinc-950 hover:underline"
                  >
                    Cadastre-se grátis
                  </button>
                </>
              ) : (
                <>
                  <span className="text-zinc-500 font-sans">Já é cadastrado?</span>
                  <button
                    onClick={() => { setAuthView('login'); setAuthFeedback(""); }}
                    className="font-bold text-zinc-950 hover:underline animate-fade-in"
                  >
                    Fazer Login
                  </button>
                </>
              )}
            </div>

            {/* Demo Quick Bypass Button (Great UX decision) */}
            <div className="pt-2 text-center text-xs">
              <span className="text-zinc-400 text-[10px] block mb-2">Quer apenas avaliar o sistema com dados predefinidos?</span>
              <button
                type="button"
                onClick={handleDemoBypass}
                id="btn-demo-bypass"
                className="inline-flex py-2 px-4 rounded-xl border border-zinc-300 bg-white font-semibold text-zinc-700 hover:bg-zinc-100 text-[11px] items-center justify-center cursor-pointer transition-colors"
              >
                Entrar com Modo Demonstração (XP Família)
              </button>
            </div>

          </div>
        </div>
      ) : (
        
        // 2. Main App Dashboard layout
        <div className="flex flex-col min-h-screen">
          
          {/* Header Topbar Navigation */}
          <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
              
              {/* Brand Logo and Title */}
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-zinc-950 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
                  <PiggyBank className="h-5 w-5" id="header-brand-logo" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight text-zinc-950 flex items-center gap-1.5">
                    {brandName}
                    <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-medium">SaaS MVP</span>
                  </h1>
                  <span className="text-[10px] text-zinc-400 block mt-0.5 leading-none font-medium">Finanças Familiares</span>
                </div>
              </div>

              {/* Navigation Tabs - Desktop View */}
              <nav className="hidden md:flex items-center gap-1 text-xs">
                
                <button
                  onClick={() => setActiveTab('dashboard')}
                  id="tab-dashboard"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Radar Analítico
                </button>

                <button
                  onClick={() => setActiveTab('planilha')}
                  id="tab-planilha"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'planilha' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Planilha Evolução
                </button>

                <button
                  onClick={() => setActiveTab('transactions')}
                  id="tab-transactions"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'transactions' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Lançar Fluxos
                </button>

                <button
                  onClick={() => setActiveTab('people')}
                  id="tab-people"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'people' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Nossos Familiares
                </button>

                <button
                  onClick={() => setActiveTab('insights')}
                  id="tab-insights"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'insights' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Mapeador IA
                </button>

                <button
                  onClick={() => setActiveTab('chatbot')}
                  id="tab-chatbot"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'chatbot' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  FinancIA Chat
                </button>

                <button
                  onClick={() => setActiveTab('docs')}
                  id="tab-docs"
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeTab === 'docs' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                >
                  Arquitetura & Docs
                </button>

              </nav>

              {/* Right Menu: User profile and Logout */}
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-zinc-900 leading-none">
                    {principalPerson.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1 leading-none">
                    Titular Familiar
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  id="btn-logout"
                  className="p-2 border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors shrink-0"
                  title="Sair do Sistema"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>

                {/* Mobile Menu Icon */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-zinc-500 hover:text-zinc-950 rounded-xl transition-colors"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>

            </div>

            {/* Mobile Navigation Dropdown drawer */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-zinc-100 bg-white p-4 space-y-1.5 flex flex-col items-stretch text-xs animate-fade-in">
                {[
                  { id: 'dashboard', val: 'Radar Analítico' },
                  { id: 'planilha', val: 'Planilha Evolução' },
                  { id: 'transactions', val: 'Lançar Fluxos' },
                  { id: 'people', val: 'Nossos Familiares' },
                  { id: 'insights', val: 'Mapeador IA' },
                  { id: 'chatbot', val: 'FinancIA Chat' },
                  { id: 'docs', val: 'Arquitetura & Docs' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setMobileMenuOpen(false); }}
                    className={`p-2.5 rounded-lg text-left font-semibold ${activeTab === tab.id ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                  >
                    {tab.val}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* Core App View Content panel */}
          <main className="flex-1 w-full mx-auto px-4 md:px-8 py-8 max-w-7xl">
            
            {/* Quick overview metric ribbon for standard dashboard, or specific renders */}
            {activeTab === 'dashboard' && (
              <PanoramaGeral
                people={people}
                incomes={incomes}
                expenses={expenses}
              />
            )}

            {activeTab === 'planilha' && (
              <FinaPlanMatrix
                people={people}
                incomes={incomes}
                expenses={expenses}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsManager
                people={people}
                incomes={incomes}
                expenses={expenses}
                onAddIncome={handleAddIncome}
                onAddExpense={handleAddExpense}
                onDeleteIncome={handleDeleteIncome}
                onDeleteExpense={handleDeleteExpense}
                onUpdateIncome={handleUpdateIncome}
                onUpdateExpense={handleUpdateExpense}
                onBulkUpdateExpenses={handleBulkUpdateExpenses}
                onBulkDeleteExpenses={handleBulkDeleteExpenses}
                onBulkUpdateIncomes={handleBulkUpdateIncomes}
                onBulkDeleteIncomes={handleBulkDeleteIncomes}
              />
            )}

            {activeTab === 'people' && (
              <PeopleManager
                people={people}
                onAddPerson={handleAddPerson}
                onToggleActive={handleToggleActivePerson}
                onDeletePerson={handleDeletePerson}
                onUpdatePerson={handleUpdatePerson}
              />
            )}

            {activeTab === 'insights' && (
              <FinanceInsights
                people={people}
                incomes={incomes}
                expenses={expenses}
                alertSettings={alertSettings}
                onChangeSettings={setAlertSettings}
              />
            )}

            {activeTab === 'chatbot' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950">FinancIA Chatbot</h2>
                  <p className="text-xs text-zinc-500 mt-1">Converse diretamente com o assistente especializado do SaaS e receba diagnósticos sobre os lançamentos ativos.</p>
                </div>
                <AIAssistant
                  people={people}
                  incomes={incomes}
                  expenses={expenses}
                />
              </div>
            )}

            {activeTab === 'docs' && (
              <SaasArchitectureDoc />
            )}

          </main>

          {/* Footer margin credit */}
          <footer className="border-t border-zinc-200 bg-white py-6">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <span>© 2026 {brandName}. Modelo de Gestão Financeira Familiar. Todos os direitos reservados.</span>
              <div className="flex gap-4">
                <span>VPS Nível: Stack Compacta</span>
                <span>•</span>
                <span>Provedores: Let's Encrypt / Resend SMTP</span>
              </div>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}
