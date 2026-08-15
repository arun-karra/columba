import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { Resend } from "resend";
import { RequestAuthCodeBody, VerifyAuthCodeBody } from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError, parseOrThrow } from "../lib/errors";
import { logger } from "../lib/logger";
import { signUserToken } from "../middleware/auth";

const router = Router();
const recentRequests = new Map<string, number>();

function getHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

router.post(
  "/auth/request-code",
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(RequestAuthCodeBody, req.body);
    const email = normalizeEmail(input.email);
    const lastRequest = recentRequests.get(email);
    if (lastRequest && Date.now() - lastRequest < 45_000) {
      throw new HttpError(429, "RATE_LIMITED", "Please wait before requesting another code.");
    }

    const code = String(randomInt(100000, 1000000));
    recentRequests.set(email, Date.now());
    await prisma.loginCode.create({
      data: {
        email,
        codeHash: getHash(code),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.FROM_EMAIL,
          to: email,
          subject: "Your Columba sign-in code",
          text: `Your Columba sign-in code is ${code}. It expires in 10 minutes.`,
        });
      } catch (error) {
        logger.error({ err: error }, "Unable to send sign-in email");
      }
    } else if (process.env.NODE_ENV !== "production") {
      logger.info({ email, code }, "Development sign-in code");
    }

    res.json({ message: "If the email can receive messages, a sign-in code has been sent." });
  }),
);

router.post(
  "/auth/verify",
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(VerifyAuthCodeBody, req.body);
    const email = normalizeEmail(input.email);

    // ── Dev bypass ───────────────────────────────────────────────────────────
    // Code "000000" works for any email in non-production to skip email setup.
    const isBypass =
      process.env.NODE_ENV !== "production" && input.code === "000000";

    let loginCodeId: string | undefined;

    if (!isBypass) {
      const loginCode = await prisma.loginCode.findFirst({
        where: { email, consumedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!loginCode || loginCode.expiresAt < new Date()) {
        throw new HttpError(401, "INVALID_CODE", "That code is invalid or has expired.");
      }
      const expected = Buffer.from(loginCode.codeHash);
      const actual = Buffer.from(getHash(input.code));
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        throw new HttpError(401, "INVALID_CODE", "That code is invalid or has expired.");
      }
      loginCodeId = loginCode.id;
    } else {
      logger.info({ email }, "Dev bypass sign-in");
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!isBypass) {
        await tx.loginCode.update({ where: { id: loginCodeId! }, data: { consumedAt: new Date() } });
      }
      const user = await tx.user.upsert({ where: { email }, update: {}, create: { email } });
      const invites = await tx.groupInvite.findMany({ where: { email, status: "pending" } });
      for (const invite of invites) {
        await tx.groupMembership.upsert({
          where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
          update: {},
          create: { groupId: invite.groupId, userId: user.id, role: "member" },
        });
        await tx.groupInvite.update({ where: { id: invite.id }, data: { status: "accepted" } });
      }
      return user;
    });

    res.json({
      token: signUserToken(result),
      user: result,
    });
  }),
);

export default router;