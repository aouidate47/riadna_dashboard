import { buildSeed } from "./seed";

/**
 * The fake "database": mutable, in memory, shared by all lib/api/* modules.
 * ONLY lib/api/** may import this (enforced by ESLint). Deleted when the NestJS API replaces it.
 */
const g = globalThis as unknown as { __riadMockDb?: ReturnType<typeof buildSeed> };
export const db = (g.__riadMockDb ??= buildSeed());
