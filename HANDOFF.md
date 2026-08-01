# KHANA BANAO — Build Handoff

Living status doc. **Read this first** when resuming work.
Spec: [AGENT_KHANA_BANAO_FINAL.md](AGENT_KHANA_BANAO_FINAL.md)

Last updated: 2026-08-01

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

## Phase status

| # | Phase | Status |
|---|-------|--------|
| 1 | Deps, brand theme, fonts | ✅ Done |
| 2 | Decorative assets + scroll motion | ✅ Done |
| 3 | Public landing page | ✅ Done |
| 4 | DB schema + RLS migrations | ✅ **Applied to Supabase** |
| 5 | Email layer (Brevo) | ✅ Done — 15 templates seeded |
| 6 | Auth + role guard + protected layout | ✅ Done |
| 7 | UI kit + TanStack data table | ✅ Done |
| 8 | Admin dashboard (cards + charts + member performance) | ✅ Done |
| 9 | Members management | ✅ Done |
| 10 | Leads list + detail, discussion, accept/reject, reassign | ✅ Done |
| 11 | Follow-up queues | ✅ Done |
| 12 | Member dashboard + member pages | ✅ Done |
| 13 | Unit + component tests | ✅ 86 passing |
| 14 | Applications (public token form + review) | ⬜ Todo |
| 15 | Documents (request, upload, per-doc approval) | ⬜ Todo |
| 16 | Agreements + payments | ⬜ Todo |
| 17 | Franchises, training, setup, go-live | ⬜ Todo |
| 18 | Email template admin + logs | ⬜ Todo |
| 19 | Playwright end-to-end flows | ⬜ Todo |

---

## ⚠️ One manual step left before anyone can sign in

The database is live and an ADMIN profile exists for
`khanabanaofranchise@gmail.com`, but **Google sign-in is not enabled yet**.

In the Supabase dashboard → Authentication → Providers → Google:
1. Enable the provider and paste the Google OAuth client ID + secret.
2. Add redirect URLs: `http://localhost:3000/auth/callback` and the production
   equivalent.

Add further admins with:

```bash
node scripts/bootstrap-admin.mjs "them@gmail.com" "Their Name" "+919876543210"
```

Everyone else is invited from **Admin → Members → Invite member**. There is no
sign-up: `/auth/callback` only admits a Google account that already matches a
profile row or a PENDING invitation.

---

## Verified against the live database

Confirmed on 2026-08-01 after `supabase db push`:

- All 20 tables + the `member_performance` view exist and are readable.
- 5 private storage buckets exist with the right MIME/size limits.
- 15 email templates seeded; `app_settings` has its single row.
- `admin_dashboard_stats()` returns the full card payload.
- Inserting a lead generates `KB-L01001`; `assign_lead_round_robin()` correctly
  returns `null` when there are no active members (spec §9.7);
  `mark_overdue_followups()` runs. Test row was deleted — `leads` is empty.

---

## What exists today

### Public site — `/`
Matches the supplied reference design: header, hero, stats bar, why-partner,
how-it-works, who-does-what, ₹50,000 fee banner, eligibility + investment,
flavours carousel, testimonials, enquiry form, FAQ, CTA banner, footer.
**All copy and image paths live in one file:** [src/lib/site.ts](src/lib/site.ts).

### Leaf scroll animation (mobile-optimised)
- [leaf.tsx](src/components/decor/leaf.tsx) — every leaf shares **one** passive
  scroll listener and **one** rAF tick. Each frame writes a single CSS custom
  property (`--leaf-y`) per *visible* leaf; the compositor does the rest, so
  there is no layout or paint work.
- Off-screen leaves are skipped. Parallax amplitude drops to 45% below 768px.
- `desktopOnly` drops the denser clusters from the DOM on phones.
- `prefers-reduced-motion` kills all of it.
- [smooth-scroll.tsx](src/components/motion/smooth-scroll.tsx) — Lenis runs on
  pointer devices only; touch keeps native scrolling.
- [reveal.tsx](src/components/motion/reveal.tsx) — one shared
  IntersectionObserver, unobserves each element after it reveals.

### Admin app
| Route | File |
|---|---|
| `/admin` — 12 cards, 8 charts, member performance | [page.tsx](<src/app/(dashboard)/admin/page.tsx>) |
| `/admin/members` — team + invitations tabs | [page.tsx](<src/app/(dashboard)/admin/members/page.tsx>) |
| `/admin/leads` — filterable, sortable, virtualised | [page.tsx](<src/app/(dashboard)/admin/leads/page.tsx>) |
| `/admin/leads/[id]` — 11 tabs, context actions | [page.tsx](<src/app/(dashboard)/admin/leads/[id]/page.tsx>) |
| `/admin/follow-ups` — today / upcoming / overdue / completed | [page.tsx](<src/app/(dashboard)/admin/follow-ups/page.tsx>) |

