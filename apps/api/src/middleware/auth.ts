import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@carwash/shared";
import { canViewReports, canManageSettings } from "@carwash/shared";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export type RequestUser = {
  id: string;
  businessId: string;
  role: UserRole;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedError();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
    });
    if (!user) throw new UnauthorizedError("Account is inactive");

    req.user = {
      id: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError());
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient role"));
    }
    next();
  };
}

export function requireReports(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new UnauthorizedError());
  if (!canViewReports(req.user.role)) {
    return next(new ForbiddenError("STAFF cannot view reports"));
  }
  next();
}

export function requireManager(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new UnauthorizedError());
  if (!canManageSettings(req.user.role)) {
    return next(new ForbiddenError());
  }
  next();
}

export function currentUser(req: Request): RequestUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
