# Security

Report security concerns privately to the HICM Portal administrator. Do not post credentials, complaint evidence, payment proofs, or student documents in public issues.

## Controls

- Encrypted Cloudflare secrets for Groq and staff bootstrap access.
- Salted HMAC-SHA256 staff password verifiers bound to an encrypted server pepper.
- Secure, HttpOnly, SameSite session cookies with server-side revocation.
- Parameterized D1 statements and object-level checks for private files.
- Private R2 bucket access through authenticated Pages Functions.
- Role checks based on persisted account roles.
- Security response headers and no-store private file responses.

## Authentication

Students sign in with matricule and password. Staff sign in with their registered name and password after completing a single-use, expiring D1-backed registration-code flow. Administrators can suspend or delete accounts and revoke their active sessions.

## Secret rotation

Rotate `GROQ_API_KEY` in the Groq console and Cloudflare Pages settings if it is ever exposed. Rotate `STAFF_REGISTRATION_CODE` after staff onboarding. Redeploy after changing Pages secrets.
