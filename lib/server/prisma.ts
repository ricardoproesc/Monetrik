/**
 * Singleton do PrismaClient — compartilhado entre o servidor Express (dev)
 * e as Vercel Functions (produção). Evita esgotar o pool de conexões em
 * ambientes com hot-reload / serverless reutilizando a mesma instância.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// BigInt não é serializável em JSON nativamente. Como os IDs do banco são
// BigInt (autoincrement) e o frontend trata IDs como string, serializamos
// qualquer BigInt como string numérica ("1", "2", ...).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
