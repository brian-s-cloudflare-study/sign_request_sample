# AGENTS.md — Cloudflare Workers Sign Request Sample

## Project Overview

Cloudflare Workers TypeScript project implementing HMAC-SHA256 request signing with WAF
custom rule validation (`is_timed_hmac_valid_v0()`), rate limiting, and **Turnstile challenge
fallback** when verification fails.

**Reference**: https://developers.cloudflare.com/workers/examples/signing-requests/

**⚠️ PUBLIC REPO** — Never commit secrets, API keys, or personal info. Use `wrangler secret put`
for all sensitive values. Use `.dev.vars` locally (gitignored). Provide `.dev.vars.example` with
placeholder values only.

**🗣️ 언어**: 이 프로젝트의 모든 대화는 **한국어**로 진행합니다.

### Architecture

```
Client → Cloudflare Edge
  ├─ WAF Rate Limiting Rules (evaluate first)
  ├─ WAF Custom Rules (is_timed_hmac_valid_v0 → Managed Challenge)
  └─ Worker (sign / verify / challenge / proxy)
        ├─ /generate/* → creates signed URL with HMAC + timestamp
        ├─ /* (valid HMAC) → proxies to origin
        └─ /* (invalid/expired HMAC) → serves Turnstile challenge page
              └─ POST /verify-turnstile → validates token via siteverify API
                    → on success: issues signed URL or grants access
```

WAF rules execute BEFORE the Worker. WAF custom rule action should be **Managed Challenge**
(not Block) so Cloudflare serves a Turnstile challenge for invalid HMACs at the edge layer.
The Worker provides a second verification layer with its own Turnstile widget for finer control.

### Turnstile Flow (Worker-level)

1. Client requests a protected URL without valid `?verify=` param
2. Worker returns an HTML page embedding the Turnstile widget (`cf-turnstile`)
3. Client solves challenge → receives a one-time token (valid 5 min, max 2048 chars)
4. Client POSTs the token to `/verify-turnstile`
5. Worker calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` to validate
6. On success → Worker generates a signed URL and redirects (or proxies directly)

### Reference UX (캐치테이블 패턴)

이 샘플은 캐치테이블(https://app.catchtable.co.kr)의 예약 흐름을 참고���여 구현합니다.

**관찰된 패턴:**

1. **페이지 접근 → 토큰 발행**: 매장 페이지 로드 시 `/api/v3/init` 호출로 세션 초기화.
   이후 매장 정보, 예약 가능 시간대 등 API 호출에 해당 토큰 사용.
2. **예약하기 → 캘린더**: "날짜·인원·시간" 선택기 클릭 시 캘린더 표시.
   날짜 선택마다 `POST /api/reservation/v1/dining/time-slots` 호출하여 해당 날짜의
   가용 시간대 조회.
3. **빠른 날짜 변경 → Rate Limit → Challenge**: 날짜를 빠르게 반복 클릭하면
   time-slots API 호출이 급증하여 rate limiting 적용. 임계치 초과 시 Turnstile
   challenge 노출.

**이 샘플에서 재현할 흐름:**

```
GET  /                → 메인 페이지 + signed token 발행 (HMAC)
GET  /slots?date=X    → 날짜별 데이터 조회 (signed URL 필요)
     ├─ valid token   → 200 + 데이터 응답
     ├─ rate limited  → 429 + retry-after
     └─ invalid/없���  → Turnstile challenge 페이지 반환
