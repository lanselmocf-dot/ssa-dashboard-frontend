# 💻 SSA Dashboard — Frontend Web Application

**Sistema de Monitoramento Operacional e Inteligência Gerencial — SSA Distribuidora**  
**Squad 68 · Residência em Software & IA (Porto Digital / UNIT)**  
**Líder Técnico & Arquiteto:** Luiz Anselmo  

Este repositório contém a **Aplicação Frontend SPA** desenvolvida em React, TypeScript e Vite, responsável pelas interfaces com o usuário, dashboards táticos e telas de apontamento de chão de fábrica.

---

## 🛠️ Tecnologias Utilizadas

* **Framework SPA:** React 18
* **Linguagem:** TypeScript 5.5+
* **Build Tool & Dev Server:** Vite 5
* **Roteamento:** React Router DOM v6
* **Estilização:** Tailwind CSS
* **Ícones:** Lucide React
* **Cliente HTTP:** Fetch API desacoplado (`apiClient.ts`) com injeção automática de JWT e timeouts
* **Containerização:** Docker (Node.js para dev / Nginx para prod)

---

## 🏛️ Arquitetura do Frontend

O projeto está estruturado de forma desacoplada da camada de backend, consumindo a API RESTful exclusivamente através de HTTP/JSON:

```
src/
├── components/         # Componentes visuais reutilizáveis (ui/, charts/, tables/)
├── pages/              # Telas da aplicação organizadas por domínio de negócio:
│   ├── dashboard/      # Visão executiva de vendas, estoque e OEE
│   ├── machines/       # Parque fabril e status operacional
│   ├── production/     # Apontamentos de produção e refugo
│   ├── stops/          # Abertura e encerramento de paradas
│   ├── occurrences/    # Relato de anomalias operacionais
│   ├── reports/        # Relatórios analíticos consolidados
│   └── users/          # Administração de usuários e perfis (RBAC)
├── services/api/       # Camada de comunicação com a API REST (apiClient.ts)
├── hooks/              # Custom React Hooks
├── contexts/           # Provedores de estado global (AuthContext, etc.)
├── routes/             # Definição das rotas públicas e protegidas
├── types/              # Tipagem estrita TypeScript dos contratos de dados
├── utils/              # Funções utilitárias e formatadores (moeda, data, etc.)
├── App.tsx             # Componente raiz da aplicação
└── main.tsx            # Ponto de entrada (Bootstrap do React DOM)
```

---

## 🚀 Como Executar o Repositório

### 1. Pré-requisitos
* Node.js v20+ instalado
* Backend em execução (porta 3000)

### 2. Passo a Passo

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar o arquivo .env
cp .env.example .env

# 3. Iniciar o servidor de desenvolvimento Vite
npm run dev
```

Acesse no seu navegador: `http://localhost:5173`.

### 3. Executando com Docker

```bash
docker build -t ssa-frontend .
docker run -p 5173:5173 ssa-frontend
```

---

## 🔗 Integração com o Backend

O frontend comunica-se com o backend através da variável de ambiente `VITE_API_URL`.  
* Endpoint padrão de desenvolvimento: `http://localhost:3000/api`
* Proxy automático configurado no `vite.config.ts` para evitar bloqueios de CORS em ambiente de desenvolvimento local.

---

## Telas 01 e 02 (adicionadas)

* **Tela 01 `/login`** — validação de e-mail/senha, 401 amigável, bloqueio 429 com contagem regressiva (`Retry-After`).
* **RBAC** — `src/routes/rbac.ts` (Operador→`/operador`, Supervisor→`/supervisor`, Gestor→`/gestor`, Admin→`/admin`). `RequireRole` redireciona perfis sem permissão para a própria tela.
* **Tela 02 `/gestor`** — `pages/dashboard/DashboardGerencial.tsx`, consumindo `/erp/faturamento`, `/erp/vendas`, `/erp/estoque-critico` e `/erp/top-produtos`. Filtros enviados como `data_inicio`, `data_fim` e `filial_id`. Em HTTP 503 usa o último dado salvo (`@ssa:cache:*`, limpo no logout) e exibe aviso de contingência (RN-12).
