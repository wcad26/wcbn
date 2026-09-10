import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AccessGuard({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [state, setState] = useState<"loading" | "allowed" | "signed-out" | "forbidden">("loading");
  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!active) return;
      if (!user) { setState("signed-out"); return; }
      if (!admin) { setState("allowed"); return; }
      const { data: roles } = await supabase.from("wcbn_user_roles").select("id").eq("user_id", user.id).eq("is_active", true).limit(1);
      if (active) setState(roles?.length ? "allowed" : "forbidden");
    }
    check();
    return () => { active = false; };
  }, [admin]);
  if (state === "loading") return <div className="grid min-h-screen place-items-center bg-ink text-primary-foreground"><p className="text-sm">Checking secure access…</p></div>;
  if (state !== "allowed") return <div className="grid min-h-screen place-items-center bg-muted px-5"><div className="max-w-md border border-border bg-background p-8 text-center"><h1 className="font-display text-3xl font-bold">{state === "signed-out" ? "Sign in required" : "Leadership access only"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{state === "signed-out" ? "Use your existing WCA credentials to continue." : "Your account does not currently have an active WCBN leadership role."}</p><Button asChild className="mt-6"><Link to={state === "signed-out" ? "/auth" : "/"}>{state === "signed-out" ? "Sign in" : "Return home"}</Link></Button></div></div>;
  return children;
}