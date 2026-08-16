import express, { type Express, type Router } from "express";
import { sendError } from "../lib/errors";
import { signUserToken } from "../middleware/auth";

/** Minimal Express app wrapping a single router, mirroring app.ts's error handling. */
export function buildTestApp(router: Router): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error);
  });
  return app;
}

export function authHeader(user: { id: string; email: string }) {
  return { Authorization: `Bearer ${signUserToken(user)}` };
}
