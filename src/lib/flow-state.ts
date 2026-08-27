/**
 * The one place in this app that touches browser storage.
 *
 * Everything kept here is *flow* state: it has to survive the redirect
 * round-trip out to GitHub and back, and it must not outlive the tab. That
 * combination is exactly `sessionStorage`.
 *
 * It is worth a module of its own because picking the wrong one is invisible in
 * review. `glueops-org-name` and `glueops-captain-domain` sat in localStorage
 * for a year, where a finished run's captain domain waited around to shadow the
 * next one — so a second setup in the same browser built its GitHub App with
 * the *previous* cluster's domain, in the app's Homepage URL, Webhook URL and
 * dex Callback URL. Nothing about the call sites looked wrong.
 *
 * So: adding a key here is a decision about lifetime. Make it once, in this
 * file, instead of implicitly at each call site.
 * `scripts/check-storage-access.mjs` keeps it that way.
 */

/** Every key this app stores, and the literal it is stored under. */
const KEYS = {
	phase: 'github-app-phase',
	flow: 'github-app-flow',
	targetOrg: 'github-target-org',
	appSlug: 'github-app-slug',
	installUrl: 'github-app-install-url',
	installationId: 'github-installation-id',
	converted: 'github-app-converted',
	app: 'github-user-app-details',
	lastManifest: 'github-app-last-manifest',
	origin: 'github-app-creator-origin',
	tenantOrgName: 'glueops-org-name',
	captainDomain: 'glueops-captain-domain'
} as const;

export type FlowKey = keyof typeof KEYS;

/** Phases surfaced to the user while a creation flow is in progress. */
export type Phase =
	| 'manifest-generated'
	| 'manifest-posted'
	| 'manifest-get-fallback'
	| 'navigated-to-github'
	| 'converted'
	| 'conversion-error'
	| 'all-complete';

/** Which organization the app is currently being installed into. */
export type InstallFlow = 'user' | 'glueops';

/**
 * sessionStorage is absent during SSR, and *throws on access* — not on use —
 * in a browser with site data blocked. Both must degrade to "no stored state"
 * rather than take the page down.
 */
function store(): Storage | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch (e) {
		console.warn('Browser storage is unavailable; continuing without it:', e);
		return null;
	}
}

export function read(key: FlowKey): string | null {
	return store()?.getItem(KEYS[key]) ?? null;
}

export function write(key: FlowKey, value: string): void {
	store()?.setItem(KEYS[key], value);
}

export function remove(key: FlowKey): void {
	store()?.removeItem(KEYS[key]);
}

export function readJson<T>(key: FlowKey): T | null {
	const raw = read(key);
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as T;
	} catch (e) {
		console.warn(`Discarding unparseable ${KEYS[key]}:`, e);
		return null;
	}
}

export function writeJson(key: FlowKey, value: unknown): void {
	write(key, JSON.stringify(value));
}

/**
 * Drops every key above. Backs "Clear State & Start Over".
 *
 * Deliberately enumerated rather than `sessionStorage.clear()`: this owns its
 * own keys and has no business wiping anything else on the origin.
 */
export function clearAll(): void {
	const s = store();
	if (!s) return;
	for (const name of Object.values(KEYS)) s.removeItem(name);
}

/**
 * The tenant org and captain domain used to live in localStorage, where they
 * outlived the tab. Drop any copies left behind by a version before that fix,
 * so an old value cannot resurface. Safe to delete once no browser in the wild
 * still holds them.
 */
export function purgeLegacyLocalStorage(): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem('glueops-org-name');
		localStorage.removeItem('glueops-captain-domain');
	} catch (e) {
		console.warn('Could not purge legacy storage keys:', e);
	}
}
