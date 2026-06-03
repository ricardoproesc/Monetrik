import React, { useState } from "react";
import { User, Lock, LogOut, Mail, X, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

interface UserProfileProps {
  displayName: string;
  email: string;
  onLogout: () => void;
}

export default function UserProfile({ displayName, email, onLogout }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">();
  const [loading, setLoading] = useState(false);

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      setMessage("Nome não pode estar vazio");
      setMessageType("error");
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
        setMessage("Nome atualizado com sucesso!");
        setMessageType("success");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setMessage("Erro ao atualizar nome");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Preencha todos os campos");
      setMessageType("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("As novas senhas não coincidem");
      setMessageType("error");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Nova senha deve ter pelo menos 6 caracteres");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser && auth.currentUser.email) {
        // Reauthenticate
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);

        // Update password
        await updatePassword(auth.currentUser, newPassword);
        setMessage("Senha alterada com sucesso!");
        setMessageType("success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        setMessage("Senha atual incorreta");
      } else {
        setMessage("Erro ao alterar senha");
      }
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão de perfil */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
        title="Perfil do usuário"
      >
        <div className="h-6 w-6 bg-emerald-500 text-white rounded-full flex items-center justify-center">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="max-w-[100px] truncate">{displayName}</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950">Meu Perfil</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Message */}
              {message && (
                <div
                  className={`flex items-center gap-2 text-xs p-3 rounded-lg border ${
                    messageType === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {message}
                </div>
              )}

              {/* Nome */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={loading || editName === displayName}
                  className="w-full py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-lg transition-colors"
                >
                  {loading ? "Salvando..." : "Salvar Nome"}
                </button>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700">E-mail</label>
                <div className="flex items-center gap-2 px-3 py-2.5 border border-zinc-200 bg-zinc-50 rounded-lg text-xs text-zinc-600">
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                </div>
                <p className="text-[10px] text-zinc-500">
                  Para alterar e-mail, entre em contato com suporte
                </p>
              </div>

              {/* Mudar Senha */}
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full py-2 text-xs font-semibold border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Alterar Senha
                </button>
              ) : (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">Senha Atual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 pr-9 focus:outline-none focus:border-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">Nova Senha</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite uma nova senha"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-700">Confirmar Nova Senha</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPasswordForm(false)}
                      className="flex-1 py-2 text-xs font-semibold border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-semibold bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-400 text-white rounded-lg transition-colors"
                    >
                      {loading ? "Alterando..." : "Alterar Senha"}
                    </button>
                  </div>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full py-2 text-xs font-semibold border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
