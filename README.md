# HICM Portal

HICM Portal is a mobile-first university platform deployed on Cloudflare Pages. React and Vite provide the frontend; Pages Functions provide the server API; D1 stores application records and server sessions; private R2 stores lecture notes, evidence, payment proofs, and analysis uploads.

No credentials, votes, application records, or session authority are stored in LocalStorage. The Groq API key is a Cloudflare encrypted secret and is never included in the browser build.

## Current modules

- Announcement-only signed-out screen with admin-published image and video media; every portal feature requires authentication.
- Password-protected student and staff login with optional 30-day remembered sessions and student-only registration.
- Optional admin-managed XLSX/CSV matricule registry, case-insensitive duplicate prevention, and department selection during registration.
- D1-backed, expiring, single-use staff codes entered through the login identifier field, followed by a dedicated staff registration workflow.
- Administrator control plane for account suspension/deletion, forum and announcement permissions, staff access codes, matricule verification, elections, document requests, reports, analysis jobs, and audit records.
- Private lecture-note publication, a searchable student library, authenticated downloads, replacement, unpublishing, and deletion.
- Groq-assisted MCQ draft generation, lecturer-selected timers, resumable server-enforced attempts, participation records, CSV export, and server-side scoring.
- Permission-controlled announcements, persistent notifications, configurable Mark/Bio-Data/Other complaints, admin-managed elections with optional live results, and department-scoped forums that administrators can suspend per channel.
- Student forum usernames, D1-backed compact/standard message sizing, timestamps, long-press actions, private R2 pictures and voice notes, and optional per-recipient view-once delivery.
- Student-created Lost & Found posts with pictures, owner-controlled found status, and automatic deletion one hour after resolution.
- Installable PWA metadata, offline app-shell support, Chromium install prompts, and iPhone/iPad home-screen guidance.
- Student document requests with admin comments and private PDF delivery through authenticated R2 downloads.
- Paid thesis workflow with private R2 files, queued PDF/DOCX extraction, deterministic internal-corpus matching, official admin-published percentages, and staff verification codes.
- D1-backed records, R2-backed uploads, HttpOnly cookies, audit events, and server-side authorization checks.

Passwords are salted and hashed in the Cloudflare backend with a server-only pepper. The browser never stores raw passwords or session authority.

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
