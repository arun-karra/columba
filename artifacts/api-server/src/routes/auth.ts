import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { DevBypassAuthBody, SignInWithAppleBody } from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { verifyAppleIdentityToken } from "../lib/appleAuth";
import { acceptPendingInvitesForUser } from "../lib/acceptPendingInvites";
import { asyncHandler, HttpError, parseOrThrow } from "../lib/errors";
import { logger } from "../lib/logger";
import { signUserToken } from "../middleware/auth";

const router = Router();

function normalizeEmail(value: string | null | undefined) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function findOrCreateAppleUser(input: {
  appleUserId: string;
  email: string | null;
}) {
  const existingByApple = await prisma.user.findUnique({
    where: { appleUserId: input.appleUserId },
  });
  if (existingByApple) {
    if (input.email && existingByApple.email !== input.email) {
      return prisma.user.update({
        where: { id: existingByApple.id },
        data: { email: input.email },
      });
    }
    return existingByApple;
  }

  if (input.email) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingByEmail) {
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: { appleUserId: input.appleUserId },
      });
    }
  }

  return prisma.user.create({
    data: {
      appleUserId: input.appleUserId,
      email: input.email,
    },
  });
}

async function finalizeAuth(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
}) {
  await prisma.$transaction(async (tx) => {
    await acceptPendingInvitesForUser(tx, user);
  });

  return {
    token: signUserToken(user),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
  };
}

router.post(
  "/auth/apple",
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(SignInWithAppleBody, req.body);

    let payload;
    try {
      payload = await verifyAppleIdentityToken(input.identityToken);
    } catch (error) {
      logger.warn({ err: error }, "Invalid Apple identity token");
      throw new HttpError(401, "INVALID_APPLE_TOKEN", "Apple sign-in could not be verified.");
    }

    const email =
      normalizeEmail(input.email) ??
      normalizeEmail(typeof payload.email === "string" ? payload.email : null);

    const user = await findOrCreateAppleUser({
      appleUserId: payload.sub,
      email,
    });

    res.json(await finalizeAuth(user));
  }),
);

router.post(
  "/auth/dev-bypass",
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(404, "NOT_FOUND", "Not found.");
    }

    const secret = process.env.DEV_BYPASS_CODE;
    if (!secret) {
      throw new HttpError(
        404,
        "NOT_FOUND",
        "Dev bypass is not configured on the server.",
      );
    }

    const input = parseOrThrow(DevBypassAuthBody, req.body);
    if (!safeCompare(input.code, secret)) {
      throw new HttpError(401, "INVALID_CODE", "That bypass code is invalid.");
    }

    logger.info("Dev bypass sign-in");

    const user = await prisma.user.upsert({
      where: { email: "dev@columba.local" },
      update: {},
      create: { email: "dev@columba.local" },
    });

    res.json(await finalizeAuth(user));
  }),
);

export default router;
