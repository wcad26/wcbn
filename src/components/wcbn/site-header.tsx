import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const links = [
  ["About", "/about"],
  ["Membership", "/membership"],
  ["Businesses", "/businesses"],
  ["Events", "/events"],
  ["News", "/news"],
  ["Impact", "/impact"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="WCBN home">
          <span className="grid size-10 place-items-center rounded-xl gradient-brand text-lg font-bold text-primary-foreground">W</span>
          <span>
            <strong className="block text-lg font-bold leading-none text-gradient-brand">WCBN</strong>
            <small className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Business Network</small>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map(([label, to]) => (
            <Link key={to} to={to} className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-muted hover:text-primary" activeProps={{ className: "bg-primary/10 text-primary" }}>{label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {signedIn && (
            <Button asChild variant="ghost" className="rounded-full"><Link to="/portal">My portal</Link></Button>
          )}
          <Button asChild className="rounded-full gradient-brand shadow-soft"><Link to="/membership">Apply to WCBN</Link></Button>
        </div>
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-4 py-4 lg:hidden">
          {links.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-medium hover:bg-muted">{label}</Link>)}
          <div className="mt-3 grid gap-2">
            <Button asChild variant="outline" className="w-full rounded-full"><Link to={signedIn ? "/portal" : "/auth"} onClick={() => setOpen(false)}>{signedIn ? "My portal" : "Member sign in"}</Link></Button>
            <Button asChild className="w-full rounded-full gradient-brand"><Link to="/membership" onClick={() => setOpen(false)}>Apply to WCBN</Link></Button>
          </div>
        </nav>
      )}
    </header>
  );
}