POST /verify-turnstile → challenge 통과 → signed URL 발급 → redirect
```

---

## Build / Dev / Deploy Commands

```bash
npm install                          # Install dependencies
npx wrangler types                   # Generate Env types from wrangler.toml
npx wrangler dev                     # Local dev (Miniflare)
npx wrangler deploy                  # Deploy to Cloudflare
npx wrangler secret put SECRET_DATA  # Set secret (interactive)
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler tail                    # Tail production logs
```

## Testing

```bash
npx vitest run                       # Run all tests
npx vitest run test/sign.test.ts     # Single test file
npx vitest run -t "verify signed"    # Tests matching pattern
npx vitest                           # Watch mode
npx vitest run --coverage            # With coverage
```

Uses `vitest` + `@cloudflare/vitest-pool-workers`. Config in `vitest.config.ts`.

## Lint / Format

```bash
npx biome check .                    # Lint
npx biome check --write .            # Lint + auto-fix
npx biome format --write .           # Format only
npx tsc --noEmit                     # Type check
```

---

## Code Style

### TypeScript

- Strict mode (`"strict": true`). Use `satisfies ExportedHandler<Env>` for default export.
- Generate `Env` via `npx wrangler types` — never hand-write it.
- Requires `nodejs_compat` flag for `Buffer` from `"node:buffer"`.

### Imports

```typescript
import { Buffer } from "node:buffer";   // node builtins: "node:" prefix
import { Hono } from "hono";            // external packages: plain specifiers
import { signUrl } from "./sign";       // local modules: relative paths
// Order: node builtins → external → local. Prefer named imports.
```

### Naming

| Element          | Convention       | Example                        |
|------------------|------------------|--------------------------------|
| Files            | kebab-case       | `sign-request.ts`              |
| Interfaces/Types | PascalCase       | `Env`, `TurnstileResponse`     |
| Functions/vars   | camelCase        | `verifyHmac`, `secretKey`      |
| Constants        | UPPER_SNAKE_CASE | `EXPIRY`, `SITEVERIFY_URL`     |
| Env bindings     | UPPER_SNAKE_CASE | `SECRET_DATA`, `TURNSTILE_SECRET_KEY` |

### Formatting (Biome)

Tabs, single quotes, trailing commas in multi-line, line width 100.

### Error Handling

- Always return `Response` objects with appropriate status codes — never throw unhandled.
- Use `crypto.subtle.verify()` for MAC comparison — **never** string `===` (timing attack).
- Never use empty catch blocks. Always `await` or `ctx.waitUntil()` Promises.

### Security Rules

- **Never** use `Math.random()` — use Web Crypto API.
- **Never** hardcode secrets — use `wrangler secret put` + `env` bindings.
- **Never** compare MACs with `===` — use `crypto.subtle.verify()` (timing-safe).
- **Never** store mutable request-scoped data in module-level variables (isolate reuse).
- **Always** validate timestamps as `Number()` before arithmetic.
- **Always** URL-encode Base64 MAC values when not using the `'s'` flag in WAF rules.
- **Always** validate Turnstile tokens server-side via siteverify — client widget alone is not secure.

---

## Key Patterns

### HMAC Signing (Web Crypto)

```typescript
const encoder = new TextEncoder();
const key = await crypto.subtle.importKey(
  "raw", encoder.encode(env.SECRET_DATA),
  { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
);
const dataToAuthenticate = `${url.pathname}${timestamp}`;
const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToAuthenticate));
const base64Mac = Buffer.from(mac).toString("base64");
// Result URL: /path?verify={timestamp}-{base64mac}
```

### Turnstile Server-Side Validation

```typescript
const siteverifyResponse = await fetch(
  "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,        // from client widget
      remoteip: request.headers.get("CF-Connecting-IP"),
    }),
  },
);
const result: { success: boolean } = await siteverifyResponse.json();
// Token is single-use, expires in 5 min, max 2048 chars
```

### WAF Custom Rule (Managed Challenge)

```
Expression: not is_timed_hmac_valid_v0("secret", http.request.uri, 3600, http.request.timestamp.sec, 8)
Action: Managed Challenge   ← shows Turnstile at edge layer
```

Parameters: `(key, messageMAC, ttl_seconds, currentTimestamp, separatorLength)`.
`?verify={timestamp}-{base64mac}` — separator length = `len("?verify=")` = 8.

### Rate Limiting

Configured via **Dashboard / API / Terraform** — NOT in wrangler.toml.
Evaluates at WAF layer before the Worker executes.

---

## Project Structure

```
sign_request_sample/
├── src/
│   ├── index.ts           # Worker entry point (fetch handler, routing)
│   ├── sign.ts            # HMAC signing logic
│   ├── verify.ts          # HMAC verification logic
│   ├── turnstile.ts       # Turnstile challenge page HTML + siteverify validation
│   └── types.ts           # Shared types (if needed beyond Env)
├── test/
│   ├── sign.test.ts       # Signing tests
│   ├── verify.test.ts     # Verification tests
│   └── turnstile.test.ts  # Turnstile validation tests
├── wrangler.toml          # Wrangler configuration
├── tsconfig.json          # TypeScript config
├── vitest.config.ts       # Vitest + Workers pool config
├── biome.json             # Biome linter/formatter config
├── .dev.vars.example      # Template: SECRET_DATA=change-me\nTURNSTILE_SECRET_KEY=change-me
├── package.json
└── AGENTS.md
```

## Configuration Files

### wrangler.toml

```toml
name = "sign-request-sample"
main = "src/index.ts"
compatibility_date = "2026-03-05"
compatibility_flags = ["nodejs_compat"]

[vars]
TURNSTILE_SITE_KEY = "0x4AAAAAAA..."  # Public site key (safe to commit)
```

Secrets (`SECRET_DATA`, `TURNSTILE_SECRET_KEY`) set via `wrangler secret put` — never in source.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext"],
    "types": ["./worker-configuration.d.ts", "node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "test/**/*"]
}
```
