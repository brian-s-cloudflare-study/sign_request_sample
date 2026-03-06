import { Buffer } from 'node:buffer';

import { getExpiry } from './sign';

const encoder = new TextEncoder();

export interface VerifyResult {
	valid: boolean;
	reason?: 'missing' | 'malformed' | 'invalid-mac' | 'expired';
}

export async function verifySignedRequest(
	key: CryptoKey,
	pathname: string,
	verifyParam: string | null,
): Promise<VerifyResult> {
	if (!verifyParam) {
		return { valid: false, reason: 'missing' };
	}

	const separatorIndex = verifyParam.indexOf('-');
	if (separatorIndex === -1) {
		return { valid: false, reason: 'malformed' };
	}

	const timestamp = verifyParam.slice(0, separatorIndex);
	const hmac = verifyParam.slice(separatorIndex + 1);

	const assertedTimestamp = Number(timestamp);
	if (Number.isNaN(assertedTimestamp)) {
		return { valid: false, reason: 'malformed' };
	}

	const dataToAuthenticate = `${pathname}${assertedTimestamp}`;
	const receivedMac = Buffer.from(hmac, 'base64');

	const verified = await crypto.subtle.verify(
		'HMAC',
		key,
		receivedMac,
		encoder.encode(dataToAuthenticate),
	);

	if (!verified) {
		return { valid: false, reason: 'invalid-mac' };
	}

	if (Date.now() / 1000 > assertedTimestamp + getExpiry()) {
		return { valid: false, reason: 'expired' };
	}

	return { valid: true };
}
