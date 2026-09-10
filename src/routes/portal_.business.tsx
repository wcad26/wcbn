import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SDGS, ensureWcbnMember, slugify, useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal_/business")({ component: BusinessPage });

type Form = {
  display_name: string; legal_name: string; sector: string; country: string; city: string;
  summary: string; description: string; website_url: string; email: string; phone: string;
  logo_url: string; cover_url: string; years_operating: string; employee_count: string; registration_number: string; sdgs: number[];
};
const EMPTY: Form = { display_name: "", legal_name: "", sector: "", country: "", city: "", summary: "", description: "", website_url: "", email: "", phone: "", logo_url: "", cover_url: "", years_operating: "", employee_count: "", registration_number: "", sdgs: [] };

function BusinessPage() {
  const { data: identity } = useIdentity();
  const queryClient = useQueryClient();
  const wcbnId = identity?.wcbnMember?.id;
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["portal", "businesses", wcbnId],
    enabled: !!wcbnId,
    queryFn: async () => (await supabase.from("wcbn_businesses").select("*, wcbn_business_sdgs(sdg_number)").eq("owner_member_id", wcbnId!).order("created_at")).data ?? [],
  });

  useEffect(() => {
    if (!editingId) return;
    const b = businesses?.find((x) => x.id === editingId);
    if (b) setForm({
      display_name: b.display_name, legal_name: b.legal_name, sector: b.sector, country: b.country, city: b.city ?? "",
      summary: b.summary ?? "", description: b.description ?? "", website_url: b.website_url ?? "", email: b.email ?? "", phone: b.phone ?? "",
      logo_url: b.logo_url ?? "", cover_url: b.cover_url ?? "", years_operating: String(b.years_operating ?? ""), employee_count: String(b.employee_count ?? ""),
      registration_number: b.registration_number ?? "", sdgs: (b.wcbn_business_sdgs as { sdg_number: number }[] | null)?.map((s) => s.sdg_number) ?? [],
    });
  }, [editingId, businesses]);

  const current = businesses?.find((b) => b.id === editingId) ?? null;

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wcbn_businesses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      setEditingId(null); setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["portal", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const memberId = await ensureWcbnMember(identity);
      const payload = {
        owner_member_id: memberId,
        display_name: form.display_name,
        legal_name: form.legal_name || form.display_name,
        slug: slugify(form.display_name) || `business-${Date.now()}`,
        sector: form.sector, country: form.country, city: form.city || null,
        summary: form.summary || null, description: form.description || null,
        website_url: form.website_url || null, email: form.email || null, phone: form.phone || null,
        logo_url: form.logo_url || null, cover_url: form.cover_url || null,
        years_operating: form.years_operating ? Number(form.years_operating) : null,
        employee_count: form.employee_count ? Number(form.employee_count) : null,
        registration_number: form.registration_number || null,
        ...(current?.vetting_status === "approved" ? {} : { vetting_status: "pending" }),
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
    },
    onSuccess: () => {
      toast.success("Business saved. It goes to WCBN leadership for vetting before it appears publicly.");
      setEditingId(null); setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["portal", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <MemberPage title="My business" description="Present your enterprise to the network. Listings appear in the public catalog once leadership vets and activates them."
      action={<Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}><Plus />New listing</Button>}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your listings</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {businesses?.length === 0 && <p className="text-sm text-muted-foreground">No listing yet. Add your first business.</p>}
          {businesses?.map((b) => (
            <button key={b.id} onClick={() => setEditingId(b.id)} className={`w-full rounded-2xl border p-4 text-left transition ${editingId === b.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
              <p className="font-semibold">{b.display_name}</p>
              <p className="text-xs text-muted-foreground">{b.sector} · {b.country}</p>
              <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize">{b.is_active ? "live" : b.vetting_status}</span>
            </button>
          ))}
        </aside>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingId ? "Edit listing" : "New listing"}</h2>
            {current && (
              <div className="flex flex-wrap items-center gap-2">
                {current.is_active && current.slug && (
                  <Button asChild variant="outline" size="sm"><Link to="/businesses/$slug" params={{ slug: current.slug }}><ExternalLink />View public page</Link></Button>
                )}
                <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => { if (confirm("Remove this listing?")) remove.mutate(current.id); }}><Trash2 />Remove</Button>
              </div>
            )}
          </div>
          {current && (
            <p className="mt-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
              {current.is_active ? "This listing is live in the public catalog."
                : current.vetting_status === "approved" ? "Approved by leadership. It will appear publicly once activated."
                : current.vetting_status === "rejected" ? `Not approved.${current.vetting_notes ? ` ${current.vetting_notes}` : " Contact WCBN leadership for guidance."}`
                : "Awaiting vetting by WCBN leadership. You can keep editing until it is approved."}
            </p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <F label="Business name"><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></F>
            <F label="Registered legal name"><Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} /></F>
            <F label="Sector"><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} /></F>
            <F label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></F>
            <F label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></F>
            <F label="Registration number"><Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></F>
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
                {SDGS.map((label, i) => { const n = i + 1; const on = form.sdgs.includes(n);
                  return <button type="button" key={n} onClick={() => set("sdgs", on ? form.sdgs.filter((s) => s !== n) : [...form.sdgs, n])} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "gradient-brand text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>{n}. {label}</button>;
                })}
              </div>
            </div>
          </div>
          <Button className="mt-6" disabled={save.isPending || !form.display_name || !form.sector || !form.country} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}Save listing
          </Button>
        </div>
      </div>
    </MemberPage>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}
