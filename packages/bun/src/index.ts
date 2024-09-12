import type { AstroAdapter, AstroIntegration } from 'astro';
import { AstroError } from 'astro/errors';
import type { Options, UserOptions } from './types.js';

export function getAdapter(options: Options): AstroAdapter {
	return {
		name: '@astrojs/bun',
		serverEntrypoint: '@astrojs/bun/server.js',
		previewEntrypoint: '@astrojs/bun/preview.js',
		exports: ['handler', 'startServer', 'options'],
		args: options,
		supportedAstroFeatures: {
			hybridOutput: 'stable',
			staticOutput: 'stable',
			serverOutput: 'stable',
			assets: {
				supportKind: 'stable',
				isSharpCompatible: true,
				isSquooshCompatible: true,
			},
		},
	};
}

async function shouldExternalizeAstroEnvSetup() {
	try {
		await import('astro/env/setup');
		return false;
	} catch {
		return true;
	}
}

export default function createIntegration(userOptions: UserOptions): AstroIntegration {
	if (!userOptions?.mode) {
		throw new AstroError(`Setting the 'mode' option is required.`);
	}

	let _options: Options;
	return {
		name: '@astrojs/bun',
		hooks: {
			'astro:config:setup': async ({ updateConfig, config }) => {
				updateConfig({
					image: {
						endpoint: config.image.endpoint ?? 'astro/assets/endpoint/node',
					},
					vite: {
						ssr: {
							noExternal: ['@astrojs/bun'],
							...((await shouldExternalizeAstroEnvSetup())
								? {
										external: ['astro/env/setup'],
									}
								: {}),
						},
					},
				});
			},
			'astro:config:done': ({ setAdapter, config, logger }) => {
				_options = {
					...userOptions,
					client: config.build.client?.toString(),
					server: config.build.server?.toString(),
					host: config.server.host,
					port: config.server.port,
					assets: config.build.assets,
				};
				setAdapter(getAdapter(_options));

				if (config.output === 'static') {
					logger.warn('`output: "server"` or `output: "hybrid"` is required to use this adapter.');
				}
			},
		},
	};
}
