# Security Policy

## Reporting a vulnerability

Do not publish credentials, exploit details, personal data, or other sensitive security information in a public issue.

If GitHub Private Vulnerability Reporting is available in the repository's Security tab, use that private channel. Otherwise, contact the repository owner privately through GitHub before sharing sensitive technical details.

Include the affected component, impact, reproduction steps, and a minimal proof of concept when safe to do so. Never include real secrets or production data.

## Secrets

Never commit passwords, API keys, access tokens, private keys, connection strings, or `.env` files containing real credentials. Use GitHub repository/environment secrets for CI/CD credentials and rotate any credential immediately if it is accidentally committed.

## Supported code

Security fixes are applied to the default branch unless additional supported versions are documented.