### Member app
`/member`, `/member/leads`, `/member/leads/[id]`, `/member/follow-ups`.
Every member query passes a `scopeMemberId`, so the query itself cannot return
another member's leads regardless of what the URL asks for. A lead belonging to
someone else 404s exactly like one that does not exist.

### Server actions
| File | Covers |
|---|---|
| `actions/enquiry.ts` | Public enquiry → lead → round-robin → email |
| `actions/members.ts` | Invite (20 cap), activate/deactivate, revoke, resend |
| `actions/leads.ts` | Create, log contact, business discussion, accept, reject, reassign, auto-assign, follow-up CRUD |

### Domain logic (pure, testable) — `src/lib/domain/`
`enums.ts`, `normalize.ts`, `permissions.ts`, `round-robin.ts`,
`transitions.ts`, `documents.ts`, `status.ts`.

### Data layer — `src/lib/data/`
`leads.ts`, `lead-detail.ts`, `followups.ts`, `members.ts` — all `server-only`,
all take an explicit member scope where relevant.

---

## Next up

Build in this order; each unlocks the tab after it on the lead detail page.

1. **Applications** (spec §13) — public `/franchise/application/[token]`,
   duplicate-submission prevention, admin review. The token table
   (`application_tokens`) and secrets already exist.
2. **Documents** (spec §14–15) — request dialog, public upload page, per-document
   approval with the three-way email confirmation, re-upload with reason,
   approved documents locked. `overallDocumentStatus()` is written and tested.
3. **Franchise approval** (spec §16) — gate is `canApproveFranchise()`, already
   written and tested.
4. **Agreements** (§17) and **payments** (§18) — manual proof upload + approve/reject
   with a visible reason. No payment gateway.
5. **Activation, training, setup, go-live** (§19–20).
6. **Email template admin + logs** (§21).
7. **Playwright flows** (§30).

The lead-detail page already renders all 11 tabs; the unbuilt ones show an
explicit "not wired up yet" panel rather than a blank state, so nobody mistakes
an unbuilt stage for a stage with no data. Fill them in as each feature lands.

---

## Decisions worth remembering

- **`proxy.ts`, not `middleware.ts`** — Next 16 renamed the convention; the
  exported function must be named `proxy`.
- **Never read the clock during render.** React Compiler's purity rule fails the
  build on `Date.now()` in a component. "Overdue"/"expired" booleans are computed
  in `src/lib/data/*` and passed down as data. Same for `setState` inside an
  effect — use the render-time adjustment pattern (see
  [toolbar.tsx](src/components/data-table/toolbar.tsx) and
  [sidebar.tsx](src/components/shell/sidebar.tsx)).
- **`datetime-local` has no time zone.** The browser reads wall-clock time; the
  server would parse the same string as UTC — a silent 5.5-hour shift. Always
  convert with `localInputToIso()` before sending to a server action. All
  display formatting is pinned to Asia/Kolkata in `src/lib/format.ts`.
- **Filters must be narrowed before hitting Postgres.** `pickEnum()` in
  `lib/table/params.ts` drops unrecognised values; passing a raw query-string
  value into `.eq()` on an enum column makes Postgres error out.
- `TableDef.Insert` in `types.ts` makes generated, defaulted and nullable
  columns optional. If you add a NOT NULL column with a DEFAULT, add its name
  to `DefaultedKey` or inserts will fail typecheck.
- Round-robin lives in Postgres (`assign_lead_round_robin`) and takes
  `SELECT ... FOR UPDATE` on the single `app_settings` row, so simultaneous
  enquiries cannot claim the same slot. `src/lib/domain/round-robin.ts` mirrors
  the arithmetic for tests only.
- `member_performance` and `admin_dashboard_stats()` are granted to
  **service_role only** — the pages calling them already do `requireAdmin()`,
  so anon/authenticated hold no privilege on them at all.
- Brand icons (Instagram/Facebook/YouTube/WhatsApp) are hand-inlined in
  `icons.tsx` — lucide v1 dropped them.
- Email sends never roll back a business action; failures are logged to
  `email_logs` with status `FAILED` or `SKIPPED`.
- **No `as const` on `whyPartner`** — it is explicitly typed so the optional
  `body` field survives.

---

## Known limitations

- `public/images/*.svg` are **placeholder** food graphics. Replace with real
  photography (keep the file names, or repoint `images` in `src/lib/site.ts`).
- Two React Compiler warnings remain and are not fixable: react-hook-form's
  `watch()` and TanStack's `useReactTable()` both return non-memoizable
  functions, so the compiler skips those two components. Both libraries are
  mandated by the spec.
- Lead-detail tabs beyond Overview / Activity / Follow-ups are placeholders.
- No Playwright suite yet.
