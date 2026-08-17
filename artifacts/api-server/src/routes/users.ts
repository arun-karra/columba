import { Router } from "express";
import { UpdateMeBody } from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, parseOrThrow } from "../lib/errors";
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
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined
          ? { displayName: input.displayName.trim() || null }
          : {}),
      },
    });
    res.json(mapUser(user));
  }),
);

export default router;
