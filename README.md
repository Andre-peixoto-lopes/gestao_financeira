# 💰 Gestão Financeira Pessoal

Sistema completo de gestão financeira pessoal com dados permanentes na nuvem.

## ✨ Funcionalidades

- 👥 Multi-usuários com autenticação segura (JWT + bcrypt)
- 💳 Controle de receitas e despesas
- 📅 Despesas fixas mensais
- 🏦 Parcelas de compras
- 🐷 Caixinhas de economia
- 📊 Painel administrativo

## 🚀 Deploy no Vercel + Neon (100% Gratuito)

### Passo 1: Criar banco de dados no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Clique em **"Create Project"**
3. Copie a **Connection String** (começa com `postgresql://...`)

### Passo 2: Subir código no GitHub

1. Crie um repositório no [GitHub](https://github.com)
2. Faça upload de todos os arquivos deste projeto

### Passo 3: Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **"Add New" → "Project"**
3. Importe o repositório do GitHub
4. Em **"Environment Variables"**, adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Cole a Connection String do Neon |
| `JWT_SECRET` | Uma senha longa e aleatória |
| `ADMIN_SECRET` | Outra senha longa e aleatória |
| `ADMIN_PASSWORD` | Senha para acessar o painel admin |

5. Clique em **"Deploy"**

### Passo 4: Pronto! 🎉

Após o deploy, você terá:
- **App:** `https://seu-projeto.vercel.app`
- **Admin:** `https://seu-projeto.vercel.app/admin`

---

## 🔐 Credenciais Padrão

| Item | Valor Padrão |
|------|--------------|
| Senha Admin | `admin123` (mude nas variáveis de ambiente!) |

---

## 📁 Estrutura do Projeto

```
├── index.html          # Página principal
├── admin.html          # Painel administrativo
├── app.js              # Lógica do frontend
├── styles.css          # Estilos
├── package.json        # Dependências
├── vercel.json         # Configuração do Vercel
└── api/
    ├── _db.js          # Conexão PostgreSQL
    ├── _auth.js        # Autenticação JWT
    ├── auth.js         # Login/Registro
    ├── transactions.js # CRUD transações
    ├── fixed.js        # CRUD despesas fixas
    ├── installments.js # CRUD parcelas
    ├── savings.js      # CRUD caixinhas
    ├── settings.js     # Configurações
    └── admin.js        # API do painel admin
```

---

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | ✅ Sim |
| `JWT_SECRET` | Chave secreta para tokens | ✅ Sim |
| `ADMIN_SECRET` | Chave secreta para admin | ✅ Sim |
| `ADMIN_PASSWORD` | Senha do painel admin | ✅ Sim |

---

## 💡 Alternativas ao Neon

Outros bancos PostgreSQL gratuitos:
- [Supabase](https://supabase.com) - 500MB grátis
- [ElephantSQL](https://elephantsql.com) - 20MB grátis
- [Railway](https://railway.app) - $5/mês de crédito grátis

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
