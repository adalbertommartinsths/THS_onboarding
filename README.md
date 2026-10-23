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
│   └── health.js        # exemplo de função serverless Node (GET /api/health)
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

## Observações

- A trilha em si (progresso, i18n, modais, organogramas) roda inteiramente no
  navegador — `public/index.html` não depende de nenhuma chamada ao
  servidor para funcionar.
- `api/health.js` é só um exemplo de função serverless Node, caso no futuro
  você queira adicionar algo como registrar a conclusão da trilha em um
  banco de dados ou disparar um e-mail ao RH.
- Para atualizar o conteúdo da trilha, edite `public/index.html` e rode
  `vercel --prod` novamente (ou dê push no repositório, se estiver usando
  deploy automático via Git).
