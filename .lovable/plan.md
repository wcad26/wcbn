# WCBN — World Changers Business Network

A public-facing network website, a member portal, and a leadership admin portal, all sharing the existing World Changers Association database. No public sign-up: people sign in with the WCA credentials they already have, and everything WCA already knows about them is reused.

## Guiding principle

Active WCA membership and active participation in a DCG make a person eligible to apply. WCBN membership is selective and earned through validation. The platform enforces that in software: the applicant never re-enters name, region, DCG, contact or membership data — the system verifies it, and the application focuses only on business, leadership, impact and covenant. WCBN administrators can configure every eligibility criterion, score weight, threshold, required document, review stage and disqualification rule without a code change.

---

## 1. Public website

Designed to present the network's grandeur — large editorial type, deep brand palette, generous imagery, motion on scroll.

- **Home** — hero, the WIN → BUILD → TRANSFORM → IMPACT model, live impact counters (members, countries, businesses, jobs created, people trained, SDGs addressed), featured businesses, call to apply.
- **About WCBN** — philosophy, relationship to WCA, membership categories (Associate, Member, Leader, Impact Partner, Fellow).
- **Membership** — the six pillars, eligibility vs selection, the validation journey, the Covenant, FAQ, "Apply" (routes to sign-in first).
- **Business Catalog** — only vetted + activated businesses. Search plus filters by sector, country, SDG, member category. Card grid with logo, sector, country, SDG badges.
- **Business Detail** — public page per business: story, products/services, sectors, markets, years operating, team size, impact commitment and SDG contributions, website/socials, contact-through-WCBN form, related businesses.
- **Impact** — SDG breakdown, the WCBN Impact Index, annual transformation report.
- **Events / News**, **Leadership**, **Contact**.

SEO handled per page (own title/description/OG), catalog and business pages server-rendered so they are shareable and indexable.

## 2. Member portal (signed in)

Proposed layout: left sidebar, top bar with profile and status chip, card-based dashboard.

- **Dashboard** — membership status and category, application progress tracker (the pipeline as a visual stepper), dues status, next annual review date, quick actions.
- **My Application** — resumable multi-step application; WCA data shown read-only and pre-filled; only new information is collected. Upload documents (registration, licences). Sees stage-by-stage progress and any feedback from reviewers.
- **My Business(es)** — manage the public listing: description, logo, gallery, sectors, markets, links. Edits to a live listing go into a small re-approval queue.
- **Impact** — the Impact Commitment (3–5 year target, SDGs, evidence measures) and the Annual Impact Review form.
- **Contributions** — dues schedule, invoices, payment history, receipts; declare a payment with reference/proof, or pay online.
- **Directory** — member-only richer view of the network with contact.
- **Covenant** — sign at induction, viewable afterwards.
- **Profile** — WCBN-specific fields only; WCA-owned fields link back to the WCA platform.

## 3. Admin portal (WCBN leadership)

Modern dashboard: dark-capable, KPI tiles, charts, dense but calm tables, slide-over detail panels.

- **Overview** — applications by stage, approval rate, dues collected vs expected, new businesses pending vetting, impact index snapshot.
- **Applications pipeline** — kanban/table across the full workflow: Applied → WCA Verified → Character Review → Business Review (with Green/Amber/Red risk flag) → Impact & SDG Review → Leadership Review → Interview → Committee Review → Approved / Deferred / Rejected → Inducted → Annual Review. Each stage has its own reviewer form, notes, attachments and sign-off.
- **Scorecard** — the 100-point matrix (WCA Alignment 15, Christian Character 20, Business Capacity 15, Leadership 15, Impact 20, SDG 15), auto-banded 80+/70+/60+/below, plus hard disqualification rules that override any score.
- **Interviews** — schedule, panel assignment, structured question scorecard.
- **Members** — roster, categories, promotion/demotion, suspension, status history, endorsements from WCA leaders.
- **Businesses** — vetting queue, activate/deactivate a public listing, edit-approval queue, risk register.
- **Contributions** — dues plans (monthly/annual, per category and currency), invoice generation, record manual payments, confirm member-submitted proofs, reconcile online payments, arrears reporting and reminders.
- **Impact** — aggregated index, SDG coverage, annual review submissions, export for the transformation report.
- **Content** — manage homepage, pages, news, events, leadership bios.
- **Criteria & workflow builder** — administrators enable/disable criteria, mark them mandatory or advisory, set score weights and thresholds, configure required documents, add review questions, reorder review stages, and maintain red-flag/disqualification rules. Active WCA membership and active DCG participation begin as mandatory defaults but remain explicitly managed in this controlled settings area; every change is versioned and audited so applications already under review retain the rules under which they were submitted.
- **Settings & roles** — WCBN roles (Admin, Validator, Committee Member, Finance, Content) with permissions, workflow configuration, audit log.

