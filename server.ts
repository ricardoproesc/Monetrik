/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";

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

// 4. Import Data: Download Template
app.get("/api/import/template", (req, res) => {
  try {
    const wb = XLSX.utils.book_new();

    // Aba: Instruções
    const instructionsData = [
      ["INSTRUÇÕES DE IMPORTAÇÃO - Monetrik"],
      [""],
      ["Preencha os dados abaixo com suas transações históricas"],
      [""],
      ["Campos obrigatórios: data, descricao, tipo, valor, subcategoria"],
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instruções");

    // Aba: Exemplo
    const exampleData = [
      ["data", "descricao", "tipo", "valor", "subcategoria", "observacoes"],
      ["15/01/2024", "Salário janeiro", "RECEITA", 3500.0, "Salário Mensal", "Pagamento principal"],
      ["16/01/2024", "Aluguel residência", "DESPESA", 1200.0, "Aluguel Residência", "Apto 302"],
      ["17/01/2024", "Supermercado", "DESPESA", 250.5, "Supermercado", "Compras semanais"],
      ["18/01/2024", "Freelance - Projeto A", "RECEITA", 1500.0, "Freelance / Consultoria", "Desenvolvimento web"],
      ["19/01/2024", "Energia elétrica", "DESPESA", 180.0, "Conta Energia Casa", "Janeiro"],
    ];
    const exampleSheet = XLSX.utils.aoa_to_sheet(exampleData);
    exampleSheet["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, exampleSheet, "Exemplo");

    // Aba: Blank para usuário preencher
    const blankData = [["data", "descricao", "tipo", "valor", "subcategoria", "observacoes"]];
    for (let i = 0; i < 50; i++) blankData.push(["", "", "", "", "", ""]);
    const blankSheet = XLSX.utils.aoa_to_sheet(blankData);
    blankSheet["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, blankSheet, "Seus Dados");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const bufferData = Buffer.from(buf as ArrayBuffer);

    res.setHeader("Content-Disposition", 'attachment; filename="template-monetrik.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Length", bufferData.length);
    res.send(bufferData);
  } catch (error) {
    console.error("Erro ao gerar template:", error);
    res.status(500).json({ error: "Erro ao gerar template" });
  }
});

// 5. Import Data: Validate and Process
app.post("/api/import/process", (req, res) => {
  try {
    const { action, fileData, existingSubcategories } = req.body;

    if (action !== "validate") {
      return res.status(400).json({ error: "Ação desconhecida" });
    }

    if (!fileData || typeof fileData !== "string") {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer);

    // Encontrar a aba correta para importar
    // Prioridade: "Seus Dados" > última aba > primeira aba com dados
    let sheetName = workbook.SheetNames[0];

    if (workbook.SheetNames.includes("Seus Dados")) {
      sheetName = "Seus Dados";
    } else if (workbook.SheetNames.includes("Data")) {
      sheetName = "Data";
    } else {
      // Pegar última aba (geralmente é onde o usuário adiciona dados)
      sheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
    }

    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return res.status(200).json({
        valid: false,
        totalRows: 0,
        validRows: 0,
        errors: [{ row: 0, field: "arquivo", value: null, error: "Arquivo está vazio" }],
        newSubcategories: [],
        existingSubcategories: [],
      });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 0 });

    // Normalizar headers (trimmed, lowercase para matching)
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = String(key).trim().toLowerCase();
        normalized[normalizedKey] = value;
      }
      return normalized;
    });

    // Filtrar linhas vazias
    const nonEmptyRows = normalizedRows.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== "" && val !== undefined)
    );

    const validatedRows: any[] = [];
    const allErrors: any[] = [];
    const newSubcategories = new Set<string>();

    function parseDate(input: any): { valid: boolean; dateStr: string } {
      if (!input && input !== 0) return { valid: false, dateStr: "" };

      const inputStr = String(input).trim();

      // Tentar como timestamp (número em ms ou segundos)
      if (/^\d+$/.test(inputStr)) {
        const num = Number(inputStr);
        // Se número tem 10 dígitos, provavelmente é segundos; se 13, é ms
        const timestamp = num > 9999999999 ? num : num * 1000;
        try {
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            // Retornar em formato YYYY-MM-DD para consistência
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return { valid: true, dateStr: `${year}-${month}-${day}` };
          }
        } catch {
          // Continua para próximo formato
        }
      }

      // Formato: DD/MM/YYYY
      const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(inputStr);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return { valid: true, dateStr: `${year}-${month}-${day}` };
        }
      }

      // Formato: YYYY-MM-DD
      const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inputStr);
      if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return { valid: true, dateStr: `${year}-${month}-${day}` };
        }
      }

      // Formato: DD-MM-YYYY
      const ddmmyyyy2 = /^(\d{2})-(\d{2})-(\d{4})$/.exec(inputStr);
      if (ddmmyyyy2) {
        const [, day, month, year] = ddmmyyyy2;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return { valid: true, dateStr: `${year}-${month}-${day}` };
        }
      }

      // Formato: MM/DD/YYYY (americano)
      const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(inputStr);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        // Tentar assumir DD/MM/YYYY primeiro (se dia > 12, é DD/MM; se mês > 12, é MM/DD)
        if (Number(day) > 12) {
          // É DD/MM/YYYY
          const date = new Date(`${year}-${month}-${day}`);
          if (!isNaN(date.getTime())) {
            return { valid: true, dateStr: `${year}-${month}-${day}` };
          }
        } else if (Number(month) > 12) {
          // É MM/DD/YYYY
          const date = new Date(`${year}-${day}-${month}`);
          if (!isNaN(date.getTime())) {
            return { valid: true, dateStr: `${year}-${day}-${month}` };
          }
        } else {
          // Ambíguo, assumir DD/MM/YYYY (padrão brasileiro)
          const date = new Date(`${year}-${month}-${day}`);
          if (!isNaN(date.getTime())) {
            return { valid: true, dateStr: `${year}-${month}-${day}` };
          }
        }
      }

      // Formato: DD.MM.YYYY
      const ddmmyyyy3 = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(inputStr);
      if (ddmmyyyy3) {
        const [, day, month, year] = ddmmyyyy3;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return { valid: true, dateStr: `${year}-${month}-${day}` };
        }
      }

      // Tentar parseDate nativo do JavaScript (ISO 8601, etc)
      try {
        const date = new Date(inputStr);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return { valid: true, dateStr: `${year}-${month}-${day}` };
        }
      } catch {
        // Continua
      }

      return { valid: false, dateStr: "" };
    }

    for (let i = 0; i < nonEmptyRows.length; i++) {
      const row = nonEmptyRows[i];
      const errors: any[] = [];

      // Validar data
      const dataInput = row.data;
      const parsedDate = parseDate(dataInput);
      if (!dataInput && dataInput !== 0) {
        errors.push({ row: i + 2, field: "data", value: dataInput, error: "Campo obrigatório" });
      } else if (!parsedDate.valid) {
        errors.push({
          row: i + 2,
          field: "data",
          value: dataInput,
          error: "Formato de data inválido. Aceitos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY, timestamp (ms ou s)"
        });
      }

      // Validar descrição (aceita "descricao" ou "descrição")
      const descricao = String(row.descricao || row.descrição || "").trim();
      if (!descricao) {
        errors.push({ row: i + 2, field: "descricao", value: descricao, error: "Campo obrigatório" });
      } else if (descricao.length > 255) {
        errors.push({ row: i + 2, field: "descricao", value: descricao, error: "Máximo 255 caracteres" });
      }

      // Validar tipo
      const tipo = String(row.tipo || "").trim().toUpperCase();
      if (!tipo) {
        errors.push({ row: i + 2, field: "tipo", value: row.tipo, error: "Campo obrigatório" });
      } else if (!["RECEITA", "DESPESA"].includes(tipo)) {
        errors.push({ row: i + 2, field: "tipo", value: row.tipo, error: 'Deve ser "RECEITA" ou "DESPESA"' });
      }

      // Validar valor (aceita "valor" ou "value")
      const valorInput = row.valor || row.value;
      const valorStr = String(valorInput || "").trim();
      const valor = parseFloat(valorStr.replace(",", "."));
      if (!valorStr) {
        errors.push({ row: i + 2, field: "valor", value: valorStr, error: "Campo obrigatório" });
      } else if (isNaN(valor)) {
        errors.push({ row: i + 2, field: "valor", value: valorStr, error: "Deve ser um número válido" });
      } else if (valor <= 0) {
        errors.push({ row: i + 2, field: "valor", value: valorStr, error: "Deve ser maior que zero" });
      }

      // Validar subcategoria (aceita "subcategoria" ou "category")
      const subcategoria = String(row.subcategoria || row.category || row.categoria || "").trim();
      if (!subcategoria) {
        errors.push({ row: i + 2, field: "subcategoria", value: subcategoria, error: "Campo obrigatório" });
      }

      if (errors.length === 0) {
        validatedRows.push({
          data: parsedDate.dateStr,
          descricao,
          tipo,
          valor: Number(valor),
          subcategoria,
          observacoes: String(row.observacoes || row.observação || row.notes || "").trim(),
        });

        if (!(existingSubcategories || []).includes(subcategoria)) {
          newSubcategories.add(subcategoria);
        }
      } else {
        allErrors.push(...errors);
      }
    }

    return res.status(200).json({
      valid: allErrors.length === 0,
      totalRows: nonEmptyRows.length,
      validRows: validatedRows.length,
      errors: allErrors,
      data: validatedRows,
      newSubcategories: Array.from(newSubcategories),
      existingSubcategories: (existingSubcategories || []).filter((sub: string) =>
        validatedRows.some((row) => row.subcategoria === sub)
      ),
    });
  } catch (error) {
    console.error("Erro no processamento:", error);
    res.status(500).json({
      error: `Erro ao processar: ${error instanceof Error ? error.message : "desconhecido"}`,
    });
  }
});

