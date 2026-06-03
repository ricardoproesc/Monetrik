import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { history, currentMessage, contextData } = req.body;

    const dataContext = contextData || {};
    const incomes: any[] = dataContext.incomes || [];
    const expenses: any[] = dataContext.expenses || [];
    const people: any[] = dataContext.people || [];

    const totalIn = incomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalOut = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalIn - totalOut;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const chatObj = ai.chats.create({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: `Você é "FinancIA", o assistente financeiro de IA para famílias do aplicativo Monetrik.
Dados da família do usuário:
- Integrantes: ${people.map((p) => `${p.name} (${p.relationship})`).join(", ") || "Nenhum"}
- Receitas acumuladas: R$ ${totalIn.toFixed(2)}
- Despesas acumuladas: R$ ${totalOut.toFixed(2)}
- Saldo líquido do mês: R$ ${balance.toFixed(2)}

Responda sempre em português brasileiro de forma acolhedora, objetiva e motivadora.
Dê conselhos práticos sobre corte de custos, investimentos, reserva de emergência e metodologia 50/30/20.
Use Markdown. Não cite detalhes técnicos de implementação.`,
          },
        });

        const promptText = `O usuário diz: "${currentMessage}". Dê um retorno prático, analisando individualmente os gastos e receitas quando perguntado.`;
        const response = await chatObj.sendMessage({ message: promptText });
        return res.json({ text: response.text });
      } catch (gemError) {
        console.error("Gemini Chat error, usando fallback:", gemError);
      }
    }

    // Fallback baseado em regras
    const greetings = ["olá", "oi", "bom dia", "boa tarde", "boa noite", "ajuda", "ajude"];
    const isGreeting = greetings.some((g) => currentMessage.toLowerCase().includes(g));
    let reply = "";

    if (isGreeting) {
      reply = `Olá! Sou o assistente **FinancIA** da sua família.\n\nAtualmente, vejo **${people.length} integrantes**, receita de **R$ ${totalIn.toFixed(2)}** e despesas de **R$ ${totalOut.toFixed(2)}**, resultando em saldo de **R$ ${balance.toFixed(2)}**.\n\nComo posso te ajudar?`;
    } else if (currentMessage.toLowerCase().includes("reserva") || currentMessage.toLowerCase().includes("emergência")) {
      const fixedTotal = expenses.filter((e) => e.isFixed).reduce((acc, curr) => acc + Number(curr.amount), 0);
      reply = `Para sua segurança, recomendo uma **Reserva de Emergência** cobrindo **6 meses** de contas fixas.\n\nSua meta ideal: **R$ ${(fixedTotal * 6).toFixed(2)}** em aplicação líquida (Tesouro Selic ou CDB com liquidez diária, mínimo 100% CDI).`;
    } else if (["lazer", "gastar", "economizar"].some((k) => currentMessage.toLowerCase().includes(k))) {
      reply = `Para economizar, a tática é o monitoramento por envelope:\n1. Estabeleça seu teto de lazer com a regra **50/30/20** (lazer ≤ 30% da receita familiar).\n2. Verifique na aba **Panorama Geral** quais despesas variáveis mais cresceram e defina metas de redução.`;
    } else {
      reply = `Entendi! Para análise mais precisa sobre "${currentMessage}", acesse o **Mapeador IA** no menu.\n\nSeu orçamento atual é de **R$ ${totalIn.toFixed(2)}**. Configure a \`GEMINI_API_KEY\` para respostas com IA completa.`;
    }

    return res.json({ text: reply });
  } catch (err: any) {
    console.error("Erro em /api/ai/assistant:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
