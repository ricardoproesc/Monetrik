import React, { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import type { SubcategoryItem } from "./TransactionsManager";

interface CategoryManagerProps {
  subcategories: SubcategoryItem[];
  onAddSubcategory: (subcategory: SubcategoryItem) => void;
}

export default function CategoryManager({
  subcategories,
  onAddSubcategory,
}: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const incomeCategories = Array.from(
    new Set(subcategories.filter(s => s.type === "income").map(s => s.category))
  );
  const expenseCategories = Array.from(
    new Set(subcategories.filter(s => s.type === "expense").map(s => s.category))
  );

  const handleAddSubcategory = () => {
    if (!categoryName.trim() || !subcategoryName.trim()) {
      alert("Preencha categoria e subcategoria");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newSubcategory: SubcategoryItem = {
        id: `sub-${type}-${Date.now()}`,
        type,
        category: categoryName,
        name: subcategoryName,
        active: true,
      };

      onAddSubcategory(newSubcategory);
      setCategoryName("");
      setSubcategoryName("");
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-900 font-semibold transition-all"
      >
        <div className="flex items-center gap-2">
          <Plus size={18} />
          Gerenciar Categorias
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 animate-fade-in">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setType("income")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                  type === "income"
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Receita
              </button>
              <button
                onClick={() => setType("expense")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                  type === "expense"
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Despesa
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoria
            </label>

            {/* Existing Categories as Buttons */}
            {(type === "income" ? incomeCategories : expenseCategories).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(type === "income" ? incomeCategories : expenseCategories).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryName(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        categoryName === cat
                          ? "bg-blue-600 text-white border border-blue-600"
                          : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Input for new category */}
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ou digite uma nova categoria..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Subcategory Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subcategoria
            </label>
            <input
              type="text"
              value={subcategoryName}
              onChange={(e) => setSubcategoryName(e.target.value)}
              placeholder="Ex: Consulta Médica, Farmácia"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubcategory();
              }}
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddSubcategory}
            disabled={isLoading || !categoryName.trim() || !subcategoryName.trim()}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {isLoading ? "Adicionando..." : "Adicionar Subcategoria"}
          </button>

          {/* Info */}
          <p className="text-xs text-gray-600 text-center">
            Pressione Enter ou clique para adicionar rapidamente
          </p>
        </div>
      )}
    </div>
  );
}
