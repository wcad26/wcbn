# Activated member overview page

Rebuild `/portal` (the member Overview) so an activated WCBN member sees a live picture of their membership standing — not the application journey. Members who are not yet activated never reach this page; they stay on the application page as already implemented.

## What the new Overview shows

**Header strip**
- Welcome line with the member's name, membership category (Associate / Member / Leader / Impact Partner / Fellow), status pill, member since date, and next review date.
- Covenant reminder chip if the covenant has not yet been accepted, linking to the Covenant page.

**KPI cards (top row)**
- Membership standing — category plus "Good standing" or "Attention needed" (derived from overdue invoices and covenant acceptance).
- Contributions this year — total confirmed payments, with outstanding balance underneath.
- Business listings — number of listings, how many are live in the public catalog.
- Impact delivered — jobs created and people trained totals from the member's annual reviews.

**Main column**
- Dues and payments: next payment due (amount, date, invoice number), an overdue warning when applicable, plus the last three payments with their confirmation state. Buttons to Contributions.
- My businesses: compact cards per listing with vetting state, sector, city/country, and a link to the public page when live, plus a link to My business.
- Impact snapshot: current impact commitment targets versus latest annual review actuals (jobs, people trained, businesses supported), with a prompt to submit this year's review if missing.

**Side column**
- Membership checklist: covenant accepted, business listing live, impact commitment on file, dues up to date, annual review submitted for the current year — each with a direct link to fix what's outstanding.
- Network pulse: WCBN-wide figures (active members, live businesses in the catalog, total jobs created and people trained across the network) so the member sees the network they belong to.
- Quick actions: declare a payment, update my business, submit annual review, view covenant, my profile.

**States**
- Skeleton placeholders while loading; friendly empty states (no invoices yet, no listing yet, no impact review yet) each with the action that resolves them.

## Technical notes

- Rewrite `src/routes/portal.tsx`. Remove the STAGES validation journey and application-stage metric card; that content already lives on the application page, which activated members no longer see.
- Single React Query key `["portal", "overview", wcbnId]` fetching in parallel: `wcbn_invoices` (with nested `wcbn_payments`), `wcbn_businesses` (with `wcbn_business_sdgs` not required), `wcbn_impact_commitments`, `wcbn_annual_reviews`, plus lightweight network aggregates from `wcbn_members`, `wcbn_businesses` and `wcbn_annual_reviews` (public/approved rows only, consistent with what `src/routes/index.tsx` and `admin.tsx` already read).
- Derived values computed client-side: outstanding = sum of `amount - paid_amount`; confirmed contributions = payments with status `confirmed`; overdue = unpaid invoices with `due_date` in the past.
- Reuse `MemberPage`, `MetricCard`, existing card/badge styling and `money()`; no new dependencies, no schema change, no RLS change.
- Keep `useIdentity()` as the source of category, status, covenant acceptance and WCA/DCG context.
