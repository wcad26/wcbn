import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AccessGuard({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [state, setState] = useState<"loading" | "allowed" | "signed-out" | "forbidden">("loading");

  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!active) return;
      if (!user) { setState("signed-out"); return; }
      if (!admin) { setState("allowed"); return; }
      const [{ data: roles }, { data: isSuper }] = await Promise.all([
        supabase.from("wcbn_user_roles").select("id").eq("user_id", user.id).eq("is_active", true).limit(1),
        supabase.rpc("is_super_admin_user", { _user_id: user.id }),
      ]);
      if (active) setState(roles?.length || isSuper === true ? "allowed" : "forbidden");
    }
    check();
    return () => { active = false; };
  }, [admin]);

  if (state === "loading") {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/40">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Checking secure access…</p>
      </div>
    );
  }

  if (state !== "allowed") {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/40 px-5">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-card">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldAlert /></span>
          <h1 className="mt-6 text-2xl font-bold">{state === "signed-out" ? "Sign in required" : "Leadership access only"}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {state === "signed-out"
              ? "Use your existing World Changers Association credentials to continue."
              : "Your account does not yet hold a WCBN leadership role. Ask a WCBN administrator to grant you access."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild><Link to={admin ? "/auth/admin" : "/auth"}>{state === "signed-out" ? "Go to sign in" : "Switch account"}</Link></Button>
            <Button asChild variant="outline"><Link to="/">Back to website</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
