import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const orgName = url.searchParams.get('org');
	
	if (!orgName) {
		return json({ error: 'Organization name is required' }, { status: 400 });
	}

	try {
		console.log(`Fetching organization ID for: ${orgName}`);
		
		// GitHub API call to get organization details
		const response = await fetch(`https://api.github.com/orgs/${orgName}`, {
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'GitHub-App-Creator'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return json({ error: `Organization '${orgName}' not found` }, { status: 404 });
			}
			throw new Error(`GitHub API responded with ${response.status}`);
		}

		const orgData = await response.json();
		
		console.log(`Found organization '${orgName}' with ID: ${orgData.id}`);
		
		return json({
			id: orgData.id,
			login: orgData.login,
			name: orgData.name,
			html_url: orgData.html_url
		});

	} catch (error) {
		console.error('Error fetching organization ID:', error);
		return json({ 
			error: 'Failed to fetch organization details',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
};