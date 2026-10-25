import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { rateLimiter } from "./rateLimiter";

const createMocks = (userId?: string) => {
  const req = {
    user: userId ? { id: userId } : undefined,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Rate Limiter Middleware", () => {
  it("should return 401 if user is not authenticated", () => {
    const { req, res, next } = createMocks();

    rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow an authenticated user's request", () => {
    const { req, res, next } = createMocks("user-test-1");

    rateLimiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 429 when the user exhausts all tokens", () => {
    const userId = "user-test-2";

    for (let i = 0; i < 5; i++) {
      const { req, res, next } = createMocks(userId);
      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const { req, res, next } = createMocks(userId);

    rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: "Too many requests. Please try again later.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should give each user an independent bucket", () => {
    const userA = "user-test-3";
    const userB = "user-test-4";

    // Exhaust User A's bucket.
    for (let i = 0; i < 5; i++) {
      const { req, res, next } = createMocks(userA);
      rateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    // User A should now be rate-limited.
    const blocked = createMocks(userA);
    rateLimiter(blocked.req, blocked.res, blocked.next);

    expect(blocked.res.status).toHaveBeenCalledWith(429);

    // User B should still have a fresh bucket.
    const fresh = createMocks(userB);
    rateLimiter(fresh.req, fresh.res, fresh.next);

    expect(fresh.next).toHaveBeenCalledTimes(1);
    expect(fresh.res.status).not.toHaveBeenCalled();
  });


  it("should set rate limit headers for an allowed request", () => {
  const { req, res, next } = createMocks("user-header-test");

  rateLimiter(req, res, next);

  expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Limit", 5);
  expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Remaining", 4);
  expect(next).toHaveBeenCalledTimes(1);
});

it("should set Retry-After when the bucket is exhausted", () => {
  const userId = "user-retry-test";

  // Consume all 5 tokens.
  for (let i = 0; i < 5; i++) {
    const { req, res, next } = createMocks(userId);
    rateLimiter(req, res, next);
  }

  // The 6th request should be rejected.
  const { req, res, next } = createMocks(userId);

  rateLimiter(req, res, next);

  expect(res.status).toHaveBeenCalledWith(429);
  expect(res.setHeader).toHaveBeenCalledWith("Retry-After", 1);
  expect(next).not.toHaveBeenCalled();
});
});
