import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, CalendarDays, CheckCircle2, ExternalLink, Globe, Loader2, Mail, MapPin,
  Pencil, Phone, Plus, ShieldCheck, Sparkles, Target, Trash2, Users,
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
import { COUNTRIES, SDGS, SECTORS, ensureWcbnMember, slugify, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal_/business")({ component: BusinessPage });

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

function statusMeta(b: Business) {
  if (b.is_active) return { label: "Live in catalog", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", note: "This profile is published in the public WCBN business catalog." };
  if (b.vetting_status === "approved") return { label: "Approved", tone: "bg-primary/12 text-primary", note: "Approved by leadership. It will appear publicly once activated." };
  if (b.vetting_status === "rejected") return { label: "Not approved", tone: "bg-destructive/12 text-destructive", note: "Not approved. Contact WCBN leadership for guidance on what to strengthen." };
  if (b.vetting_status === "changes_requested") return { label: "Changes requested", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", note: "Leadership asked for updates. Edit the profile and save to resubmit." };
  return { label: "Under vetting", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", note: "Awaiting vetting by WCBN leadership. You can keep refining the profile meanwhile." };
}

function BusinessPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["portal", "businesses", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () =>
      ((await supabase.from("wcbn_businesses").select("*, wcbn_business_sdgs(sdg_number)").eq("owner_member_id", wcbnId!).order("created_at")).data ?? []) as unknown as Business[],
  });

  useEffect(() => {
    if (!businesses?.length) return;
    setSelectedId((cur) => (cur && businesses.some((b) => b.id === cur) ? cur : businesses[0].id));
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
      toast.success("Business profile removed");
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
      toast.success("Business profile updated. Leadership vets changes before they appear publicly.");
      setDialogOpen(false);
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["portal", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const sdgNumbers = current?.wcbn_business_sdgs?.map((s) => s.sdg_number).sort((a, b) => a - b) ?? [];

  return (
    <MemberPage
      title="My business"
      description="Your business profile as the network sees it. Keep it current — leadership vets every change before it appears in the public catalog."
      action={businesses?.length ? <Button variant="outline" onClick={() => openEditor(null)}><Plus />Add another business</Button> : undefined}
    >
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        </div>
      )}

      {!isLoading && !businesses?.length && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-card">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl gradient-brand text-white"><Building2 /></div>
          <h2 className="mt-5 text-xl font-semibold">No business profile yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create your profile so the network, partners and buyers can discover what you do. Once leadership vets it, it appears in the public WCBN catalog.
          </p>
          <Button className="mt-6" onClick={() => openEditor(null)}><Plus />Create business profile</Button>
        </div>
      )}

      {!isLoading && current && (
        <div className="space-y-6">
          {businesses && businesses.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {businesses.map((b) => (
                <button key={b.id} onClick={() => setSelectedId(b.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${b.id === current.id ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                  {b.display_name}
                </button>
              ))}
            </div>
          )}

          {/* Profile header */}
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <div className="relative h-40 sm:h-52">
              {current.cover_url
                ? <img src={current.cover_url} alt={`${current.display_name} cover`} className="size-full object-cover" />
                : <div className="size-full gradient-brand" />}
              <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur ${statusMeta(current).tone}`}>{statusMeta(current).label}</span>
            </div>
            <div className="px-6 pb-6">
              <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="size-20 overflow-hidden rounded-2xl border-4 border-card bg-muted">
                    {current.logo_url
                      ? <img src={current.logo_url} alt={`${current.display_name} logo`} className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground">{current.display_name.slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl font-bold leading-tight">{current.display_name}</h2>
                    <p className="text-sm text-muted-foreground">{current.sector} · {[current.city, current.country].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {current.is_active && current.slug && (
                    <Button asChild variant="outline" size="sm"><Link to="/businesses/$slug" params={{ slug: current.slug }}><ExternalLink />View public page</Link></Button>
                  )}
                  <Button size="sm" onClick={() => openEditor(current)}><Pencil />Edit profile</Button>
                  <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => { if (confirm("Remove this business profile?")) remove.mutate(current.id); }}><Trash2 /></Button>
                </div>
              </div>
              {current.summary && <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{current.summary}</p>}
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />{statusMeta(current).note}
              </p>
            </div>
          </section>

          {/* Key facts */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={CalendarDays} label="Years operating" value={current.years_operating ? `${current.years_operating}` : "—"} />
            <Stat icon={Users} label="Team size" value={current.employee_count ? `${current.employee_count}` : "—"} />
            <Stat icon={Target} label="SDGs committed" value={String(sdgNumbers.length)} />
            <Stat icon={CheckCircle2} label="Catalog status" value={current.is_active ? "Published" : statusMeta(current).label} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Panel title="About the business" icon={Building2}>
                {current.description
                  ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{current.description}</p>
                  : <Empty text="No story added yet. Edit the profile to describe your products, services and journey." onEdit={() => openEditor(current)} />}
              </Panel>

              <Panel title="Impact commitments" icon={Sparkles}>
                {sdgNumbers.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sdgNumbers.map((n) => (
                      <span key={n} className="rounded-full gradient-brand px-3 py-1.5 text-xs font-medium text-white">{n}. {SDGS[n - 1]}</span>
                    ))}
                  </div>
                ) : <Empty text="No SDG commitments selected yet." onEdit={() => openEditor(current)} />}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Contact" icon={Phone}>
                <ul className="space-y-3 text-sm">
                  <Detail icon={Globe} label="Website" value={current.website_url} href={current.website_url ?? undefined} />
                  <Detail icon={Mail} label="Email" value={current.email} href={current.email ? `mailto:${current.email}` : undefined} />
                  <Detail icon={Phone} label="Phone" value={current.phone} href={current.phone ? `tel:${current.phone}` : undefined} />
                  <Detail icon={MapPin} label="Location" value={[current.city, current.country].filter(Boolean).join(", ") || null} />
                </ul>
              </Panel>
              <Panel title="Registration" icon={ShieldCheck}>
                <ul className="space-y-3 text-sm">
                  <Detail icon={Building2} label="Legal name" value={current.legal_name} />
                  <Detail icon={ShieldCheck} label="Registration number" value={current.registration_number} />
                  <Detail icon={CalendarDays} label="Profile created" value={new Date(current.created_at).toLocaleDateString()} />
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit business profile" : "Create business profile"}</DialogTitle>
            <DialogDescription>Changes are reviewed by WCBN leadership before they show in the public catalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Business name"><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></F>
            <F label="Registered legal name"><Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} /></F>
            <F label="Sector">
              <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                <SelectContent className="max-h-72">{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Country">
              <Select value={form.country} onValueChange={(v) => set("country", v)}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="max-h-72">{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></F>
            <F label="Registration number (optional)"><Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></F>
            <F label="Years operating"><Input type="number" value={form.years_operating} onChange={(e) => set("years_operating", e.target.value)} /></F>
            <F label="Team size"><Input type="number" value={form.employee_count} onChange={(e) => set("employee_count", e.target.value)} /></F>
            <F label="Website"><Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" /></F>
            <F label="Contact email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></F>
            <F label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
            <F label="Logo image link"><Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" /></F>
            <F label="Cover image link" className="md:col-span-2"><Input value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://" /></F>
            <F label="Short summary" className="md:col-span-2"><Input value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={160} /></F>
            <F label="Full story, products and services" className="md:col-span-2"><Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} /></F>
            <div className="md:col-span-2">
              <Label className="mb-3 block">SDG contributions</Label>
              <div className="flex flex-wrap gap-2">
                {SDGS.map((label, i) => {
                  const n = i + 1; const on = form.sdgs.includes(n);
                  return <button type="button" key={n} onClick={() => set("sdgs", on ? form.sdgs.filter((s) => s !== n) : [...form.sdgs, n])}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{n}. {label}</button>;
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending || !form.display_name || !form.sector || !form.country} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="animate-spin" /> : null}Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPage>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="size-4 text-primary" />{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Detail({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; href?: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value
          ? href
            ? <a href={href} target="_blank" rel="noreferrer" className="break-words text-sm font-medium text-primary hover:underline">{value}</a>
            : <p className="break-words text-sm font-medium">{value}</p>
          : <p className="text-sm text-muted-foreground">—</p>}
      </div>
    </li>
  );
}

function Empty({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}><Pencil />Edit profile</Button>
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}