// 6. Migration: Generate Template with existing data
app.post("/api/migration/template", (req, res) => {
  try {
    const { people, incomes, expenses, incomeSubcategories, expenseSubcategories } = req.body;

    const wb = XLSX.utils.book_new();

    // Aba 1: Cadastros (read-only reference)
    const cadastrosData: any[] = [];

    // Seção de Pessoas
    cadastrosData.push(["=== PESSOAS CADASTRADAS ===", "", "", "", "", ""]);
    cadastrosData.push(["ID", "Nome", "Relação", "Email", "WhatsApp", "Ativo"]);
    people.forEach((p: any) => {
      cadastrosData.push([
        p.id || "",
        p.name || "",
        p.relationship || "",
        p.email || "",
        p.whatsapp || "",
        p.active ? "Sim" : "Não",
      ]);
    });

    // Espaço
    cadastrosData.push(["", "", "", "", "", ""]);

    // Seção de Subcategorias de Receitas
    cadastrosData.push(["=== SUBCATEGORIAS DE RECEITAS ===", "", "", "", "", ""]);
    cadastrosData.push(["ID", "Nome", "Categoria", "", "", ""]);
    incomeSubcategories.forEach((sub: any) => {
      cadastrosData.push([
        sub.id || "",
        sub.name || "",
        sub.category || "",
        "",
        "",
        "",
      ]);
    });

    // Espaço
    cadastrosData.push(["", "", "", "", "", ""]);

    // Seção de Subcategorias de Despesas
    cadastrosData.push(["=== SUBCATEGORIAS DE DESPESAS ===", "", "", "", "", ""]);
    cadastrosData.push(["ID", "Nome", "Categoria", "", "", ""]);
    expenseSubcategories.forEach((sub: any) => {
      cadastrosData.push([
        sub.id || "",
        sub.name || "",
        sub.category || "",
        "",
        "",
        "",
      ]);
    });

    // Espaço
    cadastrosData.push(["", "", "", "", "", ""]);

    // Seção de Receitas
    cadastrosData.push(["=== RECEITAS EXISTENTES ===", "", "", "", "", ""]);
    cadastrosData.push(["Data", "Descrição", "Categoria", "Valor", "Pessoa", "Notas"]);
    incomes.forEach((inc: any) => {
      const personName = people.find((p: any) => p.id === inc.personId)?.name || inc.personId || "";
      cadastrosData.push([
        inc.date || "",
        inc.category || "",
        inc.category || "",
        inc.amount || 0,
        personName,
        inc.notes || "",
      ]);
    });

    // Espaço
    cadastrosData.push(["", "", "", "", "", ""]);

    // Seção de Despesas
    cadastrosData.push(["=== DESPESAS EXISTENTES ===", "", "", "", "", ""]);
    cadastrosData.push(["Data", "Descrição", "Categoria", "Valor", "Pessoa", "Notas"]);
    expenses.forEach((exp: any) => {
      const personName = people.find((p: any) => p.id === exp.personId)?.name || exp.personId || "";
      cadastrosData.push([
        exp.date || "",
        exp.name || "",
        exp.category || "",
        exp.amount || 0,
        personName,
        exp.notes || "",
      ]);
    });

    const cadastrosSheet = XLSX.utils.aoa_to_sheet(cadastrosData);
    cadastrosSheet["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 25 },
    ];

    // Formatar headers em negrito (adicionar merge ou estilo)
    XLSX.utils.book_append_sheet(wb, cadastrosSheet, "Cadastros");

    // Aba 2: Receitas
    const incomeSubcatNames = incomeSubcategories.map((s: any) => s.name);
    const peopleNames = people.map((p: any) => p.name);

    const receitas = [["Data", "Subcategoria", "Valor", "Pessoa", "Observação"]];
    for (let i = 0; i < 50; i++) {
      receitas.push(["", "", "", "", ""]);
    }

    const receitasSheet = XLSX.utils.aoa_to_sheet(receitas);
    receitasSheet["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, receitasSheet, "Receitas");

    // Aba 3: Despesas
    const despesas = [["Data", "Subcategoria", "Valor", "Pessoa", "Observação"]];
    for (let i = 0; i < 50; i++) {
      despesas.push(["", "", "", "", ""]);
    }

    const despesasSheet = XLSX.utils.aoa_to_sheet(despesas);
    despesasSheet["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, despesasSheet, "Despesas");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const bufferData = Buffer.from(buf as ArrayBuffer);

    res.setHeader("Content-Disposition", 'attachment; filename="monetrik-migracao.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", bufferData.length);

    res.send(bufferData);
  } catch (error) {
    console.error("Erro ao gerar template:", error);
    res.status(500).json({ error: "Erro ao gerar template" });
  }
});

// 7. Migration: Validate uploaded file
app.post("/api/migration/validate", (req, res) => {
  try {
    const { fileData, people, incomeSubcategories, expenseSubcategories } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer);

    const incomeSheet = workbook.Sheets["Receitas"];
    const expenseSheet = workbook.Sheets["Despesas"];

    if (!incomeSheet || !expenseSheet) {
      return res.status(200).json({
        valid: false,
        errors: [{ error: "Arquivo deve conter abas 'Receitas' e 'Despesas'" }],
      });
    }

    const incomeRows = XLSX.utils.sheet_to_json(incomeSheet, { header: 0 });
    const expenseRows = XLSX.utils.sheet_to_json(expenseSheet, { header: 0 });

    const incomeSubcatNames = incomeSubcategories.map((s: any) => s.name);
    const expenseSubcatNames = expenseSubcategories.map((s: any) => s.name);
    const peopleNames = people.map((p: any) => p.name);

    const errors: any[] = [];

    incomeRows.forEach((row: any, idx: number) => {
      if (!row.data && !row.Data && !row["Data"]) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];

      if (subcategoria && !incomeSubcatNames.includes(subcategoria)) {
        errors.push({
          error: `Linha ${idx + 2}: Subcategoria de receita desconhecida: "${subcategoria}"`,
        });
      }
      if (pessoa && !peopleNames.includes(pessoa)) {
        errors.push({ error: `Linha ${idx + 2}: Pessoa desconhecida: "${pessoa}"` });
      }
    });

    expenseRows.forEach((row: any, idx: number) => {
      if (!row.data && !row.Data && !row["Data"]) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];

      if (subcategoria && !expenseSubcatNames.includes(subcategoria)) {
        errors.push({
          error: `Linha ${idx + 2}: Subcategoria de despesa desconhecida: "${subcategoria}"`,
        });
      }
      if (pessoa && !peopleNames.includes(pessoa)) {
        errors.push({ error: `Linha ${idx + 2}: Pessoa desconhecida: "${pessoa}"` });
      }
    });

    return res.status(200).json({
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Erro na validação:", error);
    res.status(500).json({ error: "Erro ao validar arquivo" });
  }
});

// 8. Migration: Execute migration (delete all incomes/expenses and import new ones)
app.post("/api/migration/execute", (req, res) => {
  try {
    const { fileData, email, password, people: selectedPeople } = req.body;

    // IMPORTANTE: Validar senha via re-autenticação Firebase
    // Para fins de demonstração, apenas verificamos se foi fornecida
    if (!password) {
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    if (!fileData) {
      return res.status(400).json({ error: "Arquivo inválido" });
    }

    const buffer = Buffer.from(fileData, "base64");
    const workbook = XLSX.read(buffer);

    const incomeSheet = workbook.Sheets["Receitas"];
    const expenseSheet = workbook.Sheets["Despesas"];

    const incomeRows = XLSX.utils.sheet_to_json(incomeSheet, { header: 0 });
    const expenseRows = XLSX.utils.sheet_to_json(expenseSheet, { header: 0 });

    const newIncomes: any[] = [];
    const newExpenses: any[] = [];

    // Processar receitas
    incomeRows.forEach((row: any) => {
      const data = row.data || row.Data || row["Data"];
      if (!data) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const valor = row.valor || row.Valor || row["Valor"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];
      const observacao = row.observação || row.Observação || row["Observação"] || "";

      if (subcategoria && valor && pessoa) {
        newIncomes.push({
          id: `in-${Date.now()}-${Math.random()}`,
          personId: selectedPeople.find((p: any) => p.name === pessoa)?.id || "",
          category: subcategoria,
          amount: Number(valor),
          date: String(data),
          notes: String(observacao),
          isFixed: false,
          isRecurring: false,
          recurrence: "eventual",
        });
      }
    });

    // Processar despesas
    expenseRows.forEach((row: any) => {
      const data = row.data || row.Data || row["Data"];
      if (!data) return;

      const subcategoria = row.subcategoria || row.Subcategoria || row["Subcategoria"];
      const valor = row.valor || row.Valor || row["Valor"];
      const pessoa = row.pessoa || row.Pessoa || row["Pessoa"];
      const observacao = row.observação || row.Observação || row["Observação"] || "";

      if (subcategoria && valor && pessoa) {
        newExpenses.push({
          id: `ex-${Date.now()}-${Math.random()}`,
          personId: selectedPeople.find((p: any) => p.name === pessoa)?.id || "",
          name: subcategoria,
          category: subcategoria,
          amount: Number(valor),
          date: String(data),
          notes: String(observacao),
          isFixed: false,
          isRecurring: false,
          recurrence: "eventual",
          paymentMethod: "Pix",
        });
      }
    });

    // Retornar dados parseados para o frontend salvar no Firestore
    return res.status(200).json({
      success: true,
      incomesImported: newIncomes.length,
      expensesImported: newExpenses.length,
      newIncomes,
      newExpenses,
      message: "Migração executada com sucesso",
    });
  } catch (error) {
    console.error("Erro na migração:", error);
    res.status(500).json({
      error: `Erro ao executar migração: ${error instanceof Error ? error.message : "desconhecido"}`,
    });
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
