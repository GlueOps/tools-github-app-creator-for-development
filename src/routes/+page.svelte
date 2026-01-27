<script lang="ts">
	import { onMount } from 'svelte';
	import manifestTemplate from '$lib/manifest-template.json';

	let captainDomain = '';
	let organizationName = '';
	let currentOrigin = '';
	let converting = false;
	let installManagementUrl = '';
	let directInstallUrl = '';
	let lastInstallationId = '';
	let currentPhase = '';
	let showFinalDetails = false;
	let isInActiveFlow = false;
	let showClearConfirm = false;
	let isInitialized = false;
	
	// Multi-app support - now single app with dual installations
	let userOrgApp: any = null;
	let currentAppFlow = 'glueops'; // Start with 'glueops' now
	let bothAppsComplete = false;
	
	// Redirect countdown state
	let redirectCountdown = 0;
	let redirectMessage = '';

	// Check for active flow IMMEDIATELY to prevent form flashing
	if (typeof window !== 'undefined') {
		const storedPhase = sessionStorage.getItem('github-app-phase');
		const storedUserApp = sessionStorage.getItem('github-user-app-details');
		const storedInstallation = sessionStorage.getItem('github-installation-id');
		const storedFlow = sessionStorage.getItem('github-app-flow');
		
		if (storedPhase || storedUserApp || storedInstallation) {
			isInActiveFlow = true;
		}
		
		// Pre-load all critical state synchronously
		if (storedPhase) {
			currentPhase = storedPhase;
		}
		if (storedFlow) {
			currentAppFlow = storedFlow;
		}
		if (storedUserApp) {
			try {
				userOrgApp = JSON.parse(storedUserApp);
			} catch (e) {
				console.warn('Failed to parse stored user app details:', e);
			}
		}
		if (storedInstallation) {
			lastInstallationId = storedInstallation;
		}
		
		// Check if dual installation is complete
		if (userOrgApp && userOrgApp.user_installation_id && userOrgApp.glueops_installation_id) {
			bothAppsComplete = true;
			showFinalDetails = true;
		}
	}

	onMount(() => {
		currentOrigin = window.location.origin;
		
		// Store the current origin in session storage for callbacks
		sessionStorage.setItem('github-app-creator-origin', currentOrigin);
		
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const installationId = params.get('installation_id');
		const setupAction = params.get('setup_action');
		const error = params.get('error');
		const errorDetails = params.get('details');
		const storedPhase = sessionStorage.getItem('github-app-phase');
		const storedInstallUrl = sessionStorage.getItem('github-app-install-url');
		const storedSlug = sessionStorage.getItem('github-app-slug');
		const storedInstallation = sessionStorage.getItem('github-installation-id');

		// Handle errors
		if (error) {
			console.error('Callback error:', error, errorDetails);
			alert(`Callback Error: ${error}${errorDetails ? '\nDetails: ' + decodeURIComponent(errorDetails) : ''}`);
		}

		// Load remaining URL-based data
		if (storedInstallUrl) {
			installManagementUrl = storedInstallUrl;
		}
		if (storedSlug) {
			directInstallUrl = `https://github.com/apps/${storedSlug}/installations/select_target`;
		}

		// Never auto-clear state - always require user confirmation

		if (installationId) {
			console.group('GitHub App Installation Return');
			console.log('Setup action:', setupAction ?? '(none)');
			console.log('Installation ID:', installationId);
			
			const currentFlow = sessionStorage.getItem('github-app-flow') || 'user';
			console.log('Current installation flow:', currentFlow);
			
			// Store installation ID for the current organization
			if (currentFlow === 'glueops') {
				// First installation - glueops-rocks organization
				if (userOrgApp) {
					userOrgApp.glueops_installation_id = installationId;
					sessionStorage.setItem('github-user-app-details', JSON.stringify(userOrgApp));
				}
				console.log('GlueOps organization installation complete');
				
				// Now install the same app in user's organization
				const userOrgName = localStorage.getItem('glueops-org-name');
				console.log(`Redirecting to install in user organization: ${userOrgName}...`);
				sessionStorage.setItem('github-app-flow', 'user');
				
				// Get the user's organization ID first, then start countdown
				const appSlug = userOrgApp?.slug;
				if (appSlug && userOrgName) {
					try {
						console.log(`Fetching ${userOrgName} organization ID...`);
						const orgResponse = await fetch(`/api/get-org-id?org=${userOrgName}`);
						
						let targetUrl: string;
						if (orgResponse.ok) {
							const orgData = await orgResponse.json();
							console.log(`Found ${userOrgName} org ID:`, orgData.id);
							targetUrl = `https://github.com/apps/${appSlug}/installations/new/permissions?target_id=${orgData.id}&target_type=Organization`;
						} else {
							console.warn('Could not fetch org ID, falling back to selection page');
							targetUrl = `https://github.com/apps/${appSlug}/installations/select_target`;
						}
						
						// Start 10 second countdown before redirect
						redirectMessage = `Redirecting to install in ${userOrgName}...`;
						redirectCountdown = 10;
						const countdownInterval = setInterval(() => {
							redirectCountdown--;
							if (redirectCountdown <= 0) {
								clearInterval(countdownInterval);
								console.log(`Redirecting to ${userOrgName} install:`, targetUrl);
								window.location.href = targetUrl;
							}
						}, 1000);
					} catch (error) {
						console.error('Error fetching org ID:', error);
						console.log('Falling back to target selection page');
						const fallbackUrl = `https://github.com/apps/${appSlug}/installations/select_target`;
						window.location.href = fallbackUrl;
					}
				}
				
			} else {
				// Second installation - user's organization
				if (userOrgApp) {
					userOrgApp.user_installation_id = installationId;
					sessionStorage.setItem('github-user-app-details', JSON.stringify(userOrgApp));
				}
				console.log('User organization installation complete');
				
				// Both installations are now complete
				bothAppsComplete = true;
				showFinalDetails = true;
				sessionStorage.setItem('github-app-phase', 'all-complete');
				currentPhase = 'all-complete';
				
				// Generate final summary for single app with dual installations
				console.log('=== FINAL DUAL INSTALLATION SUMMARY (JSON) ===');
				const dualInstallSummary = {
					app_id: userOrgApp.id,
					client_id: userOrgApp.client_id,
					client_secret: userOrgApp.client_secret,
					webhook_secret: userOrgApp.webhook_secret,
					private_key_pem: userOrgApp.pem,
					private_key_base64: btoa(userOrgApp.pem),
					app_slug: userOrgApp.slug,
					installations: {
						user_org: {
							organization: localStorage.getItem('glueops-org-name'),
							installation_id: userOrgApp.user_installation_id,
							management_url: `https://github.com/organizations/${localStorage.getItem('glueops-org-name')}/settings/installations/${userOrgApp.user_installation_id}`
						},
						glueops_rocks: {
							organization: 'glueops-rocks',
							installation_id: userOrgApp.glueops_installation_id,
							app_config_url: `https://github.com/organizations/glueops-rocks/settings/apps/${userOrgApp.slug}`
						}
					}
				};
				console.log(JSON.stringify(dualInstallSummary, null, 2));
				console.log('=== END DUAL INSTALLATION SUMMARY ===');
			}
			
			sessionStorage.setItem('github-installation-id', installationId);
			lastInstallationId = installationId;
			
			console.groupEnd();
			window.history.replaceState({}, document.title, '/');
		}

		if (code) {
			console.group('GitHub App Manifest Flow');
			console.log('Returned from GitHub with manifest code:', code);
			const orgName = localStorage.getItem('glueops-org-name');
			const domain = localStorage.getItem('glueops-captain-domain');
			console.log('Stored organization:', orgName);
			console.log('Stored captain domain:', domain);

			if (!sessionStorage.getItem('github-app-converted')) {
				convertManifest(code);
			} else {
				console.log('Conversion already performed in this session; skipping duplicate call.');
			}

			// clean query params for nicer URL once we kick off conversion
			window.history.replaceState({}, document.title, '/');
			console.groupEnd();
		}
		
		// Mark as fully initialized after all state is loaded
		isInitialized = true;
	});

	function buildManifest(targetOrg?: string) {
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
		const orgPrefix = targetOrg === 'glueops-rocks' ? 'glueops-rocks' : 'glueops';
		const appName = `${orgPrefix}-${today}-${randomSuffix}`;
		
		// Use stored captain domain to ensure consistency
		const storedDomain = localStorage.getItem('glueops-captain-domain') || captainDomain;
		
		console.log('Building manifest with domain:', storedDomain, 'for org:', targetOrg || 'user');

		return {
			...manifestTemplate,
			name: appName,
			url: `https://dex.${storedDomain}`,
			hook_attributes: {
				url: `https://${storedDomain}/webhook`,
				active: false
			},
			redirect_url: currentOrigin,
			callback_urls: [
				`${currentOrigin}/api/auth/callback`,
				`https://dex.${storedDomain}/callback`
			],
			setup_url: currentOrigin
		};
	}

	function submitManifestViaPost(manifest: string, org: string) {
		console.log('Attempting POST form submission of manifest to GitHub...');
		
		// Store which organization this is for
		sessionStorage.setItem('github-app-flow', currentAppFlow);
		sessionStorage.setItem('github-target-org', org);

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = `https://github.com/organizations/${org}/settings/apps/new`;
		form.style.display = 'none';

		// Add manifest input
		const manifestInput = document.createElement('input');
		manifestInput.type = 'hidden';
		manifestInput.name = 'manifest';
		manifestInput.value = manifest;
		form.appendChild(manifestInput);

		// Add state parameter with user's organization info
		// This is critical for the callback to know where to redirect after installation
		const stateData = {
			organization: organizationName, // The user's target organization
			flow: currentAppFlow,
			captainDomain: captainDomain
		};
		const stateInput = document.createElement('input');
		stateInput.type = 'hidden';
		stateInput.name = 'state';
		stateInput.value = btoa(JSON.stringify(stateData));
		form.appendChild(stateInput);

		document.body.appendChild(form);
		form.submit();

		return form;
	}

	function startCreation() {
		if (!captainDomain || !organizationName) {
			console.warn('Captain domain and organization are required to start manifest flow.');
			return;
		}

		// Start with glueops-rocks organization first
		currentAppFlow = 'glueops';
		createAppForOrganization('glueops-rocks', 'glueops');
	}
	
	function createAppForOrganization(orgName: string, flowType: 'user' | 'glueops') {
		const manifestObj = buildManifest(orgName);
		isInActiveFlow = true;
		console.group(`GitHub App Manifest Flow - ${flowType === 'user' ? 'User Org' : 'GlueOps'}`);
		console.log('Generated manifest JSON:', manifestObj);

		// Always store the user's organization and captain domain for dual installation flow
		// We need this info regardless of which organization we're creating the app for first
		localStorage.setItem('glueops-org-name', organizationName);
		localStorage.setItem('glueops-captain-domain', captainDomain);
		console.log('Stored user organization for dual installation:', organizationName);
		
		sessionStorage.setItem('github-app-phase', 'manifest-generated');
		sessionStorage.setItem('github-app-flow', flowType);
		currentPhase = 'manifest-generated';
		currentAppFlow = flowType;
		
		// Clear previous app data for this flow
		if (flowType === 'user') {
			sessionStorage.removeItem('github-user-app-details');
		} else {
			sessionStorage.removeItem('github-glueops-app-details');
		}
		
		sessionStorage.removeItem('github-app-converted');
		sessionStorage.removeItem('github-installation-id');
		sessionStorage.removeItem('github-app-install-url');
		sessionStorage.removeItem('github-app-slug');
		sessionStorage.setItem('github-app-last-manifest', JSON.stringify(manifestObj));

		const manifestJson = JSON.stringify(manifestObj);
		const postForm = submitManifestViaPost(manifestJson, orgName);
		sessionStorage.setItem('github-app-phase', 'manifest-posted');
		currentPhase = 'manifest-posted';

		const fallbackTimeout = window.setTimeout(() => {
			console.warn('POST submission did not navigate quickly; falling back to GET query parameter approach.');
			sessionStorage.setItem('github-app-phase', 'manifest-get-fallback');
			currentPhase = 'manifest-get-fallback';
			
			// Include state parameter in fallback approach as well
			const stateData = {
				organization: organizationName, // The user's target organization
				flow: currentAppFlow,
				captainDomain: captainDomain
			};
			const stateEncoded = encodeURIComponent(btoa(JSON.stringify(stateData)));
			const manifestEncoded = encodeURIComponent(manifestJson);
			window.location.href = `https://github.com/organizations/${orgName}/settings/apps/new?manifest=${manifestEncoded}&state=${stateEncoded}`;
		}, 2000);

		const clearFallback = () => {
			clearTimeout(fallbackTimeout);
			postForm.remove();
			document.removeEventListener('visibilitychange', clearFallback);
			window.removeEventListener('pagehide', clearFallback);
		};

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				console.log('Page becoming hidden; assuming navigation succeeded.');
				sessionStorage.setItem('github-app-phase', 'navigated-to-github');
				currentPhase = 'navigated-to-github';
				clearFallback();
			}
		});

		window.addEventListener('pagehide', clearFallback, { once: true });
		console.groupEnd();
	}

	async function convertManifest(code: string) {
		try {
			converting = true;
			console.log('Converting manifest code via /api/convert-manifest ...');
			const resp = await fetch('/api/convert-manifest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});

			if (!resp.ok) {
				const txt = await resp.text();
				console.error('Manifest conversion failed', resp.status, txt);
				return;
			}

			const data = await resp.json();
			const currentFlow = sessionStorage.getItem('github-app-flow') || 'user';
			
			sessionStorage.setItem('github-app-phase', 'converted');
			currentPhase = 'converted';
			console.group(`GitHub App Conversion Result - ${currentFlow === 'user' ? 'User Org' : 'GlueOps'}`);
			console.log('App ID:', data.id);
			console.log('Slug:', data.slug);
			console.log('Client ID:', data.client_id);
			console.log('Client Secret present:', Boolean(data.client_secret));
			console.log('Webhook Secret present:', Boolean(data.webhook_secret));
			if (data.pem) {
				console.log('PEM preview:', data.pem.substring(0, 100) + '...');
			}
			console.log('Owner info:', data.owner);
			
			// Store the app details - single app for dual installation
			if (currentFlow === 'glueops') {
				// First creation in glueops-rocks
				userOrgApp = data;
				sessionStorage.setItem('github-user-app-details', JSON.stringify(data));
			}
			
			const orgName = currentFlow === 'user' ? 
				(localStorage.getItem('glueops-org-name') ?? data.owner?.login) :
				'glueops-rocks';
				
			if (data.slug && orgName) {
				const installUrl = `https://github.com/organizations/${orgName}/settings/apps/${data.slug}/installations`;
				sessionStorage.setItem('github-app-install-url', installUrl);
				sessionStorage.setItem('github-app-slug', data.slug);
				installManagementUrl = installUrl;
				directInstallUrl = `https://github.com/apps/${data.slug}/installations/select_target`;
				console.log('Install / manage URL for this app:', installUrl);
				console.log('Direct install URL:', `https://github.com/apps/${data.slug}/installations/select_target`);
			}
			
			const existingInstallation = sessionStorage.getItem('github-installation-id');
			if (existingInstallation) {
				lastInstallationId = existingInstallation;
			}
			console.log('Stored installation ID:', existingInstallation ?? '(not installed yet)');
			console.groupEnd();

			sessionStorage.setItem('github-app-converted', 'true');
			isInActiveFlow = true;
			
			// Redirect to install flow with direct organization targeting after countdown
			if (data.slug && orgName) {
				// Use organization ID from the owner data if available for direct install
				const orgId = data.owner?.id;
				let autoInstallUrl;
				
				if (orgId) {
					autoInstallUrl = `https://github.com/apps/${data.slug}/installations/new/permissions?target_id=${orgId}&target_type=Organization`;
					console.log('Redirecting to direct organization install:', autoInstallUrl);
				} else {
					autoInstallUrl = `https://github.com/apps/${data.slug}/installations/select_target`;
					console.log('Organization ID not available, redirecting to selection page:', autoInstallUrl);
				}
				
				// Start 10 second countdown before redirect
				redirectMessage = `Redirecting to install in ${orgName}...`;
				redirectCountdown = 10;
				const countdownInterval = setInterval(() => {
					redirectCountdown--;
					if (redirectCountdown <= 0) {
						clearInterval(countdownInterval);
						window.location.href = autoInstallUrl;
					}
				}, 1000);
			}
		} catch (error) {
			console.error('Error converting manifest code:', error);
			sessionStorage.setItem('github-app-phase', 'conversion-error');
			currentPhase = 'conversion-error';
		} finally {
			converting = false;
		}
	}
</script>

<svelte:head>
	<title>GitHub App Creator - Manifest Flow</title>
</svelte:head>

{#if !isInitialized}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else}
<div class="container">
	<header>
		<h1>GitHub App Manifest Flow</h1>
		<p class="subtitle">Enter org + captain domain. Everything else handled automatically. Watch console for results.</p>
	</header>

	<div class="form-section" style:display={(isInActiveFlow || converting) ? 'none' : 'block'}>
		<form on:submit|preventDefault={startCreation}>
			<div class="form-group">
				<label for="captainDomainInput">Captain Domain *</label>
				<input id="captainDomainInput" name="captainDomain" bind:value={captainDomain} placeholder="nonprod.footbar.onglueops.rocks" required />
			</div>
			<div class="form-group">
				<label for="organizationInput">GitHub Organization *</label>
				<input id="organizationInput" name="organization" bind:value={organizationName} placeholder="tenant organization (e.g. development-tenant-foobar)" required />
			</div>
			<button type="submit" disabled={converting}>{converting ? 'Converting...' : 'Create via Manifest'}</button>
		</form>
	</div>

	{#if isInActiveFlow && !showFinalDetails && !showClearConfirm}
		<section class="active-flow-notice">
			<h2>⏳ Active Flow in Progress</h2>
			<p>You have an active GitHub app creation flow. Complete it or clear the state to start fresh.</p>
			<button type="button" class="clear-state-btn" on:click={() => showClearConfirm = true}>
				Clear State & Start Over
			</button>
		</section>
	{/if}

	{#if showClearConfirm}
		<section class="confirm-panel">
			<h2>⚠️ Confirm Clear State</h2>
			<p>This will permanently delete any stored app credentials and reset the flow. Are you sure?</p>
			<div class="button-group">
				<button type="button" class="confirm-btn" on:click={() => {
					sessionStorage.clear();
					localStorage.removeItem('glueops-org-name');
					localStorage.removeItem('glueops-captain-domain');
					console.log('Storage cleared by user confirmation.');
					showFinalDetails = false;
					userOrgApp = null;
					bothAppsComplete = false;
					currentAppFlow = 'user';
					isInActiveFlow = false;
					showClearConfirm = false;
					currentPhase = '';
					lastInstallationId = '';
					installManagementUrl = '';
					directInstallUrl = '';
				}}>Yes, Clear Everything</button>
				<button type="button" class="cancel-btn" on:click={() => showClearConfirm = false}>Cancel</button>
			</div>
		</section>
	{/if}

	{#if redirectCountdown > 0}
		<section class="redirect-countdown-panel">
			<h2>⏳ {redirectMessage}</h2>
			<p class="countdown-text">Redirecting in <strong>{redirectCountdown}</strong> seconds...</p>
			<div class="countdown-spinner"></div>
		</section>
	{:else if bothAppsComplete && userOrgApp}
		<section class="credentials-panel">
			<h2>🎉 GitHub Apps Created!</h2>
			
			<!-- App Credentials -->
			<h3>📋 App Credentials</h3>
			<div class="credential-grid">
				<div class="credential-item">
					<strong>App ID:</strong>
					<code>{userOrgApp.id}</code>
				</div>
				<div class="credential-item">
					<strong>App Slug:</strong>
					<code>{userOrgApp.slug}</code>
				</div>
				<div class="credential-item">
					<strong>Client ID:</strong>
					<code>{userOrgApp.client_id}</code>
				</div>
				<div class="credential-item">
					<strong>Client Secret:</strong>
					<code class="secret">{userOrgApp.client_secret}</code>
				</div>
			</div>
			
			<!-- Installation Details -->
			<h3>🏢 Installation Details</h3>
			<div class="credential-grid">
				<div class="credential-item">
					<strong>{localStorage.getItem('glueops-org-name')} Installation ID:</strong>
					<code>{userOrgApp.user_installation_id || 'Pending...'}</code>
				</div>
				<div class="credential-item full-width">
					<strong>Manage installation in {localStorage.getItem('glueops-org-name')}:</strong>
					{#if userOrgApp.user_installation_id}
						<a href="https://github.com/organizations/{localStorage.getItem('glueops-org-name')}/settings/installations/{userOrgApp.user_installation_id}" target="_blank" rel="noreferrer" class="app-link">
							Manage installation in {localStorage.getItem('glueops-org-name')}
						</a>
					{:else}
						<span class="pending">Pending...</span>
					{/if}
				</div>
				<div class="credential-item full-width">
					<strong>App config in glueops-rocks:</strong>
					<a href="https://github.com/organizations/glueops-rocks/settings/apps/{userOrgApp.slug}" target="_blank" rel="noreferrer" class="app-link">
						Manage {userOrgApp.slug} app config
					</a>
				</div>
			</div>
			
			<p class="note">All credentials and installation details are also logged to the console. Store these securely!</p>
			
			<div class="action-buttons">
				<button type="button" class="cleanup-btn" on:click={() => showClearConfirm = true}>Clear Storage & Reset</button>
			</div>
		</section>
	{:else if installManagementUrl || directInstallUrl || lastInstallationId}
		<section class="status-panel">
			{#if currentPhase}
				<p class="status-line"><strong>Current phase:</strong> {currentPhase}</p>
			{/if}
			{#if installManagementUrl}
				<p class="status-line">
					<strong>Manage app:</strong>
					<a href={installManagementUrl} target="_blank" rel="noreferrer">Open organization install page</a>
				</p>
			{/if}
			{#if directInstallUrl}
				<p class="status-line">
					<strong>Install to repositories:</strong>
					<a href={directInstallUrl} target="_blank" rel="noreferrer">Launch GitHub install flow</a>
				</p>
			{/if}
			{#if lastInstallationId}
				<p class="status-line"><strong>Installation ID:</strong> {lastInstallationId}</p>
			{/if}
		</section>
	{/if}
</div>
{/if}

<style>
	:global(body){margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#e6edf3}
	.container{max-width:820px;margin:0 auto;padding:2rem}
	header{text-align:center;margin-bottom:2rem}
	h1{margin:0 0 .5rem 0;font-size:2rem}
	.subtitle{opacity:.7;font-size:.9rem}
	.form-section{background:#161b22;padding:1.5rem 1.75rem;border:1px solid #30363d;border-radius:10px}
	.form-group{margin-bottom:1rem}
	label{display:block;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem;color:#9da7b1}
	input{width:100%;padding:.65rem .75rem;border:1px solid #30363d;border-radius:6px;background:#0d1117;color:#e6edf3;font-size:.95rem}
	input:focus{outline:2px solid #1f6feb;border-color:#1f6feb}
	button{width:100%;padding:.9rem 1.2rem;border:none;border-radius:6px;background:#238636;color:#fff;font-weight:600;cursor:pointer;font-size:.95rem;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;transition:background .15s}
	button:hover{background:#2ea043}
	button:disabled{opacity:.55;cursor:progress}
	.status-panel{margin-top:1.5rem;background:#111820;border:1px solid #30363d;border-radius:8px;padding:1rem 1.25rem;font-size:.9rem}
	.status-line{margin:.35rem 0}
	.status-line a{color:#58a6ff;text-decoration:none}
	.status-line a:hover{text-decoration:underline}
	.credentials-panel{margin-top:1.5rem;background:#0d1117;border:2px solid #238636;border-radius:8px;padding:1.5rem}
	.credentials-panel h2{margin:0 0 1rem 0;color:#7c3aed;font-size:1.4rem}
	.credential-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
	.credential-item{display:flex;flex-direction:column;gap:.25rem}
	.credential-item.full-width{grid-column:1/-1}
	.credential-item strong{font-size:.85rem;color:#7d8590;text-transform:uppercase;letter-spacing:.05em}
	.credential-item code{background:#21262d;border:1px solid #30363d;border-radius:4px;padding:.5rem;font-family:Menlo,Consolas,monospace;font-size:.8rem;word-break:break-all}
	.credential-item code.secret{background:#2d1b1e;border-color:#8b949e}
	.credential-item textarea{background:#21262d;border:1px solid #30363d;border-radius:4px;padding:.5rem;font-family:Menlo,Consolas,monospace;font-size:.7rem;color:#e6edf3;resize:vertical;width:100%}
	.credential-item .app-link{background:#238636;color:#fff;padding:.5rem 1rem;border-radius:6px;text-decoration:none;font-size:.85rem;font-weight:500;display:inline-block;margin-top:.25rem}
	.credential-item .app-link:hover{background:#2ea043;text-decoration:none}
	.note{margin:.5rem 0 0 0;font-size:.8rem;color:#7d8590;font-style:italic}
	.action-buttons{display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap}
	.cleanup-btn{margin-top:0;padding:1rem 2rem;background:#da3633;color:#fff;border:none;border-radius:6px;font-size:1.1rem;cursor:pointer;width:100%;font-weight:600}
	.cleanup-btn:hover{background:#b62b28}
	.redirect-countdown-panel{margin-top:1.5rem;background:#1c2128;border:2px solid #58a6ff;border-radius:8px;padding:2rem;text-align:center}
	.redirect-countdown-panel h2{margin:0 0 1rem 0;color:#58a6ff;font-size:1.3rem}
	.countdown-text{font-size:1.1rem;color:#e6edf3;margin:.5rem 0}
	.countdown-text strong{font-size:1.5rem;color:#58a6ff}
	.countdown-spinner{width:50px;height:50px;border:4px solid #30363d;border-top:4px solid #58a6ff;border-radius:50%;animation:spin 1s linear infinite;margin:1rem auto 0}
	.active-flow-notice{margin-top:1.5rem;background:#1c2128;border:2px solid #d29922;border-radius:8px;padding:1.5rem;text-align:center}
	.active-flow-notice h2{margin:0 0 .5rem 0;color:#d29922;font-size:1.2rem}
	.active-flow-notice p{margin:.5rem 0 1rem 0;color:#9da7b1}
	.clear-state-btn{padding:.7rem 1.2rem;background:#da3633;color:#fff;border:none;border-radius:6px;font-size:.9rem;cursor:pointer;font-weight:500}
	.clear-state-btn:hover{background:#b62b28}
	.confirm-panel{margin-top:1.5rem;background:#1c2128;border:2px solid #da3633;border-radius:8px;padding:1.5rem;text-align:center}
	.confirm-panel h2{margin:0 0 .5rem 0;color:#da3633;font-size:1.2rem}
	.confirm-panel p{margin:.5rem 0 1.5rem 0;color:#9da7b1}
	.button-group{display:flex;gap:1rem;justify-content:center}
	.confirm-btn{padding:.7rem 1.2rem;background:#da3633;color:#fff;border:none;border-radius:6px;font-size:.9rem;cursor:pointer;font-weight:500}
	.confirm-btn:hover{background:#b62b28}
	.cancel-btn{padding:.7rem 1.2rem;background:#6e7681;color:#fff;border:none;border-radius:6px;font-size:.9rem;cursor:pointer;font-weight:500}
	.cancel-btn:hover{background:#56606d}
	.loading-container{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:1rem}
	.loading-spinner{width:40px;height:40px;border:4px solid #30363d;border-top:4px solid #58a6ff;border-radius:50%;animation:spin 1s linear infinite}
	@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
	.loading-container p{color:#7d8590;font-size:.9rem}
</style>
