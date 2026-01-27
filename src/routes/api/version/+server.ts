import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	PUBLIC_APP_VERSION,
	PUBLIC_APP_BUILD_SHA_SHORT,
	PUBLIC_APP_BUILD_SHA_LONG,
	PUBLIC_APP_BUILD_DATE
} from '$env/static/public';

export const GET: RequestHandler = async () => {
	return json({
		version: PUBLIC_APP_VERSION || 'UNKNOWN',
		sha_short: PUBLIC_APP_BUILD_SHA_SHORT || 'UNKNOWN',
		sha_long: PUBLIC_APP_BUILD_SHA_LONG || 'UNKNOWN',
		build_date: PUBLIC_APP_BUILD_DATE || 'UNKNOWN'
	});
};
