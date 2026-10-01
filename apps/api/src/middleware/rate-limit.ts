import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { env } from "../config/env.js";

const redis =
  env.REDIS_URL && env.NODE_ENV !== "test"
    ? new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      })
    : null;

redis?.on("error", () => {
  // Connection errors are surfaced by the store; keep the process alive.
});

function storeFor(prefix: string) {
  if (!redis) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as Promise<number>,
  });
}

const relaxed = env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: relaxed ? 10_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor("api"),
  passOnStoreError: true,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: relaxed ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor("login"),
  passOnStoreError: true,
  message: { error: { code: "RATE_LIMITED", message: "Too many login attempts" } },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: relaxed ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: storeFor("upload"),
  passOnStoreError: true,
  message: { error: { code: "RATE_LIMITED", message: "Too many uploads" } },
});
