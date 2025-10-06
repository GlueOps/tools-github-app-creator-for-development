import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();
		
		console.log('=== CREATE CLUSTER REQUEST ===');
		console.log('Timestamp:', new Date().toISOString());
		console.log('Full Payload:', JSON.stringify(payload, null, 2));
		
		// Log individual components for easier debugging
		console.log('--- GitHub App Details ---');
		console.log('App ID:', payload.app_id);
		console.log('App Slug:', payload.app_slug);
		console.log('Client ID:', payload.client_id);
		console.log('Has Client Secret:', Boolean(payload.client_secret));
		console.log('Has Webhook Secret:', Boolean(payload.webhook_secret));
		console.log('Has Private Key:', Boolean(payload.private_key_pem));
		console.log('Has Base64 Key:', Boolean(payload.private_key_base64));
		
		console.log('--- Installation Details ---');
		if (payload.installations) {
			console.log('User Org Installation:', payload.installations.user_org);
			console.log('GlueOps Installation:', payload.installations.glueops_rocks);
		}
		
		console.log('--- Additional Context ---');
		console.log('Captain Domain:', payload.captain_domain);
		console.log('User Organization:', payload.user_organization);
		
		// Mock response for now - in the future this will call your private API
		const mockResponse = {
			success: true,
			cluster_id: `cluster-${Date.now()}`,
			status: 'pending',
			message: 'Cluster creation initiated successfully',
			details: {
				github_app_configured: true,
				installations_verified: payload.installations ? 
					Object.keys(payload.installations).length : 0,
				estimated_completion: '5-10 minutes'
			}
		};
		
		console.log('--- Mock Response ---');
		console.log(JSON.stringify(mockResponse, null, 2));
		console.log('=== END CREATE CLUSTER REQUEST ===');
		
		return json(mockResponse);
		
	} catch (error) {
		console.error('Error processing create cluster request:', error);
		return json({ 
			success: false,
			error: 'Failed to process cluster creation request',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
};