import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const links = [
  ["About", "/about"],
  ["Membership", "/membership"],
  ["Businesses", "/businesses"],
  ["Impact", "/impact"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/20 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="WCBN home">
          <span className="grid size-10 place-items-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">W</span>
          <span><strong className="block font-display text-lg leading-none">WCBN</strong><small className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">World Changers</small></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {links.map(([label, to]) => <Link key={to} to={to} className="text-sm font-medium text-foreground/75 transition hover:text-primary" activeProps={{ className: "text-primary" }}>{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost"><Link to="/auth">Member sign in</Link></Button>
          <Button asChild><Link to="/auth">Apply to WCBN</Link></Button>
        </div>
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <nav className="border-t border-border bg-background px-5 py-5 lg:hidden">{links.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="block border-b border-border py-3 font-medium">{label}</Link>)}<Button asChild className="mt-5 w-full"><Link to="/auth">Member sign in</Link></Button></nav>}
    </header>
  );
}
