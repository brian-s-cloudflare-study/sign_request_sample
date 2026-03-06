import { env, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { generateSignedParams, importSigningKey } from '../src/sign';

declare module 'cloudflare:test' {
	interface ProvidedEnv {
		SECRET_DATA: string;
		TURNSTILE_SECRET_KEY: string;
		TURNSTILE_SITE_KEY: string;
	}
}

describe('Worker fetch handler', () => {
	describe('GET /', () => {
		it('should return the main page with HTML content', async () => {
			const response = await SELF.fetch('https://example.com/');
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toContain('text/html');

			const html = await response.text();
			expect(html).toContain('<!DOCTYPE html>');
			expect(html).toContain('section-title');
			expect(html).toContain('calendar');
		});

		it('should embed a signed token in the page', async () => {
			const response = await SELF.fetch('https://example.com/');
			const html = await response.text();

			const tokenMatch = html.match(/const TOKEN = '(\d+-[A-Za-z0-9+/]+=*)'/);
			expect(tokenMatch).not.toBeNull();
		});
	});

	describe('GET /slots', () => {
		async function createVerifyToken(): Promise<string> {
			const key = await importSigningKey(env.SECRET_DATA);
			return generateSignedParams(key, '/slots');
		}

		it('should return slots for a valid signed request', async () => {
			const token = await createVerifyToken();
			const response = await SELF.fetch(
				`https://example.com/slots?date=2026-03-14&verify=${encodeURIComponent(token)}`,
			);

			expect(response.status).toBe(200);
			const data = await response.json<{ date: string; slots: string[] }>();
			expect(data.date).toBe('2026-03-14');
			expect(data.slots).toBeInstanceOf(Array);
			expect(data.slots.length).toBeGreaterThan(0);
		});

		it('should return weekend slots for Saturday', async () => {
			const token = await createVerifyToken();
			const response = await SELF.fetch(
				`https://example.com/slots?date=2026-03-14&verify=${encodeURIComponent(token)}`,
			);

			const data = await response.json<{ slots: string[] }>();
			expect(data.slots).toContain('오전 11:30');
		});

		it('should return weekday slots for Wednesday', async () => {
			const token = await createVerifyToken();
			const response = await SELF.fetch(
				`https://example.com/slots?date=2026-03-11&verify=${encodeURIComponent(token)}`,
			);

			const data = await response.json<{ slots: string[] }>();
			expect(data.slots).not.toContain('오전 11:30');
			expect(data.slots).toContain('오후 12:00');
		});

		it('should return 403 with Turnstile challenge for missing token', async () => {
			const response = await SELF.fetch('https://example.com/slots?date=2026-03-14');

			expect(response.status).toBe(403);
			const html = await response.text();
			expect(html).toContain('cf-turnstile');
			expect(html).toContain('/verify-turnstile');
		});

		it('should return 403 for invalid token', async () => {
			const response = await SELF.fetch(
				'https://example.com/slots?date=2026-03-14&verify=999-invalidmac',
			);

			expect(response.status).toBe(403);
			const html = await response.text();
			expect(html).toContain('보안 확인');
		});

		it('should preserve date in challenge redirect form', async () => {
			const response = await SELF.fetch('https://example.com/slots?date=2026-03-20', {
				headers: { 'CF-Connecting-IP': '10.0.0.99' },
			});

			expect(response.status).toBe(403);
			const html = await response.text();
			expect(html).toContain('2026-03-20');
		});
	});

	describe('POST /verify-turnstile', () => {
		it('should return 400 for missing Turnstile token', async () => {
			const formData = new FormData();
			formData.append('redirect', '/slots?date=2026-03-14');

			const response = await SELF.fetch('https://example.com/verify-turnstile', {
				method: 'POST',
				body: formData,
			});

			expect(response.status).toBe(400);
		});
	});

	describe('unknown routes', () => {
		it('should return 404 for unknown paths', async () => {
			const response = await SELF.fetch('https://example.com/unknown');
			expect(response.status).toBe(404);
		});

		it('should return 404 for wrong method on known paths', async () => {
			const response = await SELF.fetch('https://example.com/slots', { method: 'POST' });
			expect(response.status).toBe(404);
		});
	});
});
