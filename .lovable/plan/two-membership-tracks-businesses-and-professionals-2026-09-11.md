# Two membership tracks: Businesses and Professionals

WCBN currently assumes every applicant owns a business. This adds a second track for
individuals who apply as professionals (employed, self-employed, consultants, practitioners)
with no registered business. Each track gets its own application, its own portal experience
and its own admin review path.

## 1. Choosing a track

At the very start of the application, the member picks one:

- **Business owner** — I own or co-own a registered business.
- **Professional** — I practise a profession or trade without a registered business.

The choice is saved with the application and can be changed only while the application is
still a draft. Once submitted, the track is locked (an admin can send it back if the member
picked wrong).

## 2. Member application — two different forms

Shared for both: the WCA verification card (active WCA membership + active DCG), the
covenant confirmation, and the review tracker.

**Business track** (today's form, unchanged): business name, sector, country, cities,
founding year, team size, business phone/email, registration references, what the business
does, impact commitment, SDGs.

**Professional track** (new): profession/title, field of practice, employer or
self-employed, country and city, years of experience, qualifications and certifications,
professional body / licence reference (optional), work phone and email, a short description
of the work they do, how their work serves people and reflects Kingdom values, career and
service goals, SDGs they advance, optional portfolio or LinkedIn link.

Progress bar, save-as-draft, step validation and the submitted/pending lock all behave as
they do now, per track.

## 3. Member portal after activation — two different experiences

**Business members** keep today's portal: My business (catalog listing), impact
commitments, contributions, overview KPIs about the business and catalog.

**Professional members** get:
- "My professional profile" instead of "My business" — the same edit/submit/publish flow,
  but with professional fields (profession, field, experience, qualifications, services
  offered, availability, photo, contact) and a public profile page in the directory.
- An overview tuned to them: membership standing, contributions and dues, profile
  publication status, service/impact commitments, events and news.
- No business-only sections (registration references, team size, business SDG breakdown
  framed around a company).

Both tracks continue to share Events, News, Contributions, Covenant and Profile.

## 4. Admin portal — two different validations

- **Applications pipeline** gains a track filter (All / Businesses / Professionals) and a
  clear badge on each card. The review panel renders the fields of that track, grouped and
  labelled, instead of a raw key dump.
- **Review stages** differ per track: business applications keep Business review;
  professional applications get Professional practice review instead. Only the stages that
  apply to the selected track are offered.
- **Criteria & workflow** page gets two tabs, Business criteria and Professional criteria.
  Each criterion is marked as applying to businesses, professionals or both, and each track
  has its own passing and strong-candidate score thresholds. Versioning behaviour is
  unchanged — in-flight applications keep the rules they were submitted under.
- **Members and directory admin** show the member type, and the catalog admin can filter
  and activate business listings and professional profiles separately.
- Approval sets the member's type so the portal renders the right experience.

## 5. Public site

The catalog page gets two tabs, **Businesses** and **Professionals**, sharing the same card
grid and search. Each activated professional profile has its own public detail page in the
same style as a business page. Homepage counts include both.

## Technical notes

- Migration: add `applicant_type` to `wcbn_applications`, `member_type` to `wcbn_members`
  (default `business` so existing records are unaffected), `listing_type` to
  `wcbn_businesses` so professional profiles reuse the existing listing, catalog, activation
  and impact machinery rather than a parallel table; add `applies_to` to `wcbn_criteria` and
  professional threshold columns to `wcbn_criteria_versions`; seed a starter set of
  professional criteria. Existing RLS/grants patterns are extended, not replaced.
- Shared constants (professions, fields of practice, professional stages, track labels) live
  in `src/lib/wcbn.ts`; the application page splits into two step definitions behind one
  shared shell in `src/routes/portal_.application.tsx`.
- Portal navigation and route guards in `portal-shell.tsx` branch on member type; the
  business route becomes type-aware rather than duplicated.
- Admin pages (`admin_.applications.tsx`, `admin_.criteria.tsx`, `admin_.businesses.tsx`)
  gain track filters/tabs and type-aware stage lists and field rendering.
