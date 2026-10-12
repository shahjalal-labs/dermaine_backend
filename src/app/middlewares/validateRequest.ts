import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects } from "zod";

const validateRequest =
  (schema: AnyZodObject | ZodEffects<any>) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body && typeof req.body.data === "string") {
        try {
          req.body = JSON.parse(req.body.data);
        } catch {
          // Keep raw body if parse fails
        }
      }
      await schema.parseAsync(req.body);
      return next();
    } catch (err) {
      next(err);
    }
  };

export default validateRequest;
