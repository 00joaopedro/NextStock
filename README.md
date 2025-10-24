# 🧭 NextStock — SaaS Multi-Tenant de Gestão de Estoque

**NextStock** é um sistema SaaS multi-tenant escalável e modular para gestão de estoque, produtos e movimentações, com controle de permissões (RBAC), integração de pagamentos via **Mercado Pago**, e suporte a **importação/exportação Excel/CSV**.  
O sistema oferece um **trial gratuito de 15 dias** para cada empresa (tenant) e bloqueia movimentações após o período caso o pagamento não seja realizado.

---

## 🚀 Objetivo

Criar um **SaaS leve, modular e seguro** para gerenciar produtos, vendas e relatórios, com painel administrativo completo e fluxos automatizados de pagamento e trial.

---

## 🏗️ Arquitetura e Stack

| Camada | Tecnologia | Descrição |
|--------|-------------|-----------|
| **Frontend** | HTML5, CSS3, JS puro | Responsivo, mobile-first |
| **Backend** | Node.js + NestJS (ou Express) | API RESTful escalável |
| **Banco de Dados** | PostgreSQL (Supabase) | Dados relacionais multi-tenant |
| **Cache/Queue** | Redis + BullMQ | Import/Export, notificações, filas assíncronas |
| **Armazenamento** | Supabase Buckets (migrável para AWS S3) | Imagens de produtos |
| **ORM** | Prisma ORM | Modelagem e migrações do banco |
| **Auth** | Auth0 (JWT com tenant_id) | Autenticação segura e granular |
| **Pagamentos** | Mercado Pago (API + Webhooks) | Checkout + gerenciamento de planos |
| **Monitoramento** | Sentry + Prometheus + Grafana | Logs, métricas e alertas |
| **Deploy** | Vercel + Supabase + Redis Cloud | Infraestrutura escalável |

---

## 🧩 Estrutura de Pastas

/src
├── controllers/
├── routes/
├── database/
├── middlewares/
├── workers/
├── utils/
├── server.js
/public
├── index.html
├── home.html
├── produtos.html
├── cadastro.html
├── importacao.html
├── guia.html
└── app.js

markdown
Copiar código

---

## ⚙️ Funcionalidades Principais

### Multi-Tenant
- Cada empresa (tenant) tem dados e usuários isolados.
- Identificação via `tenant_id` em todas as tabelas.
- Middleware global para validação de tenant.

### Onboarding / Trial
- Criação de tenant inicia trial de 15 dias automaticamente.
- 3 dias antes do fim, notificação por e-mail/webhook.
- Após o término: modo *read-only* até pagamento.
- Usuário pode pagar a qualquer momento para liberar o plano.

### Pagamentos (Mercado Pago)
- Criação de preferência de pagamento por tenant.
- Webhook que ativa o plano após pagamento confirmado.
- Suporte a planos mensais e anuais.
- Variáveis:
MERCADO_PAGO_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_KEY=

yaml
Copiar código

### RBAC — Papéis e Permissões

| Papel | Permissões |
|-------|-------------|
| **Cliente** | Ver produtos, adicionar ao carrinho, realizar checkout, exportar relatórios simples |
| **Vendedor** | Registrar saídas, consultar estoque, ver relatórios de vendas |
| **Chefe** | Acesso total ao tenant, CRUD completo, import/export, transferências, relatórios e logs |
| **Admin (SaaS)** | Acesso global: tenants, pagamentos, métricas e auditorias |

### Matriz de Permissões

| Recurso | Cliente | Vendedor | Chefe | Admin (SaaS) |
|----------|----------|-----------|--------|---------------|
| Dashboard | ✅ limitado | ✅ | ✅ | ✅ todos |
| Produtos (listar) | ✅ | ✅ | ✅ | ✅ |
| Produtos (criar/editar) | ❌ | ❌ | ✅ | ✅ |
| Movimentações (entradas/saídas) | ❌ | ✅ saídas | ✅ | ✅ |
| Importação / Exportação | ❌ | ❌ | ✅ | ✅ |
| Relatórios | ✅ | ✅ | ✅ | ✅ |
| Configurações Tenant | ❌ | ❌ | ✅ | ✅ |
| Pagamento / Plano | ❌ | ❌ | ✅ | ✅ |

---

## 📦 Modelagem do Banco (Prisma)

