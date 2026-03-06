# WAF Custom Rule + Rate Limiting 설정 가이드

이 문서는 `sign-request-sample` Worker를 Cloudflare에 배포한 후,
WAF Custom Rule과 Rate Limiting을 설정하는 방법을 안내합니다.

---

## 1. 사전 준비

### 1.1 Worker 배���

```bash
# 시크릿 설정 (대화형 프롬프트)
npx wrangler secret put SECRET_DATA
npx wrangler secret put TURNSTILE_SECRET_KEY

# 배포
npx wrangler deploy
```

### 1.2 Turnstile 사이트 등록

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Turnstile** 메뉴
2. **Add site** 클릭
3. 도메인 입력 (예: `sign-sample.your-domain.workers.dev`)
4. Widget Mode: **Managed** 선택 (권장)
5. 생성된 **Site Key**와 **Secret Key** 복사
6. Site Key → `wrangler.toml`의 `TURNSTILE_SITE_KEY`에 설정
7. Secret Key → `npx wrangler secret put TURNSTILE_SECRET_KEY`로 설정

---

## 2. WAF Custom Rule 설정

### 2.1 목적

Worker의 HMAC 서명(`?verify=timestamp-base64mac`)을 WAF 레이어에서 먼저 검증하여,
유효하지 않은 요청에 대해 **Managed Challenge** (Turnstile)를 자동으로 표시합니다.

### 2.2 설정 방법 (Dashboard)

1. **Cloudflare Dashboard** → 해당 도메인 → **Security** → **WAF** → **Custom rules**
2. **Create rule** 클릭
3. 아래 설정 입력:

| 항목 | 값 |
|---|---|
| Rule name | `HMAC Token Validation` |
| Expression | 아래 참조 |
| Action | **Managed Challenge** |

### 2.3 Expression

```
(http.request.uri.path eq "/slots") and
not is_timed_hmac_valid_v0(
  "your-secret-key-here",
  http.request.uri,
  3600,
  http.request.timestamp.sec,
  8
)
```

### 2.4 파라��터 설명

```
is_timed_hmac_valid_v0(
  SecretKey,              # HMAC 시크릿 (SECRET_DATA와 동일해야 함)
  MessageMAC,             # 검증할 URI (query string 포함)
  TTL,                    # 토큰 유효기간 (초) — Worker의 EXPIRY와 맞출 것
  CurrentTimestamp,       # 현재 타임스탬프 (http.request.timestamp.sec)
  SeparatorLength         # "?verify=" 길이 = 8
)
```

### 2.5 주의사항

- `SecretKey`는 Worker의 `SECRET_DATA`와 **동일한 값**이어야 합니다
- `TTL`은 Worker의 `getExpiry()` 반환값 (현재 60초)보다 크거나 같아야 합니다
  - WAF TTL을 3600초(1시간)로 설정하면 WAF는 느슨하게, Worker는 빡빡하게 검증하는 구조
- Worker가 생성하는 URL 형식: `/slots?date=2026-03-14&verify=1772769276-base64mac`
  - `SeparatorLength = 8` → `?verify=` 문자열의 길이
- Action은 **Managed Challenge** (Block이 아님) → Turnstile 표시

### 2.6 Terraform 설정 (선택)

```hcl
resource "cloudflare_ruleset" "waf_custom" {
  zone_id     = var.zone_id
  name        = "WAF Custom Rules"
  description = "HMAC token validation"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "managed_challenge"
    expression  = <<-EOT
      (http.request.uri.path eq "/slots") and
      not is_timed_hmac_valid_v0(
        "${var.hmac_secret}",
        http.request.uri,
        3600,
        http.request.timestamp.sec,
        8
      )
    EOT
    description = "HMAC Token Validation"
    enabled     = true
  }
}
```

---

## 3. Rate Limiting 설정

### 3.1 목적

`/slots` 엔드포인트에 대한 과도한 요청을 제한하��,
캘린더 날짜를 빠르게 반복 클릭하는 등의 남용을 방지합니다.

### 3.2 설정 방법 (Dashboard)

1. **Cloudflare Dashboard** → 해당 도메인 → **Security** → **WAF** → **Rate limiting rules**
2. **Create rule** 클릭

| 항목 | 값 |
|---|---|
| Rule name | `Slots API Rate Limit` |
| Expression | `(http.request.uri.path eq "/slots")` |
| Characteristics | **IP** |
| Requests | `10` requests per `10` seconds |
| Action | **Managed Challenge** |
| Duration | 60 seconds |

