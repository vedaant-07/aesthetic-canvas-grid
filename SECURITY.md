# SE7EN FIT Website Security Policy

This repository contains the public SE7EN FIT website, gym-owner management experience, and super-admin control surface. Security issues must be handled privately.

## Reporting

Do not publish credentials, private user data, exploit payloads, or administrator bypass details in public issues.

Use GitHub's private vulnerability reporting / Security Advisory flow when available. Include the affected route, reproduction steps, impact, required role/session state, and a minimal proof of concept with sensitive data removed.

## Secrets and client configuration

- `.env` and `.env.*` are ignored; only `.env.example` may be committed.
- Supabase service-role keys, Mailjet credentials, payment secrets, AI/provider secrets, and backend signing secrets must never be present in this frontend repository.
- `VITE_*` values are compiled into the browser bundle and must be treated as public client configuration.
- Rotate any credential that may have appeared in Git history or logs.

## Trust boundaries

- Gym-owner operational writes go through the shared SE7EN FIT Render API.
- Browser authentication may use Supabase public client APIs, but authorization is never trusted solely from UI state.
- Admin/gym permissions must be revalidated server-side for every privileged operation.
- The canonical production database migration history lives in the backend repository under `server/supabase/migrations`.

## Deployment baseline

Production deploys should only come from reviewed commits that pass typecheck, lint, build, dependency audit, and CodeQL checks. Render serves the static site with HSTS, frame blocking, MIME sniffing protection, and a strict referrer policy.
