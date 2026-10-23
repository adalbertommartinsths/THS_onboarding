// Servidor Node simples (Express) para rodar a trilha de onboarding localmente.
// Na Vercel, o próprio arquivo index.html (na raiz) é servido como site
// estático (ver vercel.json) — este servidor existe para facilitar testes
// locais com `npm start` ou `node dev-server.js`.
//
// Importante: este arquivo é deliberadamente chamado "dev-server.js" (e não
// "server.js"/"app.js"/"index.js") para não ser confundido com um projeto
// de backend pela detecção automática de framework da Vercel. Ele também
// está listado no .vercelignore, então não é enviado no deploy.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Aplicação é uma página única auto-contida: qualquer rota cai no index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Trilha de onboarding disponível em http://localhost:${PORT}`);
});
