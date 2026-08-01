# KHANA BANAO — Build Handoff

Living status doc. **Read this first** when resuming work.
Spec: [AGENT_KHANA_BANAO_FINAL.md](AGENT_KHANA_BANAO_FINAL.md)

Last updated: 2026-08-01

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3000
npx tsc --noEmit    # typecheck
npx next build      # production build
```

`.env` already exists locally with Supabase + Brevo credentials filled in.
`APPLICATION_TOKEN_SECRET` and `DOCUMENT_TOKEN_SECRET` were generated on
2026-08-01. See [.env.example](.env.example) for the full list.

---

## Phase status

| # | Phase | Status |
|---|-------|--------|
| 1 | Deps, brand theme, fonts | ✅ Done |
| 2 | Decorative assets + scroll motion | ✅ Done |
| 3 | Public landing page | ✅ Done |
| 4 | DB schema + RLS migrations | ✅ Written — **not yet applied to Supabase** |
| 5 | Email layer (Brevo) | ✅ Core done |
| 6 | Auth + role guard + protected layout | ⬜ Next |
| 7 | UI kit + TanStack data table | ⬜ Todo |
| 8 | Admin: dashboard, members, leads, follow-ups | ⬜ Todo |
| 9 | Applications, documents, agreements, payments | ⬜ Todo |
| 10 | Franchises, training, setup, go-live | ⬜ Todo |
| 11 | Email template admin + logs | ⬜ Todo |
| 12 | Member dashboard | ⬜ Todo |
| 13 | Tests (Vitest + RTL + Playwright) | ⬜ Todo |

---

## ⚠️ Action required before the admin app works

The migrations in [supabase/migrations/](supabase/migrations/) have **not been
run** against the live Supabase project. Apply them in order:

1. `0001_init.sql` — enums, 20 tables, sequences, indexes, member-limit trigger
2. `0002_rls.sql` — identity helpers, RLS on every table, `assign_lead_round_robin()`
3. `0003_storage_and_seed.sql` — 5 private buckets + 15 default email templates

Either paste into the Supabase SQL editor in order, or `supabase db push`.

Then, in the Supabase dashboard:
- Enable the **Google** auth provider (Authentication → Providers)
- Add redirect URL `http://localhost:3000/auth/callback` (and the production URL)
- Insert the first ADMIN row by hand:
  ```sql
  insert into profiles (full_name, email, role, status)
  values ('Your Name', 'you@gmail.com', 'ADMIN', 'ACTIVE');
  ```
  The `auth_user_id` is linked automatically on first Google sign-in.

---

## What exists today

### Public site — `/`
Matches the supplied reference design. Sections in order:

| Component | File |
|---|---|
| Sticky header + scroll-spy + mobile sheet | [header.tsx](src/components/landing/header.tsx) |
| Hero + "Stronger Together" seal | [hero.tsx](src/components/landing/hero.tsx) |
| Stats bar (animated count-up) | [stats-bar.tsx](src/components/landing/stats-bar.tsx) |
| Why Partner — 4 cards | [why-partner.tsx](src/components/landing/why-partner.tsx) |
| How It Works — 6-step timeline | [how-it-works.tsx](src/components/landing/how-it-works.tsx) |
| Who Does What | [who-does-what.tsx](src/components/landing/who-does-what.tsx) |
| ₹50,000 fee banner | [fee-banner.tsx](src/components/landing/fee-banner.tsx) |
| Eligibility + investment (spec §6) | [eligibility-investment.tsx](src/components/landing/eligibility-investment.tsx) |
| Flavours carousel | [flavours.tsx](src/components/landing/flavours.tsx) |
| Testimonials | [testimonials.tsx](src/components/landing/testimonials.tsx) |
| Enquiry form (spec §7) | [enquiry-form.tsx](src/components/landing/enquiry-form.tsx) |
| FAQ accordion | [faq.tsx](src/components/landing/faq.tsx) |
| CTA banner + footer | [cta-banner.tsx](src/components/landing/cta-banner.tsx), [footer.tsx](src/components/landing/footer.tsx) |

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

### Assets
- `public/decor/*.svg` — hand-built leaves, garlic, cashews, chilli, curry bowl,
  floral corners, cloche, handshake, ornament.
- `public/images/*.svg` — **placeholder** food photos. Replace with real
  photography (keep the file names, or repoint `images` in `src/lib/site.ts`).

### Domain logic (pure, testable) — `src/lib/domain/`
| File | Contains |
|---|---|
| `enums.ts` | Every enum + UI labels, `MAX_ACTIVE_MEMBERS = 20` |
| `normalize.ts` | Phone/email normalisation |
| `permissions.ts` | `can(role, action)` — the full action list |
| `round-robin.ts` | `nextAssignee`, `distribute` |
| `transitions.ts` | Lead status graph, `canApproveFranchise` |
| `documents.ts` | `overallDocumentStatus` roll-up |
| `status.ts` | Badge tone mapping |

### Data + email
- `src/lib/supabase/{server,client,admin}.ts` — SSR, browser, service-role clients
- `src/lib/supabase/types.ts` — hand-maintained `Database` type (mirrors the SQL)
- `src/lib/email/render.ts` — `{{variable}}` substitution (HTML-escaped)
- `src/lib/email/send.ts` — Brevo transport; **never throws**, always logs
- `src/app/actions/enquiry.ts` — public enquiry → lead → round-robin → email

---

## Next up (phase 6)

1. **Auth**
   - `src/middleware.ts` — refresh Supabase session, guard `/admin` + `/member`
   - `src/app/login/page.tsx` — Google sign-in button
   - `src/app/auth/callback/route.ts` — exchange code, link `auth_user_id` to
     the invited profile, reject uninvited Google accounts
   - `src/app/unauthorized/page.tsx`
   - `src/lib/auth/session.ts` — `requireProfile()`, `requireAdmin()`
2. **UI kit** — `src/components/ui/` (button, card, input, dialog, badge, table,
   tabs, select, sheet). Hand-written shadcn-style; Radix is already installed.
3. **Data table** — `src/components/data-table/` on TanStack Table + Virtual,
   server-side pagination/sort/filter, page sizes 20/50/100.

---

## Decisions worth remembering

- **No `as const` on `whyPartner`** — it is explicitly typed so the optional
  `body` field survives.
- `TableDef.Insert` in `types.ts` makes generated, defaulted and nullable
  columns optional. If you add a NOT NULL column with a DEFAULT, add its name
  to `DefaultedKey` or inserts will fail typecheck.
- Round-robin lives in Postgres (`assign_lead_round_robin`) and takes
  `SELECT ... FOR UPDATE` on the single `app_settings` row, so simultaneous
  enquiries cannot claim the same slot. `src/lib/domain/round-robin.ts` mirrors
  the arithmetic for tests only.
- Brand icons (Instagram/Facebook/YouTube/WhatsApp) are hand-inlined in
  `icons.tsx` — lucide v1 dropped them.
- Email sends never roll back a business action; failures are logged to
  `email_logs` with status `FAILED` or `SKIPPED`.
