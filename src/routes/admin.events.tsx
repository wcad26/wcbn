import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, Native } from "@/components/wcbn/form-field";
import { supabase } from "@/integrations/supabase/client";
import { slugify, useIdentity } from "@/lib/wcbn";
import { AUDIENCES, EVENT_CATEGORIES, EVENT_FIELDS, EVENT_STATUSES, eventDate, eventPlace, uploadCover, type WcbnEvent } from "@/lib/wcbn-content";

export const Route = createFileRoute("/admin/events")({ component: AdminEvents });

const empty = {
  title: "", summary: "", description: "", category: "Networking", start_datetime: "", end_datetime: "",
  venue_name: "", address: "", city: "", country: "", capacity: "", cost: "", cost_currency_code: "XAF",
  organizer_name: "", organizer_email: "", organizer_phone: "",
  requires_registration: true, is_featured: false, audience: "public", status: "draft", image_url: "",
};
type Form = typeof empty;

function toForm(e: WcbnEvent): Form {
  return {
    title: e.title, summary: e.summary ?? "", description: e.description ?? "", category: e.category,
    start_datetime: e.start_datetime ? new Date(e.start_datetime).toISOString().slice(0, 16) : "",
    end_datetime: e.end_datetime ? new Date(e.end_datetime).toISOString().slice(0, 16) : "",
    venue_name: e.venue_name ?? "", address: e.address ?? "", city: e.city ?? "", country: e.country ?? "",
    capacity: e.capacity ? String(e.capacity) : "", cost: e.cost ? String(e.cost) : "", cost_currency_code: e.cost_currency_code ?? "XAF",
    organizer_name: e.organizer_name ?? "", organizer_email: e.organizer_email ?? "", organizer_phone: e.organizer_phone ?? "",
    requires_registration: e.requires_registration, is_featured: e.is_featured, audience: e.audience, status: e.status, image_url: e.image_url ?? "",
  };
}

