# HICM HUB

HICM HUB is a production-ready university portal built with React, Vite, Tailwind CSS, React Router, Lucide icons, and Cloudflare Pages Functions.

The application does not use LocalStorage for persistence. Sessions and application data are stored through Cloudflare-native services:

- Cloudflare D1 for users, sessions, announcements, complaints, quizzes, votes, lost/found records, forum messages, and thesis approval state.
- Cloudflare R2 for complaint proof files, payment screenshots, lecture notes, and thesis uploads.
- HttpOnly cookies for active user sessions.

## Features

- Sticky responsive navigation with Academics, Student Services, and Campus Life dropdowns.
- Login/Register modal with separate Student and Staff tabs.
- Student/Staff testing role switch persisted in the server session.
- Announcements board with staff posting.
- Complaints desk with confidential sexual harassment category and proof upload.
- AI quiz generation simulation and timed student quiz execution with auto-submit.
- Student voting with one vote per matricule.
- Lost & Found visual feed with LOST/FOUND filters.
- Categorized chat forums for General, Level-200, Level-300, and Level-400.
- Premium thesis workflow with payment screenshot approval and simulated analysis dashboard.

## Cloudflare Setup

Install dependencies:

```bash
npm install
```

Create Cloudflare resources:

```bash
npm run cf:db:create
npm run cf:r2:create
```

Copy the generated D1 database id into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hicm-hub-db"
database_id = "YOUR_REAL_D1_DATABASE_ID"
```

Apply migrations:

```bash
npm run cf:db:migrate
```

Run locally with Cloudflare bindings:

```bash
npx wrangler pages dev dist --d1 DB=hicm-hub-db --r2 UPLOADS=hicm-hub-uploads
```

For normal frontend development:

```bash
npm run dev
```

Build for Cloudflare Pages:

```bash
npm run build
```

Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`
- D1 binding: `DB`
- R2 binding: `UPLOADS`

## GitHub Deployment Flow

Create a GitHub repository, commit these files, then connect the repository in Cloudflare Pages.

```bash
git init
git add .
git commit -m "Build HICM HUB Cloudflare app"
git branch -M main
git remote add origin https://github.com/YOUR_USER/hicm-hub.git
git push -u origin main
```

Cloudflare will build every push to `main`.
