import React, { useState } from "react";
import { Upload, Download, AlertCircle, CheckCircle, Loader, X } from "lucide-react";

interface ImportRow {
  data: string;
  descricao: string;
  tipo: string;
  valor: number;
  subcategoria: string;
  observacoes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: ValidationError[];
  data?: ImportRow[];
  newSubcategories: string[];
  existingSubcategories: string[];
}

export interface SubcategoryItem {
  id: string;
  type: "income" | "expense";
  category: string;
  name: string;
  active?: boolean;
}

interface ImportDataProps {
  onClose: () => void;
  onImportSuccess: (
    data: ImportRow[],
    newSubcategories: string[]
  ) => void;
  existingSubcategories: string[];
}

export default function ImportData({
  onClose,
  onImportSuccess,
  existingSubcategories,
}: ImportDataProps) {
  const [step, setStep] = useState<"download" | "upload" | "validation" | "success">("download");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  async function handleDownload() {
    try {
      const response = await fetch("/api/import/template");
      if (!response.ok) throw new Error("Erro ao baixar template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-monetrik.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStep("upload");
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : "desconhecido"}`);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      // Validar extensão
      if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
        alert("Por favor, selecione um arquivo Excel (.xlsx, .xls ou .csv)");
        return;
      }

      // Validar tamanho (máx 10MB)
      if (selected.size > 10 * 1024 * 1024) {
        alert("Arquivo muito grande (máximo 10MB)");
        return;
      }

      setFile(selected);
    }
  }

  async function handleValidate() {
    if (!file) {
      alert("Selecione um arquivo");
      return;
    }

    setIsLoading(true);
    try {
      // Ler arquivo como base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = (e.target?.result as string).split(",")[1]; // Remove data:...;base64, prefix

        const response = await fetch("/api/import/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "validate",
            fileData,
            existingSubcategories,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Erro na validação");
        }

        const result: ValidationResult = await response.json();
        setValidationResult(result);
        setStep("validation");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      alert(
        `Erro ao validar: ${error instanceof Error ? error.message : "desconhecido"}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleImportConfirm() {
    if (!validationResult?.data || validationResult.data.length === 0) {
      alert("Nenhum dado válido para importar");
      return;
    }

    onImportSuccess(
      validationResult.data,
      validationResult.newSubcategories
    );

    setImportedCount(validationResult.data.length);
    setStep("success");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold text-gray-900">Importar Dados</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Download Template Step */}
          {step === "download" && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Escolha uma opção para começar:
              </p>
              <button
                onClick={handleDownload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Baixar Template Excel
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <button
                onClick={() => setStep("upload")}
                className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                Já Tenho um Arquivo
              </button>
            </div>
          )}

          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="file-input"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload size={40} className="text-blue-600" />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Arraste ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-600">
                      Arquivo Excel (.xlsx, .xls ou .csv)
                    </p>
                  </div>
                </label>
              </div>

              {file && (
                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <CheckCircle size={20} className="text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("download")}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!file || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader size={18} className="animate-spin" />}
                  Validar
                </button>
              </div>
            </div>
          )}

          {/* Validation Results Step */}
          {step === "validation" && validationResult && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">Resultado da Validação</p>
                <p className="text-sm text-gray-600 mt-1">
                  Total de linhas: {validationResult.totalRows}
                </p>
                <p className="text-sm text-green-600 font-semibold">
                  Linhas válidas: {validationResult.validRows}
                </p>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-900 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {validationResult.errors.length} Erro(s) encontrado(s)
                  </p>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {validationResult.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-sm text-red-700">
                        <span className="font-semibold">Linha {err.row}:</span> {err.field} — {err.error}
                      </div>
                    ))}
                    {validationResult.errors.length > 10 && (
                      <p className="text-sm text-red-700">
                        ... e mais {validationResult.errors.length - 10} erro(s)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {validationResult.newSubcategories.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-semibold text-yellow-900">Novas Subcategorias</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    As seguintes subcategorias serão criadas automaticamente:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {validationResult.newSubcategories.map((sub) => (
                      <span
                        key={sub}
                        className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-sm"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.valid && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setFile(null);
                      setValidationResult(null);
                      setStep("upload");
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                  >
                    Confirmar Importação
                  </button>
                </div>
              )}

              {!validationResult.valid && (
                <button
                  onClick={() => {
                    setFile(null);
                    setValidationResult(null);
                    setStep("upload");
                  }}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Voltar
                </button>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-600 mx-auto" />
              <div>
                <p className="text-2xl font-bold text-gray-900">Importação Concluída!</p>
                <p className="text-gray-600 mt-2">
                  {importedCount} registro(s) foi/foram importado(s) com sucesso.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
