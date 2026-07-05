# SE7EN FIT Brand Website

Production website, gym-owner access flow, and hidden admin control surface for SE7EN FIT.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth, Postgres, and Edge Functions
- Render static hosting

## Routes

- `/` public marketing website
- `/gym-management` gym-owner entry page
- `/gym-management/request-access` gym-owner application form
- `/gym-management/code` single-use access-code validation
- `/gym-management/login` gym-owner OTP login and workspace
- `/support`, `/contact`, `/privacy`, `/terms`
- `/x7-control/*` hidden admin surface

## Required frontend environment variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Required Supabase Edge Function secrets

```bash
ADMIN_SESSION_SECRET=change-to-a-random-64-character-secret
ADMIN_UNLOCK_QUERY_HASH=sha256-of-hidden-admin-search-phrase
ACCESS_CODE_PEPPER=change-to-a-random-code-hash-pepper
PUBLIC_SITE_URL=https://se7en.fit
RESEND_API_KEY=
SE7ENFIT_FROM_EMAIL=SE7EN FIT <noreply@se7en.fit>
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run lint
npm run build
npm run preview
```

## Deployment checklist

1. Apply all Supabase migrations.
2. Deploy all Supabase Edge Functions.
3. Set all Edge Function secrets.
4. Set Render frontend environment variables.
5. Verify the gym-owner flow end to end: request, approve, generate code, validate code, OTP login, activate gym, load workspace.
6. Verify hidden admin flow: unlock search, admin login, 2FA setup/verify, dashboard, audit logs.
7. Verify support/contact links and legal pages.
8. Replace preview URLs with the final domain before public launch.
