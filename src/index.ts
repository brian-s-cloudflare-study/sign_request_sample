import { renderMainPage } from './pages';
import { generateSignedParams, importSigningKey } from './sign';
import { renderChallengePage, verifyTurnstileToken } from './turnstile';
import { verifySignedRequest } from './verify';

interface Env {
	SECRET_DATA: string;
	TURNSTILE_SECRET_KEY: string;
	TURNSTILE_SITE_KEY: string;
}

const MOCK_SLOTS: Record<string, string[]> = {
	weekday: [
		'오후 12:00',
		'오후 12:30',
		'오후 1:00',
		'오후 1:30',
		'오후 5:00',
		'오후 5:30',
		'오후 6:00',
		'오후 6:30',
		'오후 7:00',
		'오후 7:30',
	],
	weekend: [
		'오전 11:30',
		'오후 12:00',
		'오후 12:30',
		'오후 1:00',
		'오후 1:30',
		'오후 5:30',
		'오후 6:00',
		'오후 6:30',
		'오후 7:00',
		'오후 7:30',
	],
};

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 10;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_ESCALATION = 8;

function checkRateLimit(clientIp: string): {
	allowed: boolean;
	retryAfter: number;
	requireTurnstile: boolean;
} {
	const now = Math.floor(Date.now() / 1000);
	const entry = rateLimitMap.get(clientIp);

	if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
		rateLimitMap.set(clientIp, { count: 1, windowStart: now });
		return { allowed: true, retryAfter: 0, requireTurnstile: false };
	}

	entry.count++;
	if (entry.count > RATE_LIMIT_MAX) {
		const retryAfter = RATE_LIMIT_WINDOW - (now - entry.windowStart);
		const requireTurnstile = entry.count >= RATE_LIMIT_ESCALATION;
		return { allowed: false, retryAfter: Math.max(1, retryAfter), requireTurnstile };
	}

	return { allowed: true, retryAfter: 0, requireTurnstile: false };
}

function resetRateLimit(clientIp: string): void {
	rateLimitMap.delete(clientIp);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const clientIp = request.headers.get('CF-Connecting-IP') ?? '127.0.0.1';

		if (url.pathname === '/' && request.method === 'GET') {
			return handleMainPage(env);
		}

		if (url.pathname === '/slots' && request.method === 'GET') {
			return handleSlots(url, env, clientIp);
		}

		if (url.pathname === '/verify-turnstile' && request.method === 'POST') {
			return handleVerifyTurnstile(request, env, clientIp);
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

async function handleMainPage(env: Env): Promise<Response> {
	const key = await importSigningKey(env.SECRET_DATA);
	const token = await generateSignedParams(key, '/slots');
	const html = renderMainPage(token, env.TURNSTILE_SITE_KEY);

	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
}

async function handleSlots(url: URL, env: Env, clientIp: string): Promise<Response> {
	const rateCheck = checkRateLimit(clientIp);
	if (!rateCheck.allowed) {
		const headers: Record<string, string> = {
			'Retry-After': String(rateCheck.retryAfter),
		};
		if (rateCheck.requireTurnstile) {
			headers['X-Require-Turnstile'] = 'true';
		}
		return new Response('Rate limit exceeded', { status: 429, headers });
	}

	const key = await importSigningKey(env.SECRET_DATA);
	const verifyParam = url.searchParams.get('verify');
	const result = await verifySignedRequest(key, '/slots', verifyParam);

	if (!result.valid) {
		const challengeHtml = renderChallengePage(
			env.TURNSTILE_SITE_KEY,
			`/slots?date=${url.searchParams.get('date') ?? ''}`,
		);
		return new Response(challengeHtml, {
			status: 403,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	}

	const dateStr = url.searchParams.get('date') ?? '';
	const date = new Date(dateStr);
	const dayOfWeek = date.getDay();
	const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
	const slots = isWeekend ? MOCK_SLOTS.weekend : MOCK_SLOTS.weekday;

	return Response.json({ date: dateStr, slots });
}

async function handleVerifyTurnstile(
	request: Request,
	env: Env,
	clientIp: string,
): Promise<Response> {
	const formData = await request.formData();
	const turnstileResponse = formData.get('cf-turnstile-response');
	const redirect = formData.get('redirect');

	if (!turnstileResponse || typeof turnstileResponse !== 'string') {
		return new Response('Missing Turnstile token', { status: 400 });
	}

	const verification = await verifyTurnstileToken(
		env.TURNSTILE_SECRET_KEY,
		turnstileResponse,
		clientIp,
	);

	if (!verification.success) {
		return new Response('Turnstile verification failed', { status: 403 });
	}

	resetRateLimit(clientIp);

	const key = await importSigningKey(env.SECRET_DATA);
	const token = await generateSignedParams(key, '/slots');

	const acceptsJson = request.headers.get('Accept')?.includes('application/json');
	if (acceptsJson) {
		return Response.json({ success: true, token });
	}

	const redirectPath = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/';

	const separator = redirectPath.includes('?') ? '&' : '?';
	const signedUrl = `${redirectPath}${separator}verify=${encodeURIComponent(token)}`;

	return Response.redirect(new URL(signedUrl, request.url).toString(), 302);
}
