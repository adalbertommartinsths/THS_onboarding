// Servidor Node simples (Express) para rodar a trilha de onboarding localmente.
// Na Vercel, o próprio arquivo public/index.html é servido como site estático
// (ver vercel.json) — este servidor existe para facilitar testes locais com
// `npm start` ou `node server.js`, e também funciona como fallback caso você
// prefira rodar isto num Node host tradicional (Railway, Render, EC2, etc.).

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Qualquer rota não encontrada cai de volta no index.html (aplicação é uma
// página única auto-contida, não há rotas de servidor de fato).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Trilha de onboarding disponível em http://localhost:${PORT}`);
});