## 4. Simplifications from WCA reuse

- Sign-in only; no registration, no email verification, no duplicate profile capture.
- WCA and DCG verification is automatic: on first sign-in the system reads the member record, ID, region, active DCG assignment, status and join date. No membership number or DCG typing, and no duplicate manual check.
- Inactive or missing WCA membership, or no active DCG membership, blocks the application by default with a clear message and next steps; authorized administrators can change how these criteria operate through the criteria builder.
- Endorsement request goes to the applicant's existing WCA leader in-app rather than by email chasing.
- Application is one resumable form split into short steps; reviewers, not the applicant, drive the later stages.

## 5. Payments

All three routes, as requested: admin records payments manually; members submit a declared payment with reference/receipt for admin confirmation; and online checkout. For online payment I need to know your preferred rails (mobile money for Cameroon vs card) before wiring it — the rest works from day one and online payment slots in behind the same invoice model.

## 6. Design

Brand colors inherited from WCA, applied through the modern system in the attached reference: deep purple surfaces with gold/amber accents, soft gradients, rounded cards, stepper progress, pill badges, light and dark modes. Please confirm the exact WCA hex values (or I will sample them from wcaglobal.org).

---

## Technical notes

- TanStack Start, connected to the existing Supabase project (ref `dtqyyvjosdgoqloxybnx`); `profiles`, `members`, `regions`, `dcgs`, `user_roles`, `currencies` are read, never duplicated.
- New tables, all prefixed `wcbn_`: `wcbn_members`, `wcbn_applications`, `wcbn_application_stages`, `wcbn_criteria`, `wcbn_criteria_versions`, `wcbn_application_criteria_results`, `wcbn_scores`, `wcbn_interviews`, `wcbn_endorsements`, `wcbn_businesses`, `wcbn_business_documents`, `wcbn_sectors`, `wcbn_sdgs`, `wcbn_business_sdgs`, `wcbn_impact_commitments`, `wcbn_annual_reviews`, `wcbn_covenants`, `wcbn_dues_plans`, `wcbn_invoices`, `wcbn_payments`, `wcbn_roles`, `wcbn_user_roles`, `wcbn_audit_log`, `wcbn_content`.
- Eligibility reads the existing `dcg_members` relationship and verifies that both the DCG assignment and the underlying WCA member are active. Criteria definitions are versioned; each submitted application stores the criteria version used, preventing later admin changes from silently altering an in-progress decision.
- RLS throughout: public reads restricted to activated businesses and safe columns; members read/write their own records; WCBN staff access via a `wcbn_has_permission()` security-definer function. Grants issued with every new table.
- Storage buckets for business logos, galleries and application documents.
- Public catalog/detail routes are server-rendered for SEO; member and admin areas sit behind the authenticated layout.

## Build order

1. Foundations — design system, layout shell, Supabase link, WCBN schema + RLS, sign-in and WCA verification gate.
2. Public site — home, about, membership, catalog, business detail, impact, contact.
3. Member portal — dashboard, application, business management, impact, covenant.
4. Admin portal — pipeline, scorecard, interviews, members, business vetting.
5. Contributions — dues, invoices, manual + declared payments, arrears; online checkout once rails are chosen.
6. Impact index, annual review, reports, content management, polish.

This document is the master implementation plan. Delivery will proceed in the build order above, with completed and remaining work tracked against it until the full scope is finished.

## Open items

- Exact WCA brand hex values.
- Online payment rails (mobile money vs card) and currency defaults.
- Dues amounts per membership category.