function AdminEvents() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [editing, setEditing] = useState<WcbnEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [registrationsFor, setRegistrationsFor] = useState<WcbnEvent | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => (await supabase.from("wcbn_events").select(EVENT_FIELDS).order("start_datetime", { ascending: false })).data as WcbnEvent[] ?? [],
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["admin", "event-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("wcbn_event_registrations").select("event_id").eq("status", "attending");
      return (data ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.event_id] = (acc[r.event_id] ?? 0) + 1; return acc; }, {});
    },
  });

  const save = useMutation({
    mutationFn: async (form: Form) => {
      if (!form.title.trim()) throw new Error("Give the event a title.");
      if (!form.start_datetime) throw new Error("Choose when the event starts.");
      const payload = {
        title: form.title.trim(),
        summary: form.summary || null,
        description: form.description || null,
        category: form.category,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : null,
        venue_name: form.venue_name || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        cost: form.cost ? Number(form.cost) : 0,
        cost_currency_code: form.cost_currency_code || "XAF",
        organizer_name: form.organizer_name || null,
        organizer_email: form.organizer_email || null,
        organizer_phone: form.organizer_phone || null,
        requires_registration: form.requires_registration,
        is_featured: form.is_featured,
        audience: form.audience,
        status: form.status,
        image_url: form.image_url || null,
      };
      if (editing) {
        const { error } = await supabase.from("wcbn_events").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const slug = `${slugify(form.title)}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("wcbn_events").insert({ ...payload, slug, created_by: identity?.userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Event updated" : "Event created");
      setOpen(false); setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wcbn_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Event deleted"); queryClient.invalidateQueries({ queryKey: ["admin", "events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="Events" description="Create the gatherings of the network. Published events appear on the WCBN website and in every member portal."
      action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus />New event</Button></DialogTrigger>
          <EventDialog key={editing?.id ?? "new"} initial={editing ? toForm(editing) : empty} saving={save.isPending} onSubmit={(f) => save.mutate(f)} editing={!!editing} />
        </Dialog>
      }>
      {isLoading ? (
        <div className="grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : events.length ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-4">Event</th><th className="p-4">When & where</th><th className="p-4">Audience</th><th className="p-4">Status</th><th className="p-4">Registered</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="p-4"><span className="font-medium">{e.title}</span><span className="block text-xs text-muted-foreground">{e.category}</span></td>
                  <td className="p-4 text-muted-foreground">
                    <span className="flex items-center gap-2"><CalendarDays className="size-3.5" />{eventDate(e)}</span>
                    <span className="mt-1 flex items-center gap-2"><MapPin className="size-3.5" />{eventPlace(e)}</span>
                  </td>
                  <td className="p-4">{e.audience === "public" ? "Public & members" : "Members only"}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.status === "published" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : e.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{e.status}</span></td>
                  <td className="p-4">{counts[e.id] ?? 0}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Registrations" onClick={() => setRegistrationsFor(e)}><Users className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { if (confirm(`Delete "${e.title}"?`)) remove.mutate(e.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">No events yet. Create the first WCBN gathering.</p>
      )}

      <Dialog open={!!registrationsFor} onOpenChange={(v) => !v && setRegistrationsFor(null)}>
        {registrationsFor && <RegistrationsDialog event={registrationsFor} />}
      </Dialog>
    </AdminPage>
  );
}

function EventDialog({ initial, onSubmit, saving, editing }: { initial: Form; onSubmit: (f: Form) => void; saving: boolean; editing: boolean }) {
  const [form, setForm] = useState<Form>(initial);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try { set("image_url", await uploadCover("events", file)); toast.success("Cover image uploaded"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" className="md:col-span-2"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="WCBN Business Clinic" /></Field>
        <Field label="Summary" className="md:col-span-2"><Textarea rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="One or two lines shown on cards." /></Field>
        <Field label="Full description" className="md:col-span-2"><Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Category"><Native value={form.category} onChange={(v) => set("category", v)} options={EVENT_CATEGORIES.map((c) => [c, c])} /></Field>
        <Field label="Status"><Native value={form.status} onChange={(v) => set("status", v)} options={EVENT_STATUSES.map((s) => [s, s])} /></Field>
        <Field label="Starts"><Input type="datetime-local" value={form.start_datetime} onChange={(e) => set("start_datetime", e.target.value)} /></Field>
        <Field label="Ends (optional)"><Input type="datetime-local" value={form.end_datetime} onChange={(e) => set("end_datetime", e.target.value)} /></Field>
        <Field label="Venue"><Input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} /></Field>
        <Field label="Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
        <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
        <Field label="Cost"><Input type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0 for free" /></Field>
        <Field label="Organiser name"><Input value={form.organizer_name} onChange={(e) => set("organizer_name", e.target.value)} /></Field>
        <Field label="Organiser email"><Input type="email" value={form.organizer_email} onChange={(e) => set("organizer_email", e.target.value)} /></Field>
        <Field label="Organiser phone"><Input value={form.organizer_phone} onChange={(e) => set("organizer_phone", e.target.value)} /></Field>
        <Field label="Audience"><Native value={form.audience} onChange={(v) => set("audience", v)} options={AUDIENCES.map((a) => [a.value, a.label])} /></Field>
        <Field label="Cover image" className="md:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} disabled={uploading} />
            {form.image_url && <img src={form.image_url} alt="" className="h-12 w-20 rounded-lg object-cover" />}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.requires_registration} onCheckedChange={(v) => set("requires_registration", v)} />Members must register</label>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} />Feature this event</label>
      </div>
      <Button className="mt-4 w-full" disabled={saving || uploading} onClick={() => onSubmit(form)}>{saving ? "Saving…" : editing ? "Save changes" : "Create event"}</Button>
    </DialogContent>
  );
}

function RegistrationsDialog({ event }: { event: WcbnEvent }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "event-registrations", event.id],
    queryFn: async () => {
      const { data: regs } = await supabase.from("wcbn_event_registrations").select("id, user_id, status, created_at").eq("event_id", event.id).order("created_at");
      const ids = (regs ?? []).map((r) => r.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, first_name, last_name, email, phone").in("id", ids)
        : { data: [] };
      return (regs ?? []).map((r) => ({ ...r, profile: (profiles ?? []).find((p) => p.id === r.user_id) ?? null }));
    },
  });

  return (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Registrations — {event.title}</DialogTitle></DialogHeader>
      {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : data.length ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Member</th><th className="py-2">Contact</th><th className="py-2">Status</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2">{[r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") || "Member"}</td>
                <td className="py-2 text-muted-foreground">{r.profile?.email ?? "—"}{r.profile?.phone ? ` · ${r.profile.phone}` : ""}</td>
                <td className="py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-sm text-muted-foreground">No one has registered yet.</p>}
    </DialogContent>
  );
}
