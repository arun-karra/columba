import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../lib/errors";

export type AuthenticatedRequest = Request & {
  userId: string;
  userEmail: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set.");
  return secret;
}

export function signUserToken(user: { id: string; email: string }) {
  return jwt.sign({ userId: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: "30d",
  });
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "UNAUTHORIZED", "A bearer token is required.");
    }
    const decoded = jwt.verify(header.slice("Bearer ".length), getJwtSecret());
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string"
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "The token is invalid.");
    }
    const authReq = req as AuthenticatedRequest;
    authReq.userId = decoded.userId;
    authReq.userEmail = decoded.email;
    next();
  } catch (error) {
    next(
      error instanceof HttpError
        ? error
        : new HttpError(401, "UNAUTHORIZED", "The token is invalid or expired."),
    );
  }
}