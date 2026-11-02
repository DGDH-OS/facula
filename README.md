This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy (Cloudflare Workers via OpenNext)

Live: https://facula-app.dgdh-os.workers.dev (worker `facula-app`, account DGDH OS).

- `wrangler.jsonc`: worker config, R2 incremental cache (`opennext-cache-facula`, EU),
  R2 bucket `facula-templates` (EU) with `mihiriban-template.pptx` for the PowerPoint export,
  cron trigger `0 5 * * *` for `/api/cron/bronnen-archief`.
- `cf-worker.ts`: custom entry that wraps `.open-next/worker.js` and adds the `scheduled` handler
  (calls the cron route with `Authorization: Bearer $CRON_SECRET`).
- Build: `NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx opennextjs-cloudflare build`
  (the public vars are inlined at build time).
- Deploy: `npx opennextjs-cloudflare populateCache remote && npx wrangler deploy`
  with `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` set. Runtime secrets live on the worker
  (`wrangler secret put`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
- If `src/templates/mihiriban-template.pptx` changes, upload it again:
  `npx wrangler r2 object put facula-templates/mihiriban-template.pptx --file src/templates/mihiriban-template.pptx --jurisdiction eu --remote`.

Known gaps on Workers: Vertex AI via Workload Identity Federation needs a Vercel OIDC token
(not available on Cloudflare, lessons fall back to the template generator); logo upload uses
`sharp` (native, not available on Workers).
