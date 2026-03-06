import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { generateSignedParams, getExpiry, importSigningKey } from '../src/sign';

describe('sign', () => {
	const TEST_SECRET = 'test-secret-key-for-hmac';

	describe('importSigningKey', () => {
		it('should return a CryptoKey for HMAC-SHA256', async () => {
			const key = await importSigningKey(TEST_SECRET);
			expect(key).toBeDefined();
			expect(key.type).toBe('secret');
			expect(key.algorithm).toMatchObject({ name: 'HMAC' });
			expect(key.usages).toContain('sign');
			expect(key.usages).toContain('verify');
		});

		it('should produce different keys for different secrets', async () => {
			const key1 = await importSigningKey('secret-a');
			const key2 = await importSigningKey('secret-b');

			const data = new TextEncoder().encode('test-data');
			const mac1 = await crypto.subtle.sign('HMAC', key1, data);
			const mac2 = await crypto.subtle.sign('HMAC', key2, data);

			expect(Buffer.from(mac1).toString('base64')).not.toBe(Buffer.from(mac2).toString('base64'));
		});
	});

	describe('generateSignedParams', () => {
		it('should return a string in format "timestamp-base64mac"', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await generateSignedParams(key, '/slots');

			expect(result).toMatch(/^\d+-[A-Za-z0-9+/]+=*$/);
		});

		it('should embed current timestamp', async () => {
			const before = Math.floor(Date.now() / 1000);
			const key = await importSigningKey(TEST_SECRET);
			const result = await generateSignedParams(key, '/slots');
			const after = Math.floor(Date.now() / 1000);

			const timestamp = Number(result.split('-')[0]);
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it('should produce different MACs for different paths', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result1 = await generateSignedParams(key, '/slots');
			const result2 = await generateSignedParams(key, '/other');

			const mac1 = result1.split('-').slice(1).join('-');
			const mac2 = result2.split('-').slice(1).join('-');

			expect(mac1).not.toBe(mac2);
		});

		it('should produce a verifiable HMAC', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await generateSignedParams(key, '/test');

			const separatorIndex = result.indexOf('-');
			const timestamp = result.slice(0, separatorIndex);
			const mac = result.slice(separatorIndex + 1);

			const dataToAuthenticate = `/test${timestamp}`;
			const receivedMac = Buffer.from(mac, 'base64');

			const verified = await crypto.subtle.verify(
				'HMAC',
				key,
				receivedMac,
				new TextEncoder().encode(dataToAuthenticate),
			);
			expect(verified).toBe(true);
		});
	});

	describe('getExpiry', () => {
		it('should return a positive number', () => {
			const expiry = getExpiry();
			expect(expiry).toBeGreaterThan(0);
			expect(typeof expiry).toBe('number');
		});
	});
});
