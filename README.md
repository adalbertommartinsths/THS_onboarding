# THS Onboarding — versão Node/Vercel

Projeto Node.js pronto para deploy na [Vercel](https://vercel.com), empacotando a
trilha de onboarding (`public/index.html`, uma página única autocontida) como
site estático, com um servidor Express opcional incluído para rodar localmente.

## Estrutura

```
.
├── public/
│   └── index.html      # a trilha de onboarding completa (HTML/CSS/JS inline)
├── api/
│   ├── health.js             # exemplo de função serverless Node (GET /api/health)
│   └── send-termo-email.js   # envia o e-mail do Termo de Confidencialidade via Microsoft Graph/O365
├── dev-server.js         # servidor Express para desenvolvimento local (não usado em produção na Vercel)
├── package.json
└── vercel.json           # configuração de deploy estático na Vercel ("framework": null)
```

> **Por que `dev-server.js` e não `server.js`?** A Vercel detecta automaticamente
> frameworks de backend Node.js quando encontra `express` nas dependências
> combinado com um arquivo como `server.js`/`app.js`/`index.js` na raiz. Isso
> fazia a Vercel tentar rodar este projeto como uma aplicação de servidor (e
> procurar o entrypoint *dentro* de `public/`, causando falha de build). Por
> isso o servidor de desenvolvimento foi renomeado para `dev-server.js` e o
> `vercel.json` define `"framework": null` — assim a Vercel trata o projeto
> como um site 100% estático, exatamente como ele roda em produção.

## Rodando localmente

```bash
npm install
npm start
```

Acesse http://localhost:3000.

## Deploy na Vercel

### Opção 1 — via CLI

```bash
npm install -g vercel
vercel login
vercel          # deploy de preview
vercel --prod   # deploy de produção
```

### Opção 2 — via painel da Vercel

1. Suba esta pasta para um repositório no GitHub/GitLab/Bitbucket.
2. Em vercel.com → **Add New... → Project**, importe o repositório.
3. A Vercel detecta automaticamente o `vercel.json` (site estático servido a
   partir de `public/`) — não é necessário configurar build command nem
   output directory manualmente.
4. Clique em **Deploy**.

## E-mail do Termo de Confidencialidade (api/send-termo-email.js)

Ao concluir a etapa **Termo de Confidencialidade**, a trilha chama
`POST /api/send-termo-email` com o nome completo (assinatura) e os dados da
etapa. Essa função serverless envia um e-mail com esses dados para
`adalberto.martins@ths.inf.br`, com cópia para `sandro.silva@ths.inf.br`,
usando a **Microsoft Graph API** (Office 365) — não usa SMTP tradicional,
então funciona mesmo com MFA/Security Defaults ativos na caixa remetente.

**Variáveis de ambiente obrigatórias** (Vercel → Project → Settings →
Environment Variables):

| Variável | Descrição |
| --- | --- |
| `AZURE_TENANT_ID` | Tenant (Directory) ID do Azure AD da THS |
| `AZURE_CLIENT_ID` | Application (client) ID do App Registration |
| `AZURE_CLIENT_SECRET` | Client secret gerado para esse App Registration |
| `MAIL_SENDER_UPN` | Caixa que efetivamente envia o e-mail (ex.: `ammartins@ths.inf.br`) |

**Opcionais** (já têm como padrão os destinatários pedidos; aceitam vários
e-mails separados por vírgula):

| Variável | Padrão |
| --- | --- |
| `TERMO_MAIL_TO` | `adalberto.martins@ths.inf.br` |
| `TERMO_MAIL_CC` | `sandro.silva@ths.inf.br` |

**Como gerar as credenciais do Azure AD** (precisa de um admin do tenant):

1. [portal.azure.com](https://portal.azure.com) → **Azure Active Directory**
   → **App registrations** → **New registration** (qualquer nome, ex.:
   "THS Onboarding - Envio de E-mail").
2. Nesse app → **API permissions** → **Add a permission** → **Microsoft
   Graph** → **Application permissions** → marque **Mail.Send** → **Add
   permissions** → clique em **Grant admin consent for `<tenant>`**.
3. **Certificates & secrets** → **New client secret** → copie o *Value*
   assim que for gerado (ele some depois, só pode ser visto nesse momento).
4. Em **Overview**, copie o **Application (client) ID** e o **Directory
   (tenant) ID** — são o `AZURE_CLIENT_ID` e o `AZURE_TENANT_ID`.

Se o envio falhar mesmo com o consentimento acima concedido, peça para a TI
checar se existe alguma *Application Access Policy* no Exchange Online
restringindo quais caixas esse aplicativo pode usar para enviar e-mail — com
permissão de aplicativo, por padrão ele pode enviar como qualquer caixa do
tenant, a menos que essa política limite isso.

Enquanto essas variáveis não estiverem configuradas, o clique em "concluir"
dessa etapa vai falhar (mostrando a mensagem de erro/tentar novamente) — é
esperado, até a TI terminar a configuração do app no Azure AD.

## Observações

- A trilha em si (progresso, i18n, modais, organogramas) roda inteiramente no
  navegador — `public/index.html` não depende de nenhuma chamada ao
  servidor para funcionar, **exceto** a etapa do Termo de Confidencialidade,
  que depende de `api/send-termo-email.js` (ver seção acima).
- `api/health.js` é só um exemplo de função serverless Node, caso no futuro
  você queira adicionar outras integrações de backend.
- Para atualizar o conteúdo da trilha, edite `public/index.html` e rode
  `vercel --prod` novamente (ou dê push no repositório, se estiver usando
  deploy automático via Git).
