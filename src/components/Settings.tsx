import React, { useState, useEffect } from "react";
import { Person, Income, Expense } from "../types";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader,
  Crown,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import type { SubcategoryItem } from "./TransactionsManager";
import {
  downloadMigrationTemplate,
  migrationPreview,
  migrationExecute,
  loadProjetos,
  renameProject,
  type MigrationPreview,
} from "../lib/api";

interface SettingsProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  subcategories: SubcategoryItem[];
  email: string;
  userId: string;
  onMigrationComplete: () => void;
  onGoToSubcategories?: () => void;
}

// Fluxo novo: intro -> upload -> preview -> confirm -> success/error.
type MigrationStep = "intro" | "preview" | "executing" | "success" | "error";

export default function Settings({
  people,
  onMigrationComplete,
}: SettingsProps) {
  const [step, setStep] = useState<MigrationStep>("intro");
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>("");
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Projeto atual (primeiro projeto do usuário) — usado para nome pré-preenchido e rename.
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [savedCounts, setSavedCounts] = useState<{
    pessoasCriadas: number;
    categorias: number;
    subcategorias: number;
    receitas: number;
    despesas: number;
  } | null>(null);

  // nomePlanilha -> id de familiar existente OU "new" (vínculo escolhido).
  const [personMap, setPersonMap] = useState<Record<string, string>>({});

  // Carrega o projeto atual ao montar.
  useEffect(() => {
    loadProjetos()
      .then((projetos) => {
        const first = projetos[0];
        if (first) {
          setProjectId(first.id_projeto);
          setProjectName(first.nome || "");
        }
      })
      .catch(() => {});
  }, []);

  // Ao receber um preview, inicializa o vínculo de cada pessoa:
  // match exato -> a pessoa existente; senão a sugestão (se houver); senão "novo".
  useEffect(() => {
    if (!preview) return;
    const m: Record<string, string> = {};
    for (const p of preview.pessoas) {
      m[p.nomePlanilha] = p.existenteId ?? p.sugestaoId ?? "new";
    }
    setPersonMap(m);
  }, [preview]);

  // Quantas pessoas serão de fato CRIADAS (mapeadas para "new") e se isso
  // exige Premium no plano básico.
  const novasCount = preview
    ? preview.pessoas.filter((p) => !p.existenteId && (personMap[p.nomePlanilha] ?? "new") === "new").length
    : 0;
  const requerPremium = !!preview && novasCount > 0 && preview.plano === "basico";
  const podeExecutar = !!preview && preview.erros.length === 0 && !requerPremium;

  // O usuário autenticado é o dono da conta. Só exigimos que o cadastro
  // inicial (onboarding) tenha sido concluído — a migração precisa de um
  // titular cadastrado para ser o responsável do projeto.
  if (people.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle size={32} className="text-amber-600 mx-auto mb-3" />
          <p className="text-amber-900 font-semibold">Conclua o cadastro inicial antes de migrar dados.</p>
        </div>
      </div>
    );
  }

  async function handleDownloadTemplate() {
    setDownloading(true);
    setErrorMsg("");
    try {
      await downloadMigrationTemplate();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro ao baixar o modelo");
    } finally {
      setDownloading(false);
    }
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
      reader.readAsDataURL(f);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.match(/\.xlsx$/i)) {
      setErrorMsg("Por favor, selecione um arquivo Excel (.xlsx)");
      return;
    }
    setErrorMsg("");
    setFile(selected);
    setLoading(true);
    try {
      const b64 = await fileToBase64(selected);
      setFileData(b64);
      const result = await migrationPreview(b64);
      setPreview(result);
      setStep("preview");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro ao analisar a planilha");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    if (!podeExecutar) return;
    setStep("executing");
    setErrorMsg("");
    try {
      // Se o usuário ajustou o nome do projeto, salva antes de importar.
      if (projectId && projectName.trim()) {
        await renameProject(projectId, projectName.trim()).catch(() => {});
      }
      const result = await migrationExecute(fileData, projectName.trim() || undefined, personMap);
      setSavedCounts(result);
      setStep("success");
      onMigrationComplete();
      // Recarrega a página para refletir todos os dados importados (pessoas,
      // categorias, subcategorias e lançamentos) já carregados do backend.
      setTimeout(() => window.location.reload(), 2500);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro ao importar os dados");
      setStep("error");
    }
  }

  function resetFlow() {
    setStep("intro");
    setFile(null);
    setFileData("");
    setPreview(null);
    setErrorMsg("");
    setSavedCounts(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon size={22} className="text-zinc-700" />
        <h1 className="text-xl font-bold text-zinc-950">Migração de Dados</h1>
      </div>

      {/* Nome do projeto (editável) */}
      {projectId && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-semibold text-zinc-700">Nome do projeto</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Finanças da Família"
              className="flex-1 text-sm border border-zinc-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={async () => {
                if (!projectId || !projectName.trim()) return;
                try {
                  await renameProject(projectId, projectName.trim());
                } catch (error) {
                  setErrorMsg(error instanceof Error ? error.message : "Erro ao renomear projeto");
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Passo 1: Intro / baixar modelo / upload */}
      {step === "intro" && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={24} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-zinc-950 mb-1">1. Baixe o modelo</h3>
                <p className="text-sm text-zinc-600 mb-2">
                  Preencha a planilha com suas movimentações. Colunas esperadas:
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  <strong>Nome pessoa</strong> | <strong>tipo</strong> (R = receita / D = despesa) |{" "}
                  <strong>categoria</strong> | <strong>fixa</strong> (S/N) | <strong>subcategoria</strong> |{" "}
                  <strong>data</strong> | <strong>valor</strong> | <strong>observacao</strong>
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-lg transition-colors"
            >
              {downloading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              Baixar modelo (.xlsx)
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h3 className="font-semibold text-zinc-950 mb-3">2. Envie a planilha preenchida</h3>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-zinc-400 transition-colors">
              <input
                type="file"
                id="file-input"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                {loading ? (
                  <Loader size={36} className="text-zinc-500 mx-auto mb-3 animate-spin" />
                ) : (
                  <Upload size={36} className="text-zinc-500 mx-auto mb-3" />
                )}
                <p className="text-sm font-semibold text-zinc-900">
                  {loading ? "Analisando planilha..." : "Selecione o arquivo .xlsx"}
                </p>
                {file && !loading && (
                  <p className="text-xs text-zinc-500 mt-1">{file.name}</p>
                )}
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{errorMsg}</div>
          )}
        </div>
      )}

      {/* Passo 2: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-zinc-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-zinc-950">{preview.lancamentos}</p>
              <p className="text-[11px] text-zinc-500">Lançamentos</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-zinc-950">{preview.categorias.length}</p>
              <p className="text-[11px] text-zinc-500">Categorias</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-zinc-950">{preview.subcategorias}</p>
              <p className="text-[11px] text-zinc-500">Subcategorias</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-zinc-950">{preview.pessoas.length}</p>
              <p className="text-[11px] text-zinc-500">Pessoas</p>
            </div>
          </div>

          {/* Pessoas — confirmação de vínculo */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-950">Pessoas na planilha</h3>
            <p className="text-[11px] text-zinc-500">
              Confirme a quem cada nome corresponde. Nomes parecidos com seus familiares já vêm vinculados automaticamente.
            </p>
            <div className="space-y-2 pt-1">
              {preview.pessoas.map((p) => (
                <div key={p.nomePlanilha} className="flex items-center justify-between gap-3 border border-zinc-100 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{p.nomePlanilha}</p>
                    {!p.existenteId && p.sugestaoNome && (
                      <p className="text-[11px] text-amber-600">Parece ser “{p.sugestaoNome}” — confirme ao lado</p>
                    )}
                  </div>
                  {p.existenteId ? (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 shrink-0">
                      já cadastrado
                    </span>
                  ) : (
                    <select
                      value={personMap[p.nomePlanilha] ?? "new"}
                      onChange={(e) => setPersonMap((m) => ({ ...m, [p.nomePlanilha]: e.target.value }))}
                      className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-zinc-400 shrink-0 max-w-[55%]"
                    >
                      <option value="new">+ Criar novo familiar</option>
                      {preview.pessoasExistentes.map((ex) => (
                        <option key={ex.id} value={ex.id}>Vincular a {ex.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Banner Premium */}
          {requerPremium && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Crown size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Sua planilha tem {novasCount} novo(s) familiar(es)</p>
                <p className="text-sm text-amber-800 mt-1">
                  O plano Básico permite só você. Vincule-os a familiares já cadastrados acima, ou faça upgrade para o Premium (R$ 19,90/mês) para criar novos.
                </p>
              </div>
            </div>
          )}

          {/* Erros */}
          {preview.erros.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-red-900">
                {preview.erros.length} erro(s) encontrados — corrija a planilha e envie novamente:
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {preview.erros.map((err, i) => (
                  <li key={i} className="text-xs text-red-800">
                    <strong>Linha {err.linha}</strong> — {err.campo}: {err.erro}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmação: nome do projeto */}
          {podeExecutar && (
            <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-semibold text-zinc-700">Nome do projeto</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Finanças da Família"
                className="w-full text-sm border border-zinc-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400"
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={resetFlow}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <button
              onClick={handleExecute}
              disabled={!podeExecutar}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Upload size={16} />
              Importar dados
            </button>
          </div>
        </div>
      )}

      {/* Executando */}
      {step === "executing" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader size={44} className="text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-zinc-900">Importando seus dados...</p>
        </div>
      )}

      {/* Sucesso */}
      {step === "success" && savedCounts && (
        <div className="text-center space-y-4 py-6">
          <CheckCircle size={48} className="text-emerald-600 mx-auto" />
          <p className="text-lg font-bold text-zinc-950">Importação concluída!</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto text-sm">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
              <p className="font-bold text-zinc-950">{savedCounts.pessoasCriadas}</p>
              <p className="text-[11px] text-zinc-500">Pessoas criadas</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
              <p className="font-bold text-zinc-950">{savedCounts.categorias}</p>
              <p className="text-[11px] text-zinc-500">Categorias</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
              <p className="font-bold text-zinc-950">{savedCounts.subcategorias}</p>
              <p className="text-[11px] text-zinc-500">Subcategorias</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
              <p className="font-bold text-emerald-700">{savedCounts.receitas}</p>
              <p className="text-[11px] text-zinc-500">Receitas</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2">
              <p className="font-bold text-red-600">{savedCounts.despesas}</p>
              <p className="text-[11px] text-zinc-500">Despesas</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">Atualizando a página para exibir os dados…</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-1.5 bg-zinc-950 text-white font-semibold py-2 px-5 rounded-lg hover:bg-zinc-800 transition-colors text-sm"
          >
            Ver meus dados agora
          </button>
        </div>
      )}

      {/* Erro */}
      {step === "error" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
            {errorMsg || "Ocorreu um erro durante a migração."}
          </div>
          <button
            onClick={resetFlow}
            className="w-full inline-flex items-center justify-center gap-1.5 border border-zinc-200 text-zinc-700 font-semibold py-2 px-4 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
