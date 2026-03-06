import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.toml' },
				miniflare: {
					bindings: {
						SECRET_DATA: 'test-secret-key-for-hmac',
						TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
					},
				},
			},
		},
	},
});
