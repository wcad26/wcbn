import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity, useInvalidateIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/profile")({ component: ProfilePage });

function ProfilePage() {
  const { data: identity, isLoading } = useIdentity();
  const refresh = useInvalidateIdentity();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });

  useEffect(() => {
    if (identity?.profile) setForm({ first_name: identity.profile.first_name ?? "", last_name: identity.profile.last_name ?? "", phone: identity.profile.phone ?? "" });
  }, [identity?.profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ first_name: form.first_name, last_name: form.last_name, phone: form.phone || null }).eq("id", identity.userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage title="My profile" description="Your World Changers Association identity powers your WCBN membership. Membership records are maintained by WCA; contact details you can update here.">
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading your profile…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold">Contact details</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={identity?.email ?? ""} disabled /></div>
            </div>
            <Button className="mt-6" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />}Save changes</Button>
            <p className="mt-3 text-xs text-muted-foreground">Your sign-in email is managed by the World Changers Association platform.</p>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">WCA record</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Item label="Member ID" value={identity?.member?.member_id ?? "—"} />
                <Item label="Region" value={identity?.regionName ?? "—"} />
                <Item label="Destiny Care Group (DCG)" value={identity?.dcgName ?? "No DCG assignment"} />
                <Item label="Joined" value={identity?.member?.join_date ?? "—"} />
              </dl>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">{identity?.wcaActive ? <BadgeCheck className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active WCA membership</li>
                <li className="flex items-center gap-2">{identity?.dcgActive ? <BadgeCheck className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}Active Destiny Care Group (DCG) participation</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">WCBN membership</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Item label="Category" value={identity?.wcbnMember?.category ?? "Not started"} />
                <Item label="Status" value={identity?.wcbnMember?.status ?? "—"} />
                <Item label="Inducted" value={identity?.wcbnMember?.inducted_at ? new Date(identity.wcbnMember.inducted_at).toLocaleDateString() : "—"} />
                <Item label="Next review" value={identity?.wcbnMember?.next_review_date ?? "—"} />
              </dl>
            </div>
          </aside>
        </div>
      )}
    </MemberPage>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
