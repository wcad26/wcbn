# Eliminate the member portal loading flash

## Goal
Make every member portal visit resolve the signed-in member and their WCBN status before any destination page mounts. Applicants should see one loading state and then land directly on **My application**; activated members should land directly on their overview.

## Confirmed cause
- The member pages are currently separate top-level routes (`portal_.*`), so there is no shared parent route that can finish the access decision before a page mounts.
- Each page renders its own portal shell. The page component and its data requests can start before the shell finishes checking membership status.
- Identity uses one shared cached query key with a 30-second freshness window. During a refresh or account/status change, cached identity data can be treated as ready while the fresh check is still running.
- The login page navigates to `/portal` immediately after authentication, leaving the portal to correct the destination afterward.

## Implementation
1. **Create one member-portal entry gate**
   - Convert `/portal` into the parent layout for all member pages.
   - Move the activated-member overview into the `/portal` index child.
   - Nest application, business/professional profile, events, news, contributions, impact, covenant, and profile routes beneath that layout while preserving every existing public URL.
   - The parent renders only a stable loading screen until authentication and the latest WCBN membership record are resolved; child pages do not mount or query data before then.

2. **Make routing status-aware before showing content**
   - If no session exists, send the visitor to member sign-in.
   - If the member is not activated, route directly to `/portal/application`.
   - If an activated member opens `/portal/application`, route directly to `/portal`.
   - Keep the loading screen visible while either decision is pending, preventing the outgoing or incorrect page from appearing.

3. **Remove stale identity decisions and duplicate checks**
   - Give identity loading a reusable query definition and require a fresh result for portal entry decisions.
   - Treat background identity refresh as unresolved when it can change access or destination.
   - Clear or replace identity data on authentication changes so one account or prior membership state cannot briefly represent another.
   - Let the new parent gate own member access; retain the existing leadership guard for admin pages without running the member check twice.

4. **Make sign-in land efficiently**
   - After successful member login, fetch the current identity once and navigate directly to the correct destination instead of always opening the dashboard first.
   - Reuse that result in the portal cache so the destination does not immediately repeat the same database work.

5. **Verification**
   - Check signed-out access, a draft applicant, a submitted applicant, and an activated member.
   - Verify direct visits and refreshes on `/portal`, `/portal/application`, and another member page.
   - Confirm that applicant sessions never request or render dashboard data, activated members never render the application page, and only the loading state appears while status is unresolved.
   - Confirm existing member URLs, navigation, and metadata still work and the project builds cleanly.

## Technical notes
- Route filenames and `createFileRoute` IDs will be changed together; the generated route tree will not be edited.
- No database schema or application-status rules need to change.
- The visible loading state will reuse the current portal styling and remain brief and stable.
