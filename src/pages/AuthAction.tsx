/**
 * Página própria para as ações de e-mail do Firebase (verificar e-mail,
 * redefinir senha). Substitui a tela padrão (feia, em inglês) do Firebase.
 *
 * Para o Firebase usar esta página, configure no Console:
 *   Authentication → Templates → (qualquer template) → editar →
 *   "Personalizar URL de ação" → https://SEU_APP/auth/action
 */
import React, { useEffect, useState } from "react";
import { applyActionCode } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { PiggyBank, CheckCircle2, AlertTriangle, Loader, ArrowRight } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function AuthAction() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") || "";
  const continueUrl = params.get("continueUrl") || "/app";

  const [status, setStatus] = useState<Status>("loading");
  const [title, setTitle] = useState("Verificando…");
  const [message, setMessage] = useState("Só um instante enquanto confirmamos seu e-mail.");

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured || !auth) {
        setStatus("error");
        setTitle("Configuração indisponível");
        setMessage("Não foi possível processar esta ação agora. Tente novamente mais tarde.");
        return;
      }
      if (!oobCode) {
        setStatus("error");
        setTitle("Link inválido");
        setMessage("O link de verificação está incompleto. Solicite um novo e-mail.");
        return;
      }
      if (mode !== "verifyEmail") {
        // Outros modos (ex.: redefinição de senha) podem ser tratados aqui no futuro.
        setStatus("error");
        setTitle("Ação não suportada");
        setMessage("Este tipo de link ainda não é tratado por aqui.");
        return;
      }
      try {
        await applyActionCode(auth, oobCode);
        setStatus("success");
        setTitle("E-mail confirmado! 🎉");
        setMessage("Sua conta está ativa. Você já pode entrar no Monetrik e começar a organizar suas finanças.");
      } catch (e: any) {
        setStatus("error");
        const code = e?.code || "";
        if (code === "auth/expired-action-code") {
          setTitle("Este link expirou");
          setMessage("Por segurança, o link de verificação tem validade. Faça login e peça para reenviar o e-mail de confirmação.");
        } else if (code === "auth/invalid-action-code") {
          setTitle("Link já utilizado");
          setMessage("Este link já foi usado ou não é mais válido. Se a sua conta já está verificada, é só entrar normalmente.");
        } else {
          setTitle("Não foi possível verificar");
          setMessage("Tivemos um problema ao confirmar seu e-mail. Tente novamente ou solicite um novo link.");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appHref = continueUrl.startsWith("http") ? continueUrl : "/app";

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500 text-zinc-950 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-2">
            <PiggyBank className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Monetrik</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
          {status === "loading" && (
            <div className="h-16 w-16 bg-zinc-50 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto animate-fade-in">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          )}
          {status === "error" && (
            <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto animate-fade-in">
              <AlertTriangle className="h-8 w-8" />
            </div>
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-sm mx-auto">{message}</p>

          {status !== "loading" && (
            <a
              href={appHref}
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-sm font-semibold transition-colors mt-2"
            >
              {status === "success" ? "Entrar no Monetrik" : "Voltar para o login"}
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-4">© {new Date().getFullYear()} Monetrik</p>
      </div>
    </div>
  );
}