### 3.3 권장 설정값

| 파라미터 | 개발/테스트 | 프로덕션 |
|---|---|---|
| Requests | 10 / 10s | 30 / 60s |
| Action | Managed Challenge | Managed Challenge |
| Duration | 60s | 300s |
| Characteristics | IP | IP + Headers(User-Agent) |

### 3.4 Rate Limiting vs Worker 내 Rate Limiter

| 항목 | WAF Rate Limiting | Worker 내 Mock Rate Limiter |
|---|---|---|
| 실행 시점 | Worker 이전 (엣지) | Worker 내부 |
| 상태 저장 | Cloudflare 글로벌 | in-memory (isolate별) |
| 리셋 | 자동 (Cloudflare 관리) | isolate 재시작 시 |
| 프로덕션 용도 | 적합 | 샘플/데모용 |

프로덕션에서는 Worker 내 `checkRateLimit()` 대신 **WAF Rate Limiting**만 사용하세요.
Worker의 in-memory Map은 isolate가 재시작되면 초기화되므로 신뢰할 수 없습니다.

### 3.5 API 설정 (선택)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/phases/http_ratelimit/entrypoint" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "rules": [{
      "action": "managed_challenge",
      "expression": "(http.request.uri.path eq \"/slots\")",
      "description": "Slots API Rate Limit",
      "ratelimit": {
        "characteristics": ["ip.src"],
        "period": 10,
        "requests_per_period": 10,
        "mitigation_timeout": 60
      }
    }]
  }'
```

---

## 4. 실행 순서 (요청 처리 파이프라인)

```
클라이언��� 요청
    |
    v
+-----------------------------+
| 1. WAF Rate Limiting        | <-- 초과 시 Managed Challenge
|    (10 req / 10s per IP)    |
+-------------+---------------+
              | 통과
              v
+-----------------------------+
| 2. WAF Custom Rule          | <-- HMAC 무효 시 Managed Challenge
|    (is_timed_hmac_valid_v0) |
+-------------+---------------+
              | 통과
              v
+-----------------------------+
| 3. Worker                   | <-- 세밀한 검증 + 비즈니스 로직
|    - HMAC 재검증             |
|    - Mock rate limit         |
|    - Turnstile fallback      |
|    - Slots 데이터 응답       |
+-----------------------------+
```

WAF 규칙은 Worker **이전**에 실행됩니다. 따라서:
- Rate limit�� 먼저 적용되고
- HMAC 검증이 두 번째로 적용되고
- Worker는 마지막 레이어로 세밀한 제어를 수행합니다

---

## 5. 테스트 방법

### 5.1 WAF Rule ���스트

```bash
# HMAC 없이 요청 -> Managed Challenge 반환 (HTML)
curl -v https://your-worker.workers.dev/slots?date=2026-03-14

# 유효��� HMAC으로 요청 -> 200 + JSON
# (��인 페이지에서 발급받은 토큰 사��)
curl https://your-worker.workers.dev/slots?date=2026-03-14&verify=TIMESTAMP-BASE64MAC
```

### 5.2 Rate Limit 테스트

```bash
# 빠르게 반복 요청 -> 일정 횟수 후 429 또는 Managed Challenge
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://your-worker.workers.dev/slots?date=2026-03-14&verify=TOKEN"
done
```

### 5.3 Turnstile 테스트 키

| 키 | 동작 |
|---|---|
| Site Key: `1x00000000000000000000AA` | 항상 성공 (보이는 위젯) |
| Site Key: `2x00000000000000000000AB` | 항상 성공 (보이지 않는 위젯) |
| Site Key: `3x00000000000000000000FF` | 항상 실패 |
| Secret Key: `1x0000000000000000000000000000000AA` | 항상 성공 |
| Secret Key: `2x0000000000000000000000000000000AA` | 항상 실패 |

---

## 6. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| WAF가 모든 요청 차단 | SecretKey 불일치 | WAF와 Worker의 SECRET_DATA 동일하게 |
| 토큰이 항상 만료 | TTL 설정 너무 짧음 | WAF TTL >= Worker EXPIRY |
| Rate limit 미작동 | 규칙 미활성화 | Dashboard에서 Enabled 확인 |
| Turnstile 위젯 안 뜸 | Site Key 누락/불일치 | TURNSTILE_SITE_KEY 확인 |
| `SeparatorLength` 오류 | `?verify=` 길이 변경 | 8 (기본값) 유지 |
