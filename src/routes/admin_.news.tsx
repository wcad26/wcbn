import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { slugify, useIdentity } from "@/lib/wcbn";
import { AUDIENCES, POST_FIELDS, POST_TYPES, postDate, postTypeLabel, uploadCover, type WcbnPost } from "@/lib/wcbn-content";
import { Field, Native } from "./admin_.events";

export const Route = createFileRoute("/admin_/news")({ component: AdminNews });

const empty = { post_type: "announcement", title: "", summary: "", body: "", image_url: "", tags: "", is_pinned: false, audience: "public", status: "draft" };
type Form = typeof empty;

function toForm(p: WcbnPost): Form {
  return {
    post_type: p.post_type, title: p.title, summary: p.summary ?? "", body: p.body ?? "", image_url: p.image_url ?? "",
    tags: (p.tags ?? []).join(", "), is_pinned: p.is_pinned, audience: p.audience, status: p.status,
  };
}

function AdminNews() {
  const queryClient = useQueryClient();
  const { data: identity } = useIdentity();
  const [editing, setEditing] = useState<WcbnPost | null>(null);
  const [open, setOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: async () => (await supabase.from("wcbn_posts").select(POST_FIELDS).order("created_at", { ascending: false })).data as WcbnPost[] ?? [],
  });

  const save = useMutation({
    mutationFn: async (form: Form) => {
      if (!form.title.trim()) throw new Error("Give the post a title.");
      const payload = {
        post_type: form.post_type, title: form.title.trim(), summary: form.summary || null, body: form.body || null,
        image_url: form.image_url || null, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_pinned: form.is_pinned, audience: form.audience, status: form.status,
        published_at: form.status === "published" ? (editing?.published_at ?? new Date().toISOString()) : null,
      };
      if (editing) {
        const { error } = await supabase.from("wcbn_posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const slug = `${slugify(form.title)}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("wcbn_posts").insert({ ...payload, slug, created_by: identity?.userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Post updated" : "Post created"); setOpen(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wcbn_posts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Post deleted"); queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPage title="News & announcements" description="Publish announcements, news and articles to the WCBN website and the member portal."
      action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus />New post</Button></DialogTrigger>
          <PostDialog key={editing?.id ?? "new"} initial={editing ? toForm(editing) : empty} editing={!!editing} saving={save.isPending} onSubmit={(f) => save.mutate(f)} />
        </Dialog>
      }>
      {isLoading ? (
        <div className="grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : posts.length ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="p-4">Title</th><th className="p-4">Type</th><th className="p-4">Audience</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-4"><span className="font-medium">{p.title}</span>{p.is_pinned && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Pinned</span>}</td>
                  <td className="p-4">{postTypeLabel(p.post_type)}</td>
                  <td className="p-4">{p.audience === "public" ? "Public & members" : "Members only"}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "published" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{p.status}</span></td>
                  <td className="p-4 text-muted-foreground">{postDate(p)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">Nothing published yet. Write the first announcement.</p>
      )}
    </AdminPage>
  );
}

function PostDialog({ initial, onSubmit, saving, editing }: { initial: Form; onSubmit: (f: Form) => void; saving: boolean; editing: boolean }) {
  const [form, setForm] = useState<Form>(initial);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try { set("image_url", await uploadCover("posts", file)); toast.success("Image uploaded"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Edit post" : "New post"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" className="md:col-span-2"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Type"><Native value={form.post_type} onChange={(v) => set("post_type", v)} options={POST_TYPES.map((t) => [t, postTypeLabel(t)])} /></Field>
        <Field label="Audience"><Native value={form.audience} onChange={(v) => set("audience", v)} options={AUDIENCES.map((a) => [a.value, a.label])} /></Field>
        <Field label="Summary" className="md:col-span-2"><Textarea rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
        <Field label="Body" className="md:col-span-2"><Textarea rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} /></Field>
        <Field label="Tags (comma separated)"><Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="finance, mentorship" /></Field>
        <Field label="Status"><Native value={form.status} onChange={(v) => set("status", v)} options={[["draft", "Draft"], ["published", "Published"]]} /></Field>
        <Field label="Cover image" className="md:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} disabled={uploading} />
            {form.image_url && <img src={form.image_url} alt="" className="h-12 w-20 rounded-lg object-cover" />}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.is_pinned} onCheckedChange={(v) => set("is_pinned", v)} />Pin to the top</label>
      </div>
      <Button className="mt-4 w-full" disabled={saving || uploading} onClick={() => onSubmit(form)}>{saving ? "Saving…" : editing ? "Save changes" : "Create post"}</Button>
    </DialogContent>
  );
}
