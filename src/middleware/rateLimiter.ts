import { RequestHandler } from "express";
import {
  createTokenBucket,
  tryConsumeBucket,
  type TokenBucket,
} from "../tokenBucket";

const buckets = new Map<string, TokenBucket>();

const CAPACITY = 5;
const REFILL_RATE = 1;

export const rateLimiter: RequestHandler = (req, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  let bucket = buckets.get(userId);

  if (!bucket) {
    bucket = createTokenBucket(CAPACITY, REFILL_RATE);
    buckets.set(userId, bucket);
  }

  res.setHeader("RateLimit-Limit", CAPACITY);

  const allowed = tryConsumeBucket(bucket);

  res.setHeader("RateLimit-Remaining", Math.floor(bucket.tokens));

  if (!allowed) {
    const retryAfter = Math.ceil((1 - bucket.tokens) / bucket.refilRate);

    res.setHeader("Retry-After", retryAfter);

    res.status(429).json({
      message: "Too many requests. Please try again later.",
    });
    return;
  }

  next();
};
