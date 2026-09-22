import { Router } from "express";
import { loginSchema, refreshSchema } from "@carwash/shared";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../lib/errors.js";
import {
  createRefreshTokenValue,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
} from "../../lib/jwt.js";
import { verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { asyncHandler, validateBody } from "../../middleware/error-handler.js";

export const authRouter = Router();

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(res: import("express").Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/api/auth",
    expires: expiresAt,
  });
}

function clearRefreshCookie(res: import("express").Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.isActive) throw new UnauthorizedError("Invalid credentials");

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid credentials");

    const accessToken = signAccessToken({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const refreshToken = createRefreshTokenValue();
    const expiresAt = refreshExpiryDate();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    setRefreshCookie(res, refreshToken, expiresAt);
    res.json({
      accessToken,
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  }),
);

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const bodyToken = (req.body as { refreshToken?: string }).refreshToken;
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const refreshToken = bodyToken || cookieToken;
    if (!refreshToken) throw new UnauthorizedError("Missing refresh token");

    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!stored || !stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const nextRefresh = createRefreshTokenValue();
    const expiresAt = refreshExpiryDate();
    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hashToken(nextRefresh),
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      sub: stored.user.id,
      businessId: stored.user.businessId,
      role: stored.user.role,
      email: stored.user.email,
      name: stored.user.name,
    });

    setRefreshCookie(res, nextRefresh, expiresAt);
    res.json({
      accessToken,
      refreshToken: nextRefresh,
      expiresIn: env.JWT_ACCESS_EXPIRES,
      user: {
        id: stored.user.id,
        name: stored.user.name,
        email: stored.user.email,
        role: stored.user.role,
        businessId: stored.user.businessId,
      },
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const cookieToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const refreshToken = bodyToken || cookieToken;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const business = await prisma.business.findUnique({ where: { id: user.businessId } });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
      business: business
        ? { id: business.id, name: business.name, phone: business.phone, address: business.address }
        : null,
    });
  }),
);
