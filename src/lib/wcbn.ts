import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Identity = {
  userId: string;
  email: string | null;
  fullName: string;
  profile: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; region_id: string | null } | null;
  member: { id: string; member_id: string; status: string | null; join_date: string | null; region_id: string } | null;
  regionName: string | null;
  dcgName: string | null;
  dcgActive: boolean;
  wcaActive: boolean;
  wcbnMember: { id: string; category: string; status: string; member_type: string; inducted_at: string | null; next_review_date: string | null; covenant_accepted_at: string | null } | null;
  permissions: string[];
  isStaff: boolean;
};

export const CATEGORIES = ["Associate", "Member", "Leader", "Impact Partner", "Fellow"] as const;

export type Track = "business" | "professional";

export const TRACKS: { value: Track; label: string; blurb: string }[] = [
  { value: "business", label: "Business owner", blurb: "I own or co-own a registered business." },
  { value: "professional", label: "Professional", blurb: "I practise a profession or trade without a registered business." },
];

export function trackLabel(track: string | null | undefined) {
  return track === "professional" ? "Professional" : "Business owner";
}

export const PRACTICE_TYPES = ["Employed", "Self-employed", "Consultant / freelance", "Public service", "Ministry / non-profit", "Student / early career", "Other"] as const;

export const PRACTICE_FIELDS = [
  "Accounting & Finance", "Administration & Operations", "Agriculture & Agronomy", "Architecture & Design",
  "Arts, Media & Communication", "Aviation & Maritime", "Coaching & Training", "Construction & Trades",
  "Consulting & Strategy", "Education & Academia", "Engineering", "Healthcare & Medicine", "Hospitality & Culinary",
  "Human Resources", "Information Technology & Software", "Law & Legal Practice", "Marketing & Sales",
  "Ministry & Chaplaincy", "Psychology & Counselling", "Public Service & Governance", "Research & Data",
  "Science & Laboratory", "Security & Defence", "Social Work & Community Development", "Sports & Fitness", "Other",
] as const;

export const EXPERIENCE_BANDS = ["Less than 2 years", "2–5 years", "6–10 years", "11–20 years", "More than 20 years"] as const;

export const STAGES = [
  { code: "applied", label: "Applied" },
  { code: "wca_verified", label: "WCA verified" },
  { code: "character_review", label: "Character review" },
  { code: "business_review", label: "Business review" },
  { code: "practice_review", label: "Professional practice review" },
  { code: "impact_review", label: "Impact & SDG review" },
  { code: "leadership_review", label: "Leadership review" },
  { code: "interview", label: "Interview" },
  { code: "committee_review", label: "Committee review" },
  { code: "decision", label: "Decision" },
  { code: "inducted", label: "Inducted" },
] as const;

/** Review stages differ per track: businesses are vetted as enterprises, professionals as practitioners. */
export function stagesFor(track: string | null | undefined) {
  const isPro = track === "professional";
  return STAGES.filter((s) => (isPro ? s.code !== "business_review" : s.code !== "practice_review")).map((s) =>
    isPro && s.code === "impact_review" ? { code: s.code, label: "Service & impact review" } : { code: s.code, label: s.label },
  );
}

export const SDGS = [
  "No poverty", "Zero hunger", "Good health & well-being", "Quality education", "Gender equality",
  "Clean water & sanitation", "Affordable & clean energy", "Decent work & economic growth", "Industry, innovation & infrastructure",
  "Reduced inequalities", "Sustainable cities", "Responsible consumption", "Climate action", "Life below water",
  "Life on land", "Peace, justice & institutions", "Partnerships for the goals",
];

export const SECTORS = [
  "Agribusiness & Agriculture", "Automotive & Transport", "Banking & Financial Services", "Construction & Real Estate",
  "Consulting & Professional Services", "Creative Arts, Media & Entertainment", "Education & Training",
  "Energy & Utilities", "Engineering & Manufacturing", "Fashion & Beauty", "Food & Beverage", "Healthcare & Wellness",
  "Hospitality & Tourism", "Information Technology & Software", "Insurance", "Legal Services", "Logistics & Supply Chain",
  "Mining & Natural Resources", "Ministry & Faith-Based Services", "Non-Profit & Social Enterprise",
  "Retail & Trade", "Security Services", "Sports & Recreation", "Telecommunications", "Other",
] as const;

