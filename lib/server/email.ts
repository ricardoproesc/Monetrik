/**
 * Envio de e-mails transacionais via Resend (https://resend.com).
 *
 * Por que Resend (e não o e-mail padrão do Firebase Auth):
 *  - O Firebase envia de `noreply@<projeto>.firebaseapp.com`, um domínio
 *    genérico sem SPF/DKIM/DMARC do seu domínio → cai em Spam.
 *  - Aqui enviamos de um domínio PRÓPRIO autenticado no Resend → caixa de
 *    entrada — e com HTML totalmente customizado (layout do Monetrik).
 *
 * Variáveis de ambiente (servidor):
 *  - RESEND_API_KEY  — chave da API do Resend
 *  - EMAIL_FROM      — remetente, ex.: "Monetrik <nao-responda@seudominio.com>"
 */
import "dotenv/config";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Monetrik <onboarding@resend.dev>";
// URL pública (PNG/JPG) da logo do Monetrik para o cabeçalho do e-mail.
// E-mails não embutem SVG/base64 de forma confiável — precisa ser uma URL.
const LOGO_URL = process.env.LOGO_URL || "";

export class EmailError extends Error {
  status = 500;
  constructor(message: string) {
    super(message);
    this.name = "EmailError";
  }
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/** Envia um e-mail via API REST do Resend (sem dependências extras). */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new EmailError("RESEND_API_KEY não configurada no servidor.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new EmailError(`Falha no envio (Resend ${res.status}): ${text}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template HTML — layout do Monetrik (e-mail-safe: tabelas + estilos inline)
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = "#10b981"; // emerald-500
const INK = "#18181b"; // zinc-900
const MUTED = "#71717a"; // zinc-500

/** Estrutura base do e-mail (header com marca + card + footer). */
function baseLayout(opts: { title: string; bodyHtml: string; preheader?: string }): string {
  const { title, bodyHtml, preheader = "" } = opts;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <!-- Marca -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  ${LOGO_URL
                    ? `<td><img src="${LOGO_URL}" width="44" height="44" alt="Monetrik" style="display:block;border-radius:14px;border:0;outline:none;text-decoration:none;" /></td>`
                    : `<td style="background-color:${BRAND};border-radius:14px;width:44px;height:44px;text-align:center;vertical-align:middle;font-size:22px;font-weight:800;color:${INK};line-height:44px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">M</td>`}
                  <td style="padding-left:10px;font-size:20px;font-weight:700;color:${INK};letter-spacing:-0.4px;">Monetrik</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
                Você recebeu este e-mail porque criou uma conta no Monetrik.<br/>
                Se não foi você, pode ignorar esta mensagem com segurança.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#a1a1aa;">© ${year} Monetrik · Gestão Financeira Familiar Inteligente</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** E-mail de confirmação de cadastro com botão para verificar o endereço. */
export function verificationEmailHtml(verifyUrl: string, displayName?: string): string {
  const hi = displayName ? `Olá, ${escapeHtml(displayName.split(" ")[0])}!` : "Olá!";
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${INK};letter-spacing:-0.4px;">Confirme seu e-mail</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3f3f46;">
      ${hi} Falta só um passo para ativar sua conta e começar a organizar as finanças da sua família com o Monetrik.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
      <tr>
        <td style="border-radius:12px;background-color:${BRAND};">
          <a href="${verifyUrl}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
            Confirmar meu e-mail
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 6px;font-size:12px;color:${MUTED};">Se o botão não funcionar, copie e cole este link no navegador:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;">
      <a href="${verifyUrl}" target="_blank" style="color:${BRAND};text-decoration:underline;">${verifyUrl}</a>
    </p>`;
  return baseLayout({
    title: "Confirme seu e-mail · Monetrik",
    preheader: "Confirme seu e-mail para ativar sua conta no Monetrik.",
    bodyHtml: body,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
