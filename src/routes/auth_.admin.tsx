import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/admin")({
  head: () => ({ meta: [
    { title: "Leadership sign in | WCBN" },
    { name: "description", content: "Secure sign in for World Changers Business Network leadership to manage members, businesses and contributions." },
    { property: "og:title", content: "WCBN leadership sign in" },
    { property: "og:description", content: "Restricted access for WCBN administrators, validators, committee members and finance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: AdminAuth,
});

function AdminAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) { setBusy(false); setError(signInError?.message ?? "Sign in failed."); return; }
    const [{ data: roles }, { data: isSuper }] = await Promise.all([
      supabase.from("wcbn_user_roles").select("id").eq("user_id", data.user.id).eq("is_active", true).limit(1),
      supabase.rpc("is_super_admin_user", { _user_id: data.user.id }),
    ]);
    setBusy(false);
    if (!roles?.length && isSuper !== true) {
      await supabase.auth.signOut();
      setError("This account does not hold an active WCBN leadership role.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-ink px-5 py-16">
      <div className="absolute inset-0 gradient-brand opacity-30" />
      <div className="relative w-full max-w-md rounded-3xl border border-border/40 bg-card p-8 shadow-card">
        <span className="grid size-12 place-items-center rounded-2xl gradient-brand text-primary-foreground"><ShieldCheck /></span>
        <h1 className="mt-6 text-2xl font-bold">WCBN leadership portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Restricted access. Sign in with your World Changers Association credentials; your WCBN role decides what you can manage.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email address</Label>
            <Input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input id="admin-password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Sign in to leadership portal</Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Not leadership? <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">Member sign in</Link>
        </p>
      </div>
    </main>
  );
}
