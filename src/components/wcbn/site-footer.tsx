import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-3xl font-bold">WCBN</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-foreground/70">
            Christian business leaders using enterprise, influence and stewardship to transform communities and nations. A subsidiary of the World Changers Association.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Explore</p>
          <div className="mt-4 grid gap-3 text-sm text-ink-foreground/70">
            <Link to="/about" className="hover:text-ink-foreground">About the network</Link>
            <Link to="/membership" className="hover:text-ink-foreground">Membership</Link>
            <Link to="/businesses" className="hover:text-ink-foreground">Business catalog</Link>
            <Link to="/impact" className="hover:text-ink-foreground">Impact</Link>
            <Link to="/contact" className="hover:text-ink-foreground">Contact</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Portals</p>
          <div className="mt-4 grid gap-3 text-sm text-ink-foreground/70">
            <Link to="/auth" className="hover:text-ink-foreground">Member sign in</Link>
            <Link to="/portal" className="hover:text-ink-foreground">Member portal</Link>
            <Link to="/auth/admin" className="hover:text-ink-foreground">Leadership sign in</Link>
            <Link to="/admin" className="hover:text-ink-foreground">Leadership portal</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 px-5 py-5 text-center text-xs text-ink-foreground/50">
        © {new Date().getFullYear()} World Changers Business Network · A subsidiary of World Changers Association
      </div>
    </footer>
  );
}
