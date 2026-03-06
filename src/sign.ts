import { Buffer } from 'node:buffer';

const encoder = new TextEncoder();
const EXPIRY = 60;

export async function importSigningKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	);
}

export async function generateSignedParams(key: CryptoKey, pathname: string): Promise<string> {
	const timestamp = Math.floor(Date.now() / 1000);
	const dataToAuthenticate = `${pathname}${timestamp}`;
	const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToAuthenticate));
	const base64Mac = Buffer.from(mac).toString('base64');
	return `${timestamp}-${base64Mac}`;
}

export function getExpiry(): number {
	return EXPIRY;
}
