/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Using rules-based assistant.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Intelligent Insights Endpoint (Calculates & Enhances via AI if available)
app.post("/api/ai/insights", async (req, res) => {
  try {
    const { people, incomes, expenses, alertSettings } = req.body;

    // Safety checks / defaults
    const activePeople = Array.isArray(people) ? people.filter(p => p.active) : [];
    const safeIncomes = Array.isArray(incomes) ? incomes : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const settings = alertSettings || { isEnabled: true, level: 'moderate', customFixedLimit: 50, customVariableLimit: 30, customSavingsTarget: 20 };

    // Simple math calculations
    const totalIncome = safeIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalExpenses = safeExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIncome - totalExpenses;

    const fixedExpenses = safeExpenses.filter(e => e.isFixed).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const variableExpenses = safeExpenses.filter(e => !e.isFixed).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const fixedPct = totalIncome > 0 ? (fixedExpenses / totalIncome) * 100 : 0;
    const variablePct = totalIncome > 0 ? (variableExpenses / totalIncome) * 100 : 0;
    const savingsPct = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    // Limits based on settings profiles
    let targetFixed = settings.customFixedLimit || 50;
    let targetVariable = settings.customVariableLimit || 30;
    let targetSavings = settings.customSavingsTarget || 20;

    if (settings.level === 'conservative') {
      targetFixed = 45;
      targetVariable = 25;
      targetSavings = 30;
    } else if (settings.level === 'flexible') {
      targetFixed = 60;
      targetVariable = 35;
      targetSavings = 5;
    }

    // Generate base algorithmic warnings first (always reliable fallback)
    const ruleInsights: any[] = [];

    if (settings.isEnabled) {
      if (fixedPct > targetFixed) {
        ruleInsights.push({
          id: "insight-fixed-limit",
          type: "danger",
          category: "Gastos Fixos",
          title: "Gastos fixos acima do recomendado!",
          message: `Seus gastos fixos estão em ${fixedPct.toFixed(1)}% da sua receita, enquanto o recomendado para o perfil "${settings.level}" é de no máximo ${targetFixed}%. Tente renegociar contratos de internet, luz ou aluguel.`
        });
      }

      if (variablePct > targetVariable) {
        ruleInsights.push({
          id: "insight-variable-limit",
          type: "warning",
          category: "Gastos Variáveis",
          title: "Atenção com lazer e gastos variáveis",
          message: `Você está consumindo ${variablePct.toFixed(1)}% com despesas variáveis. Seu limite estabelecido é de ${targetVariable}%. Considere reduzir saídas de final de semana temporariamente.`
        });
      }

      if (totalIncome > 0 && balance < 0) {
        ruleInsights.push({
          id: "insight-deficit",
          type: "danger",
          category: "Saúde Financeira",
          title: "Sua conta está no vermelho este mês",
          message: `O saldo mensal atual é deficitário em R$ ${Math.abs(balance).toFixed(2)}. Evite contrair novas parcelas ou usar o rotativo do cartão de crédito.`
        });
      }

      if (totalIncome > 0 && savingsPct >= targetSavings) {
        ruleInsights.push({
          id: "insight-meta-savings",
          type: "success",
          category: "Investimentos",
          title: "Excelente capacidade de economia!",
          message: `Você poupou ${savingsPct.toFixed(1)}% do seu orçamento esse mês, superando sua meta de ${targetSavings}%. Ótimo momento para alimentar sua reserva de emergência!`
        });
      }

      // Add category alerts
      const categorySum: Record<string, number> = {};
      safeExpenses.forEach(e => {
        categorySum[e.category] = (categorySum[e.category] || 0) + Number(e.amount);
      });

      const maxCategory = Object.entries(categorySum).sort((a,b) => b[1] - a[1])[0];
      if (maxCategory && maxCategory[1] > (totalIncome * 0.25) && totalIncome > 0) {
        ruleInsights.push({
          id: "insight-category-heavy",
          type: "warning",
          category: maxCategory[0],
          title: `Gastos concentrados em: ${maxCategory[0]}`,
          message: `A categoria "${maxCategory[0]}" totalizou R$ ${maxCategory[1].toFixed(2)}, representando ${(maxCategory[1] / totalIncome * 100).toFixed(1)}% de toda a sua renda familiar.`
        });
      }
    }

    // Try utilizing Gemini to give highly customized financial advisory context
    const ai = getGeminiClient();
    if (ai) {
      try {
        const textPrompt = `
Você é um consultor financeiro pessoal de elite brasileiro. Com base nos dados financeiros familiares abaixo:
- Pessoas na Família: ${JSON.stringify(activePeople)}
- Resumo de Receitas Mensais: Total R$ ${totalIncome.toFixed(2)} (${safeIncomes.length} registros). Categorias: ${safeIncomes.map(i => `${i.category}: R$ ${i.amount}`).join(', ')}
- Resumo de Despesas Mensais: Total R$ ${totalExpenses.toFixed(2)} (${safeExpenses.length} registros). Fixas: R$ ${fixedExpenses.toFixed(2)} (${fixedPct.toFixed(1)}%), Variáveis: R$ ${variableExpenses.toFixed(2)} (${variablePct.toFixed(1)}%)
- Saldo Livre Residual: R$ ${balance.toFixed(2)}
- Perfil de Alerta Selecionado: ${settings.level} (Limites Propostos: Fixos ${targetFixed}%, Variáveis ${targetVariable}%, Alvo Poupar ${targetSavings}%)

Compare com o modelo clássico 50/30/20. Gere exatamente de 2 a 3 conselhos ou percepções inovadores adicionais bem diretos e realistas que complementem os alertas mecânicos existentes.
IMPORTANTE: Retorne APENAS um vetor JSON formatado. Não inclua blocos adicionais nem markdown \`\`\`json. O JSON precisa ser um array válido de objetos contendo exatamente esses campos:
[
  {
    "id": "ai-insight-1",
    "type": "info" ou "warning" ou "success",
    "category": "Planejamento" ou "Dica de Investimento" ou "Previsão",
    "title": "Título conciso",
    "message": "Conselho detalhado e focado em ações práticas"
  }
]
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: textPrompt,
          config: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        });

        const textOutput = response.text || "[]";
        let aiInsights = [];
        try {
          aiInsights = JSON.parse(textOutput.trim());
        } catch (pe) {
          // If formatting issue occurs
          console.error("Failed to parse Gemini insight output, using fallback", textOutput);
        }

        return res.json({
          ruleCalculated: ruleInsights,
          aiGenerated: aiInsights,
          metrics: {
            totalIncome,
            totalExpenses,
            balance,
            fixedPct,
            variablePct,
            savingsPct,
            limits: { targetFixed, targetVariable, targetSavings }
          }
        });

      } catch (gemError) {
        console.error("Gemini model execution error:", gemError);
      }
    }

    // Fallback if AI is disabled or fails
    return res.json({
      ruleCalculated: ruleInsights,
      aiGenerated: [
        {
          id: "fallback-ai-1",
          type: "info",
          category: "Previsão Estatística",
          title: "Análise de Tendência",
          message: totalIncome > 0 
            ? `Mantendo este ritmo de amortização saudável, nos próximos 6 meses sua família acumulará aproximadamente R$ ${(balance * 6).toFixed(2)}. Ótima previsibilidade comercial.`
            : "Cadastre algumas receitas e despesas mensais para que o motor financeiro analise seu histórico familiar de economia."
        },
        {
          id: "fallback-ai-2",
          type: "success",
          category: "Reserva de Emergência",
          title: "Sua Cláusula de Emergência",
          message: `A reserva recomendada para sua família é de R$ ${(fixedExpenses * 6).toFixed(2)} (equivalente a 6 meses de contas fixas gerais de R$ ${fixedExpenses.toFixed(2)}).`
        }
      ],
      metrics: {
        totalIncome,
        totalExpenses,
        balance,
        fixedPct,
        variablePct,
        savingsPct,
        limits: { targetFixed, targetVariable, targetSavings }
      }
    });

  } catch (err: any) {
    console.error("Error generating insights:", err);
    res.status(500).json({ error: "Internal Server Error in generating financial advisory insights" });
  }
});

// 3. Conversational Advisor Chatbot Endpoint (Fully processes chat using Gemini API or rule expert)
app.post("/api/ai/assistant", async (req, res) => {
  try {
    const { history, currentMessage, contextData } = req.body;

    const dataContext = contextData || {};
    const incomes = dataContext.incomes || [];
    const expenses = dataContext.expenses || [];
    const people = dataContext.people || [];

    const totalIn = incomes.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const totalOut = expenses.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIn - totalOut;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const chatObj = ai.chats.create({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: `Você é "FinancIA", o assistente financeiro de Inteligência Artificial para famílias e pessoas físicas do aplicativo de gestão.
Os dados da família do usuário atual:
- Integrantes familiares cadastrados: ${people.map((p: any) => `${p.name} (${p.relationship})`).join(', ') || 'Nenhum'}
- Receitas familiares acumuladas: R$ ${totalIn.toFixed(2)}
- Despesas familiares acumuladas: R$ ${totalOut.toFixed(2)}
- Saldo líquido familiar do mês corrente: R$ ${balance.toFixed(2)}

Responda sempre em português brasileiro de forma acolhedora, objetiva, profissional e motivadora. 
Dê conselhos práticos de corte de custos, investimentos inteligentes, reserva de emergência e siga a risca as regras de finanças (ex: metodologia 50/30/20, planejar com segurança).
Mantenha sua resposta fluida em Markdown prático. Não cite códigos ou detalhes técnicos de implementação do sistema.`,
          }
        });

        // Seed initial history
        if (Array.isArray(history) && history.length > 0) {
          // Send messages to register in chat history if needed, or simply append context as prompt
        }

        const promptText = `O usuário diz: "${currentMessage}". 
Dê um retorno prático do que fazer, analisando individualmente caso ele pergunte dos gastos ou receitas deles ou de integrantes.`;

        const response = await chatObj.sendMessage({ message: promptText });
        return res.json({ text: response.text });

      } catch (gemError) {
        console.error("Gemini Chat Execution error, falling back", gemError);
      }
    }

    // Default Portuguese Rule-based Assistant response if Gemini isn't present
    const greetings = ["olá", "oi", "bom dia", "boa tarde", "boa noite", "ajuda", "ajude"];
    const isGreeting = greetings.some(g => currentMessage.toLowerCase().includes(g));

    let reply = "";
    if (isGreeting) {
      reply = `Olá! Sou o assistente inteligente **FinancIA** da sua família. 

Atualmente, vejo que sua família possui **${people.length} integrantes**, com receita total registrada de **R$ ${totalIn.toFixed(2)}** e despesas de **R$ ${totalOut.toFixed(2)}**, resultando em um saldo de **R$ ${balance.toFixed(2)}**.

Como posso te ajudar hoje? Você pode me perguntar sobre:
1. Como organizar melhor os gastos fixos e variáveis.
2. Dicas para formar sua reserva de emergência de forma indolor.
3. Se seu saldo residual atual é saudável para o perfil familiar.`;
    } else if (currentMessage.toLowerCase().includes("reserva") || currentMessage.toLowerCase().includes("emergência")) {
      const targetReserva = (expenses.filter((e: any) => e.isFixed).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) * 6);
      reply = `Para garantir a segurança da sua residência e família, a recomendação é estruturar uma **Reserva de Emergência** cobrindo **6 meses** das contas fixas familiares.

Considerando seu gasto fixo atual demonstrado, sua meta ideal é estabilizar **R$ ${targetReserva.toFixed(2)}** em uma aplicação líquida e conservadora (como Tesouro Selic ou CDB de liquidez diária com rendimento mínimo de 100% do CDI).`;
    } else if (currentMessage.toLowerCase().includes("lazer") || currentMessage.toLowerCase().includes("gastar") || currentMessage.toLowerCase().includes("economizar")) {
      reply = `Analisando seu padrão tributário, se você precisa economizar, a tática ideal é o monitoramento constante por envelope.
1. Estabeleça seu teto de lazer mensal com a regra classic do **50/30/20** (onde lazer e compras flutuantes não devem violar 30% da sua receita familiar).
2. Verifique na aba de **Panorama Geral** do sistema quais despesas variáveis mais cresceram e agende metas de redução nestas categorias específicas no próximo mês.`;
    } else {
      reply = `Entendi sua dúvida sobre finanças! Para termos maior exatidão sobre "${currentMessage}", sugiro avaliar nosso simulador dinâmico de **Inteligência Financeira** na aba correspondente do menu. 

Lá, fazemos cálculos avançados de conformidade de orçamento baseados na sua renda de **R$ ${totalIn.toFixed(2)}** e seu limite de economia recomendado. Se precisar de insights baseados em inteligência artificial profunda, configure a chave de acesso \`GEMINI_API_KEY\` nas configurações da plataforma para me ativar em tempo real!`;
    }

    return res.json({ text: reply });

  } catch (err: any) {
    console.error("Assistant endpoint error:", err);
    res.status(500).json({ error: "Internal Server Error in advisor chatbot engine" });
  }
});

// Serve frontend assets in production mode
const distPath = path.join(process.cwd(), 'dist');
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Financial Server running on port ${PORT}`);
});
