# Sign Request Sample

Cloudflare Workers를 활용한 HMAC-SHA256 요청 서명 + WAF 연동 + Turnstile 챌린지 데모 프로젝트입니다.

> **Reference**: [Cloudflare Workers — Signing Requests](https://developers.cloudflare.com/workers/examples/signing-requests/)

## Architecture

```
Client → Cloudflare Edge
  ├─ WAF Rate Limiting (evaluate first)
  ├─ WAF Custom Rules (is_timed_hmac_valid_v0 → Managed Challenge)
  └─ Worker
        ├─ /           → 메인 페이지 + signed token 발행
        ├─ /slots      → 날짜별 데이터 조회 (signed URL 필요)
        └─ /verify-turnstile → Turnstile 검증 → signed URL 재발급
```

- **HMAC 서명**: Web Crypto API (`crypto.subtle`) 기반 SHA-256 서명/검증
- **WAF 연동**: `is_timed_hmac_valid_v0()` 커스텀 룰로 Edge 레벨 검증
- **Rate Limiting**: 빠른 반복 요청 시 429 응답 + Retry-After
- **Turnstile Fallback**: 검증 실패 시 Turnstile 챌린지 → 통과 후 재발급

## Quick Start

```bash
npm install
cp .dev.vars.example .dev.vars   # 시크릿 설정
npm run dev                       # http://localhost:8787
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 로컬 개발 서버 (Miniflare) |
| `npm run deploy` | Cloudflare 배포 |
| `npm test` | 테스트 실행 |
| `npm run lint` | Biome 린트 |
| `npm run typecheck` | TypeScript 타입 체크 |

## Project Structure

```
src/
├── index.ts        # Worker 엔트리포인트 (라우팅)
├── sign.ts         # HMAC 서명 로직
├── verify.ts       # HMAC 검증 로직
├── turnstile.ts    # Turnstile 챌린지 페이지 + siteverify
└── pages.ts        # 메인 페이지 HTML 렌더링
test/
├── index.test.ts   # 통합 테스트
├── sign.test.ts    # 서명 테스트
├── verify.test.ts  # 검증 테스트
└── turnstile.test.ts # Turnstile 테스트
docs/
└── WAF_RATE_LIMIT_GUIDE.md  # WAF + Rate Limiting 설정 가이드
```

## Secrets

시크릿은 절대 소스에 포함하지 않습니다. 배포 환경에서는 `wrangler secret put`을 사용하세요.

```bash
npx wrangler secret put SECRET_DATA
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## License

MIT
