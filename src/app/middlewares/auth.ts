import { NextFunction, Request, Response } from "express";
import config from "../../config";
import { JwtPayload, Secret } from "jsonwebtoken";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiErrors";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import prisma from "../../shared/prisma";
import { UserRole } from "@prisma/client";

const auth = (...roles: (UserRole | string)[]) => {
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
      if (!authorization && req.body?.forgetToken) {
        authorization = req.body.forgetToken as string;
      }

      if (!authorization) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "You are not authorized!",
          "UNAUTHORIZED",
        );
      }

      // Support both "Bearer <token>" and raw "<token>"
      const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : authorization.trim();

      if (!token) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "You are not authorized!",
          "UNAUTHORIZED",
        );
      }

      let verifiedUser: JwtPayload;
      try {
        verifiedUser = jwtHelpers.verifyToken(
          token,
          config.jwt.jwt_secret as Secret,
        );
      } catch (err: any) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "Invalid or expired authorization token! Please log in again.",
          "UNAUTHORIZED",
        );
      }
      const { id, role } = verifiedUser;

      // 🔍 Check user / organization in DB
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

      if (!account) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          "User not found!",
          "USER_NOT_FOUND",
        );
      }

      // Block deleted accounts
      if (account.status === "Deleted") {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Your account has been deleted!",
          "ACCOUNT_DELETED",
        );
      }

      // Blocked accounts
      if (account.status === "Blocked") {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Your account is blocked!",
          "ACCOUNT_BLOCKED",
        );
      }

      req.user = verifiedUser as JwtPayload;

      // ✅ Role-based access
      if (roles.length && !roles.includes(role as any)) {
        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden!", "FORBIDDEN");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
