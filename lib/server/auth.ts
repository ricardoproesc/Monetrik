/**
 * Verificação do Firebase ID Token no backend.
 *
 * O Firebase continua sendo a fonte de autenticação (login/senha/verificação
 * de e-mail). Aqui apenas validamos o ID token enviado pelo frontend no header
 * `Authorization: Bearer <token>` e extraímos o uid/email.
 *
 * `verifyIdToken` só precisa do projectId — ele baixa as chaves públicas do
 * Google para validar a assinatura. Não é necessária service account.
 */
import "dotenv/config";
import admin from "firebase-admin";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT;

function getAdminAuth() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }
  return admin.auth();
}

export interface AuthUser {
  firebaseUid: string;
  email: string;
  nome?: string;
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Extrai o token do header `Authorization: Bearer <token>`. */
export function extractBearer(authorization?: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}

/**
 * Valida o ID token e retorna o usuário autenticado.
 * Lança AuthError (401) se o token estiver ausente ou inválido.
 */
export async function verifyToken(authorization?: string | null): Promise<AuthUser> {
  const token = extractBearer(authorization);
  if (!token) throw new AuthError("Token de autenticação ausente");
  if (!projectId) {
    throw new AuthError(
      "FIREBASE_PROJECT_ID não configurado no servidor — impossível validar o token",
    );
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.email) throw new AuthError("Token sem e-mail associado");
    return {
      firebaseUid: decoded.uid,
      email: decoded.email,
      nome: decoded.name as string | undefined,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Token inválido ou expirado");
  }
}