export const COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Congo (Brazzaville)", "Congo (DRC)", "Côte d'Ivoire", "Djibouti",
  "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea",
  "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
  "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles",
  "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
  "Zambia", "Zimbabwe",
  "Australia", "Belgium", "Brazil", "Canada", "China", "Denmark", "France", "Germany", "India", "Ireland", "Italy",
  "Japan", "Netherlands", "New Zealand", "Norway", "Portugal", "Qatar", "Saudi Arabia", "Singapore", "Spain",
  "Sweden", "Switzerland", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Other",
] as const;

export function money(amount: number, currency = "XAF") {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function fetchIdentity(): Promise<Identity | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const [{ data: profile }, { data: member }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, email, phone, region_id").eq("id", user.id).maybeSingle(),
    supabase.from("members").select("id, member_id, status, join_date, region_id").eq("profile_id", user.id).limit(1).maybeSingle(),
    supabase.from("wcbn_user_roles").select("is_active, wcbn_roles(name, permissions, is_active)").eq("user_id", user.id).eq("is_active", true),
  ]);

  let regionName: string | null = null;
  if (member?.region_id ?? profile?.region_id) {
    const { data: region } = await supabase.from("regions").select("name").eq("id", (member?.region_id ?? profile?.region_id)!).maybeSingle();
    regionName = region?.name ?? null;
  }

  let dcgName: string | null = null;
  let dcgActive = false;
  if (member?.id) {
    const { data: dcgRow } = await supabase.from("dcg_members").select("is_active, dcgs(name, is_active)").eq("member_id", member.id).eq("is_active", true).limit(1).maybeSingle();
    const dcg = dcgRow?.dcgs as { name: string; is_active: boolean } | null | undefined;
    dcgName = dcg?.name ?? null;
    dcgActive = !!dcgRow?.is_active && !!dcg?.is_active;
  }

  const { data: wcbnMember } = await supabase.from("wcbn_members").select("id, category, status, member_type, inducted_at, next_review_date, covenant_accepted_at").eq("profile_id", user.id).maybeSingle();

  const permissions = (roleRows ?? []).flatMap((r) => {
    const role = r.wcbn_roles as { permissions: unknown; is_active: boolean } | null;
    if (!role?.is_active) return [];
    return Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  });

  // WCA super admins also hold WCBN leadership access (enforced in the database).
  const { data: superAdmin } = await supabase.rpc("is_super_admin_user", { _user_id: user.id });
  const isStaff = permissions.length > 0 || superAdmin === true;
  if (superAdmin === true && !permissions.includes("*")) permissions.push("*");

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || (user.email ?? "WCBN member");

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? null,
    fullName,
    profile: profile ?? null,
    member: member ?? null,
    regionName,
    dcgName,
    dcgActive,
    wcaActive: member?.status === "active",
    wcbnMember: wcbnMember ?? null,
    permissions,
    isStaff,
  };
}

export const identityQueryOptions = queryOptions({
  queryKey: ["wcbn", "identity"],
  queryFn: fetchIdentity,
  staleTime: 15_000,
  gcTime: 30 * 60_000,
});

export function useIdentity() {
  return useQuery(identityQueryOptions);
}

export function can(identity: Identity | null | undefined, permission: string) {
  if (!identity) return false;
  return identity.permissions.includes("*") || identity.permissions.includes(permission);
}

/** Creates the WCBN membership record for the signed-in member on first use. */
export async function ensureWcbnMember(identity: Identity, memberType: Track = "business") {
  if (identity.wcbnMember) return identity.wcbnMember.id;
  if (!identity.member) throw new Error("No active World Changers Association member record was found for your account.");
  const { data, error } = await supabase
    .from("wcbn_members")
    .insert({ profile_id: identity.userId, member_id: identity.member.id, category: "Associate", status: "prospect", member_type: memberType })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function useInvalidateIdentity() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["wcbn", "identity"] });
}

export const DOC_BUCKET = "wcbn-documents";

/** Uploads a private supporting document and returns its storage path. */
export async function uploadDocument(userId: string, folder: string, file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `${userId}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(DOC_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Creates a short-lived link so the owner (or leadership) can open a private document. */
export async function documentUrl(path: string) {
  const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
