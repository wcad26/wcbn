export interface WcbnJob {
  id: string;
  business_id: string;
  wcbn_member_id: string;
  title: string;
  slug: string;
  department: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  location_type: "on_site" | "hybrid" | "remote";
  city: string | null;
  country: string;
  salary_min: number | null;
  salary_max: number | null;
  currency_code: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  application_email: string | null;
  application_url: string | null;
  deadline: string | null;
  status: "draft" | "published" | "closed" | "archived";
  views_count: number;
  created_at: string;
  updated_at: string;
  wcbn_businesses?: {
    id: string;
    display_name: string;
    slug: string | null;
    logo_url: string | null;
    sector: string;
    country: string;
    city: string | null;
  } | null;
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract: "Contract",
  internship: "Internship",
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const JOB_DEPARTMENTS = [
  "Technology & Software",
  "Agriculture & Agribusiness",
  "Finance, Accounting & Banking",
  "Marketing & Public Relations",
  "Operations & Logistics",
  "Sales & Business Development",
  "Healthcare & Pharmaceuticals",
  "Education & Training",
  "Engineering & Construction",
  "Creative & Design",
  "Legal & Governance",
  "Executive & Management",
] as const;
