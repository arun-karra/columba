import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, code: error.code },
    });
  }

  return res.status(500).json({
    error: { message: "Something went wrong.", code: "INTERNAL_ERROR" },
  });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function parseOrThrow<T>(
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ message: string; path: Array<string | number> }> } } },
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success || result.data === undefined) {
    const details = result.error?.issues
      .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
      .join(", ");
    throw new HttpError(400, "VALIDATION_ERROR", details || "Invalid request.");
  }
  return result.data;
}

export function requireParam(value: string | string[] | undefined, name: string) {
  if (!value || Array.isArray(value)) throw new HttpError(400, "MISSING_PARAMETER", `${name} is required.`);
  return value;
}