# Cloudflare Setup

## Bindings

The production Pages project is `hicm-hub`.

1. Bind D1 database `hicm-hub-db` as `DB`.
2. Bind private R2 bucket `hicm-hub-uploads` as `UPLOADS`.
3. Create queue `hicm-analysis` and bind its producer as `ANALYSIS_QUEUE`.
4. Use build command `npm run build` and output directory `dist`.
5. Apply migrations with `npx wrangler d1 migrations apply hicm-hub-db --remote`.

## Groq secret

In Cloudflare Dashboard, open **Workers & Pages > hicm-hub > Settings > Variables and Secrets > Add**. Add `GROQ_API_KEY`, enter the value, choose **Encrypt**, save it, and redeploy.

Configure these non-secret runtime variables:

```text
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL_EVALUATION=openai/gpt-oss-120b
GROQ_MODEL_CHUNK=openai/gpt-oss-20b
GROQ_MODEL_ANALYSIS=openai/gpt-oss-120b
GROQ_MODEL_WEB=groq/compound
ENABLE_GROQ_WEB_SEARCH=false
```

## Account security

Add a high-entropy `PASSWORD_PEPPER` encrypted secret before creating staff accounts. Rotating this value requires a coordinated staff password reset.

The first administrator is created through `POST /api/admin/bootstrap` while no administrator exists. Temporarily set `ADMIN_BOOTSTRAP_SECRET`, create the account, then remove that secret. Bootstrap is database-guarded and closes after the first administrator.

Administrators create expiring, single-use staff codes inside `/admin`. Codes are stored and consumed in D1; there is no reusable registration code in application source or browser storage.

## Analysis worker

```bash
npx wrangler queues create hicm-analysis
npm run cf:analysis:deploy
```

The Pages Function publishes a job after a private R2 upload. `hicm-hub-analysis` extracts PDF text with `unpdf`, reads DOCX XML with `fflate`, writes progress to D1, and stores deterministic internal-corpus matches.

## Deploy

```bash
npm run build
npm run test
npm run test:e2e
npm run cf:analysis:deploy
npx wrangler pages deploy dist --project-name hicm-hub --branch main
```
