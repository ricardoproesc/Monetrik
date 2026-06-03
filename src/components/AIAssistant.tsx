/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Person, Income, Expense } from "../types";
import { Send, Sparkles, MessageSquare, RefreshCw, AlertCircle, Trash2 } from "lucide-react";

interface AIAssistantProps {
  people: Person[];
  incomes: Income[];
  expenses: Expense[];
}

export default function AIAssistant({ people, incomes, expenses }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: "Olá! Sou o **FinancIA**, o assistente inteligente da sua família brasileira. Como posso ajudar com seu controle financeiro de baixo custo hoje?",
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages.slice(-10), // pass latest conversations
          currentMessage: textToSend,
          contextData: { people, incomes, expenses } // dynamically inject live finances!
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.text || "Desculpe, não consegui processar sua mensagem.",
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("API return failure code");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ocorreu um erro ao consultar o assistente FinancIA. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-msg-reset",
        sender: "ai",
        text: "Histórico limpo! Como posso te apoiar com novas dicas financeiras familiares?",
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Preset smart questions
  const SUGGESTED_PROMPTS = [
    { label: "Nossa Reserva de Emergência", query: "Quanto devemos ter de reserva de emergência familiar com base nos nossos gastos fixos?" },
    { label: "O que é Regra 50/30/20?", query: "Pode me explicar detalhadamente a regra de harmonização financeira 50/30/20?" },
    { label: "Dicas de Economia Doméstica", query: "Gere 3 dicas de ouro extremamente práticas para reduzir despesas de água, luz ou lazer imediatamente." }
  ];

  return (
    <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden shadow-xs h-[600px] flex flex-col animate-fade-in p-1">
      
      {/* Advisor Topbar */}
      <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full bg-zinc-950 text-white flex items-center justify-center text-sm font-semibold">
            FA
          </span>
          <div>
            <h3 className="text-xs font-semibold text-zinc-950 flex items-center gap-1">
              FinancIA
              <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" id="icon-ai-chatbot" />
            </h3>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Consultor de Finanças Pessoais</span>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-650 rounded-lg transition-all"
          title="Limpar Conversa"
          id="btn-clear-chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-zinc-900 text-white rounded-tr-none shadow-xs' 
                  : 'bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200/50'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {/* Basic markdown parsing simulator for bold styling */}
                {msg.text.split("**").map((part, index) => 
                  index % 2 === 1 ? <strong key={index} className="font-semibold">{part}</strong> : part
                )}
              </div>
            </div>
            <span className="text-[9px] text-zinc-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl self-start max-w-[200px] animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>FinancIA analisando...</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-red-650 bg-red-50 border border-red-100 p-2.5 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Recommended Prompts Grid */}
      <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50/50">
        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Sugestões de Consulta</span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((prompt, prIdx) => (
            <button
              key={prIdx}
              type="button"
              id={`preset-prompt-${prIdx}`}
              onClick={() => handleSendMessage(prompt.query)}
              className="text-[10px] bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 rounded-lg px-2.5 py-1 text-left hover:bg-zinc-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Box */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-zinc-200 bg-white flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Pergunte sobre reserva móvel, regras de investimento ou gastos..."
          disabled={loading}
          id="input-ai-chat"
          className="flex-1 text-xs border border-zinc-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-zinc-400 disabled:opacity-60 disabled:bg-zinc-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          id="btn-send-ai-chat"
          className="p-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white rounded-xl transition-all flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );
}
