/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./lib/firebase";
import {
  loadPeople, savePerson, deletePerson,
  loadIncomes, saveIncome, deleteIncome,
  loadExpenses, saveExpense, deleteExpense,
  loadSettings, saveSettings as fsaveSettings,
  loadSubcategories, saveSubcategories as fsSaveSubcategories,
  migrateFromLocalStorage, batchSaveItems,
} from "./lib/firestore";
import type { SubcategoryItem } from "./components/TransactionsManager";
import { Person, Income, Expense, AlertSettings } from "./types";
import PeopleManager from "./components/PeopleManager";
import TransactionsManager, { DEFAULT_SUBCATEGORIES } from "./components/TransactionsManager";
import FinanceInsights from "./components/FinanceInsights";
import UserProfile from "./components/UserProfile";
import PanoramaGeral from "./components/PanoramaGeral";
import FinaPlanMatrix from "./components/FinaPlanMatrix";
import AIAssistant from "./components/AIAssistant";
import SaasArchitectureDoc from "./components/SaasArchitectureDoc";
import OnboardingSetup from "./components/OnboardingSetup";
import ImportData from "./components/ImportData";
import SettingsSidebar from "./components/SettingsSidebar";
import {
  PiggyBank, ArrowDownRight, ArrowUpRight, Shield, Layers,
  BookOpen, HelpCircle, Mail, Lock, Check, AlertCircle, Menu, X, Loader, Upload, SettingsIcon
} from "lucide-react";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Auth Form Fields
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [confirmPassInput, setConfirmPassInput] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [authStatus, setAuthStatus] = useState<'success' | 'error' | 'info' | ''>('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    const email = localStorage.getItem("kashfam_email");
    if (!email) return false;
    if (localStorage.getItem(`kashfam_onboarded_${email}`) === "true") return true;
    // Fallback: se já existe um familiar com nome real, pula o onboarding
    try {
      const saved = localStorage.getItem("kashfam_people");
      if (saved) {
        const people = JSON.parse(saved);
        if (people.length > 0 && people[0].name !== "Titular da Família") {
          localStorage.setItem(`kashfam_onboarded_${email}`, "true");
          return true;
        }
      }
    } catch {}
    return false;
  });

  // Subcategorias — por usuário (uid)
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>(() => {
    const uid = localStorage.getItem("kashfam_uid");
    const key = uid ? `kashfam_subcategories_${uid}` : "kashfam_subcategories";
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    // fallback: chave global legada
    const legacy = localStorage.getItem("kashfam_subcategories");
    if (legacy) return JSON.parse(legacy);
    // fallback final: usar subcategorias padrão
    return DEFAULT_SUBCATEGORIES;
  });

  // App core states
  const [people, setPeople] = useState<Person[]>(() => {
    // Se está autenticado, começa vazio e carrega do Firestore
    if (isAuthenticated) return [];
    // Senão, tenta localStorage (nunca vai usar DEFAULT_PEOPLE)
    const saved = localStorage.getItem("kashfam_people");
    return saved ? JSON.parse(saved) : [];
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    // Sempre tentar carregar do localStorage primeiro
    const saved = localStorage.getItem("kashfam_incomes");
    if (saved) return JSON.parse(saved);
    // Se autenticado, começa vazio para carregar do Firestore depois
    if (isAuthenticated) return [];
    return [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    // Sempre tentar carregar do localStorage primeiro
    const saved = localStorage.getItem("kashfam_expenses");
    if (saved) return JSON.parse(saved);
    // Se autenticado, começa vazio para carregar do Firestore depois
    if (isAuthenticated) return [];
    return [];
  });

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem("kashfam_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Navigation state
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'planilha' | 'transactions' | 'people' | 'insights' | 'chatbot' | 'docs'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [openSubcategoriesModal, setOpenSubcategoriesModal] = useState(false);

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
    if (userId && isFirebaseConfigured) {
      fsaveSettings(userId, alertSettings).catch(() => {});
    }
  }, [alertSettings, userId]);

  // ─── helpers de sessão local ───────────────────────────────────────────────
  const persistSession = (email: string) => {
    setIsAuthenticated(true);
    setSessionEmail(email);
    setIsOnboarded(localStorage.getItem(`kashfam_onboarded_${email}`) === "true");
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
      (async () => {
        if (user && user.emailVerified) {
          const email = user.email || "";
          const uid = user.uid;
          setIsAuthenticated(true);
          setSessionEmail(email);
          setUserId(uid);
          localStorage.setItem("kashfam_auth", "true");
          localStorage.setItem("kashfam_email", email);
          localStorage.setItem("kashfam_uid", uid);

          // Onboarding flag
          let onboarded = localStorage.getItem(`kashfam_onboarded_${email}`) === "true";
          if (!onboarded) {
            try {
              const saved = localStorage.getItem("kashfam_people");
              if (saved) {
                const p = JSON.parse(saved);
                if (p.length > 0 && p[0].name !== "Titular da Família") {
                  localStorage.setItem(`kashfam_onboarded_${email}`, "true");
                  onboarded = true;
                }
              }
            } catch {}
          }
          setIsOnboarded(onboarded);

          // Migrar localStorage → Firestore (só na primeira vez)
          await migrateFromLocalStorage(uid).catch(() => {});

          // Carregar dados do Firestore
          const [fsPeople, fsIncomes, fsExpenses, fsSettings] = await Promise.all([
            loadPeople(uid).catch(() => [] as Person[]),
            loadIncomes(uid).catch(() => [] as Income[]),
            loadExpenses(uid).catch(() => [] as Expense[]),
            loadSettings(uid).catch(() => null),
          ]);

          if (fsPeople.length > 0) {
            const PLACEHOLDERS = ["Titular da Família", "Cônjuge", "Filho(a)"];
            const validPeople = fsPeople.filter(p => p.id);
            const realPeople = validPeople.filter(p => !PLACEHOLDERS.includes(p.name));
            const fakePeople = validPeople.filter(p => PLACEHOLDERS.includes(p.name));
            const brokenPeople = fsPeople.filter(p => !p.id);

            // Remove placeholders e pessoas quebradas (sem ID) do Firestore
            if (fakePeople.length > 0 || brokenPeople.length > 0) {
              fakePeople.forEach(p => deletePerson(uid, p.id).catch(() => {}));
              brokenPeople.forEach(p => {
                if (p.id) deletePerson(uid, p.id).catch(() => {});
              });
            }

            if (realPeople.length > 0) {
              setPeople(realPeople);
              if (!onboarded) {
                localStorage.setItem(`kashfam_onboarded_${email}`, "true");
                setIsOnboarded(true);
              }
            }
          }
          if (fsIncomes.length > 0) setIncomes(fsIncomes);
          if (fsExpenses.length > 0) setExpenses(fsExpenses);
          if (fsSettings) setAlertSettings(fsSettings);

          // Carregar subcategorias do usuário
          const fsSubcats = await loadSubcategories(uid).catch(() => null);
          if (fsSubcats && fsSubcats.length > 0) {
            setSubcategories(fsSubcats);
            localStorage.setItem(`kashfam_subcategories_${uid}`, JSON.stringify(fsSubcats));
          } else {
            // Migrar subcategorias legadas (chave global → chave por UID)
            const legacy = localStorage.getItem("kashfam_subcategories");
            if (legacy) {
              const parsed = JSON.parse(legacy);
              setSubcategories(parsed);
              localStorage.setItem(`kashfam_subcategories_${uid}`, legacy);
            }
          }

        } else {
          setIsAuthenticated(false);
          setSessionEmail("");
          setUserId(null);
          setIsOnboarded(false);
          localStorage.removeItem("kashfam_auth");
          localStorage.removeItem("kashfam_email");
        }
      })();
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

    setIsAuthLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, emailInput.trim(), passInput);
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setPendingVerificationEmail(emailInput.trim());
          setAuthFeedback("E-mail ainda não verificado. Verifique sua caixa de entrada e clique no link.");
          setAuthStatus('error');
          return;
        }
        setAuthFeedback("");
        setPendingVerificationEmail("");
        // onAuthStateChanged cuida de setar isAuthenticated
      } else {
        // Fallback sem Firebase: aceita qualquer credencial válida
        persistSession(emailInput.trim());
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/user-not-found": "E-mail não cadastrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
      };
      setAuthFeedback(msgs[err.code] || "Erro ao fazer login. Tente novamente.");
      setAuthStatus('error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ─── Validação de senha (padrão NIST/OWASP) ────────────────────────────────
  const passwordRules = [
    { label: "Mínimo 8 caracteres",      test: (p: string) => p.length >= 8 },
    { label: "Uma letra maiúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Uma letra minúscula (a-z)", test: (p: string) => /[a-z]/.test(p) },
    { label: "Um número (0-9)",           test: (p: string) => /[0-9]/.test(p) },
    { label: "Um símbolo (!@#$...)",      test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const getPasswordStrength = (p: string) => {
    const passed = passwordRules.filter(r => r.test(p)).length;
    if (passed <= 2) return { label: "Fraca",   color: "bg-red-500",    width: "w-1/5" };
    if (passed === 3) return { label: "Regular", color: "bg-amber-400",  width: "w-3/5" };
    if (passed === 4) return { label: "Boa",     color: "bg-blue-500",   width: "w-4/5" };
    return                   { label: "Forte",   color: "bg-emerald-500",width: "w-full" };
  };

  const isPasswordValid = (p: string) => passwordRules.every(r => r.test(p));

  // ─── Cadastro ────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passInput.trim() || !confirmPassInput.trim()) {
      setAuthFeedback("Por favor, preencha todos os campos do cadastro.");
      setAuthStatus('error');
      return;
    }
    if (passInput !== confirmPassInput) {
      setAuthFeedback("As senhas não coincidem. Verifique e tente novamente.");
      setAuthStatus('error');
      return;
    }
    if (!isPasswordValid(passInput)) {
      setAuthFeedback("A senha não atende aos requisitos mínimos de segurança.");
      setAuthStatus('error');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passInput);
        await sendEmailVerification(cred.user);

        // Desloga até o e-mail ser verificado
        await signOut(auth);

        // Atualiza o titular na lista de pessoas
        setPeople(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], name: nameInput.trim(), email: emailInput.trim() };
          return updated;
        });

        setPendingVerificationEmail(emailInput.trim());
        setAuthFeedback(`Conta criada! Enviamos um e-mail de verificação para "${emailInput.trim()}". Clique no link e depois faça login.`);
        setAuthStatus('success');
        setAuthView('login');
      } else {
        // Fallback sem Firebase: cria sessão local
        setPeople(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], name: nameInput.trim(), email: emailInput.trim() };
          return updated;
        });
        persistSession(emailInput.trim());
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/email-already-in-use": "Este e-mail já possui cadastro. Faça login.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/weak-password": "Senha muito fraca. Use ao menos 6 caracteres.",
      };
      setAuthFeedback(msgs[err.code] || "Erro ao criar conta. Tente novamente.");
      setAuthStatus('error');
    } finally {
      setIsAuthLoading(false);
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

    setIsAuthLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await sendPasswordResetEmail(auth, emailInput.trim());
        setAuthFeedback(`E-mail de redefinição enviado para "${emailInput}". Verifique sua caixa de entrada.`);
        setAuthStatus('success');
      } else {
        setAuthFeedback("Recuperação de senha requer Firebase configurado.");
        setAuthStatus('info');
      }
    } catch (err: any) {
      setAuthFeedback("Não foi possível enviar o e-mail. Verifique o endereço informado.");
      setAuthStatus('error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Helper: chama Firestore só se disponível, sem travar o app em erros
  const fs = async (fn: () => Promise<void>) => {
    console.log("[FS] userId:", userId, "| configured:", isFirebaseConfigured);
    if (!userId || !isFirebaseConfigured) {
      console.warn("[FS] Skipped — userId ou Firebase não disponível");
      return;
    }
    fn().catch(e => console.error("[FS] Erro Firestore:", e));
  };

  const handleSaveSubcategories = (newSubs: SubcategoryItem[]) => {
    setSubcategories(newSubs);
    if (userId) {
      localStorage.setItem(`kashfam_subcategories_${userId}`, JSON.stringify(newSubs));
      fsSaveSubcategories(userId, newSubs).catch(() => {});
    }
  };

  const handleImportData = (importedRows: any[], newSubcategoryNames: string[]) => {
    if (!people.length) {
      alert("É necessário adicionar pelo menos um membro da família antes de importar.");
      return;
    }

    const personId = principalPerson.id;
    const newIncomes: Income[] = [];
    const newExpenses: Expense[] = [];

    // Criar novas subcategorias automaticamente
    const updatedSubcategories = [...subcategories];
    for (const subName of newSubcategoryNames) {
      if (!updatedSubcategories.find(s => s.name === subName)) {
        // Determinar se é income ou expense baseado nos dados
        const isIncome = importedRows.some(
          row => row.subcategoria === subName && row.tipo === 'RECEITA'
        );
        updatedSubcategories.push({
          id: `sub-${Date.now()}-${Math.random()}`,
          type: isIncome ? 'income' : 'expense',
          category: subName,
          name: subName,
          active: true,
        });
      }
    }

    // Converter linhas importadas em Income/Expense
    for (const row of importedRows) {
      const baseData = {
        date: row.data,
        notes: row.observacoes || undefined,
      };

      if (row.tipo === 'RECEITA') {
        newIncomes.push({
          id: `in-${Date.now()}-${Math.random()}`,
          personId,
          category: row.subcategoria,
          amount: Number(row.valor),
          isFixed: false,
          isRecurring: false,
          recurrence: 'eventual',
          ...baseData,
        });
      } else {
        newExpenses.push({
          id: `ex-${Date.now()}-${Math.random()}`,
          personId,
          name: row.descricao,
          category: row.subcategoria,
          amount: Number(row.valor),
          isFixed: false,
          isRecurring: false,
          recurrence: 'eventual',
          paymentMethod: 'Pix',
          ...baseData,
        });
      }
    }

    // Atualizar estados
    setSubcategories(updatedSubcategories);
    setIncomes(prev => [...prev, ...newIncomes]);
    setExpenses(prev => [...prev, ...newExpenses]);

    // Salvar no Firebase em background
    if (userId) {
      localStorage.setItem(`kashfam_subcategories_${userId}`, JSON.stringify(updatedSubcategories));
      fsSaveSubcategories(userId, updatedSubcategories).catch(() => {});

      // Salvar incomes/expenses em lote
      if (newIncomes.length > 0) {
        batchSaveItems(userId, 'incomes', newIncomes).catch(() => {});
      }
      if (newExpenses.length > 0) {
        batchSaveItems(userId, 'expenses', newExpenses).catch(() => {});
      }
    }

    setShowImportModal(false);
  };

  const handleCompleteOnboarding = (memberData: Omit<import("./types").Person, "id">) => {
    const newPerson: import("./types").Person = { ...memberData, id: "p1" };
    setPeople([newPerson]);
    setIncomes([]);
    setExpenses([]);

    if (isFirebaseConfigured && auth?.currentUser) {
      updateProfile(auth.currentUser, { displayName: memberData.name }).catch(() => {});
    }

    if (userId) {
      // Remove dados default que vieram da migração
      (async () => {
        try {
          const [people, incomes, expenses] = await Promise.all([
            loadPeople(userId),
            loadIncomes(userId).catch(() => []),
            loadExpenses(userId).catch(() => [])
          ]);

          // Remove pessoas fake (Cônjuge, Filho)
          await Promise.all(
            people.filter(p => p.id !== "p1").map(p => deletePerson(userId, p.id))
          );

          // Remove receitas e despesas default
          await Promise.all([
            ...incomes.map(inc => deleteIncome(userId, inc.id)),
            ...expenses.map(exp => deleteExpense(userId, exp.id))
          ]);

          await savePerson(userId, newPerson);
        } catch { /* */ }
      })();
    }

    localStorage.setItem(`kashfam_onboarded_${sessionEmail}`, "true");
    setIsOnboarded(true);
  };

  const handleDemoBypass = () => {
    const demoEmail = "demo@monetrik.app";
    localStorage.setItem(`kashfam_onboarded_${demoEmail}`, "true");
    setIsOnboarded(true);
    persistSession(demoEmail);
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    clearSession();
    setAuthFeedback("");
    setAuthStatus('');
  };

  // ─── Pessoas ────────────────────────────────────────────────────────────────
  // Plano free: máximo 1 pessoa
  const plan = "free"; // TODO: implementar sistema de planos real
  const maxPeopleForPlan = plan === "free" ? 1 : Infinity;
  const validPeople = people.filter(p => p.id);
  const canAddMorePeople = validPeople.length < maxPeopleForPlan;

  const handleAddPerson = (newPerson: Omit<Person, 'id'>) => {
    if (!canAddMorePeople) {
      alert(`Plano Free permite apenas ${maxPeopleForPlan} pessoa. Upgrade para Premium para adicionar mais.`);
      return;
    }
    const person: Person = { ...newPerson, id: `p-${Date.now()}` };
    setPeople(prev => [...prev, person]);
    fs(() => savePerson(userId!, person));
  };

  const handleToggleActivePerson = (id: string) => {
    setPeople(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, active: !p.active };
      fs(() => savePerson(userId!, updated));
      return updated;
    }));
  };

  const handleDeletePerson = (id: string) => {
    console.log("[DELETE] Deletando pessoa:", id);
    setPeople(prev => prev.filter(p => p.id !== id));
    fs(async () => {
      console.log("[DELETE] Chamando Firestore...");
      await deletePerson(userId!, id);
      console.log("[DELETE] Sucesso!");
    });
  };

  const handleUpdatePerson = (updated: Person) => {
    setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
    fs(() => savePerson(userId!, updated));
  };

  // ─── Receitas ───────────────────────────────────────────────────────────────
  const handleAddIncome = (newIncome: Omit<Income, 'id'>) => {
    const income: Income = { ...newIncome, id: `in-${Date.now()}` };
    setIncomes(prev => [...prev, income]);
    fs(() => saveIncome(userId!, income));
  };

  const handleDeleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(inc => inc.id !== id));
    fs(() => deleteIncome(userId!, id));
  };

  const handleUpdateIncome = (updated: Income) => {
    setIncomes(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
    fs(() => saveIncome(userId!, updated));
  };

  const handleBulkUpdateIncomes = (updatedList: Income[]) => {
    setIncomes(prev => prev.map(inc => {
      const match = updatedList.find(u => u.id === inc.id);
      return match ? match : inc;
    }));
    fs(() => batchSaveItems(userId!, "incomes", updatedList));
  };

  const handleBulkDeleteIncomes = (idsToDelete: string[]) => {
    setIncomes(prev => prev.filter(inc => !idsToDelete.includes(inc.id)));
    fs(async () => { for (const id of idsToDelete) await deleteIncome(userId!, id); });
  };

  // ─── Despesas ───────────────────────────────────────────────────────────────
  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expense: Expense = { ...newExpense, id: `ex-${Date.now()}` };
    setExpenses(prev => [...prev, expense]);
    fs(() => saveExpense(userId!, expense));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    fs(() => deleteExpense(userId!, id));
  };

  const handleUpdateExpense = (updated: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updated.id ? updated : exp));
    fs(() => saveExpense(userId!, updated));
  };

  const handleBulkUpdateExpenses = (updatedList: Expense[]) => {
    setExpenses(prev => prev.map(exp => {
      const match = updatedList.find(u => u.id === exp.id);
      return match ? match : exp;
    }));
    fs(() => batchSaveItems(userId!, "expenses", updatedList));
  };

  const handleBulkDeleteExpenses = (idsToDelete: string[]) => {
    setExpenses(prev => prev.filter(exp => !idsToDelete.includes(exp.id)));
    fs(async () => { for (const id of idsToDelete) await deleteExpense(userId!, id); });
  };

  // Aggregated live KPIs for Main Dashboard Grid
  const totalIncomeValue = incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpenseValue = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const mainBalance = totalIncomeValue - totalExpenseValue;

  const currentMonthName = "Maio, 2026"; // Consistent with requested time mock

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-zinc-950 selection:text-white antialiased">
      
      {/* Onboarding — primeiro acesso após login */}
      {isAuthenticated && !isOnboarded ? (
        <OnboardingSetup
          sessionEmail={sessionEmail}
          displayName={auth?.currentUser?.displayName || undefined}
          onComplete={handleCompleteOnboarding}
        />
      ) : null}

      {/* 1. Auth gate if user is not authenticated */}
      {!isAuthenticated ? (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-zinc-50 font-sans">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            
            {/* Header / Brand Logo */}
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-emerald-500 text-zinc-950 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
                <PiggyBank className="h-6 w-6" id="logo-icon-auth" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{brandName}</h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                SaaS Inteligente de Gestão Financeira Familiar. Design moderno com custos de infraestrutura extremamente calculados.
              </p>
            </div>

            {/* Auth feedbacks */}
            {authFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                authStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                authStatus === 'error' ? 'bg-red-50 text-red-800 border-red-100' :
                'bg-zinc-50 text-zinc-500 border-zinc-100'
              }`}>
                <div className="flex gap-2 items-start">
                  {authStatus === 'success' ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  <span className="leading-snug">{authFeedback}</span>
                </div>
                {pendingVerificationEmail && authStatus === 'error' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isFirebaseConfigured || !auth) return;
                      try {
                        const cred = await signInWithEmailAndPassword(auth, pendingVerificationEmail, passInput);
                        await sendEmailVerification(cred.user);
                        await signOut(auth);
                        setAuthFeedback("E-mail de verificação reenviado! Verifique sua caixa de entrada.");
                        setAuthStatus('success');
                      } catch {
                        setAuthFeedback("Não foi possível reenviar. Verifique o e-mail e tente novamente.");
                      }
                    }}
                    className="text-[10px] font-semibold underline text-red-700 hover:text-red-900 text-left"
                  >
                    Reenviar e-mail de verificação
                  </button>
                )}
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
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  {isAuthLoading && <Loader className="h-4 w-4 animate-spin" />}
                  {isAuthLoading ? "Entrando..." : "Confirmar Credenciais"}
                </button>
              </form>
            )}

            {/* REGISTER VIEW */}
            {authView === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
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
                      placeholder="Ex: Monetrik@2026"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  {/* Barra de força da senha */}
                  {passInput.length > 0 && (() => {
                    const strength = getPasswordStrength(passInput);
                    return (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <div className="h-1.5 flex-1 bg-zinc-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                          </div>
                          <span className={`text-[10px] font-semibold ml-2 ${
                            strength.label === 'Fraca' ? 'text-red-500' :
                            strength.label === 'Regular' ? 'text-amber-500' :
                            strength.label === 'Boa' ? 'text-blue-500' : 'text-emerald-600'
                          }`}>{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5">
                          {passwordRules.map((rule, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className={`h-3 w-3 rounded-full flex items-center justify-center shrink-0 ${rule.test(passInput) ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                                {rule.test(passInput) && <Check className="h-2 w-2 text-white" />}
                              </div>
                              <span className={`text-[10px] ${rule.test(passInput) ? 'text-emerald-700' : 'text-zinc-400'}`}>{rule.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Confirmar senha */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="password"
                      value={confirmPassInput}
                      onChange={e => setConfirmPassInput(e.target.value)}
                      placeholder="Digite a senha novamente"
                      className={`w-full text-xs border rounded-xl pl-10 pr-3 py-3 focus:outline-none transition-colors ${
                        confirmPassInput.length > 0
                          ? passInput === confirmPassInput
                            ? "border-emerald-400 bg-emerald-50/30 focus:border-emerald-500"
                            : "border-red-300 bg-red-50/30 focus:border-red-400"
                          : "border-zinc-200 bg-white focus:border-zinc-400"
                      }`}
                    />
                    {confirmPassInput.length > 0 && (
                      <span className={`absolute right-3 top-3 text-xs font-semibold ${passInput === confirmPassInput ? "text-emerald-600" : "text-red-500"}`}>
                        {passInput === confirmPassInput ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-auth-submit-register"
                  disabled={
                    isAuthLoading ||
                    (passInput.length > 0 && !isPasswordValid(passInput)) ||
                    (confirmPassInput.length > 0 && passInput !== confirmPassInput)
                  }
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isAuthLoading && <Loader className="h-4 w-4 animate-spin" />}
                  {isAuthLoading ? "Criando conta..." : "Registrar e Enviar E-mail"}
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
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isAuthLoading && <Loader className="h-4 w-4 animate-spin" />}
                  {isAuthLoading ? "Enviando..." : "Disparar Recuperação"}
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


          </div>
        </div>
      ) : isOnboarded ? (

        // 2. Main App Dashboard layout
        <div className="flex flex-col min-h-screen">
          
          {/* Header Topbar Navigation */}
          <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
              
              {/* Brand Logo and Title */}
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-emerald-500 text-zinc-950 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
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

              </nav>

              {/* Right Menu: User profile */}
              <div className="flex items-center gap-1">
                <UserProfile
                  displayName={principalPerson.name}
                  email={sessionEmail}
                  onLogout={handleLogout}
                />

                <button
                  onClick={() => setShowSettingsSidebar(true)}
                  className="p-2 rounded-lg font-semibold transition-all text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                  title="Configurações"
                >
                  <SettingsIcon size={20} />
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
                subcategories={subcategories}
                onSaveSubcategories={handleSaveSubcategories}
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
                openSubcategoriesModal={openSubcategoriesModal}
                setOpenSubcategoriesModal={setOpenSubcategoriesModal}
              />
            )}

            {activeTab === 'people' && (
              <PeopleManager
                people={people}
                canAddMore={canAddMorePeople}
                plan={plan}
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

          {/* Import Data Button (Floating on transactions tab) */}
          {activeTab === 'transactions' && isAuthenticated && (
            <button
              onClick={() => setShowImportModal(true)}
              className="fixed bottom-8 right-8 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all z-40"
            >
              <Upload size={20} />
              Importar Dados
            </button>
          )}

          {/* Import Data Modal */}
          {showImportModal && isAuthenticated && (
            <ImportData
              onClose={() => setShowImportModal(false)}
              onImportSuccess={handleImportData}
              existingSubcategories={subcategories.map((s: SubcategoryItem) => s.name)}
            />
          )}

          {/* Settings Sidebar */}
          <SettingsSidebar
            isOpen={showSettingsSidebar}
            onClose={() => setShowSettingsSidebar(false)}
            people={people}
            incomes={incomes}
            expenses={expenses}
            subcategories={subcategories}
            email={sessionEmail}
            onLogout={handleLogout}
            onMigrationComplete={() => {
              setIncomes([]);
              setExpenses([]);
            }}
            onGoToSubcategories={() => {
              setShowSettingsSidebar(false);
              setActiveTab('transactions');
              setOpenSubcategoriesModal(true);
            }}
          />

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
      ) : null}

    </div>
  );
}
