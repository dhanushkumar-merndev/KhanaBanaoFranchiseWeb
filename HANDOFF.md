# KHANA BANAO — Build Handoff

Living status doc. **Read this first** when resuming work.
Spec: [AGENT_KHANA_BANAO_FINAL.md](AGENT_KHANA_BANAO_FINAL.md)

Last updated: 2026-08-02

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # typecheck + lint + tests
pnpm build        # production build
```

Database (already linked to project `bavjzxmcjuoyiuhjwbtn`):

```bash
pnpm db:push      # apply pending migrations
pnpm db:types     # regenerate src/lib/supabase/types.ts from the live schema
```

`.env` holds the Supabase + Brevo credentials. See [.env.example](.env.example).

---

## Status

Every module in the spec is built. Verified on 2026-08-02:

```text
typecheck  clean
lint       0 errors (2 unavoidable warnings, see below)
tests      103 passing
build      26 routes, compiled successfully
```

| # | Spec section | Status |
|---|---|---|
| 3 | Brand, theme, fonts | ✅ |
| 5 | Member invitation + Google login | ✅ |
| 6 | Public landing page | ✅ |
| 7 | Franchise enquiry form | ✅ |
| 8 | Manual lead creation | ✅ |
| 9 | Round-robin assignment | ✅ |
| 10–11 | Lead pipeline + 11-tab detail page | ✅ |
| 12 | Business discussion + follow-ups | ✅ |
| 13 | Public application form | ✅ |
| 14–15 | Document request + per-document approval | ✅ |
| 16 | Franchise approval | ✅ |
| 17 | Agreement management | ✅ |
| 18 | Payment workflow | ✅ |
| 19 | Franchise activation | ✅ |
| 20 | Training, setup, go-live | ✅ |
| 21 | Brevo emails + template admin | ✅ |
| 22 | Admin dashboard + analytics | ✅ |
| 23 | Member dashboard | ✅ |
| 24 | One reusable table system | ✅ |
| 25–27 | Storage, schema, RLS | ✅ applied |
| 28 | Routes | ✅ all present |
| 30 | Unit + component tests | ✅ 103 · Playwright ⬜ |

---

## ⚠️ One manual step before anyone can sign in

The database is live and an ADMIN profile exists for
`khanabanaofranchise@gmail.com`, but **Google sign-in is not enabled yet**.

Supabase dashboard → Authentication → Providers → Google:
1. Enable the provider, paste the Google OAuth client ID + secret.
2. Add redirect URLs: `http://localhost:3000/auth/callback` and the production
   equivalent.

Add further admins with:

```bash
node scripts/bootstrap-admin.mjs "them@gmail.com" "Their Name" "+919876543210"
```

Everyone else is invited from **Admin → Members**. There is no sign-up:
`/auth/callback` only admits a Google account that already matches a profile
row or a PENDING invitation.

---

## Routes

**Public** — `/`, `/login`, `/unauthorized`, `/auth/callback`

**Applicant** (token-authenticated, no login, `noindex`)
`/franchise/application/[token]`, `/franchise/documents/[token]`

**Admin** — `/admin`, `/admin/leads`, `/admin/leads/[id]`, `/admin/follow-ups`,
`/admin/applications`, `/admin/documents`, `/admin/agreements`,
`/admin/payments`, `/admin/franchises`, `/admin/training`, `/admin/setup`,
`/admin/members`, `/admin/email-templates`, `/admin/email-logs`,
`/admin/activity`

**Member** — `/member`, `/member/leads`, `/member/leads/[id]`,
`/member/follow-ups`, `/member/applications`, `/member/documents`,
`/member/payments`

---

## Architecture notes

### Lead detail
One page, eleven tabs, rendered through
[lead-tabs.tsx](src/components/leads/lead-tabs.tsx) so the admin and member
versions cannot drift. Members get eight of the eleven — the approval-only
stages are left off the strip rather than shown disabled. Only
context-relevant actions appear (spec §11).

