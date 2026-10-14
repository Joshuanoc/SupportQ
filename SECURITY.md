# Security Policy

## Reporting a vulnerability

Do not publish credentials, exploit details, personal data, or other sensitive security information in a public issue.

If GitHub Private Vulnerability Reporting is available in the repository's Security tab, use that private channel. Otherwise, contact the repository owner privately through GitHub before sharing sensitive technical details.

Include the affected component, impact, reproduction steps, and a minimal proof of concept when safe to do so. Never include real secrets or production data.

## Secrets

Never commit passwords, API keys, access tokens, private keys, connection strings, or `.env` files containing real credentials. Use GitHub repository/environment secrets for CI/CD credentials and rotate any credential immediately if it is accidentally committed.

## Supported code

Security fixes are applied to the default branch unless additional supported versions are documented.


## Release security controls

Dependency versions and lockfiles are committed. CI installs with `npm ci --ignore-scripts`, blocks high/critical npm advisories, and runs Gitleaks before building for Pages. Actions are pinned to commit SHAs. Secret findings must be reviewed and affected credentials revoked, not merely deleted from the current tree.

Vercel response headers include CSP, anti-framing, MIME sniffing protection, referrer/permissions policies and HSTS. Pages receives a meta CSP but cannot apply the Vercel response-header configuration. Verify actual production headers before release.

Repository workflows alone cannot enforce GitHub branch protections or Vercel Git deployment checks; configure required checks in the hosting/repository settings. No claim is made that live database policies, secret history or deployment settings have passed until their checks complete.

Incident history now lives only in sessionStorage for the current tab. Legacy persistent history is removed on load. Do not enter passwords or confidential incident data. The external Selenium workflow remains post-merge monitoring; the Pages release now gates on local tests, dependency audit and secret scanning.
