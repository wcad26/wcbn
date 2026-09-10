# Complete the WCBN member portal

## What is wrong today

The member portal only really works on the Overview page. Every other member page — My application, My business, Contributions, Impact, Covenant — is written, but the portal is wired so that clicking those menu items shows the Overview page again instead of the page you asked for. So the whole portal looks half-built even though most of the content exists.

Two data problems sit behind that:

- A member can create a business listing, but the moment it is saved the rules in the database stop the same member from editing it again. Editing your own listing before leadership approves it currently fails.
- When an application is submitted, nothing is recorded in the review history and the member's own status stays untouched, so the leadership pipeline shows an application with no starting point.

## What will be built

1. **Fix portal navigation** so each menu item opens its own page. Same fix already applied to the leadership portal.

2. **Application process, end to end**
   - Four steps (Business, Character & leadership, Impact & SDGs, Review & submit) with required-field checks before moving on and a visible completion bar.
   - Autosave of progress, clear "draft / submitted / under review / approved" state.
   - Supporting document upload (registration certificate, licence, references) into the existing private WCBN document store.
   - On submit: the first review stage is recorded, the member's status moves to "applicant", and the member sees a live tracker of where the application stands and any note leadership has left.
   - Blocked-state messaging when WCA membership or DCG participation is not active, with what to do about it.

3. **My business** — allow editing before approval (a rules fix in the database), add draft vs submit-for-vetting, show the vetting decision and any change requests, allow removing a draft listing, and link to the public page once live.

4. **Contributions** — show the dues plan that applies to the member's category, next amount due, arrears, receipt history, payment status after finance confirms, and clearer declare-a-payment flow with proof of payment upload.

5. **Impact** — edit an existing annual review instead of only adding new ones, show review status from leadership, and show progress against the member's own targets.

6. **Covenant** — allow the member to read and accept the covenant with a recorded acceptance date, rather than a static page.

7. **New page: My profile** — WCA identity, region, DCG, contact details, and a photo, read from the shared WCA records with the editable parts writable.

8. **Empty and loading states** across every page so nothing ever renders as a blank panel.

## Technical notes

- Route files `portal.*.tsx` become `portal_.*.tsx` so each is a standalone page, matching the `admin_.*` pattern already used; `/portal` stays the overview.
- One database migration: allow owners to update their own `wcbn_businesses` rows while `vetting_status` is `pending`; add a covenant acceptance timestamp on `wcbn_members`; storage policy check for member document uploads.
- Application submit performs the stage insert (`wcbn_application_stages`) and member status update in the same action.
- All reads/writes stay on the shared Supabase project through the browser client under existing RLS.
