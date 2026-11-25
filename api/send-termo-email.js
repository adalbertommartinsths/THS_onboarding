// /api/send-termo-email
//
// Função serverless (Vercel) acionada pela tela "Termo de Confidencialidade"
// do onboarding (public/index.html) quando o(a) colaborador(a) clica em
// "Marcar etapa como concluída". Envia um e-mail de confirmação via
// Microsoft Graph (conta O365), usando o fluxo OAuth2 client-credentials
// (aplicação registrada no Azure AD / Entra ID, sem usuário interativo).
//
// A assinatura do termo em si já aconteceu no front-end (nome completo +
// aceite). Este endpoint só precisa notificar TI/RH por e-mail; por isso,
// o front-end trata uma falha aqui como aviso (warning), não bloqueia a
// conclusão da etapa — ver finishWarningTermo em public/index.html.
//
// Variáveis de ambiente necessárias (configurar no painel do Vercel em
// Project Settings > Environment Variables, e em .env local para rodar
// com `npm run dev`):
//
//   AZURE_TENANT_ID      ID (ou domínio) do tenant Azure AD / Entra ID
//   AZURE_CLIENT_ID      Application (client) ID do app registrado
//   AZURE_CLIENT_SECRET  Client secret do app registrado
//   MAIL_SENDER_UPN      UPN/e-mail da caixa que envia (ex.: onboarding@ths.inf.br)
//                        É necessário permissão de aplicação Mail.Send
//                        (consentida pelo admin do tenant) para essa caixa.
//   MAIL_TO              (opcional) destinatário principal — padrão abaixo
//   MAIL_CC              (opcional) cópia — padrão abaixo
//
// O app registrado no Azure AD precisa da permissão de aplicação (não
// delegada) "Mail.Send" da Microsoft Graph, com consentimento de admin.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const DEFAULT_MAIL_TO = 'adalberto.martins@ths.inf.br';
const DEFAULT_MAIL_CC = 'sandro.silva@ths.inf.br';

async function obterTokenAcesso() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Credenciais do Azure AD ausentes. Configure AZURE_TENANT_ID, ' +
      'AZURE_CLIENT_ID e AZURE_CLIENT_SECRET nas variáveis de ambiente.'
    );
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default'
  });

  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!resposta.ok) {
    const textoErro = await resposta.text().catch(() => '');
    throw new Error(`Falha ao obter token OAuth2 (${resposta.status}): ${textoErro}`);
  }

  const dados = await resposta.json();
  return dados.access_token;
}

function escaparHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function montarCorpoEmail(payload) {
  const agora = new Date();
  const dataHora = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const nome = escaparHtml(payload.nomeCompleto);
  const email = escaparHtml(payload.colaborador);
  const etapa = escaparHtml(payload.etapa);
  const idioma = escaparHtml(payload.idioma || 'pt');

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Termo de Confidencialidade assinado</h2>
      <p>Um(a) colaborador(a) concluiu a etapa <strong>${etapa}</strong> da trilha de onboarding e
      assinou eletronicamente o Termo de Confidencialidade.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="border: 1px solid #e5e7eb;"><strong>Nome completo (assinatura)</strong></td>
          <td style="border: 1px solid #e5e7eb;">${nome}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e5e7eb;"><strong>E-mail corporativo</strong></td>
          <td style="border: 1px solid #e5e7eb;">${email}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e5e7eb;"><strong>Data/hora (São Paulo)</strong></td>
          <td style="border: 1px solid #e5e7eb;">${escaparHtml(dataHora)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e5e7eb;"><strong>Idioma da interface</strong></td>
          <td style="border: 1px solid #e5e7eb;">${idioma}</td>
        </tr>
      </table>
      <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">
        E-mail automático gerado pela trilha de onboarding SSP/THS.
      </p>
    </div>
  `;
}

async function enviarEmail(accessToken, payload) {
  const remetente = process.env.MAIL_SENDER_UPN;
  if (!remetente) {
    throw new Error('MAIL_SENDER_UPN não configurado nas variáveis de ambiente.');
  }

  const destinatarios = (process.env.MAIL_TO || DEFAULT_MAIL_TO)
    .split(',').map(e => e.trim()).filter(Boolean);
  const copias = (process.env.MAIL_CC || DEFAULT_MAIL_CC)
    .split(',').map(e => e.trim()).filter(Boolean);

  const mensagem = {
    message: {
      subject: `Termo de Confidencialidade assinado — ${payload.nomeCompleto || payload.colaborador}`,
      body: {
        contentType: 'HTML',
        content: montarCorpoEmail(payload)
      },
      toRecipients: destinatarios.map(endereco => ({ emailAddress: { address: endereco } })),
      ccRecipients: copias.map(endereco => ({ emailAddress: { address: endereco } }))
    },
    saveToSentItems: true
  };

  const resposta = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(remetente)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mensagem)
    }
  );

  if (!resposta.ok) {
    const textoErro = await resposta.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail via Graph (${resposta.status}): ${textoErro}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'method_not_allowed' });
    return;
  }

  try {
    const payload = req.body && typeof req.body === 'object'
      ? req.body
      : JSON.parse(req.body || '{}');

    if (!payload.colaborador) {
      res.status(400).json({ ok: false, erro: 'colaborador_ausente' });
      return;
    }

    const accessToken = await obterTokenAcesso();
    await enviarEmail(accessToken, payload);

    res.status(200).json({ ok: true });
  } catch (erro) {
    console.error('[send-termo-email] Falha ao processar solicitação:', erro);
    res.status(502).json({ ok: false, erro: 'send_termo_email_failed', detalhe: String(erro.message || erro) });
  }
};
