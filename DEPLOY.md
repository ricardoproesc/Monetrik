# Monetrik — Guia de Deploy para Produção

## Visão Geral da Arquitetura

```
Monetrik/
├── api/                        ← Serverless Functions (Vercel)
│   ├── health.ts               ← GET  /api/health
│   └── ai/
│       ├── insights.ts         ← POST /api/ai/insights
│       └── assistant.ts        ← POST /api/ai/assistant
├── src/
│   ├── lib/
│   │   ├── firebase.ts         ← Inicialização Firebase
│   │   └── firestore.ts        ← CRUD Firestore + migração
│   └── ... (componentes React)
├── vercel.json                 ← Config de deploy
├── .env.local.example          ← Template de variáveis
└── .gitignore                  ← NÃO versiona .env.local
```

---

## PASSO 1 — Obter a Chave Gemini

1. Acesse https://aistudio.google.com/app/apikey
2. Clique em **Create API Key**
3. Copie a chave gerada

---

## PASSO 2 — Configurar o Firebase

### 2.1 Criar Projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **Adicionar projeto** → dê o nome "Monetrik"
3. Desative Google Analytics (opcional) → **Criar projeto**

### 2.2 Ativar Authentication (Email/Senha)

1. No menu lateral: **Authentication** → **Começar**
2. Aba **Sign-in method** → ative **E-mail/senha**

### 2.3 Criar Banco Firestore

1. No menu lateral: **Firestore Database** → **Criar banco de dados**
2. Selecione **Modo de produção** → escolha a região `southamerica-east1`
3. Nas **Regras de segurança**, substitua pelo conteúdo abaixo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2.4 Obter Credenciais do Firebase

1. No projeto Firebase: **Configurações** (ícone de engrenagem) → **Configurações do projeto**
2. Role até **Seus aplicativos** → clique em **</>** (Web)
3. Dê o apelido "Monetrik Web" → **Registrar app**
4. Copie o objeto `firebaseConfig` exibido

---

## PASSO 3 — Criar as Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Copie o exemplo e preencha
cp .env.local.example .env.local
```

Preencha com seus valores reais:

```env
GEMINI_API_KEY=AIzaSy...sua_chave_aqui

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=monetrik-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=monetrik-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=monetrik-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
```

**IMPORTANTE:** `GEMINI_API_KEY` (sem VITE_) fica apenas no servidor — nunca exposta no browser.

---

## PASSO 4 — Instalar Dependências e Testar Localmente

```bash
npm install

# Testar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000 e verifique se o app funciona.

---

## PASSO 5 — Deploy na Vercel

### 5.1 Instalar Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 5.2 Configurar Variáveis na Vercel

```bash
# Adicione cada variável de ambiente na Vercel
vercel env add GEMINI_API_KEY production
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
vercel env add VITE_FIREBASE_APP_ID production
```

**Ou pela interface:** https://vercel.com → seu projeto → **Settings** → **Environment Variables**

### 5.3 Fazer o Deploy

```bash
# Deploy de produção
vercel --prod
```

A Vercel detecta automaticamente:
- As funções serverless em `api/`
- O build Vite (`vite build`) para o frontend
- O `vercel.json` com as rotas de SPA

---

## PASSO 6 — Integrar Firebase Auth no App (opcional mas recomendado)

O arquivo `src/lib/firebase.ts` já está pronto. Para substituir a autenticação fake pela Firebase Auth, edite `src/App.tsx`:

```typescript
// 1. Adicione no topo do arquivo:
import { auth } from "./lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// 2. Substitua handleLogin:
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, emailInput, passInput);
    setIsAuthenticated(true);
    setSessionEmail(emailInput);
  } catch (err: any) {
    setAuthFeedback("E-mail ou senha incorretos.");
    setAuthStatus("error");
  }
};

// 3. Substitua handleRegister:
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await createUserWithEmailAndPassword(auth, emailInput, passInput);
    setAuthFeedback("Cadastro realizado! Faça login para continuar.");
    setAuthStatus("success");
  } catch (err: any) {
    setAuthFeedback("Erro no cadastro. Verifique os dados.");
    setAuthStatus("error");
  }
};

// 4. Substitua handleLogout:
const handleLogout = async () => {
  await signOut(auth);
  setIsAuthenticated(false);
  setSessionEmail("");
};

// 5. Adicione listener de auth no useEffect:
useEffect(() => {
  return onAuthStateChanged(auth, (user) => {
    setIsAuthenticated(!!user);
    if (user) setSessionEmail(user.email || "");
  });
}, []);
```

---

## PASSO 7 — Integrar Firestore para Persistência (opcional)

O arquivo `src/lib/firestore.ts` já contém todas as funções CRUD. Para usar no App.tsx:

```typescript
import { migrateFromLocalStorage, loadPeople, savePerson, loadIncomes, loadExpenses, saveIncome, saveExpense } from "./lib/firestore";

// Ao fazer login, migre dados existentes e carregue do Firestore:
const onUserLogin = async (uid: string) => {
  await migrateFromLocalStorage(uid);  // migra localStorage → Firestore (só na primeira vez)
  const [firestorePeople, firestoreIncomes, firestoreExpenses] = await Promise.all([
    loadPeople(uid),
    loadIncomes(uid),
    loadExpenses(uid),
  ]);
  if (firestorePeople.length > 0) setPeople(firestorePeople);
  if (firestoreIncomes.length > 0) setIncomes(firestoreIncomes);
  if (firestoreExpenses.length > 0) setExpenses(firestoreExpenses);
};
```

---

## Segurança — Checklist Final

- [ ] `.env.local` está no `.gitignore` (nunca no git)
- [ ] `GEMINI_API_KEY` não tem prefixo `VITE_` (fica só no servidor)
- [ ] Regras do Firestore exigem autenticação
- [ ] Variáveis configuradas na Vercel antes do deploy
- [ ] Domínio de produção adicionado no Firebase Authentication → **Domínios autorizados**

---

## Estrutura de Dados no Firestore

```
users/
  {userId}/
    meta/
      settings → { isEnabled, level, customFixedLimit, ... }
    people/
      {personId} → { id, name, email, relationship, ... }
    incomes/
      {incomeId} → { id, amount, category, date, ... }
    expenses/
      {expenseId} → { id, name, amount, category, isFixed, ... }
```

---

## Domínio Customizado (opcional)

Na Vercel: **Settings** → **Domains** → adicione `monetrik.com.br` ou seu domínio.

No Firebase Authentication: **Authentication** → **Settings** → **Domínios autorizados** → adicione o novo domínio.
