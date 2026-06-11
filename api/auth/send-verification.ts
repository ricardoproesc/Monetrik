/**
 * Vercel Function: envia o e-mail de verificação de conta (HTML do Monetrik
 * via Resend), gerando o link no Firebase Admin.
 *
 * Requer no projeto Vercel: RESEND_API_KEY, EMAIL_FROM, FIREBASE_SERVICE_ACCOUNT
 * (ou GOOGLE_APPLICATION_CREDENTIALS), FIREBASE_PROJECT_ID e APP_URL.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendVerificationEmail } from "../../lib/server/authEmail.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { email, displayName } = req.body || {};
    await sendVerificationEmail(email, displayName);
    return res.json({ success: true });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? err.status : 500;
    console.error("[auth/send-verification]", err?.message || err);
    return res.status(status).json({ error: err?.message || "Falha ao enviar e-mail de verificação" });
  }
}
