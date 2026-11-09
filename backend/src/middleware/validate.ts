import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "query") {
        Object.assign(req.query, parsed);
      } else {
        req[source] = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
