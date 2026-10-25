import { describe, it, expect, vi, afterEach } from "vitest";

import { createTokenBucket, tryConsumeBucket } from "./tokenBucket";

afterEach(() => {
  vi.useRealTimers();
});

describe("Token Bucket", () => {
  it("should consume tokens until the bucket becomes empty", () => {
    const bucket = createTokenBucket(3, 1);

    expect(tryConsumeBucket(bucket)).toBe(true);
    expect(tryConsumeBucket(bucket)).toBe(true);
    expect(tryConsumeBucket(bucket)).toBe(true);

    expect(bucket.tokens).toBe(0);
    expect(tryConsumeBucket(bucket)).toBe(false);
  });

  it("should refill tokens based on elapsed time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const bucket = createTokenBucket(5, 1);

    bucket.tokens = 0;
    bucket.lastRefilTime = Date.now();

    vi.advanceTimersByTime(3000);

    expect(tryConsumeBucket(bucket)).toBe(true);
    expect(bucket.tokens).toBe(2);
  });

  it("should not exceed the bucket capacity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const bucket = createTokenBucket(5, 1);

    bucket.tokens = 0;
    bucket.lastRefilTime = Date.now();

    // Simulate 10 seconds passing
    vi.advanceTimersByTime(10_000);

    expect(tryConsumeBucket(bucket)).toBe(true);

    // 5 tokens refilled, then 1 consumed = 4
    expect(bucket.tokens).toBe(4);
  });

  it("should accumulate fractional tokens over time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const bucket = createTokenBucket(5, 1);

    bucket.tokens = 0;
    bucket.lastRefilTime = Date.now();

    // 500 milliseconds = 0.5 token
    vi.advanceTimersByTime(500);

    expect(tryConsumeBucket(bucket)).toBe(false);
    expect(bucket.tokens).toBe(0.5);

    // Another 500 milliseconds = total 1 token
    vi.advanceTimersByTime(500);

    expect(tryConsumeBucket(bucket)).toBe(true);
    expect(bucket.tokens).toBe(0);
  });
});
