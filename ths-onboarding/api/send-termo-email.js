// Função serverless (Vercel) que dispara, via Microsoft Graph API (Office
// 365), o e-mail de confirmação do Termo de Confidencialidade assinado na
// trilha de onboarding. Usa o fluxo OAuth2 "client credentials" (aplicativo
// registrado no Azure AD, com permissão de aplicativo Mail.Send) — não
// depende de SMTP AUTH nem de senha de aplicativo, e funciona normalmente
// mesmo com MFA/Security Defaults ativos na conta remetente.
//
// ---------------------------------------------------------------------
// Variáveis de ambiente necessárias (Vercel → Project → Settings →
// Environment Variables):
//
//   AZURE_TENANT_ID     Tenant (Directory) ID do Azure AD da THS
//   AZURE_CLIENT_ID     Application (client) ID do App Registration
//   AZURE_CLIENT_SECRET Client secret gerado para esse App Registration
//   MAIL_SENDER_UPN     Caixa de e-mail que efetivamente envia a mensagem
//                       (ex.: ammartins@ths.inf.br) — precisa existir nesse
//                       mesmo tenant.
//
// Opcionais (já têm como padrão os destinatários pedidos):
//
//   TERMO_MAIL_TO   padrão: adalberto.martins@ths.inf.br
//   TERMO_MAIL_CC   padrão: sandro.silva@ths.inf.br
//   (aceitam múltiplos e-mails separados por vírgula)
//
// ---------------------------------------------------------------------
// Como configurar no Azure AD (portal.azure.com):
//
//   1. Azure Active Directory → App registrations → New registration
//      (qualquer nome, ex.: "THS Onboarding - Envio de E-mail").
//   2. Nesse app → API permissions → Add a permission → Microsoft Graph →
//      Application permissions → marque "Mail.Send" → Add permissions →
//      clique em "Grant admin consent for <tenant>" (precisa ser feito por
//      um admin do tenant).
//   3. Certificates & secrets → New client secret → copie o VALUE assim que
//      for gerado (ele não é mostrado novamente depois).
//   4. Em "Overview", copie o "Application (client) ID" e o
//      "Directory (tenant) ID" — são o AZURE_CLIENT_ID e o AZURE_TENANT_ID.
//
// Observação: com permissão de aplicativo (não delegada), o app pode enviar
// e-mail "como" qualquer caixa do tenant em MAIL_SENDER_UPN, a menos que uma
// Application Access Policy restrinja isso no Exchange Online — se o envio
// falhar com erro de permissão/autorização mesmo com o consentimento acima
// concedido, peça para a TI checar se existe alguma dessas políticas
// limitando o escopo do app.
// ---------------------------------------------------------------------

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function obterTokenAcesso() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Variáveis de ambiente do Azure AD não configuradas (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).'
    );
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(
      'Falha ao obter token do Azure AD: ' + (dados.error_description || dados.error || resposta.status)
    );
  }
  return dados.access_token;
}

function escapeHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listaDeEmails(valorEnv, padrao) {
  return (valorEnv || padrao)
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function montarCorpoEmail({ nomeCompleto, colaboradorEmail, dataHora, idioma }) {
  const nome = escapeHtml(nomeCompleto || '(não informado)');
  const email = escapeHtml(colaboradorEmail || '(não informado)');
  const idiomaExibido = escapeHtml(idioma || 'pt');

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #991b1b;">Termo de Confidencialidade assinado</h2>
      <p>O(a) colaborador(a) abaixo concluiu a etapa de <strong>Termo de Confidencialidade</strong> na trilha de onboarding THS/SSP.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="font-weight: bold; border: 1px solid #e5e7eb;">Nome completo (assinatura)</td>
          <td style="border: 1px solid #e5e7eb;">${nome}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: 1px solid #e5e7eb;">E-mail do colaborador</td>
          <td style="border: 1px solid #e5e7eb;">${email}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: 1px solid #e5e7eb;">Data/hora do aceite</td>
          <td style="border: 1px solid #e5e7eb;">${dataHora}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: 1px solid #e5e7eb;">Idioma da interface no aceite</td>
          <td style="border: 1px solid #e5e7eb;">${idiomaExibido}</td>
        </tr>
      </table>

      <h3 style="margin: 20px 0 8px;">Texto do termo aceito</h3>
      <p>Ao ingressar na empresa, o(a) colaborador(a) poderá ter acesso a informações internas, estratégicas, de clientes e de sistemas que devem ser tratadas com sigilo. Ao assinar este termo, ele(a) declarou que:</p>
      <ul>
        <li>Não divulgará informações confidenciais da empresa ou de seus clientes a terceiros, durante ou após seu vínculo;</li>
        <li>Utilizará os sistemas, dados e credenciais de acesso exclusivamente para fins profissionais;</li>
        <li>Reportará imediatamente ao seu gestor qualquer uso indevido ou vazamento de informações que identificar;</li>
        <li>Está ciente de que o descumprimento deste termo pode resultar em medidas disciplinares e legais.</li>
      </ul>

      <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">E-mail gerado automaticamente pela trilha de onboarding THS/SSP.</p>
    </div>
  `;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const corpo = req.body || {};
    const nomeCompleto = corpo.nomeCompleto;
    const colaborador = corpo.colaborador;
    const idioma = corpo.idioma;

    if (!nomeCompleto || !String(nomeCompleto).trim()) {
      res.status(400).json({ ok: false, error: 'nome_completo_obrigatorio' });
      return;
    }

    const senderUpn = process.env.MAIL_SENDER_UPN;
    if (!senderUpn) {
      throw new Error('Variável de ambiente MAIL_SENDER_UPN não configurada.');
    }

    const destinatarios = listaDeEmails(process.env.TERMO_MAIL_TO, 'adalberto.martins@ths.inf.br');
    const copias = listaDeEmails(process.env.TERMO_MAIL_CC, 'sandro.silva@ths.inf.br');

    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const accessToken = await obterTokenAcesso();

    const mensagem = {
      message: {
        subject: `Termo de Confidencialidade assinado — ${nomeCompleto}`,
        body: {
          contentType: 'HTML',
          content: montarCorpoEmail({ nomeCompleto, colaboradorEmail: colaborador, dataHora, idioma })
        },
        toRecipients: destinatarios.map((email) => ({ emailAddress: { address: email } })),
        ccRecipients: copias.map((email) => ({ emailAddress: { address: email } }))
      },
      saveToSentItems: true
    };

    const envio = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(senderUpn)}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mensagem)
    });

    if (!envio.ok) {
      const detalhe = await envio.text();
      throw new Error(`Graph sendMail falhou (${envio.status}): ${detalhe}`);
    }

    res.status(200).json({ ok: true });
  } catch (erro) {
    console.error('[send-termo-email] erro:', erro);
    res.status(500).json({ ok: false, error: erro.message || 'erro_desconhecido' });
  }
};
