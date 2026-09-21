import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/wcbn-network.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Member sign in | WCBN" },
    { name: "description", content: "Sign in to the World Changers Business Network member portal with your World Changers Association credentials." },
    { property: "og:title", content: "WCBN member sign in" },
    { property: "og:description", content: "Access your WCBN application, business listing, contributions and impact reporting." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/portal", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) { setError(signInError.message); return; }
    navigate({ to: "/portal", replace: true });
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroImage} alt="World Changers business leaders in conversation" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 gradient-brand opacity-85" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <h2 className="max-w-md text-4xl font-bold leading-tight">Faith, enterprise and measurable impact.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">The WCBN member portal reuses your World Changers Association identity — no new registration, no repeated forms.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl gradient-brand text-sm font-bold text-primary-foreground">W</span>
            <span className="text-sm font-bold uppercase tracking-wide text-gradient-brand">WCBN</span>
          </Link>
          <h1 className="mt-8 text-3xl font-bold">Member sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use the World Changers Association credentials you already have. WCBN has no separate sign-up.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LogIn />}Sign in
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
