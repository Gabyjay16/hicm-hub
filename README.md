# HICM Portal

HICM Portal is a mobile-first university platform deployed on Cloudflare Pages. React and Vite provide the frontend; Pages Functions provide the server API; D1 stores application records and server sessions; private R2 stores lecture notes, evidence, payment proofs, and analysis uploads.

No credentials, votes, application records, or session authority are stored in LocalStorage. The Groq API key is a Cloudflare encrypted secret and is never included in the browser build.

## Current modules

- Role-aware student and staff portal dashboards.
- Student registration and name-plus-matricule login.
- Staff access-code registration with salted, server-peppered password authentication.
- Private lecture-note publication and authenticated student downloads.
- Groq-assisted MCQ draft generation, staff publication, timed student execution, and server-side scoring.
- Announcements, confidential complaints, voting, Lost & Found, General Forum, and paid Plagiarism Test workflow.
- D1-backed records, R2-backed uploads, HttpOnly cookies, audit events, and server-side authorization checks.

Student name-plus-matricule login follows the requested initial workflow but is weaker than a private password or OTP. A future migration should add student passwords or phone OTP while retaining matricule as the account identifier.

## Local setup

```bash
npm install
npm run build
npx wrangler d1 migrations apply hicm-hub-db --local
npx wrangler pages dev dist
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Never commit `.dev.vars`.

## Production

- Build command: `npm run build`
- Output directory: `dist`
- D1 binding: `DB`
- R2 binding: `UPLOADS`
- Production URL: <https://hicm-hub.pages.dev>

See `CLOUDFLARE_SETUP.md` for bindings and secrets. All schema changes are versioned in `migrations/`.

## Groq

The browser calls only authenticated `/api` routes. The Pages Function calls Groq using `GROQ_API_KEY`; generated MCQs are validated, saved as drafts, and require staff publication. If Groq is not configured, development generation uses a clearly identified fallback question set.

## Security notes

- Staff API checks use the account role from D1, never the selected UI view.
- Logout deletes the server session and expires the HttpOnly cookie.
- Private R2 object keys are not returned to students.
- Student quiz payloads omit correct answers before submission.
- Forum messages reject common URL forms on both client and server.
- Originality percentages are never invented by an LLM; the current report explicitly states its limited internal coverage.
