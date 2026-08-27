export const MODULE_SOURCE_REPO =
	'git::https://github.com/GlueOps/terraform-module-cloud-multy-prerequisites.git//modules/captain-cluster';

export const ADMIN_GITHUB_ORG = 'glueops-rocks';

export interface ClusterModuleInputs {
	environmentName: string;
	moduleRef: string;
	githubOauthAppClientId: string;
	githubOauthAppClientSecret: string;
	githubTenantAppId: string;
	githubTenantAppInstallationId: string;
	githubTenantAppB64encPrivateKey: string;
	adminGithubOrgName: string;
	tenantGithubOrgName: string;
	tenantDeveloperTeam: string;
}

/** Escape a value for use inside an HCL double-quoted string literal. */
export function hclString(value: string): string {
	return (
		'"' +
		String(value)
			.replace(/\\/g, '\\\\')
			.replace(/"/g, '\\"')
			.replace(/\$\{/g, '$${')
			.replace(/%\{/g, '%%{')
			.replace(/\r?\n/g, '\\n') +
		'"'
	);
}

/**
 * The `environment_name` of a cluster is the first DNS label of its captain
 * domain: `<environment_name>.<parent_zone_name>` (see captain-cluster module,
 * generate-gluekube-creds.tf / generate-tenant-readmes.tf).
 */
export function environmentNameFromDomain(captainDomain: string): string {
	return (captainDomain || '').trim().split('.')[0] || '';
}

/**
 * Builds a `module "cluster_<env>"` block for the captain-cluster module of
 * terraform-module-cloud-multy-prerequisites, ready to paste into a tenant repo.
 */
export function buildClusterModuleHcl(i: ClusterModuleInputs): string {
	const adminGroup = `${i.adminGithubOrgName}:super_admins`;
	const tenantGroup = `${i.tenantGithubOrgName}:${i.tenantDeveloperTeam}`;
	const source = `${MODULE_SOURCE_REPO}?ref=${i.moduleRef}`;

	return `module "cluster_${i.environmentName}" {
  source = ${hclString(source)}
  providers = {
    aws.clientaccount = aws.clientaccount
    aws.primaryregion = aws.primaryregion
    aws.replicaregion = aws.replicaregion
  }
  tenant         = module.tenant_base.captain_cluster_inputs
  tenant_secrets = module.tenant_base.captain_cluster_secrets
  cluster_environments = [
    {
      environment_name                     = ${hclString(i.environmentName)}
      kubeadm_cluster                      = false
      host_network_enabled                 = true
      nginx_enable_public_lb               = true
      github_oauth_app_client_id           = ${hclString(i.githubOauthAppClientId)}
      github_oauth_app_client_secret       = ${hclString(i.githubOauthAppClientSecret)}
      github_tenant_app_id                 = ${hclString(i.githubTenantAppId)}
      github_tenant_app_installation_id    = ${hclString(i.githubTenantAppInstallationId)}
      github_tenant_app_b64enc_private_key = ${hclString(i.githubTenantAppB64encPrivateKey)}
      admin_github_org_name                = ${hclString(i.adminGithubOrgName)}
      tenant_github_org_name               = ${hclString(i.tenantGithubOrgName)}

      vault_github_org_team_policy_mappings = [
        {
          oidc_groups = [${hclString(adminGroup)}]
          policy_name = "editor"
        },
        {
          oidc_groups = [${hclString(adminGroup)}, ${hclString(tenantGroup)}]
          policy_name = "reader"
        }
      ]
      argocd_rbac_policies = <<EOT
      g, ${adminGroup}, role:admin
EOT
    }
  ]
}
`;
}
