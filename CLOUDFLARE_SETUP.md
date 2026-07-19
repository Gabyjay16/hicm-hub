# Cloudflare Setup

## Bindings

The production Pages project is `hicm-hub`.

1. Bind D1 database `hicm-hub-db` as `DB`.
2. Bind private R2 bucket `hicm-hub-uploads` as `UPLOADS`.
3. Use build command `npm run build` and output directory `dist`.
4. Apply migrations with `npx wrangler d1 migrations apply hicm-hub-db --remote`.

## Groq secret

In Cloudflare Dashboard, open **Workers & Pages → hicm-hub → Settings → Variables and Secrets → Add**. Add `GROQ_API_KEY`, enter the value, choose **Encrypt**, save it, and redeploy.

Configure these non-secret runtime variables:

```text
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL_EVALUATION=openai/gpt-oss-120b
GROQ_MODEL_CHUNK=openai/gpt-oss-20b
GROQ_MODEL_ANALYSIS=openai/gpt-oss-120b
GROQ_MODEL_WEB=groq/compound
ENABLE_GROQ_WEB_SEARCH=false
```

## Staff registration

Add `STAFF_REGISTRATION_CODE` as an encrypted Pages secret. New staff enter this bootstrap code once with their name, position, and password. Rotate the secret after onboarding. Existing staff log in using name and password and do not need the code again.

Add a separate high-entropy `PASSWORD_PEPPER` encrypted secret before creating staff accounts. Rotating this value requires a coordinated staff password reset.

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name hicm-hub --branch main
```
