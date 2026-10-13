import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, PRACTICE_FIELDS, SDGS, SECTORS, ensureWcbnMember, slugify, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/business")({ component: BusinessPage });

type Form = {
  display_name: string; legal_name: string; sector: string; country: string; city: string;
  summary: string; description: string; website_url: string; email: string; phone: string;
  logo_url: string; cover_url: string; years_operating: string; employee_count: string; registration_number: string; sdgs: number[];
};
const EMPTY: Form = { display_name: "", legal_name: "", sector: "", country: "", city: "", summary: "", description: "", website_url: "", email: "", phone: "", logo_url: "", cover_url: "", years_operating: "", employee_count: "", registration_number: "", sdgs: [] };

type Business = {
  id: string; display_name: string; legal_name: string; slug: string | null; sector: string; country: string; city: string | null;
  summary: string | null; description: string | null; website_url: string | null; email: string | null; phone: string | null;
  logo_url: string | null; cover_url: string | null; years_operating: number | null; employee_count: number | null;
  registration_number: string | null; vetting_status: string; is_active: boolean; created_at: string;
  wcbn_business_sdgs: { sdg_number: number }[] | null;
};

type Tab = "about" | "contact" | "impact";

function statusMeta(b: Business) {
  if (b.is_active) return { label: "Live in directory", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", note: "Your profile is published in the public WCBN directory." };
  if (b.vetting_status === "approved") return { label: "Approved", tone: "bg-primary/12 text-primary", note: "Approved by leadership. It will appear publicly once activated." };
  if (b.vetting_status === "rejected") return { label: "Not approved", tone: "bg-destructive/12 text-destructive", note: "Not approved. Contact WCBN leadership for guidance." };
  if (b.vetting_status === "changes_requested") return { label: "Changes requested", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", note: "Leadership asked for updates. Edit your profile and save to resubmit." };
  return { label: "Under vetting", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", note: "Awaiting vetting by WCBN leadership. You can keep refining meanwhile." };
}

function BusinessPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  // Professionals use the same listing machinery, presented as a personal professional profile.
  const pro = identity?.wcbnMember?.member_type === "professional";
  const t = {
    entity: pro ? "professional profile" : "business profile",
    Entity: pro ? "Professional profile" : "Business profile",
    name: pro ? "Full name as it should appear" : "Business name",
    sector: pro ? "Field of practice" : "Sector",
    about: pro ? "About my practice" : "About the business",
    story: pro ? "Services, expertise and experience" : "Full story, products and services",
    years: pro ? "Years of experience" : "Years operating",
    cover: pro ? "Photo or cover image link" : "Cover image link",
    logo: pro ? "Profile photo link" : "Logo image link",
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [tab, setTab] = useState<Tab>("about");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["portal", "businesses", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () =>
      ((await supabase.from("wcbn_businesses").select("*, wcbn_business_sdgs(sdg_number)").eq("owner_member_id", wcbnId!).order("created_at")).data ?? []) as unknown as Business[],
  });

  useEffect(() => {
    if (!businesses?.length) return;
    setSelectedId((cur) => (cur && businesses.some((b) => b.id === cur) ? cur : businesses[0]!.id));
  }, [businesses]);

  const current = useMemo(() => businesses?.find((b) => b.id === selectedId) ?? null, [businesses, selectedId]);

  const openEditor = (b: Business | null) => {
    setEditingId(b?.id ?? null);
    setForm(
      b
        ? {
            display_name: b.display_name, legal_name: b.legal_name, sector: b.sector, country: b.country, city: b.city ?? "",
            summary: b.summary ?? "", description: b.description ?? "", website_url: b.website_url ?? "", email: b.email ?? "", phone: b.phone ?? "",
            logo_url: b.logo_url ?? "", cover_url: b.cover_url ?? "", years_operating: String(b.years_operating ?? ""), employee_count: String(b.employee_count ?? ""),
            registration_number: b.registration_number ?? "", sdgs: b.wcbn_business_sdgs?.map((s) => s.sdg_number) ?? [],
          }
        : EMPTY,
    );
    setDialogOpen(true);
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wcbn_businesses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${t.Entity} removed`);
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["portal", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const editing = businesses?.find((b) => b.id === editingId) ?? null;
      const payload = {
        owner_member_id: memberId,
        display_name: form.display_name,
        legal_name: form.legal_name || form.display_name,
        slug: editing?.slug ?? (slugify(form.display_name) || `business-${Date.now()}`),
        sector: form.sector, country: form.country, city: form.city || null,
        summary: form.summary || null, description: form.description || null,
        website_url: form.website_url || null, email: form.email || null, phone: form.phone || null,
        logo_url: form.logo_url || null, cover_url: form.cover_url || null,
        years_operating: form.years_operating ? Number(form.years_operating) : null,
        employee_count: form.employee_count ? Number(form.employee_count) : null,
        registration_number: form.registration_number || null,
        listing_type: pro ? "professional" : "business",
        ...(editing?.vetting_status === "approved" ? {} : { vetting_status: "pending" }),
      };
      let businessId = editingId;
      if (editingId) {
        const { error } = await supabase.from("wcbn_businesses").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("wcbn_businesses").insert(payload).select("id").single();
        if (error) throw error;
        businessId = data.id;
      }
      await supabase.from("wcbn_business_sdgs").delete().eq("business_id", businessId!);
      if (form.sdgs.length) {
        const { error } = await supabase.from("wcbn_business_sdgs").insert(form.sdgs.map((n) => ({ business_id: businessId!, sdg_number: n })));
        if (error) throw error;
      }
      return businessId!;
    },
    onSuccess: (id) => {
      toast.success(`${t.Entity} updated. Leadership vets changes before it appears publicly.`);
      setDialogOpen(false);
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["portal", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const sdgNumbers = current?.wcbn_business_sdgs?.map((s) => s.sdg_number).sort((a, b) => a - b) ?? [];

  // Profile strength: what is still missing from the listing.
  const checklist = current
    ? [
        { label: pro ? "Add a profile photo" : "Add a logo", ok: !!current.logo_url },
        { label: "Add a cover image", ok: !!current.cover_url },
        { label: "Write a short summary", ok: !!current.summary },
        { label: "Tell your full story", ok: !!current.description },
        { label: "Add contact details", ok: !!(current.email || current.phone || current.website_url) },
        { label: "Pick SDG commitments", ok: sdgNumbers.length > 0 },
        { label: pro ? "Add credentials" : "Add registration number", ok: !!current.registration_number },
      ]
    : [];
  const done = checklist.filter((c) => c.ok).length;
  const percent = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
  const R = 30;
  const C = 2 * Math.PI * R;

  const labelCls = "text-xs font-semibold text-muted-foreground";

  return (
    <MemberPage
      title={pro ? "My professional profile" : "My business"}
      description="How the network sees you. Leadership vets every change before it appears publicly."
      action={
        businesses?.length && !pro ? (
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => openEditor(null)}>
            <Plus className="size-3.5" />
            <span>Add business</span>
          </Button>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      )}

      {!isLoading && !businesses?.length && (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl gradient-brand text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <h2 className="mt-5 text-lg font-bold">No {t.entity} yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Create your profile so partners and clients can discover what you do. Once leadership vets it, it appears in the public WCBN directory.
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => openEditor(null)}>
            <Plus className="size-4" />
            <span>Create {t.entity}</span>
          </Button>
        </div>
      )}

      {!isLoading && current && (
        <div className="space-y-5">
          {businesses && businesses.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    b.id === current.id ? "gradient-brand text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {b.display_name}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            {/* MAIN COLUMN */}
            <div className="min-w-0 space-y-5">
              {/* Hero */}
              <section className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs">
                <div className="h-28 sm:h-40">
                  {current.cover_url ? (
                    <img src={current.cover_url} alt={`${current.display_name} cover`} className="size-full object-cover" />
                  ) : (
                    <div className="size-full gradient-brand opacity-90" />
                  )}
                </div>
                <div className="px-5 pb-5">
                  <div className="-mt-9 flex items-end justify-between gap-3">
                    <div className="size-[72px] shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-sm">
                      {current.logo_url ? (
                        <img src={current.logo_url} alt={`${current.display_name} logo`} className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-lg font-bold text-muted-foreground">
                          {current.display_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`mb-1 rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta(current).tone}`}>
                      {statusMeta(current).label}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-2xl">
                    {current.display_name}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{current.sector}</span>
                    {(current.city || current.country) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {[current.city, current.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </p>
                  {current.summary && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.summary}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-xl" onClick={() => openEditor(current)}>
                      <Pencil className="size-3.5" />
                      <span>Edit profile</span>
                    </Button>
                    {current.is_active && current.slug && (
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link to="/businesses/$slug" params={{ slug: current.slug }}>
                          <ExternalLink className="size-3.5" />
                          <span>Public page</span>
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-muted-foreground hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => { if (confirm(`Remove this ${t.entity}?`)) remove.mutate(current.id); }}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>

                  <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-[11px] leading-snug text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    {statusMeta(current).note}
                  </p>
                </div>
              </section>

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact icon={CalendarDays} label={t.years} value={current.years_operating ? String(current.years_operating) : "—"} />
                {!pro && <Fact icon={Users} label="Team size" value={current.employee_count ? String(current.employee_count) : "—"} />}
                <Fact icon={Target} label="SDGs" value={String(sdgNumbers.length)} />
                <Fact icon={ShieldCheck} label="Vetting" value={current.is_active ? "Live" : current.vetting_status === "approved" ? "Approved" : "Pending"} />
              </div>

              {/* Tabs */}
              <section className="rounded-3xl border border-border/80 bg-card p-2 shadow-xs">
                <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/60 p-1">
                  {([
                    ["about", "About"],
                    ["contact", "Contact"],
                    ["impact", "Impact"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`rounded-xl py-2 text-xs font-semibold transition ${
                        tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-5">
                  {tab === "about" && (
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{t.about}</h3>
                      {current.description ? (
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{current.description}</p>
                      ) : (
                        <EmptyHint text="No story added yet. Describe your products, services and journey." onEdit={() => openEditor(current)} />
                      )}
                    </div>
                  )}

                  {tab === "contact" && (
                    <ul className="divide-y divide-border/60">
                      <Detail icon={Globe} label="Website" value={current.website_url} href={current.website_url ?? undefined} />
                      <Detail icon={Mail} label="Email" value={current.email} href={current.email ? `mailto:${current.email}` : undefined} />
                      <Detail icon={Phone} label="Phone" value={current.phone} href={current.phone ? `tel:${current.phone}` : undefined} />
                      <Detail icon={MapPin} label="Location" value={[current.city, current.country].filter(Boolean).join(", ") || null} />
                      {!pro && <Detail icon={Building2} label="Legal name" value={current.legal_name} />}
                      <Detail icon={ShieldCheck} label={pro ? "Licence / professional body" : "Registration number"} value={current.registration_number} />
                    </ul>
                  )}

                  {tab === "impact" && (
                    <div>
                      <h3 className="text-sm font-bold text-foreground">SDG commitments</h3>
                      {sdgNumbers.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {sdgNumbers.map((n) => (
                            <span key={n} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                              {n}. {SDGS[n - 1]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <EmptyHint text="No SDG commitments selected yet." onEdit={() => openEditor(current)} />
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* SIDE COLUMN */}
            <aside className="space-y-5">
              <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="relative size-[72px] shrink-0">
                    <svg viewBox="0 0 72 72" className="size-full -rotate-90">
                      <circle cx="36" cy="36" r={R} fill="none" strokeWidth="7" className="stroke-muted" />
                      <circle
                        cx="36" cy="36" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
                        className="stroke-primary transition-all duration-500"
                        strokeDasharray={C}
                        strokeDashoffset={C - (C * percent) / 100}
                      />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-sm font-bold text-foreground">{percent}%</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Profile strength</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {percent === 100 ? "Your profile is complete." : `${checklist.length - done} step${checklist.length - done === 1 ? "" : "s"} left to complete.`}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {checklist.map((c) => (
                    <li key={c.label} className="flex items-center gap-2.5 text-xs">
                      <span className={`grid size-4 shrink-0 place-items-center rounded-full ${c.ok ? "bg-emerald-500 text-white" : "border border-border"}`}>
                        {c.ok && <Check className="size-2.5" />}
                      </span>
                      <span className={c.ok ? "text-muted-foreground line-through decoration-muted-foreground/40" : "font-medium text-foreground"}>{c.label}</span>
                    </li>
                  ))}
                </ul>
                {percent < 100 && (
                  <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl" onClick={() => openEditor(current)}>
                    Complete profile
                  </Button>
                )}
              </section>

              {!pro && (
                <section className="rounded-3xl border border-border/80 bg-card p-2 shadow-xs">
                  <LinkRow to="/portal/jobs" icon={Briefcase} title="Jobs & hiring" hint="Post and manage roles" />
                  <LinkRow to="/portal/impact" icon={Target} title="Annual impact" hint="Reports & commitment" />
                </section>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit ${t.entity}` : `Create ${t.entity}`}</DialogTitle>
            <DialogDescription>Changes are reviewed by WCBN leadership before they show publicly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Group title="Basics">
              <F label={t.name}><Input className="h-11 rounded-xl" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></F>
              {!pro && <F label="Registered legal name"><Input className="h-11 rounded-xl" value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} /></F>}
              <F label={t.sector}>
                <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={pro ? "Select field" : "Select sector"} /></SelectTrigger>
                  <SelectContent className="max-h-72">{(pro ? PRACTICE_FIELDS : SECTORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label={t.years}><Input className="h-11 rounded-xl" type="number" inputMode="numeric" value={form.years_operating} onChange={(e) => set("years_operating", e.target.value)} /></F>
              {!pro && <F label="Team size"><Input className="h-11 rounded-xl" type="number" inputMode="numeric" value={form.employee_count} onChange={(e) => set("employee_count", e.target.value)} /></F>}
              <F label={pro ? "Licence / professional body (optional)" : "Registration number (optional)"}><Input className="h-11 rounded-xl" value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></F>
            </Group>

            <Group title="Location & contact">
              <F label="Country">
                <Select value={form.country} onValueChange={(v) => set("country", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent className="max-h-72">{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="City"><Input className="h-11 rounded-xl" value={form.city} onChange={(e) => set("city", e.target.value)} /></F>
              <F label="Contact email"><Input className="h-11 rounded-xl" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></F>
              <F label="Phone"><Input className="h-11 rounded-xl" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
              <F label={pro ? "Website or portfolio" : "Website"} full><Input className="h-11 rounded-xl" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" /></F>
            </Group>

            <Group title="Story & imagery">
              <F label={t.logo}><Input className="h-11 rounded-xl" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" /></F>
              <F label={t.cover}><Input className="h-11 rounded-xl" value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://" /></F>
              <F label="Short summary" full><Input className="h-11 rounded-xl" value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={160} /></F>
              <F label={t.story} full><Textarea rows={6} className="rounded-xl" value={form.description} onChange={(e) => set("description", e.target.value)} /></F>
            </Group>

            <div>
              <Label className={`${labelCls} mb-2 block`}>SDG contributions</Label>
              <div className="flex flex-wrap gap-1.5">
                {SDGS.map((label, i) => {
                  const n = i + 1; const on = form.sdgs.includes(n);
                  return (
                    <button type="button" key={n} onClick={() => set("sdgs", on ? form.sdgs.filter((s) => s !== n) : [...form.sdgs, n])}
                      className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                      {n}. {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" disabled={save.isPending || !form.display_name || !form.sector || !form.country} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPage>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 truncate text-lg font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; href?: string | undefined }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer" className="break-words text-sm font-medium text-primary hover:underline">{value}</a>
          ) : (
            <p className="break-words text-sm font-medium text-foreground">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
    </li>
  );
}

function EmptyHint({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={onEdit}>
        <Pencil className="size-3.5" />
        <span>Edit profile</span>
      </Button>
    </div>
  );
}

function LinkRow({ to, icon: Icon, title, hint }: { to: "/portal/jobs" | "/portal/impact"; icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-muted/60">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{title}</h4>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function F({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
