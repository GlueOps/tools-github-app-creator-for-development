// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Version info injected at build time via Docker build args
declare module '$env/static/public' {
	export const PUBLIC_APP_VERSION: string;
	export const PUBLIC_APP_BUILD_SHA_SHORT: string;
	export const PUBLIC_APP_BUILD_SHA_LONG: string;
	export const PUBLIC_APP_BUILD_DATE: string;
}

export {};
