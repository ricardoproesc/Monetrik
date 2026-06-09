import React, { useState } from "react";
import { Person, Income, Expense } from "../types";
import { X, LogOut, Database } from "lucide-react";
import Settings from "./Settings";
import type { SubcategoryItem } from "./TransactionsManager";

interface SettingsSidebarProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
  subcategories: SubcategoryItem[];
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onMigrationComplete: () => void;
  onGoToSubcategories?: () => void;
}

export default function SettingsSidebar({
  people,
  incomes,
  expenses,
  subcategories,
  email,
  isOpen,
  onClose,
  onLogout,
  onMigrationComplete,
  onGoToSubcategories,
}: SettingsSidebarProps) {
  const [showMigration, setShowMigration] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Fechar ao clicar fora (invisível em desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-30 md:bg-opacity-0 md:bg-transparent"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full md:w-80 bg-white shadow-lg overflow-y-auto z-50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">⚙️ Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {/* Migração de Dados Button */}
          <button
            onClick={() => setShowMigration(true)}
            className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold py-3 px-4 rounded-lg border border-blue-200 transition-all"
          >
            <Database size={20} />
            Migração de Dados
          </button>

          {/* User Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Conectado como:</p>
            <p className="text-sm font-semibold text-gray-900 break-all">{email}</p>
          </div>
        </div>
      </div>

      {/* Settings (Migration) Modal */}
      {showMigration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-2xl font-bold text-gray-900">Migração de Dados</h2>
              <button
                onClick={() => setShowMigration(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <Settings
                people={people}
                incomes={incomes}
                expenses={expenses}
                subcategories={subcategories}
                email={email}
                onMigrationComplete={() => {
                  onMigrationComplete();
                  setShowMigration(false);
                  onClose();
                }}
                onGoToSubcategories={() => {
                  setShowMigration(false);
                  onClose();
                  onGoToSubcategories?.();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
