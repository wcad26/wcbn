# WCBN — WCA brand alignment, richer public site, full portals

The site currently uses a plum-and-gold look with sharp-edged panels that does not match the WCA platform. This plan re-skins WCBN with the exact WCA brand system, upgrades the public pages with real imagery and reporting, and finishes both the member portal and the leadership portal so they work on live data.

## 1. Adopt the WCA brand system

Taken directly from the WCA project:

- Purple primary, deeper violet secondary, teal accent, near-white surfaces, matching dark mode.
- Inter typeface, tight headings, generous section spacing.
- Soft glass cards, purple-to-violet-to-teal gradients, rounded-3xl corners, soft/hover shadows and a subtle glow — the same "modern soft" language as the WCA super admin portal.
- Gold accents removed; teal becomes the highlight colour.

Every existing WCBN page (public, member, admin) is restyled against these tokens: rounded cards, soft shadows, gradient headers, pill navigation.

## 2. Public website upgrade

- New generated imagery across the landing page and inner pages: hero, business/enterprise scenes, leadership and mentoring, impact/community work, sector tiles for the catalog, an about-page portrait scene, an impact-page banner, and a contact scene. Every image gets descriptive alt text.
- Home: gradient hero over photography, live counters pulled from the database (approved members, businesses, countries, SDGs) instead of hard-coded numbers, the WIN → BUILD → TRANSFORM → IMPACT model as illustrated cards, featured businesses row, testimonial/quote band, and a clear apply call to action.
- About, Membership, Impact and Contact pages rebuilt with image-led sections, clearer reporting blocks (charts for SDG coverage and impact totals) and stronger typography.
- Business catalog: sector and country filter chips, image cards, empty and loading states; business detail page gains gallery, impact commitments, SDG badges and a contact-through-WCBN form.
- Per-page titles, descriptions and social preview tags kept and refreshed.

## 3. Sign-in

- The existing member sign-in stays at `/auth`.
- A dedicated leadership sign-in at `/auth/admin`, modelled on the WCA super admin login: branded split panel, show/hide password, clear errors, and a check that the account holds an active WCBN leadership role before entering the portal. A visible link to it from the footer so admins can always reach it.

## 4. Member portal — completed

- Real profile header: name, WCA member ID, region, DCG, membership category and status chip, all read from the shared WCA records.
- Application: multi-step form that saves each step, resumable, with document uploads, eligibility automatically verified against WCA membership and DCG participation, submission for review, and live stage tracking with reviewer feedback.
- My business: create and edit a listing (logo, cover, gallery, sectors, markets, links), submit for vetting, and see approval status; edits to a live listing queue for re-approval.
- Contributions: dues plan, invoices, payment history, declare a payment with reference and receipt upload.
- Impact: impact commitment with SDG selection and the annual review form.
- Covenant page to read and sign.

## 5. Admin portal — completed

Sidebar shell matching the WCA super admin layout (collapsible icon sidebar, page-title header bar, mobile sheet + bottom nav).

- Overview with live KPI tiles and charts: applications by stage, approval rate, dues collected vs expected, businesses pending vetting.
- Applications pipeline with stage-by-stage review, scorecard against the 100-point matrix, notes, attachments and decisions (approve / defer / reject / induct).
- Members roster with category changes, suspension and status history.
- Businesses vetting queue with activate/deactivate and edit-approval handling.
- Contributions: dues plans per category and currency, invoice generation, record manual payments, confirm member-declared payments, arrears view.
- Criteria builder made functional: enable/disable criteria, set weights, thresholds and required documents, publish a new version.
- Roles and permissions screen for WCBN staff.

## Technical notes

- WCA tokens ported into `src/styles.css` (`--primary` 284 32% 35%, `--secondary` 267 54% 36%, `--accent` 181 53% 45%), plus gradient, shadow, glow and glass tokens; Inter loaded via a link tag in the root route. `gold`/`ink` tokens retired or remapped.
- Shared shell components rebuilt: `page-shell`, `portal-shell`, `admin-page`, `metric-card`, plus new `stat-tile`, `data-table` and `stage-badge`.
- Data access through TanStack Query with `createServerFn`; public catalog reads stay server-rendered for SEO. Member and admin writes go through authenticated server functions, RLS-enforced via `wcbn_has_permission`.
- Storage buckets for business logos, galleries and application documents, with policies.
- Charts via Recharts, consistent with WCA reporting screens.

## Build order

1. Brand system and shared shells.
2. Public site with new imagery and live reporting.
3. Admin sign-in and admin portal.
4. Member portal end to end.
5. Contributions, criteria builder, roles.
