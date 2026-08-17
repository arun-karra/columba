import { Router } from "express";
import { Prisma } from "@prisma/client";
import { UpdateMeBody } from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError, parseOrThrow } from "../lib/errors";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

export function mapUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    res.json(mapUser(user));
  }),
);

router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const input = parseOrThrow(UpdateMeBody, req.body);
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.displayName !== undefined
            ? {
                displayName:
                  typeof input.displayName === "string"
                    ? input.displayName.trim() || null
                    : null,
              }
            : {}),
        },
      });
      res.json(mapUser(user));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
        throw new HttpError(
          503,
          "SCHEMA_OUTDATED",
          "Database schema is out of date. Run pnpm mac:setup (or restart pnpm mac:dev) to sync.",
        );
      }
      throw error;
    }
  }),
);

export default router;
