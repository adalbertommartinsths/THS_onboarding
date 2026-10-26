// Servidor Node simples (Express) para rodar a trilha de onboarding localmente.
// Na Vercel, o próprio arquivo public/index.html é servido como site estático
// (ver vercel.json) — este servidor existe para facilitar testes locais com
// `npm start` ou `node dev-server.js`, e também funciona como fallback caso
// você prefira rodar isto num Node host tradicional (Railway, Render, EC2).
//
// Importante: este arquivo é deliberadamente chamado "dev-server.js" (e não
// "server.js"/"app.js"/"index.js") para não ser confundido com um projeto
// de backend pela detecção automática de framework da Vercel — este app é
// 100% estático em produção (ver vercel.json: "framework": null).

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Monta localmente as mesmas funções que, na Vercel, rodam como funções
// serverless em api/*.js — assim dá para testar o fluxo completo (incluindo
// o envio do e-mail do Termo de Confidencialidade) antes de publicar.
app.all('/api/health', (req, res) => require('./api/health.js')(req, res));
app.post('/api/send-termo-email', (req, res) => require('./api/send-termo-email.js')(req, res));

// Qualquer rota não encontrada cai de volta no index.html (aplicação é uma
// página única auto-contida, não há rotas de servidor de fato).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Trilha de onboarding disponível em http://localhost:${PORT}`);
});
