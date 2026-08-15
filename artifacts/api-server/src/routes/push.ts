import { Router } from "express";
import { RegisterPushTokenBody, UnregisterPushTokenBody } from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, parseOrThrow } from "../lib/errors";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.post(
  "/push/register",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const input = parseOrThrow(RegisterPushTokenBody, req.body);
    await prisma.pushToken.upsert({
      where: { expoPushToken: input.expoPushToken },
      update: { userId, platform: input.platform },
      create: { userId, expoPushToken: input.expoPushToken, platform: input.platform },
    });
    res.json({ message: "Push token registered." });
  }),
);

router.delete(
  "/push/register",
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).userId;
    const input = parseOrThrow(UnregisterPushTokenBody, req.body);
    await prisma.pushToken.deleteMany({ where: { userId, expoPushToken: input.expoPushToken } });
    res.status(204).send();
  }),
);

export default router;