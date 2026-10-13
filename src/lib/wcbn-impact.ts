import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnnualReviewRow {
  id: string;
  review_year: number;
  status: string;
  jobs_created: number;
  people_trained: number;
  businesses_supported: number;
  community_initiatives: number;
  achievements: string | null;
  challenges: string | null;
  next_objectives: string | null;
  sdg_evidence: unknown;
  submitted_at: string | null;
  reviewed_at?: string | null;
  review_feedback?: string | null;
}

export function reviewStatusLabel(status: string | undefined | null) {
  if (status === "approved") return "Approved & live";
  if (status === "submitted") return "Pending review";
  if (status === "changes_requested") return "Revision requested";
  return "Not submitted";
}

/** Shared loader for the annual impact overview and its two form pages. */
export function useImpactData(wcbnId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "impact", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => {
      const [commitment, reviews, biz] = await Promise.all([
        supabase.from("wcbn_impact_commitments").select("*").eq("wcbn_member_id", wcbnId!).maybeSingle(),
        supabase.from("wcbn_annual_reviews").select("*").eq("wcbn_member_id", wcbnId!).order("review_year", { ascending: false }),
        supabase.from("wcbn_businesses").select("id, slug, display_name").eq("owner_member_id", wcbnId!).limit(1).maybeSingle(),
      ]);
      return {
        commitment: commitment.data,
        reviews: (reviews.data ?? []) as unknown as AnnualReviewRow[],
        business: biz.data,
      };
    },
  });
}
