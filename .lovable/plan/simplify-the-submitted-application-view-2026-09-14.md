# Simplify the submitted application view

## Changes
- Keep the current editable track selector and application form only while an application is still a draft.
- Once submitted, hide the “How are you applying?” card, completeness bar, step tabs, all form fields, and form action buttons.
- Replace “Complete the form below to apply.” with a concise status message showing that the application is being processed.
- Keep the full-width “Verified from WCA” card first.
- Place a collapsible “Review tracker” card beneath it, showing the current stage and completed stages for the applicant’s Business or Professional track.
- Add a second collapsible “Application summary” card beneath the tracker, showing the submitted WCA identity and track-specific answers as read-only details.
- Preserve decision notes and reviewer stage notes inside the relevant collapsible section.

## States
- **Draft:** verification, track choice, and editable application steps remain available.
- **Submitted / under review:** processing status, verification, collapsible tracker, and collapsible submitted summary only.
- **Activated:** existing portal redirect continues to take the member to the full member overview.

## Validation
- Confirm business and professional summaries show their correct fields.
- Confirm submitted applicants cannot see or edit the form.
- Confirm draft applicants can still save and submit normally.
- Confirm both collapsible cards work on desktop and mobile.
