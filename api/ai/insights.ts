import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não configurada. Usando análise por regras.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { people, incomes, expenses, alertSettings } = req.body;

    const activePeople = Array.isArray(people) ? people.filter((p: any) => p.active) : [];
    const safeIncomes = Array.isArray(incomes) ? incomes : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const settings = alertSettings || {
      isEnabled: true,
      level: "moderate",
      customFixedLimit: 50,
      customVariableLimit: 30,
      customSavingsTarget: 20,
    };

    const totalIncome = safeIncomes.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const totalExpenses = safeExpenses.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIncome - totalExpenses;

    const fixedExpenses = safeExpenses.filter((e: any) => e.isFixed).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const variableExpenses = safeExpenses.filter((e: any) => !e.isFixed).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const fixedPct = totalIncome > 0 ? (fixedExpenses / totalIncome) * 100 : 0;
    const variablePct = totalIncome > 0 ? (variableExpenses / totalIncome) * 100 : 0;
    const savingsPct = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    let targetFixed = settings.customFixedLimit || 50;
    let targetVariable = settings.customVariableLimit || 30;
    let targetSavings = settings.customSavingsTarget || 20;

    if (settings.level === "conservative") { targetFixed = 45; targetVariable = 25; targetSavings = 30; }
    else if (settings.level === "flexible") { targetFixed = 60; targetVariable = 35; targetSavings = 5; }

    const ruleInsights: any[] = [];

    if (settings.isEnabled) {
      if (fixedPct > targetFixed) {
        ruleInsights.push({
          id: "insight-fixed-limit", type: "danger", category: "Gastos Fixos",
          title: "Gastos fixos acima do recomendado!",
          message: `Seus gastos fixos estão em ${fixedPct.toFixed(1)}% da sua receita, enquanto o recomendado para o perfil "${settings.level}" é de no máximo ${targetFixed}%. Tente renegociar contratos de internet, luz ou aluguel.`,
        });
      }
      if (variablePct > targetVariable) {
        ruleInsights.push({
          id: "insight-variable-limit", type: "warning", category: "Gastos Variáveis",
          title: "Atenção com lazer e gastos variáveis",
          message: `Você está consumindo ${variablePct.toFixed(1)}% com despesas variáveis. Seu limite estabelecido é de ${targetVariable}%. Considere reduzir saídas de final de semana temporariamente.`,
        });
      }
      if (totalIncome > 0 && balance < 0) {
        ruleInsights.push({
          id: "insight-deficit", type: "danger", category: "Saúde Financeira",
          title: "Sua conta está no vermelho este mês",
          message: `O saldo mensal atual é deficitário em R$ ${Math.abs(balance).toFixed(2)}. Evite contrair novas parcelas ou usar o rotativo do cartão de crédito.`,
        });
      }
      if (totalIncome > 0 && savingsPct >= targetSavings) {
        ruleInsights.push({
          id: "insight-meta-savings", type: "success", category: "Investimentos",
          title: "Excelente capacidade de economia!",
          message: `Você poupou ${savingsPct.toFixed(1)}% do seu orçamento esse mês, superando sua meta de ${targetSavings}%. Ótimo momento para alimentar sua reserva de emergência!`,
        });
      }
      const categorySum: Record<string, number> = {};
      safeExpenses.forEach((e: any) => { categorySum[e.category] = (categorySum[e.category] || 0) + Number(e.amount); });
      const maxCategory = Object.entries(categorySum).sort((a, b) => b[1] - a[1])[0];
      if (maxCategory && maxCategory[1] > totalIncome * 0.25 && totalIncome > 0) {
        ruleInsights.push({
          id: "insight-category-heavy", type: "warning", category: maxCategory[0],
          title: `Gastos concentrados em: ${maxCategory[0]}`,
          message: `A categoria "${maxCategory[0]}" totalizou R$ ${maxCategory[1].toFixed(2)}, representando ${((maxCategory[1] / totalIncome) * 100).toFixed(1)}% de toda a sua renda familiar.`,
        });
      }
    }

    const metrics = { totalIncome, totalExpenses, balance, fixedPct, variablePct, savingsPct, limits: { targetFixed, targetVariable, targetSavings } };

    const ai = getGeminiClient();
    if (ai) {
      try {
        const textPrompt = `
Você é um consultor financeiro pessoal de elite brasileiro. Com base nos dados financeiros familiares abaixo:
- Pessoas na Família: ${JSON.stringify(activePeople)}
- Resumo de Receitas Mensais: Total R$ ${totalIncome.toFixed(2)} (${safeIncomes.length} registros). Categorias: ${safeIncomes.map((i: any) => `${i.category}: R$ ${i.amount}`).join(", ")}
- Resumo de Despesas Mensais: Total R$ ${totalExpenses.toFixed(2)} (${safeExpenses.length} registros). Fixas: R$ ${fixedExpenses.toFixed(2)} (${fixedPct.toFixed(1)}%), Variáveis: R$ ${variableExpenses.toFixed(2)} (${variablePct.toFixed(1)}%)
- Saldo Livre Residual: R$ ${balance.toFixed(2)}
- Perfil de Alerta Selecionado: ${settings.level} (Limites: Fixos ${targetFixed}%, Variáveis ${targetVariable}%, Alvo Poupar ${targetSavings}%)

Compare com o modelo clássico 50/30/20. Gere exatamente de 2 a 3 conselhos inovadores e diretos que complementem os alertas mecânicos existentes.
IMPORTANTE: Retorne APENAS um array JSON válido. Sem markdown. Campos obrigatórios:
[{"id":"ai-insight-1","type":"info","category":"Planejamento","title":"Título conciso","message":"Conselho prático"}]`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: textPrompt,
          config: { temperature: 0.7, responseMimeType: "application/json" },
        });

        let aiInsights: any[] = [];
        try {
          aiInsights = JSON.parse((response.text || "[]").trim());
        } catch {
          console.error("Falha ao parsear resposta do Gemini");
        }

        return res.json({ ruleCalculated: ruleInsights, aiGenerated: aiInsights, metrics });
      } catch (gemError) {
        console.error("Erro ao chamar Gemini:", gemError);
      }
    }

    return res.json({
      ruleCalculated: ruleInsights,
      aiGenerated: [
        {
          id: "fallback-ai-1", type: "info", category: "Previsão Estatística",
          title: "Análise de Tendência",
          message: totalIncome > 0
            ? `Mantendo este ritmo, nos próximos 6 meses sua família acumulará aproximadamente R$ ${(balance * 6).toFixed(2)}.`
            : "Cadastre receitas e despesas para que o motor financeiro analise seu histórico.",
        },
        {
          id: "fallback-ai-2", type: "success", category: "Reserva de Emergência",
          title: "Sua Cláusula de Emergência",
          message: `A reserva recomendada para sua família é de R$ ${(fixedExpenses * 6).toFixed(2)} (6 meses de contas fixas de R$ ${fixedExpenses.toFixed(2)}).`,
        },
      ],
      metrics,
    });
  } catch (err: any) {
    console.error("Erro em /api/ai/insights:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
