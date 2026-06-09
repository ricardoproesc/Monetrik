import React, { useState, useEffect } from "react";
import { Person, Income, Expense } from "../types";
import { Settings as SettingsIcon, Download, Upload, AlertCircle, CheckCircle, Loader, Lock, ExternalLink } from "lucide-react";
import type { SubcategoryItem } from "./TransactionsManager";
import { collection, deleteDoc, getDocs, query, setDoc, doc, getFirestore } from "firebase/firestore";
import app from "../lib/firebase";

interface SettingsProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  subcategories: SubcategoryItem[];
  email: string;
  onMigrationComplete: () => void;
  onGoToSubcategories?: () => void;
}

type MigrationStep = "info" | "flowChoice" | "config" | "confirm" | "uploading" | "validating" | "confirmPassword" | "success" | "error";

export default function Settings({
  people,
  incomes,
  expenses,
  subcategories,
  email,
  onMigrationComplete,
  onGoToSubcategories,
}: SettingsProps) {
  const [localSubcategories, setLocalSubcategories] = useState<SubcategoryItem[]>(subcategories);
  const [step, setStep] = useState<MigrationStep>("flowChoice");
  const [migrationMode, setMigrationMode] = useState<"prepare" | "upload">("prepare");
  const [selectedPeople, setSelectedPeople] = useState<string[]>(people.map(p => p.id));

  const incomeSubcats = localSubcategories.filter(s => s.type === "income");
  const expenseSubcats = localSubcategories.filter(s => s.type === "expense");

  const [selectedIncomeSubcats, setSelectedIncomeSubcats] = useState<string[]>(
    incomeSubcats.map(s => s.id)
  );
  const [selectedExpenseSubcats, setSelectedExpenseSubcats] = useState<string[]>(
    expenseSubcats.map(s => s.id)
  );
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Atualizar quando subcategories prop mudar
  useEffect(() => {
    setLocalSubcategories(subcategories);
  }, [subcategories]);

  const isTitular = people.some(p => p.relationship === "principal");
  if (!isTitular) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle size={32} className="text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-900 font-semibold">Apenas o titular da conta pode acessar Configurações</p>
        </div>
      </div>
    );
  }

  async function handleDownloadTemplate() {
    try {
      const selectedPeopleData = people.filter(p => selectedPeople.includes(p.id));
      const selectedIncomeSubcatsData = localSubcategories.filter(s =>
        s.type === "income" && selectedIncomeSubcats.includes(s.id)
      );
      const selectedExpenseSubcatsData = localSubcategories.filter(s =>
        s.type === "expense" && selectedExpenseSubcats.includes(s.id)
      );

      const response = await fetch("/api/migration/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: selectedPeopleData,
          incomes,
          expenses,
          incomeSubcategories: selectedIncomeSubcatsData,
          expenseSubcategories: selectedExpenseSubcatsData,
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monetrik-migracao.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStep("confirm");
    } catch (error) {
      setErrorMsg(`Erro: ${error instanceof Error ? error.message : "desconhecido"}`);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.match(/\.xlsx$/i)) {
        alert("Por favor, selecione um arquivo Excel (.xlsx)");
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        alert("Arquivo muito grande (máximo 50MB)");
        return;
      }
      setFile(selected);
    }
  }

  async function handleValidateFile() {
    if (!file) {
      alert("Selecione um arquivo");
      return;
    }

    setStep("validating");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = (e.target?.result as string).split(",")[1];

        const response = await fetch("/api/migration/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData,
            people: people.filter(p => selectedPeople.includes(p.id)),
            incomeSubcategories: subcategories.filter(s =>
              s.type === "income" && selectedIncomeSubcats.includes(s.id)
            ),
            expenseSubcategories: subcategories.filter(s =>
              s.type === "expense" && selectedExpenseSubcats.includes(s.id)
            ),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          setErrorMsg(err.error || "Erro na validação");
          setStep("error");
          return;
        }

        const result = await response.json();
        if (!result.valid) {
          setErrorMsg(`Arquivo inválido: ${result.errors?.[0]?.error || "dados inconsistentes"}`);
          setStep("error");
          return;
        }

        setStep("confirmPassword");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrorMsg(`Erro: ${error instanceof Error ? error.message : "desconhecido"}`);
      setStep("error");
    }
  }

  async function handleConfirmMigration() {
    if (!password) {
      alert("Digite sua senha para confirmar");
      return;
    }

    setStep("uploading");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = (e.target?.result as string).split(",")[1];

        const response = await fetch("/api/migration/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData,
            email,
            password,
            people: people.filter(p => selectedPeople.includes(p.id)),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          setErrorMsg(err.error || "Erro na migração");
          setStep("error");
          return;
        }

        const result = await response.json();

        // Salvar dados no Firestore/localStorage
        try {
          setStep("validating");

          // Se Firebase está disponível, usar Firestore
          if (app) {
            const db = getFirestore(app);

            // Deletar receitas e despesas antigas
            const incomesQuery = query(collection(db, "users", email, "incomes"));
            const expensesQuery = query(collection(db, "users", email, "expenses"));

            const incomesSnapshot = await getDocs(incomesQuery);
            const expensesSnapshot = await getDocs(expensesQuery);

            // Delete old incomes
            for (const docSnapshot of incomesSnapshot.docs) {
              await deleteDoc(docSnapshot.ref);
            }
            // Delete old expenses
            for (const docSnapshot of expensesSnapshot.docs) {
              await deleteDoc(docSnapshot.ref);
            }

            // Add new incomes from result
            if (result.newIncomes && Array.isArray(result.newIncomes)) {
              for (const income of result.newIncomes) {
                await setDoc(
                  doc(collection(db, "users", email, "incomes")),
                  income
                );
              }
            }

            // Add new expenses from result
            if (result.newExpenses && Array.isArray(result.newExpenses)) {
              for (const expense of result.newExpenses) {
                await setDoc(
                  doc(collection(db, "users", email, "expenses")),
                  expense
                );
              }
            }
          } else {
            // Fallback: usar localStorage
            if (result.newIncomes && Array.isArray(result.newIncomes)) {
              localStorage.setItem("kashfam_incomes", JSON.stringify(result.newIncomes));
            }
            if (result.newExpenses && Array.isArray(result.newExpenses)) {
              localStorage.setItem("kashfam_expenses", JSON.stringify(result.newExpenses));
            }
          }

          // Sucesso - mostrar apenas após salvar
          setSuccessMsg(
            `✓ Migração concluída!\n${result.incomesImported} receitas importadas\n${result.expensesImported} despesas importadas`
          );
          setStep("success");
          setPassword("");
          setFile(null);

          setTimeout(() => {
            onMigrationComplete();
          }, 2000);
        } catch (firebaseError) {
          console.error("Erro ao salvar dados:", firebaseError);
          setErrorMsg(`Erro ao salvar dados: ${firebaseError instanceof Error ? firebaseError.message : "desconhecido"}`);
          setStep("error");
        }
      };
      reader.readAsDataURL(file!);
    } catch (error) {
      setErrorMsg(`Erro: ${error instanceof Error ? error.message : "desconhecido"}`);
      setStep("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={24} className="text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Migração de Dados */}
      <div className="space-y-4">
        {/* Escolha de Fluxo */}
        {step === "flowChoice" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Migração de Dados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção 1: Preparar novo template */}
              <button
                onClick={() => {
                  setMigrationMode("prepare");
                  setStep("info");
                }}
                className="border-2 border-emerald-200 rounded-lg p-6 hover:bg-emerald-50 hover:border-emerald-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">📥</div>
                <h3 className="font-bold text-gray-900 mb-2">Preparar novo template</h3>
                <p className="text-sm text-gray-600">
                  Selecione pessoas e subcategorias para baixar um novo template
                </p>
              </button>

              {/* Opção 2: Fazer upload direto */}
              <button
                onClick={() => {
                  setMigrationMode("upload");
                  setStep("confirm");
                }}
                className="border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-50 hover:border-blue-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">📤</div>
                <h3 className="font-bold text-gray-900 mb-2">Usar template existente</h3>
                <p className="text-sm text-gray-600">
                  Você já tem um template preenchido? Faça upload agora
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Modal Informativo */}
        {step === "info" && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <AlertCircle size={32} className="text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Antes de começar...</h3>
                <p className="text-blue-800 mb-3">
                  Para realizar a migração de dados, certifique-se de que:
                </p>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <span className={people.length > 0 ? "text-green-600" : "text-orange-600"}>
                      {people.length > 0 ? "✓" : "⚠️"}
                    </span>
                    <strong>Todos os usuários/pessoas estão cadastrados</strong>
                    <span className="text-xs">({people.length} cadastrado(s))</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={subcategories.length > 0 ? "text-green-600" : "text-orange-600"}>
                      {subcategories.length > 0 ? "✓" : "⚠️"}
                    </span>
                    <strong>Todas as subcategorias estão criadas</strong>
                    <span className="text-xs">({subcategories.length} cadastrada(s))</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setStep("config")}
              disabled={people.length === 0 || subcategories.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg"
            >
              {people.length === 0 || subcategories.length === 0
                ? "⚠️ Cadastre pessoas e subcategorias primeiro"
                : "✓ Continuar com a Migração"}
            </button>
          </div>
        )}

        {/* Configuration Section - apenas para modo "prepare" */}
        {(step === "config" || (step === "confirm" && migrationMode === "prepare")) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Migração de Dados em Massa</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Selecione quais dados deseja incluir no template de migração:
            </p>

            {/* Pessoas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Pessoas ({selectedPeople.length}/{people.length})</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPeople(people.map(p => p.id))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedPeople([])}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              {people.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">Nenhuma pessoa cadastrada</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {people.map(person => (
                    <div key={person.id} className="flex items-center">
                      <input
                        id={`person-${person.id}`}
                        type="checkbox"
                        checked={selectedPeople.includes(person.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPeople([...selectedPeople, person.id]);
                          } else {
                            setSelectedPeople(selectedPeople.filter(id => id !== person.id));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer accent-blue-600"
                      />
                      <label htmlFor={`person-${person.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {person.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info: Configure no menu de Subcategorias */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-2">
                  Deseja adicionar novas subcategorias?
                </p>
                <p className="text-blue-800 mb-3">
                  Configure no menu de Subcategorias do app para manter tudo organizado.
                </p>
                {onGoToSubcategories && (
                  <button
                    onClick={onGoToSubcategories}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    <ExternalLink size={14} />
                    Ir para Subcategorias
                  </button>
                )}
              </div>
            </div>

            {/* Subcategorias Receitas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Subcategorias de Receitas ({selectedIncomeSubcats.length}/{incomeSubcats.length})</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedIncomeSubcats(incomeSubcats.map(s => s.id))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedIncomeSubcats([])}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              {incomeSubcats.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">Nenhuma subcategoria de receita cadastrada</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {incomeSubcats.map(subcat => (
                    <div key={subcat.id} className="flex items-center">
                      <input
                        id={`income-${subcat.id}`}
                        type="checkbox"
                        checked={selectedIncomeSubcats.includes(subcat.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIncomeSubcats([...selectedIncomeSubcats, subcat.id]);
                          } else {
                            setSelectedIncomeSubcats(selectedIncomeSubcats.filter(id => id !== subcat.id));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer accent-green-600"
                      />
                      <label htmlFor={`income-${subcat.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {subcat.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subcategorias Despesas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Subcategorias de Despesas ({selectedExpenseSubcats.length}/{expenseSubcats.length})</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedExpenseSubcats(expenseSubcats.map(s => s.id))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedExpenseSubcats([])}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              {expenseSubcats.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">Nenhuma subcategoria de despesa cadastrada</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {expenseSubcats.map(subcat => (
                    <div key={subcat.id} className="flex items-center">
                      <input
                        id={`expense-${subcat.id}`}
                        type="checkbox"
                        checked={selectedExpenseSubcats.includes(subcat.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExpenseSubcats([...selectedExpenseSubcats, subcat.id]);
                          } else {
                            setSelectedExpenseSubcats(selectedExpenseSubcats.filter(id => id !== subcat.id));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer accent-red-600"
                      />
                      <label htmlFor={`expense-${subcat.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {subcat.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-6"
            >
              <Download size={20} />
              Baixar Template
            </button>
          </div>
          </div>
        )}

        {/* Step 2: Upload and Validate */}
        {step === "confirm" && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-4">2. Preencha e faça upload do template</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-input"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Upload size={40} className="text-blue-600 mx-auto mb-3" />
                <p className="text-lg font-semibold text-gray-900">Selecione o arquivo</p>
                <p className="text-sm text-gray-600">Arquivo Excel (.xlsx) preenchido</p>
              </label>
            </div>

            {file && (
              <div className="mt-4 flex items-center gap-3 bg-green-50 p-4 rounded border border-green-200">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-green-900 font-semibold">{file.name}</span>
              </div>
            )}

            <button
              onClick={handleValidateFile}
              disabled={!file || step === "validating"}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              {step === "validating" && <Loader size={18} className="animate-spin" />}
              {step === "validating" ? "Processando..." : "Validar e Prosseguir"}
            </button>
          </div>
        )}

        {/* Step 3: Confirm Password */}
        {step === "confirmPassword" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle size={24} className="text-red-600 mb-2" />
              <p className="text-red-900 font-semibold mb-2">⚠️ Esta ação é irreversível!</p>
              <p className="text-red-800 text-sm">
                Todos os registros de receitas e despesas existentes serão <strong>permanentemente deletados</strong> e
                substituídos pelos dados na planilha.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Digite sua senha para confirmar
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("confirm");
                  setPassword("");
                  setFile(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMigration}
                disabled={!password || step === "validating"}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                {step === "validating" && <Loader size={18} className="animate-spin" />}
                {step === "validating" ? "Salvando..." : "Confirmar Migração"}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-600 mx-auto" />
            <div className="whitespace-pre-line text-gray-700 font-semibold">{successMsg}</div>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900">{errorMsg}</div>
            <button
              onClick={() => {
                setStep("config");
                setErrorMsg("");
                setPassword("");
                setFile(null);
              }}
              className="w-full border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
