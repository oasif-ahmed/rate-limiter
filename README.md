<div align="center">

# Rate Limiter

**A token-bucket rate limiter for Express — per-user buckets, `429` + `Retry-After`, and a 10-test Vitest suite.**

Built one question at a time through a conversation with ChatGPT —
[read the full learning thread →](https://chatgpt.com/share/6ade0d1c-d7a8-83e8-bbee-6f29c89cdf7d)

![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.19%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-10_tests-6E9F18?logo=vitest&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

[Features](#features) · [How it works](#how-it-works) · [Quick start](#quick-start) · [Tests](#tests) · [The story](#how-this-was-built)

</div>

---

## Why this project exists

Most portfolio projects are CRUD apps. This one answers a question that comes up in every
backend interview: **what happens when a client sends too many requests?**

It is a rate limiter written from scratch — no `express-rate-limit`, no library. The algorithm,
the HTTP semantics, the tests and the reasoning behind every line were worked out step by step,
with each decision explained in my own words *before* any code was written.

## Features

- **Token bucket algorithm from scratch** — `createTokenBucket`, `refilBucket`, `tryConsumeBucket`
- **Lazy, time-based refill** — no `setInterval`, no background workers; refill is computed on demand
- **Fractional tokens** — 500 ms of idle time earns exactly `0.5` of a token
- **Per-user isolation** — a `Map<userId, TokenBucket>` so one user can never exhaust another's quota
- **Correct HTTP semantics** — `401` unauthenticated, `429` throttled, plus `Retry-After`
- **Standard rate-limit headers** — `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`
- **10 deterministic tests** — Vitest fake timers, mocked Express `req`/`res`
- **Real routing around it** — JWT auth, Prisma + PostgreSQL, role-based access

---

## How it works

### The bucket

```
   TOKEN BUCKET  (capacity = 5, refill = 1 token / second)

   request ──▶  [ ● ● ● ● ● ]  ──▶  200 OK          one token removed
                  5 4 3 2 1

   request ──▶  [ . . . . . ]   ──▶  429 Too Many Requests
                  empty               Retry-After: 1
```

Each user owns one bucket. Every request tries to take a single token. If the bucket has
less than one token, the request is rejected and the client is told how long to wait.

### Refill math

The bucket never wakes up on a timer. Refill is calculated the moment a request arrives:

```ts
const elapsedSeconds = (now - bucket.lastRefilTime) / 1000;
const tokensToAdd    = elapsedSeconds * bucket.refilRate;
bucket.tokens        = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
```

Three consequences of this design:

| Situation | What happens |
|---|---|
| 0.5 s since last request | `0.5` token added — not a whole one |
| 3 s since last request | `3` tokens added at once, but never past capacity |
| Bucket already full | `Math.min` clamps it — no overflow, no bonus |

### Consumption order matters

```ts
export const tryConsumeBucket = (bucket: TokenBucket): boolean => {
  refilBucket(bucket);          // 1. always top up first
  if (bucket.tokens < 1) return false;   // 2. short-circuit before touching tokens
  bucket.tokens -= 1;           // 3. only deduct on success
  return true;
};
```

Refill runs **every** time — even when the bucket looks full — because time may have passed
since the last request.

### Request flow

```mermaid
flowchart LR
    A["Incoming request"] --> B["auth middleware<br/>JWT → req.user.id"]
    B --> C{"req.user.id<br/>exists?"}
    C -- no --> D["401 Unauthorized"]
    C -- yes --> E["buckets.get(userId)"]
    E -- miss --> F["createTokenBucket(5, 1)"]
    E -- hit --> G["tryConsumeBucket(bucket)"]
    F --> G
    G --> H["refilBucket<br/>elapsed × refillRate"]
    H --> I{"tokens ≥ 1 ?"}
    I -- yes --> J["next() → controller → 200"]
    I -- no --> K["429 + Retry-After"]
```

`rateLimiter.ts` is the **decision maker**; `tokenBucket.ts` is the **arithmetic**. Swapping
the in-memory `Map` for Redis later only changes where the state lives — not the algorithm.

---

## API

| Method | Route | Auth | Rate limited | Purpose |
|---|---|---|---|---|
| `GET` | `/` | — | — | Health check |
| `POST` | `/api/auth/register` | — | — | Create account |
| `POST` | `/api/auth/login` | — | — | Get JWT (cookie or `Bearer`) |
| `GET` | `/api/users` | `CUSTOMER` role | Yes | Protected route behind the limiter |

### What a throttled response looks like

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0
Retry-After: 1

{ "message": "Too many requests. Please try again later." }
```

The `Retry-After` value is derived, not guessed:

```ts
const retryAfter = Math.ceil((1 - bucket.tokens) / bucket.refilRate);
// tokens = 0.4, refillRate = 1  →  ceil(0.6)  →  1 second
```

---

## Quick start

**Prerequisites:** Node.js 20.19+, PostgreSQL

```bash
git clone https://github.com/oasif-ahmed/rate-limiter.git
cd rate-limiter
npm install
```

Create a `.env` file in the project root:

```env
PORT=3000

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/rate_limiter

# Auth
BCRYPT_SALT_ROUNDS=10
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

Then:

```bash
npx prisma migrate deploy   # apply the existing migration
npm run dev                 # start with hot reload
```

Sanity checks:

```bash
npx tsc --noEmit            # type-check (should print nothing)
npx vitest run              # run the full test suite
```

---

## Tests

**10 tests, 2 files, all passing.**

| # | Suite | Test | Proves |
|---|---|---|---|
| 1 | Token Bucket | consumes tokens until empty | `true true true false` |
| 2 | Token Bucket | refills based on elapsed time | 3 s idle → tokens available again |
| 3 | Token Bucket | never exceeds capacity | 10 s idle still caps at 5 |
| 4 | Token Bucket | accumulates fractional tokens | 0.5 token is real and usable |
| 5 | Rate Limiter | 401 without a user | unauthenticated traffic never reaches the bucket |
| 6 | Rate Limiter | allows an authenticated request | `next()` called exactly once |
| 7 | Rate Limiter | 429 after 5 requests | the 6th request is rejected |
| 8 | Rate Limiter | independent bucket per user | User A blocked ≠ User B blocked |
| 9 | Rate Limiter | sets rate-limit headers | `RateLimit-Limit: 5`, `RateLimit-Remaining: 4` |
| 10 | Rate Limiter | sets `Retry-After` on exhaustion | `Retry-After: 1` |

Timing-dependent tests use `vi.useFakeTimers()`, `vi.setSystemTime()` and
`vi.advanceTimersByTime()`, with `vi.useRealTimers()` restored in `afterEach` — so the suite
is deterministic and finishes in ~100 ms.

```bash
npm test            # watch mode
npx vitest run      # single run (CI)
```

---

## Project structure

```
rate-limiter/
├── app.ts                        # Express app: middleware order + routes
├── server.ts                     # boot: Prisma connect → listen
├── src/
│   ├── tokenBucket.ts            # core: the algorithm (create / refill / consume)
│   ├── tokenBucket.test.ts       # 4 algorithm tests
│   ├── middleware/
│   │   ├── rateLimiter.ts        # core: Map of buckets + HTTP semantics
│   │   ├── rateLimiter.test.ts   # 6 middleware tests
│   │   ├── auth.ts               # JWT → req.user
│   │   ├── globalErrorHandler.ts
│   │   └── notFound.ts
│   ├── modules/
│   │   ├── auth/                 # register / login
│   │   └── user/                 # user routes (protected + limited)
│   ├── config/index.ts           # env → typed config
│   ├── lib/prisma.ts
│   └── utils/                    # catchAsync, jwt, sendResponse
└── prisma/                       # schema + migrations (PostgreSQL)
```

## Configuration

| Constant | Value | File | Meaning |
|---|---|---|---|
| `CAPACITY` | `5` | `src/middleware/rateLimiter.ts` | burst size — max tokens a user can hold |
| `REFILL_RATE` | `1` | `src/middleware/rateLimiter.ts` | tokens refilled per second |

With these values: **5 requests instantly, then 1 per second, per user.**

---

## How this was built

The entire roadmap — algorithm → verification → Express integration → per-user buckets →
headers → tests → Redis — was designed in a single conversation, and each step was only
touched after I could explain it back.

[Open the conversation](https://chatgpt.com/share/6ade0d1c-d7a8-83e8-bbee-6f29c89cdf7d)

The loop was always the same: **predict → run → read the output → explain it in my own words.**

- [x] Token bucket algorithm (`create` / `refil` / `tryConsume`)
- [x] Verify with scratch tests: `true true true false`
- [x] Integrate with Express, confirm `429` in Postman
- [x] Fix the shared-bucket bug — one bucket per user via `Map`
- [x] Rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`)
- [x] Automated tests (algorithm + middleware)
- [x] Documentation
- [ ] Evict idle buckets (memory cleanup)
- [ ] Environment-driven configuration
- [ ] Redis — shared state across instances

### What I actually learned

- **A shared bucket is a bug, not a shortcut.** A module-scope `const bucket = createTokenBucket(5, 1)`
  means one aggressive user drains the quota for *everyone*. Keying buckets by `req.user.id`
  gives each user an independent allowance.
- **Per-user buckets are resource isolation, not concurrency.** The `Map` stops users from
  eating each other's tokens — it does *not* make shared state race-free. That distinction
  cost me a wrong answer in the conversation and is worth remembering in an interview.
- **Refill can be lazy.** No timer needs to run in the background; asking "how much time
  passed?" at the moment of the request is cheaper and simpler.
- **Fractional tokens are the whole point of a token bucket.** Rounding to whole tokens would
  turn it into a fixed window counter.
- **State in process memory is a scope, not a store.** A restart wipes every bucket, and two
  instances disagree about who is limited — which is exactly the problem Redis solves.
- **`rateLimiter.ts` decides, `tokenBucket.ts` computes.** Keeping them separate means the
  Redis migration touches storage, never the algorithm.

---

## Limitations & future work

| Limitation | Consequence | Planned fix |
|---|---|---|
| Buckets live in a `Map` in one Node process | Reset on restart; diverges across instances | Redis-backed buckets |
| Idle buckets are never evicted | Memory grows with total unique users | TTL-based cleanup |
| Limits are hardcoded constants | Changing them means a redeploy | `.env`-driven config |
| Fixed 5 req/s for everyone | No distinction between free and paid tiers | Per-role policies |

## License

ISC
