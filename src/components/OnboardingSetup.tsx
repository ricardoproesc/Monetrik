import React, { useState } from "react";
import { PiggyBank, User, Phone, Calendar, Check, ArrowRight } from "lucide-react";
import type { Person } from "../types";

interface OnboardingSetupProps {
  sessionEmail: string;
  displayName?: string;
  onComplete: (person: Omit<Person, "id">) => void;
}

const AVATARS = ["👨‍💼","👩‍💼","👨‍💻","👩‍💻","👨","👩","🧑","👴","👵","🧔","👱","👱‍♀️"];

const COLORS = [
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#10b981", label: "Verde" },
  { hex: "#6366f1", label: "Índigo" },
  { hex: "#f59e0b", label: "Âmbar" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#8b5cf6", label: "Violeta" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#14b8a6", label: "Teal" },
];

export default function OnboardingSetup({ sessionEmail, displayName, onComplete }: OnboardingSetupProps) {
  const [name, setName]         = useState(displayName || "");
  const [gender, setGender]     = useState<Person["gender"]>("masculino");
  const [birthDate, setBirth]   = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatar, setAvatar]     = useState("👨‍💼");
  const [color, setColor]       = useState("#3b82f6");
  const [error, setError]       = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor, informe seu nome completo.");
      return;
    }
    onComplete({
      name: name.trim(),
      avatar,
      gender,
      relationship: "principal",
      email: sessionEmail,
      whatsapp: whatsapp.trim(),
      birthDate,
      color,
      active: true,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6 space-y-3">
          <div className="h-14 w-14 bg-zinc-950 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <PiggyBank className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Bem-vindo(a)!</h1>
            <p className="text-xs text-zinc-500 mt-1">Vamos configurar seu perfil familiar para começar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-3xl p-6 space-y-5 shadow-sm">

          {/* Avatar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700">Escolha seu avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all border-2 ${
                    avatar === em ? "border-zinc-900 bg-zinc-100 scale-110" : "border-transparent bg-zinc-50 hover:bg-zinc-100"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Nome completo <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Ricardo Matos"
                className="w-full text-xs border border-zinc-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Gênero */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Gênero</label>
            <div className="flex gap-2">
              {(["masculino", "feminino", "outro"] as Person["gender"][]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
                    gender === g
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Data de nascimento */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">Data de nascimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirth(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700">WhatsApp <span className="text-zinc-400 font-normal">(opcional)</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full text-xs border border-zinc-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Cor do perfil */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700">Cor do seu perfil</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.label}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c.hex ? "border-zinc-900 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Prévia do perfil */}
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: color + "22" }}>
              {avatar}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900">{name || "Seu nome aqui"}</p>
              <p className="text-[10px] text-zinc-400">Titular Familiar · {sessionEmail}</p>
            </div>
            <div className="ml-auto h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Entrar no Monetrik
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-[10px] text-zinc-400 text-center">
            Você pode adicionar outros membros da família depois em <strong>Nossos Familiares</strong>.
          </p>
        </form>
      </div>
    </div>
  );
}
