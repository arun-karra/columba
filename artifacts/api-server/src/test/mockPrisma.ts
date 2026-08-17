import { vi } from "vitest";

/**
 * A minimal in-memory stand-in for the subset of PrismaClient the routes
 * use, so route/business-logic tests don't need a live Postgres database.
 * Each method is a vi.fn() the test configures per-case with
 * mockResolvedValueOnce / mockImplementation.
 */
export function createMockPrisma() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    groupInvite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    pushToken: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
    // Runs the callback with the same mock object standing in for `tx`,
    // matching how routes call `prisma.$transaction(async (tx) => ...)`.
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(prisma)),
  };
  return prisma;
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
