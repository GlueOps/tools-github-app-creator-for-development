import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MODULE_REPO = 'GlueOps/terraform-module-cloud-multy-prerequisites';

/**
 * GET /api/module-ref
 * Returns the latest release tag of the terraform-module-cloud-multy-prerequisites
 * repository so the generated HCL block can pin `?ref=` to a current version.
 */
export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`https://api.github.com/repos/${MODULE_REPO}/releases/latest`, {
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': 'GitHub-App-Creator'
			}
		});

		if (!response.ok) {
			throw new Error(`GitHub API responded with ${response.status}`);
		}

		const release = await response.json();
		return json({ ref: release.tag_name, html_url: release.html_url });
	} catch (error) {
		console.error('Error fetching latest module release:', error);
		return json(
			{
				error: 'Failed to fetch latest module release',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 502 }
		);
	}
};
