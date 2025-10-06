import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const installation_id = url.searchParams.get('installation_id');
	const setup_action = url.searchParams.get('setup_action');
	
	// Get the correct origin - use a simple fallback to the dev tunnel
	const host = request.headers.get('host');
	let actualOrigin;
	
	// If we see localhost, assume we're behind a dev tunnel and use the tunnel URL
	if (host?.includes('localhost')) {
		actualOrigin = 'https://cb68wgn8-3000.euw.devtunnels.ms';
	} else {
		const protocol = request.headers.get('x-forwarded-proto') || 'https';
		let cleanHost = host;
		if (host?.includes(':')) {
			const parts = host.split(':');
			const lastPart = parts[parts.length - 1];
			if (/^\d+$/.test(lastPart)) {
				cleanHost = parts.slice(0, -1).join(':');
			}
		}
		actualOrigin = `${protocol}://${cleanHost}`;
	}
	
	console.log('OAuth callback - redirecting to:', actualOrigin);
	
	// If we have an installation_id, this is an installation callback
	if (installation_id) {
		const redirectUrl = `${actualOrigin}/?installation_id=${installation_id}${setup_action ? `&setup_action=${setup_action}` : ''}`;
		return redirect(302, redirectUrl);
	}
	
	// If we have a code but no installation_id, this might be a manifest conversion callback
	if (code) {
		const redirectUrl = `${actualOrigin}/?code=${code}${state ? `&state=${state}` : ''}`;
		return redirect(302, redirectUrl);
	}
	
	// No useful parameters, just redirect to home
	return redirect(302, actualOrigin);
};;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, state } = await request.json();
		
		if (!code) {
			return json({ 
				success: false, 
				error: 'Authorization code is required' 
			}, { status: 400 });
		}
		
		console.log('Received OAuth callback with code length:', code.length, 'state:', state);
		
		// Validate code format - GitHub manifest codes are typically long alphanumeric strings
		if (code.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(code)) {
			console.error('Invalid code format:', code);
			return json({ 
				success: false, 
				error: 'Invalid authorization code format' 
			}, { status: 400 });
		}
		
		// Parse state to get organization info for auto-installation
		let stateData = null;
		try {
			if (state) {
				stateData = JSON.parse(atob(state));
				console.log('Parsed state data:', stateData);
			} else {
				console.warn('No state parameter provided in callback - organization info will be missing');
			}
		} catch (e) {
			console.log('Could not parse state parameter:', e);
		}
		
		// Step 1: Convert the code to an access token and get app info
		const conversionUrl = `https://api.github.com/app-manifests/${code}/conversions`;
		console.log('Calling GitHub API:', conversionUrl);
		
		try {
			const response = await fetch(conversionUrl, {
				method: 'POST',
				headers: {
					'Accept': 'application/vnd.github+json',
					'User-Agent': 'GitHub-App-Creator/1.0',
					'X-GitHub-Api-Version': '2022-11-28'
				}
			});
			
			console.log('GitHub API Response status:', response.status);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('GitHub API Error Details:', {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
					url: conversionUrl
				});
				
				// Provide more specific error messages
				let userMessage = `GitHub API Error: ${response.status}`;
				if (response.status === 404) {
					userMessage = 'The authorization code has expired or is invalid. Please try creating the app again.';
				} else if (response.status === 422) {
					userMessage = 'The app manifest is invalid. Please check your configuration and try again.';
				} else if (response.status === 403) {
					userMessage = 'Access denied. Please check your GitHub permissions and try again.';
				}
				
				return json({ 
					success: false, 
					error: userMessage,
					details: errorText 
				}, { status: response.status });
			}
			
			const appData = await response.json();
			console.log('App creation successful. App ID:', appData.id, 'Slug:', appData.slug);
			
			// Extract basic credentials from GitHub's response
			let credentials = {
				installationId: '',
				appId: appData.id?.toString() || '',
				clientId: appData.client_id || '',
				clientSecret: appData.client_secret || '',
				privateKey: appData.pem || '',
				webhookSecret: appData.webhook_secret || '',
				installationInstructions: '',
				installationUrl: ''
			};
			
			// Try to get the organization ID and generate proper installation URL
			if (stateData?.organization && appData.slug) {
				console.log(`Attempting to get organization ID for: ${stateData.organization}`);
				try {
					// Fetch organization details to get the numeric ID
					const orgResponse = await fetch(`https://api.github.com/orgs/${stateData.organization}`, {
						headers: {
							'Accept': 'application/vnd.github+json',
							'User-Agent': 'GitHub-App-Creator',
							'X-GitHub-Api-Version': '2022-11-28'
						}
					});
					
					if (orgResponse.ok) {
						const orgData = await orgResponse.json();
						const orgId = orgData.id;
						console.log(`Successfully fetched organization ID: ${orgId} for ${stateData.organization}`);
						
						// Generate correct installation URL with numeric org ID
						credentials.installationUrl = `https://github.com/apps/${appData.slug}/installations/new/permissions?target_id=${orgId}`;
						credentials.installationInstructions = `Auto-installation URL generated for organization: ${stateData.organization} (ID: ${orgId})
Click the installation URL to automatically install this app to your organization.
After installation, the Installation ID will be available in your app settings.`;
					} else {
						console.warn(`Failed to fetch organization details for ${stateData.organization}. Status: ${orgResponse.status}`);
						// Fallback to general installation URL
						credentials.installationUrl = `https://github.com/apps/${appData.slug}/installations/new`;
						credentials.installationInstructions = `Could not auto-target organization ${stateData.organization}.
Use the installation URL to manually select your organization and install the app.`;
					}
				} catch (orgError) {
					console.error('Error fetching organization:', orgError);
					// Fallback to general installation URL
					credentials.installationUrl = `https://github.com/apps/${appData.slug}/installations/new`;
					credentials.installationInstructions = `Could not auto-target organization ${stateData.organization}.
Use the installation URL to manually select your organization and install the app.`;
				}
			} else {
				console.warn('Missing organization in state data or app slug:', { 
					organization: stateData?.organization, 
					slug: appData.slug,
					fullStateData: stateData 
				});
				// Add instructions for finding the installation ID
				credentials.installationInstructions = `To install and find your Installation ID:
1. Go to https://github.com/apps/${appData.slug || 'your-app'}/installations/new
2. Select your organization/repository to install the app
3. After installation, go to https://github.com/settings/apps/${appData.slug || 'your-app'}
4. Click "Install App" to see installations and get the Installation ID from the URL`;
				
				if (appData.slug) {
					credentials.installationUrl = `https://github.com/apps/${appData.slug}/installations/new`;
				}
			}
			
			return json({ 
				success: true, 
				credentials,
				message: 'App credentials retrieved successfully'
			});
			
		} catch (fetchError) {
			console.error('Error calling GitHub API:', fetchError);
			return json({ 
				success: false, 
				error: 'Failed to communicate with GitHub API' 
			}, { status: 500 });
		}
		
	} catch (error) {
		console.error('Error processing OAuth callback:', error);
		return json({ 
			success: false, 
			error: 'Failed to process OAuth callback' 
		}, { status: 500 });
	}
};