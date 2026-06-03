import React from "react";
import { ArrowRight, TrendingUp, Users, Lock, Zap, PiggyBank, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-zinc-200 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-emerald-500 text-zinc-950 rounded-lg flex items-center justify-center font-bold">
              <PiggyBank className="h-5 w-5" />
            </div>
            <span className="font-semibold text-zinc-950">Monetrik</span>
          </div>
          <button
            onClick={() => navigate("/app")}
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 border border-zinc-200 px-4 py-2 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-950 leading-tight">
          Gestão Financeira Familiar
          <br />
          <span className="text-emerald-600">Inteligente e Simples</span>
        </h1>
        <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
          Chega de planilhas confusas. Controle receitas, despesas e metas de toda a família em um só lugar, com IA e insights reais.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
        >
          Começar Grátis <ArrowRight className="h-5 w-5" />
        </button>
        <p className="text-xs text-zinc-500">Sem cartão de crédito. Sem compromisso.</p>
      </section>

      {/* Features Grid */}
      <section className="bg-zinc-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-zinc-950 mb-16">Por que escolher Monetrik?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="h-6 w-6" />,
                title: "Múltiplos Familiares",
                desc: "Adicione cônjuge, filhos e saiba quem está gastando o quê"
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Análise Inteligente",
                desc: "Relatórios automáticos com IA que identifica padrões"
              },
              {
                icon: <Lock className="h-6 w-6" />,
                title: "Seguro & Privado",
                desc: "Dados criptografados. Banco de dados em nuvem confiável"
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Ultra Rápido",
                desc: "Sem lag. Funciona offline. Sincroniza automaticamente"
              },
              {
                icon: <Check className="h-6 w-6" />,
                title: "Categorias Automáticas",
                desc: "Organize despesas por categoria predefinida ou customizada"
              },
              {
                icon: <PiggyBank className="h-6 w-6" />,
                title: "Metas Financeiras",
                desc: "Defina orçamentos e acompanhe o progresso mensal"
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-3">
                <div className="text-emerald-600">{feature.icon}</div>
                <h3 className="font-semibold text-zinc-950">{feature.title}</h3>
                <p className="text-sm text-zinc-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-zinc-950 mb-12">vs. Planilha de Excel</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="text-left py-4 px-4 font-semibold text-zinc-950">Recurso</th>
                <th className="text-center py-4 px-4 font-semibold text-zinc-500">Excel</th>
                <th className="text-center py-4 px-4 font-semibold text-emerald-600">Monetrik</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Acesso pelo celular", "❌", "✅"],
                ["Sincronizar entre dispositivos", "❌", "✅"],
                ["Análise automática de dados", "❌", "✅"],
                ["Alertas de gastos", "❌", "✅"],
                ["Múltiplos usuários", "❌", "✅"],
                ["Segurança profissional", "❌", "✅"],
                ["Suporte técnico", "❌", "✅"],
                ["Criar dashboards visuais", "❌", "✅"]
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-zinc-100">
                  <td className="py-4 px-4 text-zinc-950">{row[0]}</td>
                  <td className="py-4 px-4 text-center text-zinc-500 text-lg">{row[1]}</td>
                  <td className="py-4 px-4 text-center text-emerald-600 text-lg font-semibold">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-zinc-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-zinc-950 mb-16">Planos Simples</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              {
                name: "Grátis",
                price: "R$ 0",
                desc: "Para começar",
                features: ["Até 3 familiares", "6 meses de histórico", "Categorias básicas", "Dashboard simples"]
              },
              {
                name: "Plus",
                price: "R$ 19",
                period: "/mês",
                desc: "Para controle total",
                features: ["Familiares ilimitados", "Histórico completo", "Análise com IA", "Exportar PDF/Excel", "Suporte prioritário"],
                highlight: true
              }
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-2xl border-2 ${
                  plan.highlight
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <h3 className="text-xl font-bold text-zinc-950">{plan.name}</h3>
                <p className="text-sm text-zinc-600 mt-1">{plan.desc}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-zinc-950">{plan.price}</span>
                  {plan.period && <span className="text-zinc-600">{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm text-zinc-700">
                      <Check className="h-4 w-4 text-emerald-600" /> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/app")}
                  className={`w-full mt-6 py-2.5 rounded-lg font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border border-zinc-300 text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  Começar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 py-20 text-white text-center space-y-6">
        <h2 className="text-4xl font-bold">Pronto para organizar suas finanças?</h2>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Junte toda a família, organize as despesas e alcance seus objetivos financeiros.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-3 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
        >
          Acessar Monetrik <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>© 2026 Monetrik. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
