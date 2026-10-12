import { NextFunction, Request, Response } from "express";
import config from "../../config";
import { JwtPayload, Secret } from "jsonwebtoken";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import prisma from "../../shared/prisma";

const optionalAuth = () => {
  return async (
    req: Request & { user?: any },
    _res: Response,
    next: NextFunction,
  ) => {
    try {
      let authorization = req.headers.authorization;
      if (!authorization && req.headers.token) {
        authorization = req.headers.token as string;
      }
      if (!authorization && req.body?.token) {
        authorization = req.body.token as string;
      }

      if (!authorization) {
        return next();
      }

      const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : authorization.trim();

      if (!token) {
        return next();
      }

      let verifiedUser: JwtPayload;
      try {
        verifiedUser = jwtHelpers.verifyToken(
          token,
          config.jwt.jwt_secret as Secret,
        );
      } catch {
        // If token is expired or invalid, proceed as guest without failing
        return next();
      }

      const { id, role } = verifiedUser;
      let account: any = null;
      if (role === "Organization") {
        account = await prisma.organization.findUnique({
          where: { id },
        });
      } else {
        account = await prisma.user.findUnique({
          where: { id },
        });
        if (!account) {
          account = await prisma.organization.findUnique({
            where: { id },
          });
          if (account) {
            verifiedUser.role = "Organization";
          }
        }
      }

      if (
        account &&
        account.status !== "Deleted" &&
        account.status !== "Blocked"
      ) {
        req.user = verifiedUser as JwtPayload;
      }

      next();
    } catch {
      next();
    }
  };
};

export default optionalAuth;
