#!/usr/bin/env node
/**
 * Browser storage is a lifetime decision, and getting it wrong does not look
 * wrong at the call site.
 *
 * `glueops-org-name` and `glueops-captain-domain` spent a year in localStorage,
 * where a finished run's captain domain waited to shadow the next one — so a
 * second cluster set up in the same browser got its GitHub App built with the
 * previous cluster's domain. Every individual `localStorage.getItem(...)`
 * looked perfectly reasonable.
 *
 * So exactly one module may reach for web storage; everything else goes through
 * it, and the lifetime question gets answered once, in one reviewable place.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const ALLOWED = join('src', 'lib', 'flow-state.ts');
const STORAGE = /\b(?:localStorage|sessionStorage)\b/;
const COMMENT = /^\s*(?:\/\/|\*|\/\*|<!--)/;

function* sourceFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sourceFiles(path);
		else if (/\.(?:ts|js|svelte)$/.test(entry.name)) yield path;
	}
}

const offenders = [];
for (const file of sourceFiles(ROOT)) {
	if (file === ALLOWED) continue;
	readFileSync(file, 'utf8')
		.split('\n')
		.forEach((line, i) => {
			if (STORAGE.test(line) && !COMMENT.test(line)) {
				offenders.push(`${file}:${i + 1}  ${line.trim()}`);
			}
		});
}

if (offenders.length > 0) {
	console.error(`\nDirect browser-storage access outside ${ALLOWED}:\n`);
	for (const offender of offenders) console.error(`  ${offender}`);
	console.error(
		`\nRoute it through $lib/flow-state instead. That module owns the key names,` +
			`\nand more importantly the lifetime decision behind them — see the note at` +
			`\nthe top of it for what went wrong last time this was decided ad hoc.\n`
	);
	process.exit(1);
}

console.log(`OK: browser storage is confined to ${ALLOWED}`);
