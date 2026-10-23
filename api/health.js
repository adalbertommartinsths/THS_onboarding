// Exemplo de função serverless Node na Vercel (roda em /api/health).
// A trilha de onboarding em si é 100% estática (public/index.html) e não
// depende desta função — ela está aqui apenas como ponto de partida caso
// você queira adicionar lógica de servidor no futuro (ex.: registrar
// conclusão da trilha em um banco de dados, enviar e-mail ao RH, etc.).

module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ths-onboarding',
    timestamp: new Date().toISOString()
  });
};
