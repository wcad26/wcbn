# Remove public "Member sign in" button

## Goal
Remove the public-facing "Member sign in" button from the WCBN site header, since members already have credentials from the WCA platform and do not need a public sign-in entry point on the marketing site.

## Changes
1. In `src/components/wcbn/site-header.tsx`:
   - Remove the desktop "Member sign in" `<Button asChild variant="ghost">` link (currently the first button in the right-side header actions).
   - Remove the corresponding mobile-menu "Member sign in" button inside the collapsible menu so the experience is consistent on small screens.
   - Keep the "Apply to WCBN" primary CTA and the signed-in "My portal" behavior unchanged.

## Outcome
The public header will show only the "Apply to WCBN" CTA and the mobile hamburger menu will no longer offer a public member sign-in option.
