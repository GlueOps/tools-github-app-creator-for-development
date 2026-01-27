<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import {
		PUBLIC_APP_VERSION,
		PUBLIC_APP_BUILD_SHA_SHORT,
		PUBLIC_APP_BUILD_SHA_LONG,
		PUBLIC_APP_BUILD_DATE
	} from '$env/static/public';

	let { children } = $props();

	const version = PUBLIC_APP_VERSION || 'UNKNOWN';
	const shaShort = PUBLIC_APP_BUILD_SHA_SHORT || 'UNKNOWN';
	const shaLong = PUBLIC_APP_BUILD_SHA_LONG || 'UNKNOWN';
	const buildDate = PUBLIC_APP_BUILD_DATE || 'UNKNOWN';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<footer class="version-footer">
	<span>Version: {version}</span>
	<span class="separator">|</span>
	<span title="Full SHA: {shaLong}">SHA: {shaShort}</span>
	<span class="separator">|</span>
	<span>Built: {buildDate}</span>
</footer>

<style>
	.version-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.8);
		color: #888;
		font-size: 0.75rem;
		padding: 0.5rem 1rem;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		font-family: monospace;
		z-index: 1000;
	}

	.separator {
		color: #555;
	}

	.version-footer span[title] {
		cursor: help;
	}
</style>
