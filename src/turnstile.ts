const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
	success: boolean;
	'error-codes'?: string[];
}

export async function verifyTurnstileToken(
	secretKey: string,
	token: string,
	remoteIp: string | null,
): Promise<TurnstileVerifyResult> {
	const body: Record<string, string> = {
		secret: secretKey,
		response: token,
	};
	if (remoteIp) {
		body.remoteip = remoteIp;
	}

	const response = await fetch(SITEVERIFY_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	return response.json<TurnstileVerifyResult>();
}

export function renderChallengePage(siteKey: string, originalPath: string): string {
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>보안 확인</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; background: #f7f8fa;
  }
  .card {
    background: #fff; border-radius: 16px; padding: 40px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08); text-align: center;
    max-width: 400px; width: 90%;
  }
  h1 { font-size: 20px; margin-bottom: 8px; color: #1a1a1a; }
  p { font-size: 14px; color: #666; margin-bottom: 24px; }
  .cf-turnstile { display: flex; justify-content: center; margin-bottom: 16px; }
  button {
    background: #ff5a00; color: #fff; border: none; border-radius: 8px;
    padding: 12px 32px; font-size: 16px; cursor: pointer; width: 100%;
  }
  button:disabled { background: #ccc; cursor: not-allowed; }
</style>
</head>
<body>
<div class="card">
  <h1>보안 확인이 필요합니다</h1>
  <p>요청이 너무 빠릅니다. 아래 확인을 완료해 주세요.</p>
  <form id="challenge-form" method="POST" action="/verify-turnstile">
    <input type="hidden" name="redirect" value="${escapeHtml(originalPath)}">
    <div class="cf-turnstile" data-sitekey="${escapeHtml(siteKey)}" data-callback="onTurnstileSuccess"></div>
    <button type="submit" id="submit-btn" disabled>확인 중...</button>
  </form>
</div>
<script>
function onTurnstileSuccess() {
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-btn').textContent = '계속하기';
}
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}
