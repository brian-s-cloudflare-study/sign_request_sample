import { describe, expect, it } from 'vitest';
import { renderChallengePage } from '../src/turnstile';

describe('turnstile', () => {
	describe('renderChallengePage', () => {
		it('should return valid HTML', () => {
			const html = renderChallengePage('test-site-key', '/slots?date=2026-03-06');

			expect(html).toContain('<!DOCTYPE html>');
			expect(html).toContain('</html>');
		});

		it('should embed the site key in the turnstile widget', () => {
			const siteKey = '1x00000000000000000000AA';
			const html = renderChallengePage(siteKey, '/slots');

			expect(html).toContain(`data-sitekey="${siteKey}"`);
		});

		it('should include the original path in the form', () => {
			const html = renderChallengePage('test-key', '/slots?date=2026-03-06');

			expect(html).toContain('name="redirect"');
			expect(html).toContain('value="/slots?date=2026-03-06"');
		});

		it('should escape HTML in originalPath to prevent XSS', () => {
			const maliciousPath = '"><script>alert(1)</script>';
			const html = renderChallengePage('test-key', maliciousPath);

			expect(html).not.toContain('<script>alert(1)</script>');
			expect(html).toContain('&lt;script&gt;');
		});

		it('should escape HTML in siteKey to prevent XSS', () => {
			const maliciousKey = '"><img src=x onerror=alert(1)>';
			const html = renderChallengePage(maliciousKey, '/slots');

			expect(html).not.toContain('"><img src=x');
			expect(html).toContain('&quot;&gt;&lt;img');
		});

		it('should include the Turnstile script', () => {
			const html = renderChallengePage('key', '/path');

			expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
		});

		it('should post to /verify-turnstile', () => {
			const html = renderChallengePage('key', '/path');

			expect(html).toContain('action="/verify-turnstile"');
			expect(html).toContain('method="POST"');
		});

		it('should have submit button initially disabled', () => {
			const html = renderChallengePage('key', '/path');

			expect(html).toContain('disabled');
			expect(html).toContain('확인 중...');
		});
	});
});
