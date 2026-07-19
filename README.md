# HICM Portal

HICM Portal is a mobile-first university platform deployed on Cloudflare Pages. React and Vite provide the frontend; Pages Functions provide the server API; D1 stores application records and server sessions; private R2 stores lecture notes, evidence, payment proofs, and analysis uploads.

No credentials, votes, application records, or session authority are stored in LocalStorage. The Groq API key is a Cloudflare encrypted secret and is never included in the browser build.

## Current modules

- Announcement-only signed-out screen with admin-published image and video media; every portal feature requires authentication.
- Role-aware student and staff portal dashboards with student registration and name-plus-matricule login.
- D1-backed, expiring, single-use staff codes entered in the Matricule field, followed by a dedicated staff registration workflow with salted, server-peppered password authentication.
- Administrator control plane for accounts, staff permissions, access codes, reports, analysis jobs, and audit records.
- Private lecture-note publication, a searchable student library, authenticated downloads, replacement, unpublishing, and deletion.
- Groq-assisted MCQ draft generation, staff publication, timed student execution, and server-side scoring.
- Announcements, persistent notifications, configurable Mark/Bio-Data/Other complaints, voting, Lost & Found, and a General Forum that administrators can suspend or reopen.
- Paid thesis workflow with private R2 files, queued PDF/DOCX extraction, deterministic internal-corpus matching, progress, retries, and source evidence.
- D1-backed records, R2-backed uploads, HttpOnly cookies, audit events, and server-side authorization checks.

Student name-plus-matricule login follows the requested initial workflow but is weaker than a private password or OTP. A future migration should add student passwords or phone OTP while retaining matricule as the account identifier.

## Local setup

```bash
npm install
npm run check
npm run test:e2e
npx wrangler d1 migrations apply hicm-hub-db --local
npx wrangler pages dev dist
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Never commit `.dev.vars`.

## Production

- Build command: `npm run build`
- Output directory: `dist`
- D1 binding: `DB`
- R2 binding: `UPLOADS`
- Queue producer binding: `ANALYSIS_QUEUE`
- Queue consumer Worker: `hicm-hub-analysis`
- Production URL: <https://hicm-hub.pages.dev>

See `CLOUDFLARE_SETUP.md` for bindings and secrets. All schema changes are versioned in `migrations/`.

## Groq

The browser calls only authenticated `/api` routes. The Pages Function calls Groq using `GROQ_API_KEY`; generated MCQs are validated, saved as drafts, and require staff publication. If Groq is not configured, development generation uses a clearly identified fallback question set.

## Security notes

- Staff API checks use the account role from D1, never the selected UI view.
- Logout deletes the server session and expires the HttpOnly cookie.
- Private R2 object keys are not returned to students.
- Student quiz payloads omit correct answers before submission.
- Forum permissions are resolved from D1; links are disabled by channel policy on both client and server.
- Originality percentages are deterministic seven-word shingle overlap measurements. LLM output never controls a score.
- Administrator password changes revoke every other active session.
