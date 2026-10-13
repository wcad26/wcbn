import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { MetricCard } from "@/components/wcbn/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { money, slugify, useIdentity } from "@/lib/wcbn";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_DEPARTMENTS,
  LOCATION_TYPE_LABELS,
  type WcbnJob,
} from "@/lib/wcbn-jobs";

export const Route = createFileRoute("/portal/jobs")({ component: PortalJobsPage });

interface JobFormData {
  business_id: string;
  title: string;
  department: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  location_type: "on_site" | "hybrid" | "remote";
  city: string;
  country: string;
  salary_min: string;
  salary_max: string;
  currency_code: string;
  description: string;
  requirements: string;
  benefits: string;
  application_email: string;
  application_url: string;
  deadline: string;
  status: "draft" | "published" | "closed";
}

const DEFAULT_FORM: JobFormData = {
  business_id: "",
  title: "",
  department: "Technology & Software",
  employment_type: "full_time",
  location_type: "on_site",
  city: "",
  country: "Cameroon",
  salary_min: "",
  salary_max: "",
  currency_code: "XAF",
  description: "",
  requirements: "",
  benefits: "",
  application_email: "",
  application_url: "",
  deadline: "",
  status: "published",
};

export function PortalJobsPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormData>(DEFAULT_FORM);
  const [search, setSearch] = useState("");

  // Query: Member's businesses
  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "member-businesses", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () =>
      (
        await supabase
          .from("wcbn_businesses")
          .select("id, display_name, slug, sector, country, city")
          .eq("owner_member_id", wcbnId!)
      ).data ?? [],
  });

  // Query: Member's jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["portal", "member-jobs", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () =>
      (
        await supabase
          .from("wcbn_jobs")
          .select("*, wcbn_businesses(id, display_name, slug, logo_url, sector, country, city)")
          .eq("wcbn_member_id", wcbnId!)
          .order("created_at", { ascending: false })
      ).data as unknown as WcbnJob[] ?? [],
  });

  const primaryBiz = businesses[0] ?? null;

  const handleOpenNew = () => {
    setEditingJobId(null);
    setForm({
      ...DEFAULT_FORM,
      business_id: primaryBiz?.id ?? "",
      city: primaryBiz?.city ?? "",
      country: primaryBiz?.country ?? "Cameroon",
      application_email: identity?.email ?? "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (j: WcbnJob) => {
    setEditingJobId(j.id);
    setForm({
      business_id: j.business_id,
      title: j.title,
      department: j.department || "Technology & Software",
      employment_type: j.employment_type,
      location_type: j.location_type,
      city: j.city || "",
      country: j.country,
      salary_min: j.salary_min ? String(j.salary_min) : "",
      salary_max: j.salary_max ? String(j.salary_max) : "",
      currency_code: j.currency_code || "XAF",
      description: j.description,
      requirements: j.requirements || "",
      benefits: j.benefits || "",
      application_email: j.application_email || "",
      application_url: j.application_url || "",
      deadline: j.deadline ? j.deadline.slice(0, 10) : "",
      status: j.status === "archived" ? "closed" : (j.status as "draft" | "published" | "closed"),
    });
    setDialogOpen(true);
  };

  // Mutation: Save Job
  const saveJobMutation = useMutation({
    mutationFn: async () => {
      if (!wcbnId) throw new Error("No active WCBN membership");
      if (!form.title.trim()) throw new Error("Please enter a job title.");
      if (!form.business_id) throw new Error("Please select the hiring business.");
      if (!form.description.trim()) throw new Error("Please provide a role description.");

      const baseSlug = slugify(form.title) || `role-${Date.now().toString().slice(-6)}`;
      const payload = {
        business_id: form.business_id,
        wcbn_member_id: wcbnId,
        title: form.title.trim(),
        department: form.department,
        employment_type: form.employment_type,
        location_type: form.location_type,
        city: form.city.trim() || null,
        country: form.country.trim() || "Cameroon",
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        currency_code: form.currency_code || "XAF",
        description: form.description.trim(),
        requirements: form.requirements.trim() || null,
        benefits: form.benefits.trim() || null,
        application_email: form.application_email.trim() || null,
        application_url: form.application_url.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        status: form.status,
      };

      if (editingJobId) {
        const { error } = await supabase.from("wcbn_jobs").update(payload).eq("id", editingJobId);
        if (error) throw error;
      } else {
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("wcbn_jobs").insert({ ...payload, slug });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingJobId ? "Job opportunity updated" : "Job opportunity published successfully!");
      setDialogOpen(false);
      setEditingJobId(null);
      queryClient.invalidateQueries({ queryKey: ["portal", "member-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation: Delete Job
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wcbn_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job posting removed");
      queryClient.invalidateQueries({ queryKey: ["portal", "member-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishedCount = jobs.filter((j) => j.status === "published").length;
  const draftCount = jobs.filter((j) => j.status === "draft").length;
  const closedCount = jobs.filter((j) => j.status === "closed").length;

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (j.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MemberPage
      title="Jobs & Talent Hub"
      description="Post career opportunities and hire qualified talent across the WCBN ecosystem. Published jobs appear on the public WCBN Career Board."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/jobs" target="_blank">
              <span>View Public Jobs Board</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
          <Button onClick={handleOpenNew} size="sm" className="gap-2 shadow-sm">
            <Plus className="size-4" />
            <span>Post New Job</span>
          </Button>
        </div>
      }
    >
      {/* Top Metrics Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Job Postings"
          value={jobs.length}
          detail="All career listings created"
          icon={Briefcase}
        />
        <MetricCard
          label="Active / Live Roles"
          value={publishedCount}
          detail="Live on public /jobs board"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Drafts / Preparing"
          value={draftCount}
          detail="Unpublished roles"
          icon={Clock}
        />
        <MetricCard
          label="Closed / Filled"
          value={closedCount}
          detail="Archived opportunities"
          icon={Users}
        />
      </div>

      {/* Main Content Area */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, department, or city..."
              className="pl-9 rounded-xl h-10"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} roles
          </span>
        </div>

        {/* Jobs List */}
        <div className="mt-6 divide-y divide-border/60">
          {!filteredJobs.length ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Briefcase className="size-6" />
              </div>
              <h3 className="font-semibold text-foreground text-base">No Job Opportunities Posted</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Attract talented professionals to your enterprise by publishing full-time, part-time, or remote roles.
              </p>
              <Button onClick={handleOpenNew} size="sm" className="mt-2">
                <Plus className="mr-2 size-4" /> Post Your First Job
              </Button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/10 transition rounded-xl px-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">{job.title}</h3>
                    <Badge
                      className={`text-xs capitalize ${
                        job.status === "published"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : job.status === "draft"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {job.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {LOCATION_TYPE_LABELS[job.location_type] || job.location_type}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5 text-primary" />
                      {job.wcbn_businesses?.display_name || "Enterprise"}
                    </span>
                    {(job.city || job.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" />
                        {[job.city, job.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {job.salary_min && (
                      <span className="flex items-center gap-1 font-semibold text-foreground/80">
                        {money(job.salary_min, job.currency_code)}
                        {job.salary_max ? ` – ${money(job.salary_max, job.currency_code)}` : "+"}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === "published" && (
                    <Button asChild variant="ghost" size="sm" className="rounded-xl h-9 text-xs">
                      <Link to="/jobs/$slug" params={{ slug: job.slug }} target="_blank">
                        <Eye className="mr-1.5 size-3.5" /> View
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-xs"
                    onClick={() => handleOpenEdit(job)}
                  >
                    <Pencil className="mr-1.5 size-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (window.confirm(`Delete job posting "${job.title}"?`)) {
                        deleteJobMutation.mutate(job.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Post / Edit Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              <span>{editingJobId ? "Edit Job Opportunity" : "Post New Job Opportunity"}</span>
            </DialogTitle>
            <DialogDescription>
              Fill out the role details. Published listings appear live on the WCBN network jobs board.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hiring Business *
                </Label>
                <Select
                  value={form.business_id}
                  onValueChange={(v) => setForm({ ...form, business_id: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Department / Sector
                </Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Title *
              </Label>
              <Input
                placeholder="e.g. Senior Agricultural Operations Manager"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Employment Type
                </Label>
                <Select
                  value={form.employment_type}
                  onValueChange={(v: any) => setForm({ ...form, employment_type: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-Time</SelectItem>
                    <SelectItem value="part_time">Part-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Workplace Model
                </Label>
                <Select
                  value={form.location_type}
                  onValueChange={(v: any) => setForm({ ...form, location_type: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_site">On-site</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Fully Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Publish Status
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v: any) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published (Live)</SelectItem>
                    <SelectItem value="draft">Draft (Private)</SelectItem>
                    <SelectItem value="closed">Closed / Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  City / Location
                </Label>
                <Input
                  placeholder="e.g. Douala"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Country
                </Label>
                <Input
                  placeholder="e.g. Cameroon"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Salary Minimum
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 350000"
                  value={form.salary_min}
                  onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Salary Maximum
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 600000"
                  value={form.salary_max}
                  onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Currency
                </Label>
                <Input
                  placeholder="XAF"
                  value={form.currency_code}
                  onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role Description & Key Responsibilities *
              </Label>
              <Textarea
                rows={4}
                placeholder="Detailed overview of the role, day-to-day responsibilities, and team structure..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements & Qualifications
              </Label>
              <Textarea
                rows={3}
                placeholder="Education, years of experience, technical proficiencies, languages, etc."
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                className="rounded-xl resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Application Email
                </Label>
                <Input
                  type="email"
                  placeholder="careers@enterprise.com"
                  value={form.application_email}
                  onChange={(e) => setForm({ ...form, application_email: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Application Deadline
                </Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Application URL (Optional external link)
              </Label>
              <Input
                placeholder="https://company.com/apply"
                value={form.application_url}
                onChange={(e) => setForm({ ...form, application_url: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => saveJobMutation.mutate()}
              disabled={saveJobMutation.isPending}
              className="rounded-xl px-6"
            >
              {saveJobMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {editingJobId ? "Save Changes" : "Publish Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPage>
  );
}
