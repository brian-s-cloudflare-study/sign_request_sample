import { describe, expect, it } from 'vitest';
import { generateSignedParams, getExpiry, importSigningKey } from '../src/sign';
import { verifySignedRequest } from '../src/verify';

describe('verifySignedRequest', () => {
	const TEST_SECRET = 'test-secret-key-for-hmac';

	async function createSignedParam(pathname: string): Promise<string> {
		const key = await importSigningKey(TEST_SECRET);
		return generateSignedParams(key, pathname);
	}

	describe('valid signatures', () => {
		it('should verify a freshly signed request', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const verifyParam = await createSignedParam('/slots');
			const result = await verifySignedRequest(key, '/slots', verifyParam);

			expect(result).toEqual({ valid: true });
		});
	});

	describe('missing parameter', () => {
		it('should return missing when verifyParam is null', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await verifySignedRequest(key, '/slots', null);

			expect(result).toEqual({ valid: false, reason: 'missing' });
		});

		it('should return missing when verifyParam is empty string', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await verifySignedRequest(key, '/slots', '');

			expect(result).toEqual({ valid: false, reason: 'missing' });
		});
	});

	describe('malformed parameter', () => {
		it('should return malformed when no separator', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await verifySignedRequest(key, '/slots', 'no-separator-here-all-text');

			expect(result.valid).toBe(false);
			expect(result.reason).toBe('malformed');
		});

		it('should return malformed when timestamp is not a number', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const result = await verifySignedRequest(key, '/slots', 'abc-somemac');

			expect(result).toEqual({ valid: false, reason: 'malformed' });
		});
	});

	describe('invalid MAC', () => {
		it('should return invalid-mac for wrong signature', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const timestamp = Math.floor(Date.now() / 1000);
			const result = await verifySignedRequest(key, '/slots', `${timestamp}-aW52YWxpZC1tYWM=`);

			expect(result).toEqual({ valid: false, reason: 'invalid-mac' });
		});

		it('should return invalid-mac for wrong path', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const verifyParam = await createSignedParam('/slots');

			const result = await verifySignedRequest(key, '/other-path', verifyParam);
			expect(result).toEqual({ valid: false, reason: 'invalid-mac' });
		});

		it('should return invalid-mac for different secret', async () => {
			const signKey = await importSigningKey('secret-a');
			const verifyKey = await importSigningKey('secret-b');

			const verifyParam = await generateSignedParams(signKey, '/slots');
			const result = await verifySignedRequest(verifyKey, '/slots', verifyParam);

			expect(result).toEqual({ valid: false, reason: 'invalid-mac' });
		});
	});

	describe('expired token', () => {
		it('should return expired for old timestamp', async () => {
			const key = await importSigningKey(TEST_SECRET);
			const expiry = getExpiry();

			const oldTimestamp = Math.floor(Date.now() / 1000) - expiry - 10;
			const dataToAuthenticate = `/slots${oldTimestamp}`;
			const mac = await crypto.subtle.sign(
				'HMAC',
				key,
				new TextEncoder().encode(dataToAuthenticate),
			);
			const { Buffer } = await import('node:buffer');
			const base64Mac = Buffer.from(mac).toString('base64');
			const verifyParam = `${oldTimestamp}-${base64Mac}`;

			const result = await verifySignedRequest(key, '/slots', verifyParam);
			expect(result).toEqual({ valid: false, reason: 'expired' });
		});
	});
});
