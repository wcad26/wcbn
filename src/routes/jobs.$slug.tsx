import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { PublicPage } from "@/components/wcbn/public-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/wcbn";
import {
  EMPLOYMENT_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  type WcbnJob,
} from "@/lib/wcbn-jobs";
import gradient from "@/assets/wcbn-gradient.jpg";

export const Route = createFileRoute("/jobs/$slug")({
  component: PublicJobDetailPage,
});

export function PublicJobDetailPage() {
  const { slug } = Route.useParams();

  const { data: job, isLoading } = useQuery({
    queryKey: ["public", "job", slug],
    queryFn: async () =>
      (
        await supabase
          .from("wcbn_jobs")
          .select("*, wcbn_businesses(*)")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle()
      ).data as unknown as WcbnJob | null,
  });

  if (isLoading) {
    return (
      <PublicPage eyebrow="Opportunity Details" title="Loading Career Posting..." image={gradient} intro="">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </PublicPage>
    );
  }

  if (!job) {
    return (
      <PublicPage eyebrow="Not Found" title="Opportunity Not Available" image={gradient} intro="">
        <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <p className="text-muted-foreground">This job listing may have been filled, expired, or removed.</p>
          <Button asChild>
            <Link to="/jobs">Back to All Jobs</Link>
          </Button>
        </div>
      </PublicPage>
    );
  }

  const biz = job.wcbn_businesses;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job.title,
        text: `Explore this role at ${biz?.display_name || "WCBN Enterprise"}: ${job.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Job link copied to clipboard");
    }
  };

  return (
    <PublicPage
      eyebrow="Career Opportunity"
      title={job.title}
      image={gradient}
      intro={`Open position with ${biz?.display_name || "a verified WCBN enterprise"}.`}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/jobs">
              <ArrowLeft className="size-4" />
              <span>Back to all jobs</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-xl">
            <Share2 className="size-4" />
            <span>Share</span>
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Job Details */}
          <div className="space-y-8 lg:col-span-8">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div className="flex items-center gap-4">
                  {biz?.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.display_name}
                      className="size-16 rounded-2xl object-cover border border-border"
                    />
                  ) : (
                    <div className="grid size-16 place-items-center rounded-2xl gradient-brand text-white font-bold text-xl">
                      {biz?.display_name?.slice(0, 1) || "W"}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span>{biz?.display_name || "Enterprise"}</span>
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </h2>
                    <p className="text-sm text-muted-foreground">{biz?.sector || job.department}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                    {LOCATION_TYPE_LABELS[job.location_type] || job.location_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                  </Badge>
                </div>
              </div>

              {/* Key Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Location
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {[job.city, job.country].filter(Boolean).join(", ") || "Remote"}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="size-3.5 text-primary" /> Department
                  </span>
                  <p className="font-semibold text-foreground text-sm">{job.department || "General"}</p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" /> Deadline
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open Until Filled"}
                  </p>
                </div>
              </div>

              {/* Compensation if available */}
              {job.salary_min && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                      Compensation / Salary Bracket
                    </span>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {money(job.salary_min, job.currency_code)}
                      {job.salary_max ? ` – ${money(job.salary_max, job.currency_code)}` : "+"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Competitive Package</span>
                </div>
              )}

              {/* Job Description */}
              <div className="space-y-3 pt-2">
                <h3 className="text-lg font-bold text-foreground">Role Overview & Responsibilities</h3>
                <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <h3 className="text-lg font-bold text-foreground">Candidate Requirements</h3>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                    {job.requirements}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <h3 className="text-lg font-bold text-foreground">Perks & Growth Opportunities</h3>
                  <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                    {job.benefits}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Apply Action & Hiring Company Dossier */}
          <div className="space-y-6 lg:col-span-4">
            {/* Apply Card */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
              <h3 className="text-base font-bold text-foreground">Ready to Apply?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send your resume and cover letter directly to the enterprise hiring team.
              </p>

              {job.application_email && (
                <Button asChild size="lg" className="w-full rounded-xl gap-2 font-semibold">
                  <a
                    href={`mailto:${job.application_email}?subject=Application for ${encodeURIComponent(job.title)}`}
                  >
                    <Mail className="size-4" />
                    <span>Apply via Email</span>
                  </a>
                </Button>
              )}

              {job.application_url && (
                <Button asChild variant="outline" size="lg" className="w-full rounded-xl gap-2">
                  <a href={job.application_url} target="_blank" rel="noreferrer">
                    <span>Apply on Company Portal</span>
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}

              <p className="text-[11px] text-center text-muted-foreground">
                Verified opportunity under WCBN Business Network Standards.
              </p>
            </div>

            {/* Hiring Business Profile Card */}
            {biz && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                  <Building2 className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">About the Employer</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <strong className="text-sm text-foreground block">{biz.display_name}</strong>
                  <p className="text-muted-foreground line-clamp-4 leading-relaxed">
                    {biz.summary || biz.description || "A vetted enterprise in the World Changers Business Network."}
                  </p>
                </div>

                {biz.slug && (
                  <Button asChild variant="outline" size="sm" className="w-full rounded-xl gap-2 text-xs">
                    <Link to="/businesses/$slug" params={{ slug: biz.slug }}>
                      <span>View Full Business Profile</span>
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicPage>
  );
}
