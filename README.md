# KHANA BANAO Franchise CRM

Internal franchise lead-management application built with Next.js and Supabase.
Access is invitation-only through Google. The primary administrator is:

```text
khanabanaofranchise@gmail.com
```

## Local setup

Requirements: Node.js 20 or newer and pnpm.

```bash
pnpm install
```

Copy `.env.example` to `.env` and configure every value. In particular, use
the URL and keys belonging to the same Supabase project that will receive the
database migrations. Never expose or commit `SUPABASE_SERVICE_ROLE_KEY`.

```bash
pnpm dev
```

The application will be available at <http://localhost:3000>.

## Create or migrate the Supabase database

The SQL migrations in `supabase/migrations` create the schema, row-level
security policies, storage buckets, email templates, upload limits and primary
administrator profile. Supabase records which migrations have already run, so
later pushes apply only new migrations.

### 1. Log in to the Supabase CLI

The CLI does not need to be installed globally:

```bash
pnpm dlx supabase@latest login
```

### 2. Link the intended Supabase project

Find the project reference in **Supabase Dashboard → Project Settings →
General**, then run:

```bash
pnpm dlx supabase@latest link --project-ref YOUR_PROJECT_REF
```

Confirm the project name carefully before continuing. For an existing
production database, take a backup before applying new migrations.

### 3. Apply the migrations

```bash
pnpm dlx supabase@latest db push
```

On a new database this applies every migration in order. On an existing
database it applies only migrations that are not yet recorded remotely.

### 4. Verify the primary administrator

Migration `0008_bootstrap_primary_admin.sql` guarantees that
`khanabanaofranchise@gmail.com` has the `ADMIN` role and `ACTIVE` status. Verify
it in **Supabase Dashboard → SQL Editor**:

```sql
select email, role, status, auth_user_id
from public.profiles
where lower(email) = 'khanabanaofranchise@gmail.com';
```

Before the first login, `auth_user_id` may be `null`; this is expected. The
first successful Google login with that exact email securely links the
Supabase Auth user to the existing administrator profile. A different Google
account will not receive administrator access.

If the migration has not been applied, the same admin can be created safely
with:

```bash
node scripts/bootstrap-admin.mjs "khanabanaofranchise@gmail.com" "Khana Banao Admin"
```

The command is safe to repeat and does not change an existing profile.

## Enable Google login

1. Create Google OAuth credentials.
2. In Google Cloud, add this authorized redirect URI:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. In **Supabase Dashboard → Authentication → Providers → Google**, enable
   Google and enter the client ID and secret.
4. In **Authentication → URL Configuration**, set the production site URL and
   allow these redirect URLs:
   `http://localhost:3000/auth/callback` and
   `https://YOUR_DOMAIN/auth/callback`.
5. Set `NEXT_PUBLIC_APP_URL` to the deployed application URL.
6. Open `/login` and sign in as `khanabanaofranchise@gmail.com`.

All other team members must be invited from **Admin → Members**. There is no
public account registration.

## Deploying later database changes

After pulling a release containing new migration files:

```bash
pnpm install --frozen-lockfile
pnpm dlx supabase@latest db push
pnpm check
pnpm build
```

Apply database migrations before deploying application code that depends on
them. Do not edit a migration that has already been applied; create the next
numbered migration instead.

## Validation

```bash
pnpm check
pnpm build
```

`pnpm check` runs TypeScript, ESLint and the automated test suite.
