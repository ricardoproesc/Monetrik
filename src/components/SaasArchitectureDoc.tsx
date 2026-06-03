/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Server, Database, Shield, CreditCard, LifeBuoy, 
  Layers, Settings, ChevronRight, FileText, Calendar, Compass 
} from "lucide-react";

export default function SaasArchitectureDoc() {
  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Hero Section */}
      <div className="border border-zinc-100 rounded-2xl bg-gradient-to-br from-zinc-50 to-white p-6 md:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-950 flex items-center gap-2">
          <Layers className="h-6 w-6 text-zinc-700" id="icon-arch-hero" />
          Especificações de Arquitetura & Infraestrutura SaaS
        </h2>
        <p className="mt-2 text-sm text-zinc-600 max-w-3xl leading-relaxed">
          Planejamento completo do sistema financeiro familiar projetado para rodar com **baixo custo**, segurança de nível bancário e alta escalabilidade. Conheça as escolhas da nossa equipe de engenharia e análise financeira de elite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column - Doc Navigation & Stack Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-zinc-200 rounded-xl p-5 bg-white shadow-xs">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Stack Sugerida (Baixo Custo)</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Server className="h-4 w-4" id="icon-stack-backend" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-950">Backend & API</h4>
                  <p className="text-xs text-zinc-500">Node.js (Express com TypeScript). Consumo mínimo de RAM (150MB), assíncrono e ideal para APIs JSON.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Database className="h-4 w-4" id="icon-stack-db" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-950">Banco de Dados</h4>
                  <p className="text-xs text-zinc-500">PostgreSQL (mesmo VPS inicial). Altíssima confiabilidade ACID, ideal para transações numéricas com indexação complexa.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-zinc-100 text-zinc-800 rounded-lg">
                  <Shield className="h-4 w-4" id="icon-stack-auth" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-950">Autenticação</h4>
                  <p className="text-xs text-zinc-500">JWT em Cookies HttpOnly com proteção CSRF. Seguro e sem custos recorrentes de provedores externos.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                  <CreditCard className="h-4 w-4" id="icon-stack-vps" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-950">Hospedagem & VPS</h4>
                  <p className="text-xs text-zinc-500">VPS Hetzner ou Contabo ou AWS LightSail. Intel/AMD vCPU + 2GB RAM custando de $4 a $6 mensais.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-emerald-100 rounded-xl p-5 bg-emerald-50/50">
            <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
              <LifeBuoy className="h-4 w-4 text-emerald-700" id="icon-stack-economy" />
              Estratégia de Envio de E-mails
            </h3>
            <p className="mt-2 text-xs text-emerald-900 leading-relaxed">
              Para e-mails de confirmação e recuperação de senha sem custos, recomendamos a integração com **Resend** (plano gratuito que dá direito a 3.000 e-mails por mês) ou **SMTP da VPS via Zoho Mail Lite (R$ 5,00/mês)**. Isso garante taxa de entrega de 99% sem estourar o orçamento da startup.
            </p>
          </div>
        </div>

        {/* Right Columns - Technical Tabs/Accordions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Arquitetura DevOps & Segurança */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-950 tracking-tight flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-zinc-950 rounded-full"></div>
              Infraestrutura, DevOps & Segurança
            </h3>
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Topologia de Containers e Deploy</span>
              </div>
              <div className="p-5 space-y-4 text-sm text-zinc-600 leading-relaxed">
                <div>
                  <strong className="text-zinc-950">1. Docker Multi-Stage Build:</strong>
                  <p className="mt-1 text-xs text-zinc-500">
                    O frontend React/Vite é compilado em arquivos estáticos servidos pelo Express diretamente. Tudo roda em um único container final leve, mantendo o consumo de memória baixo na VPS econômica.
                  </p>
                </div>
                <div className="h-px bg-zinc-100"></div>
                <div>
                  <strong className="text-zinc-950">2. Reverse Proxy & SSL (Caddy Server):</strong>
                  <p className="mt-1 text-xs text-zinc-500">
                    Sugerimos o uso do Caddy como servidor de borda na VPS. Ele é incrivelmente rápido e gerencia a emissão e renovação automática de certificados SSL gratuitos da Let's Encrypt de forma nativa e sem configurações complexas como o Nginx clássico.
                  </p>
                </div>
                <div className="h-px bg-zinc-100"></div>
                <div>
                  <strong className="text-zinc-950">3. Rotina Automática de Backups:</strong>
                  <p className="mt-1 text-xs text-zinc-500">
                    Script Cron rodando diariamente à meia-noite na VPS para realizar <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">pg_dump</code> do banco de dados, compactar em tar.gz e enviar via rclone diretamente para um bucket S3 gratuito (plano de 10GB da Cloudflare R2 ou Backblaze B2).
                  </p>
                </div>
                <div className="h-px bg-zinc-100"></div>
                <div>
                  <strong className="text-zinc-950">4. Práticas Reais de Segurança:</strong>
                  <p className="mt-1 text-xs text-zinc-500">
                    Senhas salvas usando hashing **bcrypt** (iterações salt-factor 12) no banco. Proteção robusta contra CSRF por token de validação síncrona, sanitização com dominios estritos para evitar XSS e ativação de cabeçalhos de segurança básicos via Express <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">helmet</code>. Rate-limit configurado para 100 requisições a cada 15 minutos por IP para barrar força bruta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Modelagem do Banco de Dados */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-950 tracking-tight flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-zinc-950 rounded-full"></div>
              Modelagem Matemática das Tabelas Relacionais
            </h3>
            
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50 grid grid-cols-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <div>Tabela / PK</div>
                <div>Campos Chave</div>
                <div>FK / Tipo de Relação</div>
              </div>
              <div className="divide-y divide-zinc-100 text-xs">
                
                <div className="p-4 grid grid-cols-3 text-zinc-600">
                  <div>
                    <strong className="text-zinc-950 block">users</strong>
                    <span className="text-zinc-400 font-mono text-[10px]">PK: id (uuid)</span>
                  </div>
                  <div>name, email, password_hash, email_verified, is_active, created_at</div>
                  <div>Nenhuma (Pai principal)</div>
                </div>

                <div className="p-4 grid grid-cols-3 text-zinc-600">
                  <div>
                    <strong className="text-zinc-950 block">people</strong>
                    <span className="text-zinc-400 font-mono text-[10px]">PK: id (uuid)</span>
                  </div>
                  <div>name, avatar, gender, relationship, email, whatsapp, birth_date, color, active</div>
                  <div>
                    <strong className="text-zinc-950 text-[10px] block">FK: user_id</strong> 
                    1:N (Um usuário pode ter muitas pessoas da família)
                  </div>
                </div>

                <div className="p-4 grid grid-cols-3 text-zinc-600">
                  <div>
                    <strong className="text-zinc-950 block">incomes</strong>
                    <span className="text-zinc-400 font-mono text-[10px]">PK: id (uuid)</span>
                  </div>
                  <div>category, amount (decimal 15,2), date, notes, is_fixed, is_recurring, recurrence</div>
                  <div>
                    <strong className="text-zinc-950 text-[10px] block">FK: person_id</strong>
                    1:N (Uma pessoa familiar é responsável por várias rendas)
                  </div>
                </div>

                <div className="p-4 grid grid-cols-3 text-zinc-600">
                  <div>
                    <strong className="text-zinc-950 block">expenses</strong>
                    <span className="text-zinc-400 font-mono text-[10px]">PK: id (uuid)</span>
                  </div>
                  <div>name, category, is_fixed, amount (decimal), date, notes, is_recurring, payment_method</div>
                  <div>
                    <strong className="text-zinc-950 text-[10px] block font-mono">FK: person_id, user_id</strong>
                    1:N (Despesa vinculada à pessoa familiar responsável)
                  </div>
                </div>

                <div className="p-4 grid grid-cols-3 text-zinc-600">
                  <div>
                    <strong className="text-zinc-950 block">alert_settings</strong>
                    <span className="text-zinc-400 font-mono text-[10px]">PK: id (uuid)</span>
                  </div>
                  <div>is_enabled, level (enum), custom_fixed_limit, custom_variable_limit, custom_savings_target</div>
                  <div>
                    <strong className="text-zinc-950 text-[10px] block">FK: user_id (Unique)</strong>
                    1:1 (Cada usuário possui uma configuração de inteligência)
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 3. Estrutura de APIs */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-950 tracking-tight flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-zinc-950 rounded-full"></div>
              Rotas da API Restful
            </h3>
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-xs text-xs">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50 grid grid-cols-4 font-semibold text-zinc-500 uppercase tracking-widest">
                <div>Método</div>
                <div className="col-span-2">Endpoint</div>
                <div>Ação / Autenticação</div>
              </div>
              <div className="divide-y divide-zinc-100">
                
                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">POST</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/auth/register</div>
                  <div className="text-zinc-500">Cadastro de conta principal e disparo do e-mail</div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">POST</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/auth/login</div>
                  <div className="text-zinc-500">Cria a sessão segura enviando JWT via cookie HttpOnly</div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">GET</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/people</div>
                  <div className="text-zinc-500">Lista pessoas da família vinculadas <span className="text-red-600 font-semibold">[JWT]</span></div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">POST</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/people</div>
                  <div className="text-zinc-500">Insere novo integrante familiar <span className="text-red-600 font-semibold">[JWT]</span></div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">GET</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/transactions</div>
                  <div className="text-zinc-500">Retorna receitas e despesas com filtros de ano/período <span className="text-red-600 font-semibold">[JWT]</span></div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">POST</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/ai/insights</div>
                  <div className="text-zinc-500">Motor de recomendação da IA com análise de metas <span className="text-red-600 font-semibold">[JWT]</span></div>
                </div>

                <div className="p-4 grid grid-cols-4 items-center">
                  <div><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">POST</span></div>
                  <div className="col-span-2 font-mono text-zinc-800">/api/ai/assistant</div>
                  <div className="text-zinc-500">Envio de chats de conversação com contexto familiar <span className="text-red-600 font-semibold">[JWT]</span></div>
                </div>

              </div>
            </div>
          </div>

          {/* 4. Metodologias & Roadmap */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-zinc-950 tracking-tight flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-zinc-950 rounded-full"></div>
              Diretrizes Financeiras Clássicas & Roadmap
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-zinc-200 rounded-xl bg-white p-5 space-y-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Metodologia 50/30/20</span>
                <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                  Regra defendida por economistas de Harvard para divisão saudável da receita líquida familiar:
                </p>
                <ul className="text-xs text-zinc-600 space-y-1 my-2">
                  <li>🟢 <strong>50% Bens Essenciais / Fixos:</strong> Contas indispensáveis recorrentes (Aluguel, escola, convênios, mercado).</li>
                  <li>🟡 <strong>30% Estilo de Vida / Variáveis:</strong> Gastos supérfluos, jantares, assinaturas streamings, hobbies, lazer.</li>
                  <li>🔵 <strong>20% Investimentos / Reservas:</strong> Poupado imediatamente no início do mês para objetivos de longo prazo.</li>
                </ul>
              </div>

              <div className="border border-zinc-200 rounded-xl bg-white p-5 space-y-2">
                <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">Reserva de Emergência Familiar</span>
                <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                  Estilo de cobertura do sistema:
                </p>
                <div className="text-xs text-zinc-600 space-y-2">
                  <p>
                    <strong>Fórmula do App:</strong> <code className="bg-zinc-100 px-1 py-0.5 rounded">Custo Fixo Mensal × 6 meses</code>.
                  </p>
                  <p>
                    Para autônomos ou famílias com renda flutuante, o assistente FinancIA automaticamente notifica o usuário para elevar este alvo para 9 ou 12 meses de despesas fixas para maior blindagem.
                  </p>
                </div>
              </div>
            </div>

            {/* Roadmap */}
            <div className="border border-zinc-200 rounded-xl bg-gradient-to-r from-zinc-50 to-white p-6 space-y-4">
              <h4 className="text-sm font-semibold text-zinc-950">Plano de Evolução do Produto (Roadmap)</h4>
              <div className="relative border-l border-zinc-200 pl-4 space-y-6">
                
                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 bg-zinc-950 h-2.5 w-2.5 rounded-full ring-4 ring-white"></div>
                  <strong className="text-xs text-zinc-950">MVP (Este Applet)</strong>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    Cadastro de pessoas, input de receitas e despesas estruturadas, gráficos com filtros, inteligência de alertas mecânicos baseada em perfis de risco e Chatbot de consultoria impulsionado de forma integrada por Inteligência Artificial (Gemini).
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 bg-zinc-400 h-2.5 w-2.5 rounded-full ring-4 ring-white"></div>
                  <strong className="text-xs text-zinc-700">Versão V1 (Próximo Release)</strong>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    Autenticação com envio de e-mails em VPS de produção, vinculação com banco de dados PostgreSQL seguro, upload de fotos de participantes locais (ou cadastro de avatares) e visualizador de projeção de saldo estatística no menu.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1.5 bg-zinc-300 h-2.5 w-2.5 rounded-full ring-4 ring-white"></div>
                  <strong className="text-xs text-zinc-400">Versão V2 & Funcionalidades Premium (Monetização)</strong>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    Integração com Open Finance via Pluggy ou Belvo para sincronização automática das contas de bancos reais sem digitação; leitura automática de notas fiscais do consumidor pela câmera via OCR; e relatórios consolidados em PDF assinados via IA para envio por WhatsApp.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