### Applicant links
[tokens.ts](src/lib/tokens.ts) — a token is `<random>.<hmac>`. The signature is
checked before any query runs, so a scanner hitting the route never reaches the
database. Only the SHA-256 hash is stored, so a leaked backup does not hand
over working links. Issuing a new link revokes the previous one. Every token
failure renders the same page: telling a stranger a token "expired" confirms it
once existed.

### The three-way email confirmation
[email-confirm-dialog.tsx](src/components/ui/email-confirm-dialog.tsx) —
`[Approve and send email] [Approve without email] [Cancel]`, used for document
approval, re-upload requests, franchise approval, agreement sent, payment
approval and rejection, activation, training and go-live (spec §21). The two
confirm buttons differ *only* in whether an email goes out; a send never rolls
back the business action.

### Data layer
`src/lib/data/` — `leads`, `lead-detail`, `pipeline`, `queues`, `followups`,
`members`, `tokens`. All `server-only`. Anything member-facing takes an explicit
`scopeMemberId`, so the query itself cannot return another member's rows
whatever the URL asks for. A lead belonging to someone else 404s exactly like
one that does not exist.

### Status roll-ups
Document status is recomputed from the request rows after every upload and
review (`syncDocumentStatus`), never set by hand. Lead status only ever moves
through `canTransition()`, so a stale tab cannot skip an approval gate.

---

## Decisions worth remembering

- **`proxy.ts`, not `middleware.ts`** — Next 16 renamed the convention; the
  exported function must be named `proxy`.
- **Never read the clock during render.** React Compiler fails the build on
  `Date.now()` in a component. "Overdue" / "expired" booleans are computed in
  `src/lib/data/*` and passed down as data. Same for `setState` inside an
  effect — use the render-time adjustment pattern (see
  [toolbar.tsx](src/components/data-table/toolbar.tsx)).
- **`datetime-local` has no time zone.** The browser reads wall-clock time; the
  server would parse the same string as UTC — a silent 5.5-hour shift. Always
  convert with `localInputToIso()` before calling a server action. Display
  formatting is pinned to Asia/Kolkata in `src/lib/format.ts`.
- **`formatBytes` lives in `format.ts`, not `storage.ts`** — `storage.ts` is
  `server-only` and client components render file sizes.
- **Filters must be narrowed before hitting Postgres.** `pickEnum()` drops
  unrecognised values; a raw query-string value in `.eq()` on an enum column
  makes Postgres error out.
- **`z.boolean().refine(v => v)`, not `z.literal(true)`**, for required
  checkboxes — `literal(true)` makes the *input* type `true`, so the form
  cannot start unticked.
- `TableDef.Insert` in `types.ts` makes generated, defaulted and nullable
  columns optional. Adding a NOT NULL column with a DEFAULT means adding its
  name to `DefaultedKey` or inserts fail typecheck.
- Round-robin lives in Postgres (`assign_lead_round_robin`) and takes
  `SELECT ... FOR UPDATE` on the single `app_settings` row, so simultaneous
  enquiries cannot claim the same slot.
- `member_performance` and `admin_dashboard_stats()` are granted to
  **service_role only** — every caller already does `requireAdmin()`.
- Email sends never roll back a business action; failures are logged to
  `email_logs` as `FAILED` or `SKIPPED`.
- `server-only` is stubbed under Vitest ([tests/stubs](tests/stubs/)) — there is
  no client boundary to protect in a test run.

---

## Known limitations

- `public/images/*.svg` are **placeholder** food graphics. Replace with real
  photography (keep the file names, or repoint `images` in `src/lib/site.ts`).
- **No Playwright suite yet.** Spec §30 lists 25 end-to-end flows; the unit and
  component layers are done, the browser layer is not.
- Two React Compiler warnings remain and are not fixable: react-hook-form's
  `watch()` and TanStack's `useReactTable()` return non-memoizable functions, so
  the compiler skips those two components. Both libraries are mandated by the
  spec.
- Go-live's "support owner" picker lists active members only; a departed
  member's assignment stays on the record but cannot be re-selected.
- Nothing has been exercised against real data yet — the flows are built and
  typechecked, but the database is empty apart from the seed rows.
