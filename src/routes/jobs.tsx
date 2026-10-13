import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Globe,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { PublicPage } from "@/components/wcbn/public-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/wcbn";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_DEPARTMENTS,
  LOCATION_TYPE_LABELS,
  type WcbnJob,
} from "@/lib/wcbn-jobs";
import gradient from "@/assets/wcbn-gradient.jpg";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "WCBN Careers & Opportunities" },
      {
        name: "description",
        content:
          "Discover career opportunities and purpose-driven jobs posted by vetted enterprises in the World Changers Business Network.",
      },
      { property: "og:title", content: "WCBN Careers & Opportunities" },
      {
        property: "og:description",
        content: "Explore job vacancies and talent opportunities across verified WCBN businesses.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PublicJobsPage,
});

export function PublicJobsPage() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationModelFilter, setLocationModelFilter] = useState("all");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["public", "jobs"],
    queryFn: async () =>
      (
        await supabase
          .from("wcbn_jobs")
          .select("*, wcbn_businesses(id, display_name, slug, logo_url, sector, country, city)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
      ).data as unknown as WcbnJob[] ?? [],
  });

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      (job.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.wcbn_businesses?.display_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === "all" || job.department === departmentFilter;
    const matchesType = typeFilter === "all" || job.employment_type === typeFilter;
    const matchesLocation = locationModelFilter === "all" || job.location_type === locationModelFilter;
    return matchesSearch && matchesDept && matchesType && matchesLocation;
  });

  return (
    <PublicPage
      eyebrow="Careers & Opportunities"
      title="Work with World Changers"
      image={gradient}
      intro="Join high-impact, kingdom-principled enterprises across the globe. Explore open roles across sectors including technology, agribusiness, manufacturing, finance and services."
    >
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Search & Filters */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, company name, skill or city..."
              className="pl-11 h-12 rounded-2xl text-base"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Department / Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors & Departments</SelectItem>
                {JOB_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employment Types</SelectItem>
                <SelectItem value="full_time">Full-Time</SelectItem>
                <SelectItem value="part_time">Part-Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationModelFilter} onValueChange={setLocationModelFilter}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Workplace Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workplace Models</SelectItem>
                <SelectItem value="on_site">On-site</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="remote">Fully Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Header */}
        <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing <strong className="text-foreground">{filteredJobs.length}</strong> opportunity
            {filteredJobs.length === 1 ? "" : "ies"}
          </p>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : filteredJobs.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {job.wcbn_businesses?.logo_url ? (
                        <img
                          src={job.wcbn_businesses.logo_url}
                          alt={job.wcbn_businesses.display_name}
                          className="size-12 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="grid size-12 place-items-center rounded-xl gradient-brand text-white font-bold text-base">
                          {job.wcbn_businesses?.display_name?.slice(0, 1) || "W"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <span>{job.wcbn_businesses?.display_name || "Enterprise"}</span>
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {job.wcbn_businesses?.sector || job.department}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 text-primary">
                      {LOCATION_TYPE_LABELS[job.location_type] || job.location_type}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-primary" />
                      {[job.city, job.country].filter(Boolean).join(", ") || "Remote"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3 text-primary" />
                      {EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                    </span>
                    {job.salary_min && (
                      <span className="font-semibold text-foreground/85">
                        {money(job.salary_min, job.currency_code)}
                        {job.salary_max ? ` - ${money(job.salary_max, job.currency_code)}` : "+"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                  {job.deadline ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      Closes {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Actively Recruiting
                    </span>
                  )}
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/jobs/$slug" params={{ slug: job.slug }}>
                      View & Apply
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
            <Briefcase className="mx-auto size-8 text-muted-foreground" />
            <h3 className="font-semibold text-lg text-foreground">No roles match your search filters</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Try adjusting your keywords or clearing the sector filters to see more opportunities.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setDepartmentFilter("all");
                setTypeFilter("all");
                setLocationModelFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </section>
    </PublicPage>
  );
}