### Tenants
| Campo | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador |
| name | String | Nome da empresa |
| slug | String | Subdomínio |
| status | Enum (trial, active, past_due, canceled) | Status do tenant |
| trial_starts_at | Date | Início do trial |
| trial_ends_at | Date | Fim do trial |
| created_at | Date | Criação |

### Users
| id | UUID |  |
| tenant_id | FK |  |
| name | String |  |
| email | String |  |
| password_hash | String |  |
| role | Enum(cliente, vendedor, chefe, admin) |  |
| last_login | Date |  |

### Products
Campos principais:
img (até 3 imagens, ≤ 2MB cada, reduzidas via Sharp)
preço, descrição, categoria, quantidade, nome, marca,
SKU, unidade, fornecedor (opcional)

shell
Copiar código

### Movements
id, tenant_id, product_id, type (entrada|saida|transferencia|ajuste),
quantity, user_id, note, created_at

yaml
Copiar código

### ImportJobs / ExportJobs
Controle de importação e exportação CSV/XLSX:
- Limite: 50MB (configurável)
- Processamento assíncrono via BullMQ
- Armazenamento temporário em Supabase/S3
- Expiração de links de export após 24h

---

## 🧾 Endpoints Principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/tenants` | Criar tenant + iniciar trial |
| POST | `/api/v1/auth/register` | Registrar usuário |
| POST | `/api/v1/auth/login` | Autenticar usuário |
| GET | `/api/v1/products` | Listar produtos |
| POST | `/api/v1/products` | Criar produto |
| PUT | `/api/v1/products/:id` | Atualizar produto |
| DELETE | `/api/v1/products/:id` | Desativar produto |
| POST | `/api/v1/movements` | Registrar movimentação |
| GET | `/api/v1/dashboard` | Dados agregados |
| POST | `/api/v1/imports` | Upload de CSV/XLSX |
| GET | `/api/v1/imports/:id/status` | Ver status da importação |
| POST | `/api/v1/payments/mercadopago/create_preference` | Criar preferência |
| POST | `/api/v1/payments/mercadopago/webhook` | Webhook de pagamento |
| GET | `/api/v1/admin/tenants` | Painel global (admin SaaS) |

---

## 💰 Fluxo de Pagamento e Trial

1. **Tenant criado:** inicia trial (15 dias).
2. **3 dias antes do fim:** enviar alerta.
3. **Sem pagamento após trial:** tenant = “limited”, bloqueia escritas.
4. **Pagamento via Mercado Pago:**
   - Cria preferência (`external_reference = tenant_id`);
   - Webhook recebe confirmação;
   - Atualiza status `active`.
5. **Reativação:** após pagamento, liberar novamente o tenant.

---

## 📥 Importação / Exportação

- Upload via CSV/XLSX (≤ 50MB por padrão, configurável).
- Validação de colunas, preview antes da importação.
- Processo assíncrono em worker BullMQ.
- Exportação gera arquivo e link válido por 24h.

---

## 🧠 Segurança e Boas Práticas

- Hash de senhas (bcrypt/argon2)
- TLS obrigatório
- Rate limiting e CSRF Protection
- Isolamento total por `tenant_id`
- Logs de auditoria (`AuditLogs`)
- Backups automáticos do PostgreSQL

---

## 🔍 Observabilidade e CI/CD

- Logs e erros: **Sentry**
- Métricas: **Prometheus + Grafana**
- Testes unitários e integração (**Jest**, cobertura ≥ 60%)
- CI/CD configurado para **Vercel + Supabase + Redis Cloud**

---

## 🧰 Setup Local

```bash
# Instalar dependências
npm install

# Configurar variáveis
cp .env.example .env

# Rodar servidor
npm run dev
📄 Variáveis de Ambiente (.env)
bash
Copiar código
DATABASE_URL=
SUPABASE_URL=
SUPABASE_KEY=
REDIS_URL=
JWT_SECRET=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
MERCADO_PAGO_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_KEY=
STORAGE_BUCKET_URL=
✅ Critérios de Aceitação
Criar tenant inicia trial de 15 dias corretamente.

Usuário chefe pode criar produtos e configurar vendedores.

Vendedor registra saídas normalmente.

Cliente apenas visualiza e realiza checkout.

Webhook do Mercado Pago ativa tenants pagos.

Trial expirado bloqueia escritas.

Exportações e imports funcionam até 50MB (ajustável).

Logs e alertas configurados no monitoramento.

📘 Licença
Projeto NextStock — © João Reis.
Desenvolvimento SaaS automatizado com IA Lovable.
