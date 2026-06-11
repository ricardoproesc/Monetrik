/**
 * Orquestra o envio do e-mail de verificação de conta:
 *  1. gera o link de verificação no Firebase (Admin SDK);
 *  2. envia um e-mail HTML do Monetrik via Resend.
 *
 * Usado por /api/auth/send-verification (Express e Vercel).
 */
import "dotenv/config";
import { generateVerificationLink } from "./auth";
import { sendEmail, verificationEmailHtml } from "./email";

export async function sendVerificationEmail(email: string, displayName?: string): Promise<void> {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw Object.assign(new Error("E-mail inválido."), { status: 400 });
  }
  const appUrl = process.env.APP_URL || process.env.VITE_APP_URL;
  const continueUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/app` : undefined;

  const link = await generateVerificationLink(email, continueUrl);
  await sendEmail({
    to: email,
    subject: "Confirme seu e-mail · Monetrik",
    html: verificationEmailHtml(link, displayName),
  });
}
